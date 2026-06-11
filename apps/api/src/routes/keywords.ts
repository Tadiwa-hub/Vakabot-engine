import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { keywords, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const keywordsApp = new Hono<{ Bindings: Bindings }>();

keywordsApp.get('/:userId', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  const items = await db.select().from(keywords).where(eq(keywords.userId, userId));
  return c.json(items);
});

keywordsApp.post('/', async (c) => {
  const { userId, triggers, matchType, response } = await c.req.json();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  // Safety: Ensure user exists
  await db.insert(users).values({
    id: userId,
    email: 'user@example.com',
    createdAt: new Date().toISOString()
  }).onConflictDoNothing();

  const newItem = {
    id: nanoid(),
    userId,
    triggers,
    matchType: matchType || 'contains',
    response,
    createdAt: new Date().toISOString(),
  };
  
  await db.insert(keywords).values(newItem);
  return c.json(newItem);
});

keywordsApp.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const { userId, isActive, triggers, response, matchType } = await c.req.json();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  await db.update(keywords)
    .set({ isActive, triggers, response, matchType })
    .where(and(eq(keywords.id, id), eq(keywords.userId, userId)));
    
  return c.json({ success: true });
});

keywordsApp.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const userId = c.req.header('x-user-id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  await db.delete(keywords).where(and(eq(keywords.id, id), eq(keywords.userId, userId)));
  return c.json({ success: true });
});

export default keywordsApp;
