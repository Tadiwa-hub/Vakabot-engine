import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { messages } from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

const conversationsApp = new Hono<{ Bindings: Bindings }>();

conversationsApp.get('/:userId', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  // Get unique conversations by remoteJid
  // We use a subquery to get the latest message for each remoteJid
  const chats = await db.select({
    remoteJid: messages.remoteJid,
    pushName: messages.pushName,
    lastMessage: messages.content,
    timestamp: messages.timestamp,
  })
    .from(messages)
    .where(eq(messages.userId, userId))
    .groupBy(messages.remoteJid)
    .orderBy(desc(messages.timestamp));

  return c.json(chats);
});

conversationsApp.get('/:userId/:remoteJid', async (c) => {
  const { userId, remoteJid } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  const history = await db.select()
    .from(messages)
    .where(and(eq(messages.userId, userId), eq(messages.remoteJid, remoteJid)))
    .orderBy(messages.timestamp);

  return c.json(history);
});

export default conversationsApp;
