import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { users, insights, messages } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const usersApp = new Hono<{ Bindings: Bindings }>();

// GET: User Insights (with dynamic on-the-fly analyzer backup)
usersApp.get('/:id/insights', async (c) => {
  const { id: userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  try {
    // 1. Fetch pre-computed insights from DB
    const stored = await db.select().from(insights).where(
      and(eq(insights.userId, userId), eq(insights.isDismissed, 0))
    );

    if (stored.length > 0) {
      return c.json(stored.map(ins => ({
        ...ins,
        metadata: ins.metadata ? JSON.parse(ins.metadata) : null
      })));
    }

    // 2. Dynamic Backup Analyzer: If no stored insights, generate on-the-fly!
    const fallbackInsights = [];
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (user) {
      // Upsell Check: AI usage is above 80%
      const usagePercent = (user.aiUsageCount || 0) / (user.aiLimit || 25);
      if (usagePercent >= 0.8) {
        fallbackInsights.push({
          id: 'upsell-dynamic',
          userId,
          type: 'UPSELL_OPPORTUNITY',
          title: 'Upgrade your AI message limit',
          description: `You've used ${user.aiUsageCount} of your ${user.aiLimit} monthly AI messages (${Math.round(usagePercent * 100)}%). Upgrade your bundle to ensure your bots stay active!`,
          metadata: { plan: 'Business', price: '$15' },
          createdAt: new Date().toISOString()
        });
      }

      // Keyword Helper Check: Find real incoming customer messages that triggered a fallback reply
      const unhandledIncoming: any[] = [];
      const fallbackReplies = await db.select().from(messages)
        .where(and(
          eq(messages.userId, userId),
          eq(messages.fromMe, true),
          eq(messages.responseType, 'fallback')
        ))
        .orderBy(desc(messages.timestamp))
        .limit(3);

      for (const fallback of fallbackReplies) {
        // Find the latest incoming message from this contact that arrived right before the fallback was sent
        const [incoming] = await db.select().from(messages)
          .where(and(
            eq(messages.userId, userId),
            eq(messages.fromMe, false),
            eq(messages.remoteJid, fallback.remoteJid),
            sql`timestamp < ${fallback.timestamp}`
          ))
          .orderBy(desc(messages.timestamp))
          .limit(1);
          
        if (incoming && incoming.content) {
          unhandledIncoming.push(incoming);
        }
      }

      if (unhandledIncoming.length > 0) {
        // Suggest creating a keyword based on the latest genuine unhandled customer question
        const sampleMsg = unhandledIncoming[0];
        
        // Clean and prepare trigger suggestion (take first two words, lowercase, no special characters)
        const suggestedTrigger = sampleMsg.content.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase().replace(/[^\w\s]/g, '');
        
        fallbackInsights.push({
          id: `suggest-keyword-${sampleMsg.id}`,
          userId,
          type: 'SUGGEST_KEYWORD',
          title: 'Automate a new keyword response',
          description: `Customers are asking questions like: "${sampleMsg.content}". Create an instant keyword reply to answer them faster next time!`,
          metadata: {
            suggestedTrigger: suggestedTrigger || 'hours',
            suggestedResponse: "Thanks for asking! Our opening hours are 8am - 5pm. How else can we help you?"
          },
          createdAt: new Date().toISOString()
        });
      }
    }

    // Default Insight if absolutely nothing else can be triggered
    if (fallbackInsights.length === 0) {
      fallbackInsights.push({
        id: 'welcome-insight',
        userId,
        type: 'PLATFORM_TIP',
        title: 'Optimize your AI assistant',
        description: 'Training your AI is simple. Head over to the Services page and list your business offerings so the bot can answer precise client questions!',
        metadata: {},
        createdAt: new Date().toISOString()
      });
    }

    return c.json(fallbackInsights);
  } catch (err: any) {
    console.error("[Insights API Error]:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// PATCH: Dismiss Insight
usersApp.patch('/:id/insights/:insightId/dismiss', async (c) => {
  const { id: userId, insightId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  try {
    // If it's a dynamic insight, we can't save the dismissal unless we write to DB,
    // so we insert it as dismissed or simply return success (for non-database elements)
    if (insightId.startsWith('upsell-dynamic') || insightId.startsWith('suggest-keyword') || insightId.startsWith('welcome')) {
      return c.json({ success: true });
    }

    await db.update(insights)
      .set({ isDismissed: 1 })
      .where(and(eq(insights.id, insightId), eq(insights.userId, userId)));

    return c.json({ success: true });
  } catch (err: any) {
    console.error("[Insights Dismiss Error]:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

usersApp.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (!user) {
      // Dynamic skeleton auto-creation: guarantees user exists in DB instantly on first load
      const skeletonUser = {
        id,
        email: 'user@example.com',
        businessName: null,
        availability: null,
        createdAt: new Date().toISOString()
      };
      
      await db.insert(users).values(skeletonUser);
      console.log(`[Users API] Auto-created skeleton record for new user: ${id}`);
      return c.json(skeletonUser);
    }
    
    return c.json(user);
  } catch (err: any) {
    console.error("[Users API Error]:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

usersApp.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json() as { businessName?: string, availability?: string, email?: string };
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  await db.insert(users)
    .values({
      id,
      email: body.email || 'user@example.com',
      businessName: body.businessName,
      availability: body.availability,
      createdAt: new Date().toISOString()
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { 
        businessName: body.businessName,
        availability: body.availability
      }
    });
    
  return c.json({ success: true });
});

export default usersApp;
