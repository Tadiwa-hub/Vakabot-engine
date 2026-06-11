import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { services, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const servicesApp = new Hono<{ Bindings: Bindings }>();

servicesApp.get('/:userId', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  const items = await db.select().from(services).where(eq(services.userId, userId));
  return c.json(items);
});

servicesApp.post('/', async (c) => {
  const { userId, name, description, price } = await c.req.json();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  // Safety: Ensure user exists to avoid foreign key constraint error
  await db.insert(users).values({
    id: userId,
    email: 'user@example.com',
    createdAt: new Date().toISOString()
  }).onConflictDoNothing();

  const newItem = {
    id: nanoid(),
    userId,
    name,
    description,
    price,
    createdAt: new Date().toISOString(),
  };
  
  await db.insert(services).values(newItem);
  return c.json(newItem);
});

servicesApp.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const { userId, isActive, name, description, price } = await c.req.json();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  await db.update(services)
    .set({ isActive, name, description, price })
    .where(and(eq(services.id, id), eq(services.userId, userId)));
    
  return c.json({ success: true });
});

servicesApp.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const userId = c.req.header('x-user-id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  await db.delete(services).where(and(eq(services.id, id), eq(services.userId, userId)));
  return c.json({ success: true });
});

export default servicesApp;
