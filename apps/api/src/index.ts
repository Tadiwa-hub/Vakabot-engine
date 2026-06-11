import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Bindings } from './lib/types';
import instancesApp from './routes/instances';
import webhooksApp from './routes/webhooks';
import keywordsApp from './routes/keywords';
import servicesApp from './routes/services';
import usersApp from './routes/users';
import analyticsApp from './routes/analytics';
import conversationsApp from './routes/conversations';
import billingApp from './routes/billing';
import adminApp from './routes/admin';
import { getDb } from './db';
import { instances, messages } from './db/schema';
import { EvolutionClient } from './lib/evolution';
import { and, eq, lt } from 'drizzle-orm';
import { ConnectionManager } from './lib/manager';
import { processWebhookMessage, QueueMessage } from './lib/queue';

export { ConnectionManager };

const app = new Hono<{ Bindings: Bindings }>();

// WebSocket route
app.get('/ws', async (c) => {
  const id = c.env.MANAGER.idFromName('default'); // Use a single global manager
  const obj = c.env.MANAGER.get(id);
  return obj.fetch(c.req.raw);
});


app.use('*', cors());
app.use('*', logger());

// Add Edge & Browser Caching for lightning-fast frontend loads
app.use('*', async (c, next) => {
  await next();
  if (c.req.method === 'GET' && c.res.status === 200 && c.req.path.startsWith('/api/')) {
    c.res.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
  }
});

app.get('/', (c) => c.text('Velo AI API v1'));
app.get('/ping', (c) => c.text('PONG'));

app.route('/api/instance', instancesApp);
app.route('/webhook', webhooksApp);
app.route('/api/keywords', keywordsApp);
app.route('/api/services', servicesApp);
app.route('/api/users', usersApp);
app.route('/api/analytics', analyticsApp);
app.route('/api/conversations', conversationsApp);
app.route('/api/billing', billingApp);
app.route('/api/admin', adminApp);

// Background Cron Job (FIX 4: Layer 4)
const scheduled = async (event: any, env: Bindings, ctx: ExecutionContext) => {
  const db = getDb(env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN);
  const evolution = new EvolutionClient(env.EVOLUTION_API_URL, env.EVOLUTION_API_KEY);

  // 1. Keep-Alive Ping for Evolution API (Render free tier goes to sleep after 15m of inactivity)
  try {
    console.log("[Cron] Keep-alive pinging Evolution API...");
    await fetch(`${env.EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { "apikey": env.EVOLUTION_API_KEY }
    });
    console.log("[Cron] Keep-alive ping successful.");
  } catch (err: any) {
    console.warn("[Cron] Keep-alive ping failed:", err.message);
  }

  // Find all instances that are 'DISCONNECTED' (which we use for connecting state)
  // and older than 3 minutes
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const orphans = await db
    .select()
    .from(instances)
    .where(
      and(
        eq(instances.status, 'DISCONNECTED'),
        lt(instances.createdAt, threeMinutesAgo)
      )
    );

  console.log(`[Cron] Found ${orphans.length} orphaned instances.`);

  for (const inst of orphans) {
    try {
      console.log(`[Cron] Purging orphaned instance: ${inst.instanceName}`);
      await evolution.deleteInstance(inst.instanceName);
      await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, inst.id));
      await db.delete(instances).where(eq(instances.id, inst.id));
    } catch (err: any) {
      if (err.message.includes('404')) {
        await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, inst.id));
        await db.delete(instances).where(eq(instances.id, inst.id));
      }
    }
  }
};

export default {
  fetch: app.fetch,
  scheduled,
  async queue(batch: MessageBatch<QueueMessage>, env: Bindings) {
    for (const message of batch.messages) {
      try {
        await processWebhookMessage(message.body, env);
        message.ack();
      } catch (err) {
        console.error("[Queue Consumer Error]:", err);
        message.retry();
      }
    }
  }
};
