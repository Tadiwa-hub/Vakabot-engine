import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { users, instances, messages } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const adminApp = new Hono<{ Bindings: Bindings }>();

// Authorized Admin UUIDs (including your active Clerk User IDs)
const ADMIN_UUIDS = [
  "user_3EyzCfcKC4ja4chzLVL7dSdl20g",
  "user_3EAVXOo4i0Tb1YWy0TaYzpQzMSn"
];

adminApp.use('*', async (c, next) => {
  const userId = c.req.header('x-user-id');
  if (!userId || !ADMIN_UUIDS.includes(userId)) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }
  await next();
});

// GET: Overall Platform Stats
adminApp.get('/stats', async (c) => {
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [instCount] = await db.select({ count: sql<number>`count(*)` }).from(instances);
    const [msgCount] = await db.select({ count: sql<number>`count(*)` }).from(messages);
    const [connectedInsts] = await db.select({ count: sql<number>`count(*)` }).from(instances).where(eq(instances.status, 'CONNECTED'));

    return c.json({
      totalUsers: userCount?.count || 0,
      totalBots: instCount?.count || 0,
      activeBots: connectedInsts?.count || 0,
      totalMessages: msgCount?.count || 0
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET: All Registered Users
adminApp.get('/users', async (c) => {
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  try {
    const allUsers = await db.select().from(users);
    const allInstances = await db.select().from(instances);

    // Map instances to users
    const mapped = allUsers.map(u => ({
      ...u,
      bot: allInstances.find(i => i.userId === u.id) || null
    }));

    return c.json(mapped);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// PATCH: Adjust User Plan & Limits Manually
adminApp.patch('/users/:id', async (c) => {
  const { id } = c.req.param();
  const { plan, aiLimit, aiUsageCount, aiExpiryDate } = await c.req.json();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  try {
    await db.update(users)
      .set({
        plan: plan || undefined,
        aiLimit: aiLimit !== undefined ? Number(aiLimit) : undefined,
        aiUsageCount: aiUsageCount !== undefined ? Number(aiUsageCount) : undefined,
        aiExpiryDate: aiExpiryDate || undefined
      })
      .where(eq(users.id, id));

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default adminApp;
