import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { messages, keywords, instances, users, services } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { EvolutionClient } from '../lib/evolution';

const analyticsApp = new Hono<{ Bindings: Bindings }>();

// Unified Consolidated Dashboard Payload
analyticsApp.get('/:userId/dashboard', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  const evolution = new EvolutionClient(c.env.EVOLUTION_API_URL, c.env.EVOLUTION_API_KEY);

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTs = Math.floor(startOfDay.getTime() / 1000);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const ts = Math.floor(sevenDaysAgo.getTime() / 1000);

    // Run ALL queries in parallel on the edge
    let [
      [user],
      [instance],
      userKeywords,
      userServices,
      todayMsgsResult,
      kwMatchesResult,
      recentActivity,
      chartData,
      breakdown
    ] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      db.select().from(instances).where(eq(instances.userId, userId)),
      db.select().from(keywords).where(eq(keywords.userId, userId)),
      db.select().from(services).where(eq(services.userId, userId)),
      db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), sql`${messages.timestamp} >= ${startTs}`)),
      db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.responseType, 'keyword'), sql`${messages.timestamp} >= ${startTs}`)),
      db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.timestamp)).limit(10),  
      db.select({
        day: sql<string>`strftime('%Y-%m-%d', datetime(${messages.timestamp}, 'unixepoch'))`.as('day'),
        count: sql<number>`count(*)`
      }).from(messages).where(and(eq(messages.userId, userId), sql`${messages.timestamp} >= ${ts}`)).groupBy(sql`day`),
      db.select({
        type: messages.responseType,
        count: sql<number>`count(*)`
      }).from(messages).where(eq(messages.userId, userId)).groupBy(messages.responseType)
    ]);

    // Active state check and self-healing for the instance
    if (instance) {
      try {
        const stateData = await evolution.getInstanceData(instance.instanceName) as any;
        const state = stateData?.instance?.state || stateData?.state;
        const reason = stateData?.instance?.statusReason || stateData?.statusReason || stateData?.instance?.error?.statusCode;

        if (state === 'open' && instance.status !== 'CONNECTED') {
          await db.update(instances).set({ status: 'CONNECTED', updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));
          instance.status = 'CONNECTED';
        } else if (state === 'logout' || state === 'refused' || (state === 'close' && (reason === 401 || reason === 403))) {
           await evolution.deleteInstance(instance.instanceName).catch(() => {});
           await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, instance.id));
           await db.delete(instances).where(eq(instances.id, instance.id));
           instance = undefined; // Act as if null
        }
      } catch (e: any) {
         if (e.message?.includes('404') || e.message?.toLowerCase().includes('not found')) {
           await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, instance.id));
           await db.delete(instances).where(eq(instances.id, instance.id));
           instance = undefined;
         }
      }
    }

    return c.json({
      user: user || null,
      instance: instance || null,
      keywords: userKeywords,
      services: userServices,
      stats: {
        messagesToday: todayMsgsResult[0]?.count || 0,
        keywordsMatched: kwMatchesResult[0]?.count || 0,
        recentActivity
      },
      charts: {
        chartData,
        breakdown
      }
    });
  } catch (err: any) {
    console.error("[Dashboard Unified API Error]:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

analyticsApp.get('/:userId/stats', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  // 1. Messages today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTs = Math.floor(startOfDay.getTime() / 1000);
  
  const todayMsgs = await db.select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.userId, userId), sql`${messages.timestamp} >= ${startTs}`));

  // 2. Keyword matches today
  const kwMatches = await db.select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(
      eq(messages.userId, userId), 
      eq(messages.responseType, 'keyword'),
      sql`${messages.timestamp} >= ${startTs}`
    ));

  // 3. Recent activity (last 10 messages)
  const recent = await db.select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.timestamp))
    .limit(10);

  return c.json({
    messagesToday: todayMsgs[0]?.count || 0,
    keywordsMatched: kwMatches[0]?.count || 0,
    recentActivity: recent
  });
});

analyticsApp.get('/:userId/charts', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  // Group messages by day for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const ts = Math.floor(sevenDaysAgo.getTime() / 1000);

  const chartData = await db.select({
    day: sql<string>`strftime('%Y-%m-%d', datetime(${messages.timestamp}, 'unixepoch'))`.as('day'),
    count: sql<number>`count(*)`
  })
    .from(messages)
    .where(and(eq(messages.userId, userId), sql`${messages.timestamp} >= ${ts}`))
    .groupBy(sql`day`);

  // Response breakdown
  const breakdown = await db.select({
    type: messages.responseType,
    count: sql<number>`count(*)`
  })
    .from(messages)
    .where(eq(messages.userId, userId))
    .groupBy(messages.responseType);

  return c.json({
    chartData,
    breakdown
  });
});

export default analyticsApp;
