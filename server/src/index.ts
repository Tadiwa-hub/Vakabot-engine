import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db';
import { EvolutionClient } from './lib/evolution';
import { EmailClient } from './lib/email';
import { PaynowClient } from './lib/paynow';
import { users, instances, autoReplies, services, chatHistory, plans, subscriptions, payments, groqUsage, instanceUsage, chatMeta, messageQueue, activityLogs, contacts, scheduledMessages } from './db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  GROQ_API_KEY: string;
  OPENROUTER_API_KEY: string;
  PAYNOW_INTEGRATION_ID: string;
  PAYNOW_INTEGRATION_KEY: string;
  RESEND_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.onError((err, c) => {
  console.error(`[Hono Error] ${err.message}`, err);
  return c.json({ error: "Internal Server Error", details: err.message }, 500);
});

app.get('/api/debug', async (c) => {
  return c.json({
    hasTursoUrl: !!c.env.TURSO_DATABASE_URL,
    hasTursoToken: !!c.env.TURSO_AUTH_TOKEN,
    hasEvolutionUrl: !!c.env.EVOLUTION_API_URL,
    hasEvolutionKey: !!c.env.EVOLUTION_API_KEY,
    time: new Date().toISOString()
  });
});

// Helper to get tools
const getTools = (env: Bindings) => {
  const db = getDb(env);
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  const paynow = new PaynowClient(env.PAYNOW_INTEGRATION_ID, env.PAYNOW_INTEGRATION_KEY);
  const email = new EmailClient(env.RESEND_API_KEY);
  
  const logActivity = async (userId: string | null, event: string, details?: string, level: 'info' | 'warn' | 'error' = 'info', instanceId?: string) => {
    try {
      await db.insert(activityLogs).values({
        id: crypto.randomUUID(),
        userId,
        instanceId,
        event,
        details,
        level,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("[Logger] Failed to save activity log:", e);
    }
  };

  return { db, evolution, paynow, email, logActivity };
};

// --- ANTI-BAN & RATE LIMIT HELPERS ---

async function checkInstanceRateLimit(db: any, instanceId: string) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getHours().toString();
  
  const [usage] = await db.select().from(instanceUsage)
    .where(and(eq(instanceUsage.instanceId, instanceId), eq(instanceUsage.date, date), eq(instanceUsage.hour, hour)));
    
  if (usage && usage.messageCount >= 40) return false;
  
  if (!usage) {
    await db.insert(instanceUsage).values({ id: crypto.randomUUID(), instanceId, date, hour, messageCount: 1 });
  } else {
    await db.update(instanceUsage).set({ messageCount: usage.messageCount + 1 }).where(eq(instanceUsage.id, usage.id));
  }
  return true;
}

async function callAI(env: Bindings, messages: any[]) {
  // 1. Try Groq (Fastest)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 250,
        temperature: 0.7
      })
    });
    if (res.ok) {
      const data: any = await res.json();
      return data.choices[0].message.content;
    }
    console.warn(`[AI] Groq failed with status ${res.status}`);
  } catch (e) {
    console.error("[AI] Groq error:", e);
  }

  // 2. Try OpenRouter Fallback (Reliable)
  if (env.OPENROUTER_API_KEY) {
    try {
      console.log("[AI] Switching to OpenRouter fallback...");
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vakabot.pages.dev',
          'X-Title': 'VakaBot'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages,
          max_tokens: 250,
          temperature: 0.7
        })
      });
      if (res.ok) {
        const data: any = await res.json();
        return data.choices[0].message.content;
      }
      console.warn(`[AI] OpenRouter failed with status ${res.status}`);
    } catch (e) {
      console.error("[AI] OpenRouter error:", e);
    }
  }

  return null;
}

async function canCallGroq(db: any, userId: string) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const minute = now.toISOString().substring(0, 16); // YYYY-MM-DD HH:mm
  
  // 1. Global Minute Limit (Groq Free Tier: 30 RPM)
  const [globalMinute] = await db.select().from(groqUsage)
    .where(and(eq(groqUsage.minuteTimestamp, minute), sql`user_id IS NULL`));
  
  if (globalMinute && globalMinute.requestsCount >= 28) return false;
  
  // 2. Global Day Limit (Groq Free Tier: 14400 RPD)
  const [globalDay] = await db.select().from(groqUsage)
    .where(and(eq(groqUsage.date, date), sql`user_id IS NULL`));
    
  if (globalDay && globalDay.requestsCount >= 14000) return false;

  // Update usage (Global)
  if (!globalMinute) await db.insert(groqUsage).values({ id: crypto.randomUUID(), date, minuteTimestamp: minute, requestsCount: 1 });
  else await db.update(groqUsage).set({ requestsCount: globalMinute.requestsCount + 1 }).where(eq(groqUsage.id, globalMinute.id));
  
  return true;
}

async function sendSmartMessage(evolution: EvolutionClient, instanceName: string, remoteJid: string, text: string, userId?: string, db?: any) {
  try {
    // 1. Calculate human-like delay with Jitter
    // 120ms per char base + +/- 20% randomness
    const baseDelay = Math.min(text.length * 120, 8000);
    const jitter = (Math.random() * 0.4 - 0.2) * baseDelay; // -20% to +20%
    const finalDelay = Math.max(1500, Math.round(baseDelay + jitter)); // Minimum 1.5s
    
    console.log(`[SmartMessage] Human flow: typing ${finalDelay}ms for ${remoteJid}`);
    
    // 2. Mark as read and Send message with built-in delay
    // The engine handles "composing" status automatically during the delay period
    await evolution.markRead(instanceName, remoteJid).catch(() => {});
    return await evolution.sendMessage(instanceName, remoteJid, text, finalDelay);
  } catch (e: any) {
    console.error("[SmartMessage] Error in human flow:", e);
    
    // FIX #14: Queue failed message for retry instead of immediate failure
    if (userId && db) {
      try {
        await db.insert(messageQueue).values({
          id: crypto.randomUUID(),
          userId,
          instanceName,
          remoteJid,
          message: text,
          status: 'pending',
          retryCount: 0,
          maxRetries: 5,
          error: e.message,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`[SmartMessage] Queued message for retry: ${remoteJid}`);
        return { queued: true, id: crypto.randomUUID() };
      } catch (queueError) {
        console.error("[SmartMessage] Failed to queue message:", queueError);
      }
    }
    
    // Fallback: try one more time without delay
    try {
      return await evolution.sendMessage(instanceName, remoteJid, text, 0);
    } catch (e2) {
      console.error("[SmartMessage] Final fallback failed:", e2);
      throw e2;
    }
  }
}

async function checkBusinessAccess(db: any, userId: string) {
  const [userProfile] = await db.select().from(users).where(eq(users.id, userId));
  const aiUsage = userProfile?.aiUsageCount || 0;

  // 1. Get User Subscription
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  
  if (!sub) {
    const [freePlan] = await db.select().from(plans).where(eq(plans.id, 'free'));
    const allowed = aiUsage < (freePlan?.aiResponsesLimit || 20);
    return { allowed, plan: freePlan, sub: null, usage: aiUsage };
  }

  // 2. Check Expiry
  if (sub.status !== 'ACTIVE') return { allowed: false, reason: 'inactive' };
  
  const expiryDate = new Date(sub.expiresAt);
  if (new Date() > expiryDate) {
    await db.update(subscriptions).set({ status: 'EXPIRED' }).where(eq(subscriptions.id, sub.id));
    // Fallback check: if expired, do they still have free tier messages left?
    const [freePlan] = await db.select().from(plans).where(eq(plans.id, 'free'));
    const allowed = aiUsage < (freePlan?.aiResponsesLimit || 20);
    return { allowed, plan: freePlan, sub: null, usage: aiUsage, reason: 'expired' };
  }

  // 3. Check Usage Limit
  const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId));
  const allowed = aiUsage < (plan?.aiResponsesLimit || 0);
  return { allowed, plan, sub, usage: aiUsage };
}



// API: Get Instance
app.get('/api/instance/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution, logActivity } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  const [userProfile] = await db.select().from(users).where(eq(users.id, userId));
  
  // Fetch Subscription & Plan
  const access = await checkBusinessAccess(db, userId);
  
  if (instance && instance.status !== "CONNECTED") {
    try {
      const engineData = await evolution.getConnectData(instance.instanceName);
      const engineStatus = engineData.instance?.state || engineData.instance?.status;
      
      let newStatus = "DISCONNECTED";
      let newQr = instance.qrcode;

      if (engineStatus === "open") newStatus = "CONNECTED";
      else if (engineStatus === "connecting") newStatus = "CONNECTING";
      else {
        // v2 response structure is nested
        const qrFromEngine = engineData.instance?.qrcode?.base64 || 
                             engineData.qrcode?.base64 || 
                             engineData.base64;
                             
        if (qrFromEngine) newQr = qrFromEngine;
      }

      if (newStatus !== instance.status || newQr !== instance.qrcode) {
        await db.update(instances).set({ status: newStatus, qrcode: newQr, updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));
        instance.status = newStatus;
        instance.qrcode = newQr;
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
  }

  return c.json({ 
    instance: instance || null, 
    user: userProfile || null,
    plan: access.plan,
    subscription: access.sub
  });
});

// API: Get Pairing Code
app.get('/api/instance/:userId/pairing-code', async (c) => {
  const userId = c.req.param('userId');
  const { db, evolution, logActivity } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  // Return the cached pairing code (captured at creation time)
  if (instance.pairingCode) {
    return c.json({ code: instance.pairingCode });
  }

  // Fallback: try to fetch live (works only on first connect call for fresh instances)
  try {
    const data = await evolution.getPairingCode(instance.instanceName, instance.phoneNumber);
    console.log('[Pairing] Live response:', JSON.stringify(data));
    const code = data.pairingCode || null;
    
    if (code) {
      // Cache it for next time
      await db.update(instances)
        .set({ pairingCode: code })
        .where(eq(instances.id, instance.id));
      return c.json({ code });
    }

    return c.json({ error: "No pairing code available. Please delete and re-create your bot." }, 400);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// API: Create Instance
app.post('/api/instance', async (c) => {
  const { userId, phoneNumber, email } = await c.req.json();
  const { db, evolution, logActivity } = getTools(c.env);
  
  console.log(`[Backend] Creating instance for user: ${userId}, phone: ${phoneNumber}`);

  try {
    // 1. Ensure User exists in our DB (Upsert)
    // If email wasn't provided, we use a placeholder or handle it
    await db.insert(users)
      .values({ id: userId, email: email || 'user@example.com' })
      .onConflictDoNothing();

    // 2. Create Evolution Instance
    const instanceName = `vaka__${Math.random().toString(36).substring(7).toUpperCase()}`;
    const engineResponse = await evolution.createInstance(instanceName);
    
    // v2 response structure is nested: engineResponse.instance.qrcode.base64
    const initialQr = engineResponse.instance?.qrcode?.base64 || 
                      engineResponse.qrcode?.base64 || 
                      engineResponse.base64 || 
                      null;

    // CRITICAL: Fetch the 8-digit pairing code NOW because the engine
    // only generates it on the FIRST connect call. After that it switches to QR mode.
    let cachedPairingCode = null;
    try {
      console.log('[Backend] Waiting 10s for engine to stabilize before fetching pairing code...');
      await sleep(10000);
      const pairingData = await evolution.getPairingCode(instanceName, phoneNumber);
      console.log('[Backend] Pairing response:', JSON.stringify(pairingData));
      cachedPairingCode = pairingData.pairingCode || null;
      console.log('[Backend] Cached pairing code:', cachedPairingCode);
    } catch (e) {
      console.error('[Backend] Failed to pre-fetch pairing code:', e);
    }

    const newInstance = {
      id: crypto.randomUUID(),
      userId,
      instanceName,
      phoneNumber,
      qrcode: initialQr,
      pairingCode: cachedPairingCode,
      status: "DISCONNECTED",
      isActive: true
    };

    // 3. Save to DB
    await db.insert(instances).values(newInstance);
    await logActivity(userId, 'INSTANCE_CREATED', `Phone: ${phoneNumber}`, 'info', newInstance.id);

    // 4. Automatically set the webhook
    const backendUrl = new URL(c.req.url).origin;
    try {
      await evolution.setWebhook(instanceName, `${backendUrl}/webhook/evolution`);
    } catch (e) {
      console.error("Failed to set initial webhook:", e);
    }

    // 5. Migrate rules
    await db.update(autoReplies)
      .set({ instanceId: newInstance.id })
      .where(eq(autoReplies.userId, userId));

    return c.json(newInstance);
  } catch (error: any) {
    console.error("[Backend Error] Instance Creation Failed:", error);
    return c.json({ error: "Creation failed", details: error.message }, 500);
  }
});

// API: Refresh Instance (Deep Clean & Recreate)
app.post('/api/instance/:userId/refresh', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution, logActivity } = getTools(c.env);
  
  try {
    console.log(`[Backend] Refreshing instance for user: ${userId}`);
    
    // 1. Find existing instance
    const [existing] = await db.select().from(instances).where(eq(instances.userId, userId));
    
    if (existing) {
      console.log(`[Backend] Deleting existing instance: ${existing.instanceName}`);
      try {
        await evolution.deleteInstance(existing.instanceName);
      } catch (e) {
        console.warn("[Backend] Failed to delete from engine (might already be gone):", e);
      }
      
      // Delete child records first to satisfy FK constraints
      await db.delete(instanceUsage).where(eq(instanceUsage.instanceId, existing.id));
      await db.delete(instances).where(eq(instances.id, existing.id));
    }

    // 2. We don't have the phone number in the URL, so we should probably expect it in the body 
    // or fetch it from the previous instance record if we hadn't deleted it yet.
    // For safety, let's expect it in the body.
    const { phoneNumber } = await c.req.json();
    if (!phoneNumber) return c.json({ error: "Phone number required for refresh" }, 400);

    // 3. Create Evolution Instance
    const instanceName = `vaka__${Math.random().toString(36).substring(7).toUpperCase()}`;
    const engineResponse = await evolution.createInstance(instanceName);
    
    // 4. Capture pairing code immediately
    let cachedPairingCode = null;
    try {
      console.log('[Backend] Waiting 10s for engine stabilization...');
      await sleep(10000);
      const pairingData = await evolution.getPairingCode(instanceName, phoneNumber);
      cachedPairingCode = pairingData.pairingCode || null;
      console.log('[Backend] New cached pairing code:', cachedPairingCode);
    } catch (e) {
      console.error('[Backend] Failed to pre-fetch pairing code during refresh:', e);
    }

    const newInstance = {
      id: crypto.randomUUID(),
      userId,
      instanceName,
      phoneNumber,
      pairingCode: cachedPairingCode,
      status: "DISCONNECTED",
      isActive: true
    };

    // 5. Save to DB
    await db.insert(instances).values(newInstance);
    await logActivity(userId, 'INSTANCE_REFRESHED', `Phone: ${phoneNumber}`, 'info', newInstance.id);

    // 6. Set Webhook
    const backendUrl = new URL(c.req.url).origin;
    await evolution.setWebhook(instanceName, `${backendUrl}/webhook/evolution`);

    return c.json(newInstance);
  } catch (error: any) {
    console.error("[Backend Error] Refresh Failed:", error);
    return c.json({ error: "Refresh failed", details: error.message }, 500);
  }
});

// API: Configure Webhook
app.post('/api/webhook/config', async (c) => {
  const { userId, webhookUrl } = await c.req.json();
  const { db, evolution, logActivity } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  // 1. Validate Webhook URL
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const res = await fetch(webhookUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok && res.status !== 405) { // 405 Method Not Allowed is fine for HEAD
         // Try GET as fallback
         const res2 = await fetch(webhookUrl, { method: 'GET', signal: controller.signal });
         if (!res2.ok) throw new Error(`URL returned status ${res2.status}`);
      }
    } catch (e: any) {
      return c.json({ error: "Invalid Webhook URL. Ensure it is publicly reachable.", details: e.message }, 400);
    }
  }

  await evolution.setWebhook(instance.instanceName, webhookUrl);
  await db.update(instances).set({ webhookUrl, updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));
  await logActivity(userId, 'WEBHOOK_CONFIGURED', `URL: ${webhookUrl}`, 'info', instance.id);

  return c.json({ success: true, webhookUrl });
});


// API: Disconnect & Wipe Instance (Fresh Start)
app.post('/api/instance/:userId/disconnect', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution, logActivity } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  console.log(`[Disconnect] nuclear wipe for user ${userId}, instance ${instance.instanceName}`);

  try { 
    await evolution.logoutInstance(instance.instanceName); 
    await evolution.deleteInstance(instance.instanceName); 
  } catch(e) {
    console.warn("[Disconnect] Engine cleanup failed (likely already gone):", e);
  }

  // 1. Delete usage records
  await db.delete(instanceUsage).where(eq(instanceUsage.instanceId, instance.id));
  // 2. Delete the instance itself
  await db.delete(instances).where(eq(instances.id, instance.id));
  await logActivity(userId, 'INSTANCE_DISCONNECTED', `Instance: ${instance.instanceName}`, 'warn', instance.id);

  // Try to notify the user
  const [userProfile] = await db.select().from(users).where(eq(users.id, userId));
  if (userProfile?.email) {
    const { email } = getTools(c.env);
    await email.sendDisconnectAlert(userProfile.email, userProfile.businessName || "Your Bot");
  }

  return c.json({ success: true, message: "Instance wiped successfully" });
});

// API: Toggle Bot Status
app.post('/api/instance/:userId/toggle', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  const newStatus = !instance.isActive;
  await db.update(instances).set({ isActive: newStatus, updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));

  return c.json({ success: true, isActive: newStatus });
});

// API: Toggle Group Chat Support
app.post('/api/instance/:userId/toggle-group', async (c) => {
  const { userId } = c.req.param();
  const { db, logActivity } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  const newStatus = !instance.isGroupEnabled;
  await db.update(instances).set({ isGroupEnabled: newStatus, updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));
  await logActivity(userId, 'TOGGLE_GROUP_CHAT', `Enabled: ${newStatus}`, 'info', instance.id);

  return c.json({ success: true, isGroupEnabled: newStatus });
});

// API: Fetch Analytics
app.get('/api/analytics/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  
  const [userProfile] = await db.select().from(users).where(eq(users.id, userId));
  const [msgCount] = await db.select({ count: sql`count(*)` }).from(chatHistory).where(eq(chatHistory.userId, userId));
  const recentLogs = await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(10);
  
  // Weekly Usage (Last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const dailyUsage = await db.select({
    date: instanceUsage.date,
    count: sql`sum(message_count)`
  })
  .from(instanceUsage)
  .where(and(
    sql`instance_id IN (SELECT id FROM instances WHERE user_id = ${userId})`,
    sql`date >= ${weekAgo.split('T')[0]}`
  ))
  .groupBy(instanceUsage.date);

  // Top Contacts (By message count)
  const topContacts = await db.select({
    jid: chatHistory.customerJid,
    count: sql`count(*)`
  })
  .from(chatHistory)
  .where(and(eq(chatHistory.userId, userId), eq(chatHistory.role, 'user')))
  .groupBy(chatHistory.customerJid)
  .orderBy(desc(sql`count(*)`))
  .limit(5);

  // Fetch Plan Limits
  const access = await checkBusinessAccess(db, userId);

  return c.json({
    totalMessages: msgCount.count,
    aiUsage: userProfile?.aiUsageCount || 0,
    recentLogs,
    dailyUsage,
    topContacts,
    quota: {
      used: userProfile?.aiUsageCount || 0,
      limit: access.plan?.aiResponsesLimit || 0,
      plan: access.plan?.name || 'Free'
    }
  });
});

// API: Fetch Activity Logs
app.get('/api/logs/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  const logs = await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(50);
  return c.json({ success: true, logs });
});

// --- CONTACTS API ---

// API: Fetch Contacts
app.get('/api/contacts/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  const data = await db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.lastInteractionAt));
  return c.json({ success: true, contacts: data });
});

// API: Add/Update Contact
app.post('/api/contacts', async (c) => {
  const { userId, jid, name, phoneNumber } = await c.req.json();
  const { db, logActivity } = getTools(c.env);
  
  const [existing] = await db.select().from(contacts).where(and(eq(contacts.userId, userId), eq(contacts.jid, jid)));
  
  if (existing) {
    await db.update(contacts)
      .set({ name, phoneNumber, lastInteractionAt: new Date().toISOString() })
      .where(eq(contacts.id, existing.id));
    return c.json({ success: true, contact: { ...existing, name, phoneNumber } });
  }

  const newContact = {
    id: crypto.randomUUID(),
    userId,
    jid,
    name,
    phoneNumber,
    lastInteractionAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await db.insert(contacts).values(newContact);
  await logActivity(userId, 'CONTACT_CREATED', `Name: ${name}, JID: ${jid}`, 'info');
  return c.json({ success: true, contact: newContact });
});

// API: Update Contact
app.put('/api/contacts/:id', async (c) => {
  const { id } = c.req.param();
  const { name, phoneNumber } = await c.req.json();
  const { db } = getTools(c.env);
  
  await db.update(contacts).set({ name, phoneNumber }).where(eq(contacts.id, id));
  return c.json({ success: true });
});

// API: Delete Contact
app.delete('/api/contacts/:id', async (c) => {
  const { id } = c.req.param();
  const { db } = getTools(c.env);
  await db.delete(contacts).where(eq(contacts.id, id));
  return c.json({ success: true });
});

// API: Search Contacts
app.get('/api/contacts/:userId/search', async (c) => {
  const { userId } = c.req.param();
  const query = c.req.query('q') || '';
  const { db } = getTools(c.env);
  
  const data = await db.select().from(contacts).where(
    and(
      eq(contacts.userId, userId),
      sql`(${contacts.name} LIKE ${'%' + query + '%'} OR ${contacts.phoneNumber} LIKE ${'%' + query + '%'})`
    )
  );
  return c.json({ success: true, contacts: data });
});

// --- SCHEDULED MESSAGES API ---

// API: Fetch Scheduled Messages
app.get('/api/scheduled-messages/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  const data = await db.select().from(scheduledMessages).where(eq(scheduledMessages.userId, userId)).orderBy(desc(scheduledMessages.scheduledAt));
  return c.json({ success: true, scheduledMessages: data });
});

// API: Add Scheduled Message
app.post('/api/scheduled-messages', async (c) => {
  const { userId, instanceId, remoteJid, message, scheduledAt } = await c.req.json();
  const { db, logActivity } = getTools(c.env);
  
  const newScheduled = {
    id: crypto.randomUUID(),
    userId,
    instanceId,
    remoteJid,
    message,
    scheduledAt, // Expected ISO format
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await db.insert(scheduledMessages).values(newScheduled);
  await logActivity(userId, 'MESSAGE_SCHEDULED', `To: ${remoteJid}, At: ${scheduledAt}`, 'info', instanceId);
  return c.json({ success: true, scheduledMessage: newScheduled });
});

// API: Delete Scheduled Message
app.delete('/api/scheduled-messages/:id', async (c) => {
  const { id } = c.req.param();
  const { db, logActivity } = getTools(c.env);
  
  const [msg] = await db.select().from(scheduledMessages).where(eq(scheduledMessages.id, id));
  if (msg) {
    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
    await logActivity(msg.userId, 'SCHEDULED_MSG_CANCELLED', `To: ${msg.remoteJid}`, 'warn', msg.instanceId);
  }
  return c.json({ success: true });
});


// API: Fetch Auto-Replies
app.get('/api/auto-replies/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  const rules = await db.select().from(autoReplies).where(eq(autoReplies.userId, userId));
  return c.json({ success: true, rules });
});

// API: Add Auto-Reply
app.post('/api/auto-replies', async (c) => {
  const { userId, keyword, replyText } = await c.req.json();
  const { db } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  const newRule = {
    id: crypto.randomUUID(),
    userId,
    instanceId: instance.id,
    keyword: keyword.toLowerCase(),
    replyText,
    isActive: true
  };

  await db.insert(autoReplies).values(newRule);
  return c.json({ success: true, rule: newRule });
});

// API: Delete Auto-Reply
app.delete('/api/auto-replies/:id', async (c) => {
  const { id } = c.req.param();
  const { db } = getTools(c.env);
  await db.delete(autoReplies).where(eq(autoReplies.id, id));
  return c.json({ success: true });
});

// API: Fetch Services
app.get('/api/services/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db } = getTools(c.env);
  const data = await db.select().from(services).where(eq(services.userId, userId));
  return c.json({ success: true, services: data });
});

// API: Add Service
app.post('/api/services', async (c) => {
  const { userId, name, description, price } = await c.req.json();
  const { db } = getTools(c.env);
  
  const newService = {
    id: crypto.randomUUID(),
    userId,
    name,
    description,
    price,
    isActive: true
  };

  await db.insert(services).values(newService);
  return c.json({ success: true, service: newService });
});

// API: Delete Service
app.delete('/api/services/:id', async (c) => {
  const { id } = c.req.param();
  const { db } = getTools(c.env);
  await db.delete(services).where(eq(services.id, id));
  return c.json({ success: true });
});

// API: Update User Profile
app.post('/api/user/profile', async (c) => {
  const { userId, businessName, businessType, location, hours, ownerName, aiInstructions } = await c.req.json();
  const { db } = getTools(c.env);
  
  await db.update(users)
    .set({ 
      businessName, 
      businessType, 
      location, 
      hours, 
      ownerName, 
      aiInstructions,
      updatedAt: new Date().toISOString() 
    } as any)
    .where(eq(users.id, userId));

  return c.json({ success: true });
});

// --- PAYMENT API ---

// API: Initiate Payment
app.post('/api/payment/initiate', async (c) => {
  const { userId, planId, amount, phone, method } = await c.req.json();
  const { db, paynow, logActivity } = getTools(c.env);
  
  const paymentId = crypto.randomUUID();
  const reference = `VAKA-${Date.now()}`;
  
  // 1. Create pending payment record
  await db.insert(payments).values({
    id: paymentId,
    userId,
    planId,
    amount: Math.round(amount), // Ensure integer
    reference,
    method,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  });
  await logActivity(userId, 'PAYMENT_INITIATED', `Plan: ${planId}, Amount: ${amount}`, 'info');

  try {
    // 2. Initiate with Paynow
    const response = await paynow.initiateMobile({
      reference,
      amount,
      email: 'billing@vakabot.pages.dev',
      phone,
      method,
      returnUrl: 'https://vakabot.pages.dev/dashboard',
      resultUrl: 'https://vakabot-backend.zimbabwe.workers.dev/api/payment/webhook'
    });

    if (response.status === 'Error') {
      return c.json({ success: false, error: response.error }, 400);
    }

    // 3. Update payment with pollUrl
    await db.update(payments)
      .set({ pollUrl: response.pollurl } as any)
      .where(eq(payments.id, paymentId));

    return c.json({ 
      success: true, 
      paymentId, 
      pollUrl: response.pollurl,
      instructions: response.instructions 
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// API: Payment Webhook (from Paynow)
app.post('/api/payment/webhook', async (c) => {
  const data = await c.req.formData();
  const reference = data.get('reference');
  const status = data.get('status');
  const { db, logActivity } = getTools(c.env);

  console.log(`[Payment Webhook] Ref: ${reference}, Status: ${status}`);

  if (status === 'Paid') {
    const [payment] = await db.select().from(payments).where(eq(payments.reference, reference as string));
    if (payment && payment.status !== 'PAID') {
      // 1. Mark payment as PAID
      await db.update(payments).set({ status: 'PAID' }).where(eq(payments.id, payment.id));
      await logActivity(payment.userId, 'PAYMENT_SUCCESS', `Ref: ${reference}`, 'info');
      
      // 2. Activate/Update Subscription (Handle Renewal or New)
      const [plan] = await db.select().from(plans).where(eq(plans.id, payment.planId as any));
      if (plan) {
        const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, payment.userId));
        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (existingSub) {
          await db.update(subscriptions)
            .set({ 
              planId: plan.id, 
              status: 'ACTIVE', 
              expiresAt: expiry,
              paynowReference: reference as string 
            })
            .where(eq(subscriptions.userId, payment.userId));
        } else {
          await db.insert(subscriptions).values({
            id: crypto.randomUUID(),
            userId: payment.userId,
            planId: plan.id,
            status: 'ACTIVE',
            startedAt: new Date().toISOString(),
            expiresAt: expiry,
            paynowReference: reference as string
          });
        }
        // Reset AI Usage Count on new/renewed subscription
        await db.update(users).set({ aiUsageCount: 0 }).where(eq(users.id, payment.userId));
      }

      // FIX #1: Wait for DB sync before responding to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return c.text('OK');
});

// API: Check Payment Status (Polling)
app.get('/api/payment/check/:paymentId', async (c) => {
  const { paymentId } = c.req.param();
  const { db, paynow, logActivity } = getTools(c.env);

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment) return c.json({ error: 'Not found' }, 404);
  if (payment.status === 'PAID') return c.json({ status: 'PAID' });

  if (payment.pollUrl) {
    const response = await paynow.pollTransaction(payment.pollUrl);
    if (response.status === 'Paid') {
      // Update DB and return
      await db.update(payments).set({ status: 'PAID' }).where(eq(payments.id, paymentId));
      
      // Update subscription (Handle Renewal or New)
      const [plan] = await db.select().from(plans).where(eq(plans.id, payment.planId as any));
      if (!plan) return c.json({ error: 'Plan not found' }, 404);

      const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, payment.userId));
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (existingSub) {
        await db.update(subscriptions)
          .set({ 
            planId: plan.id, 
            status: 'ACTIVE', 
            expiresAt: expiry,
            paynowReference: payment.reference 
          })
          .where(eq(subscriptions.userId, payment.userId));
      } else {
        await db.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId: payment.userId,
          planId: plan.id,
          status: 'ACTIVE',
          startedAt: new Date().toISOString(),
          expiresAt: expiry,
          paynowReference: payment.reference
        });
      }

      // Also Reset AI Usage Count on new subscription?
      // User says: "free plan will just be for that moment until the messages expire"
      // Usually, when you upgrade, you get a fresh limit.
      await db.update(users).set({ aiUsageCount: 0 }).where(eq(users.id, payment.userId));
      return c.json({ status: 'PAID' });
    }
    return c.json({ status: response.status });
  }

  return c.json({ status: payment.status });
});

app.get('/ping', (c) => {
  console.log("PING LOG TEST - Bot is awake!");
  return c.text("PONG");
});

// WEBHOOK: Evolution API Receiver
app.post('/webhook/evolution', async (c) => {
  try {
    const body = await c.req.json();
    const { event, instance: instanceName, data } = body;
    const { db, evolution, logActivity } = getTools(c.env);

    const isPresenceEvent = event === 'presence.update' || event === 'PRESENCE_UPDATE' || event === 'presence-update';
    const isMessageEvent = event === 'messages.upsert' || event === 'MESSAGES_UPSERT' || event === 'messages-upsert';
    const isConnectionEvent = event === 'connection.update' || event === 'CONNECTION_UPDATE' || event === 'connection-update';

    // HANDLE DISCONNECTS (Auto-Cleanup)
    if (isConnectionEvent) {
      const state = data?.state || data?.status;
      console.log(`[Webhook] Connection update for ${instanceName}: ${state}`);
      
      if (state === 'logout' || state === 'close' || state === 'refused') {
        console.log(`[Webhook] User disconnected externally. Wiping instance ${instanceName}...`);
        const [instance] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
        if (instance) {
          try { await evolution.deleteInstance(instanceName); } catch(e) {}
          await db.delete(instanceUsage).where(eq(instanceUsage.instanceId, instance.id));
          await db.delete(instances).where(eq(instances.id, instance.id));
          console.log(`[Webhook] Instance ${instanceName} fully wiped from DB.`);

          // SEND EMAIL ALERT
          const [userProfile] = await db.select().from(users).where(eq(users.id, instance.userId));
          if (userProfile?.email) {
             const { email } = getTools(c.env);
             await email.sendDisconnectAlert(userProfile.email, userProfile.businessName || "Your Bot");
          }
        }
      }
      return c.text('OK');
    }

    // HANDLE HUMAN TYING (Auto-Pause extension)
    if (isPresenceEvent) {
      const remoteJid = data?.id;
      // In Evolution v2, presences is a map. If our own number is typing, it's a takeover.
      const presences = data?.presences || {};
      const [instance] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
      
      if (instance && remoteJid) {
        const botNumberOnly = instance.phoneNumber.replace(/\D/g, '');
        const botJid = `${botNumberOnly}@s.whatsapp.net`;
        
        // If the owner (botJid) is the one with the 'composing' state
        if (presences[botJid]?.lastKnownPresence === 'composing') {
          console.log(`[Webhook] Owner is typing to ${remoteJid}. Extending takeover pause.`);
          const pausedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const [existing] = await db.select().from(chatMeta).where(and(eq(chatMeta.userId, instance.userId), eq(chatMeta.customerJid, remoteJid)));
          
          if (existing) {
            await db.update(chatMeta)
              .set({ pausedUntil, lastHumanInteractionAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .where(eq(chatMeta.id, existing.id));
          } else {
            await db.insert(chatMeta).values({
              id: crypto.randomUUID(),
              userId: instance.userId,
              customerJid: remoteJid,
              pausedUntil,
              lastHumanInteractionAt: new Date().toISOString()
            });
          }
        }
      }
      return c.text('OK');
    }

    if (!isMessageEvent) {
      console.log(`[Webhook] Ignoring non-message event: ${event}`);
      return c.text('OK');
    }

    // Extract message content
    const messageType = data?.message?.imageMessage ? 'image' : 
                        data?.message?.videoMessage ? 'video' :
                        data?.message?.documentMessage ? 'document' :
                        data?.message?.audioMessage ? 'audio' : 'text';

    const rawText = data?.message?.conversation || 
                    data?.message?.extendedTextMessage?.text || 
                    data?.message?.imageMessage?.caption || 
                    data?.message?.videoMessage?.caption ||
                    "";
    
    // MEDIA FALLBACK: If it's media without a caption, provide context
    let message = rawText;
    if (!rawText && messageType !== 'text') {
        message = `[User sent a ${messageType}]`;
    }
                    
    const [instance] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
    if (!instance) {
      console.log(`[Webhook] Instance ${instanceName} not found in DB`);
      return c.text('OK');
    }

    if (!instance.isActive) {
      console.log(`[Webhook] Bot is PAUSED for ${instanceName}`);
      return c.text('OK');
    }

    // Deep JID Extraction: Find the real phone number JID
    let remoteJid = data.key?.remoteJid;
    
    // IGNORE GROUPS unless enabled
    if (remoteJid && remoteJid.endsWith('@g.us')) {
        if (!instance.isGroupEnabled) {
          console.log(`[Webhook] Ignoring group chat (disabled): ${remoteJid}`);
          return c.text('OK');
        }
        console.log(`[Webhook] Processing group chat (enabled): ${remoteJid}`);
    }
    // Normalize botJid by stripping EVERYTHING except numbers from the DB phone number
    const botNumberOnly = instance.phoneNumber.replace(/\D/g, '');
    const botJid = `${botNumberOnly}@s.whatsapp.net`;
    const fromMe = data.key?.fromMe;

    console.log(`[Webhook] Raw remoteJid: ${remoteJid}, BotJid: ${botJid}, fromMe: ${fromMe}`);

    // If it's a message from the bot itself (or owner), handle human takeover
    if (fromMe || (remoteJid && remoteJid.split(':')[0] === botJid.split('@')[0])) {
        if (remoteJid) {
          // HUMAN TAKEOVER: If owner sends a message, pause bot for 1 hour for this JID
          const pausedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const [existing] = await db.select().from(chatMeta).where(and(eq(chatMeta.userId, instance.userId), eq(chatMeta.customerJid, remoteJid)));
          
          if (existing) {
            await db.update(chatMeta)
              .set({ pausedUntil, lastHumanInteractionAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .where(eq(chatMeta.id, existing.id));
          } else {
            await db.insert(chatMeta).values({
              id: crypto.randomUUID(),
              userId: instance.userId,
              customerJid: remoteJid,
              pausedUntil,
              lastHumanInteractionAt: new Date().toISOString()
            });
          }
          console.log(`[Webhook] Human takeover detected. Bot paused for ${remoteJid} until ${pausedUntil}`);
        }
        return c.text('OK');
    }

    // If remoteJid is an LID, try to find a better one in body.sender
    if (remoteJid && remoteJid.endsWith('@lid')) {
        if (body.sender && body.sender.endsWith('@s.whatsapp.net') && body.sender !== botJid) {
            remoteJid = body.sender;
            console.log(`[Webhook] Resolved LID from body.sender: ${remoteJid}`);
        } else {
            // Fallback: Resolve via API
            try {
                console.log(`[Webhook] LID detected: ${remoteJid}. Attempting resolution via API...`);
                const profile = await evolution.getContactProfile(instanceName, remoteJid);
                if (profile && profile.jid && profile.jid.endsWith('@s.whatsapp.net') && profile.jid !== botJid) {
                    remoteJid = profile.jid;
                    console.log(`[Webhook] Successfully resolved LID via API to: ${remoteJid}`);
                }
            } catch (e) {
                console.error(`[Webhook] Error resolving LID:`, e);
            }
        }
    }

    console.log(`[Webhook] Final Target JID: ${remoteJid}`);
    
    // UPSERT CONTACT
    if (remoteJid && remoteJid.endsWith('@s.whatsapp.net')) {
        try {
            const phoneNumber = remoteJid.split('@')[0];
            const [existingContact] = await db.select().from(contacts).where(and(eq(contacts.userId, instance.userId), eq(contacts.jid, remoteJid)));
            if (existingContact) {
                await db.update(contacts)
                    .set({ lastInteractionAt: new Date().toISOString() })
                    .where(eq(contacts.id, existingContact.id));
            } else {
                await db.insert(contacts).values({
                    id: crypto.randomUUID(),
                    userId: instance.userId,
                    jid: remoteJid,
                    phoneNumber,
                    lastInteractionAt: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("[Webhook] Failed to upsert contact:", e);
        }
    }

    if (!message || !remoteJid) {
        console.log(`[Webhook] Skipping: message=${!!message}, remoteJid=${remoteJid}`);
        return c.text('OK');
    }

    // 1. Check Subscription Access
    const access = await checkBusinessAccess(db, instance.userId);
    if (!access.allowed) {
      console.log(`[Webhook] Access denied for user ${instance.userId}: ${access.reason}`);
      return c.text('OK');
    }

    // 2. Anti-Ban Rate Limit Check
    const canSend = await checkInstanceRateLimit(db, instance.id);
    if (!canSend) {
      console.log(`[Webhook] Rate limit reached for instance ${instanceName}`);
      return c.text('OK');
    }

    // 2.5. Human Takeover Check
    const [meta] = await db.select().from(chatMeta).where(and(eq(chatMeta.userId, instance.userId), eq(chatMeta.customerJid, remoteJid)));
    if (meta && meta.pausedUntil) {
      const pausedUntilDate = new Date(meta.pausedUntil);
      if (pausedUntilDate > new Date()) {
        console.log(`[Webhook] Bot is PAUSED for ${remoteJid} due to human takeover until ${meta.pausedUntil}`);
        return c.text('OK');
      }
    }

    // 3. Keyword Matching (High Priority)
    const [rulesList] = await Promise.all([
      db.select().from(autoReplies).where(eq(autoReplies.userId, instance.userId))
    ]);

    const match = rulesList.find(r => 
      r.isActive && 
      message.toLowerCase().trim().includes(r.keyword.toLowerCase().trim())
    );

    if (match) {
      console.log(`[Webhook] Keyword match found: ${match.keyword}`);
      await sendSmartMessage(evolution, instanceName, remoteJid, match.replyText, instance.userId, db);
    } else {
      // Dynamic Services Lookup
      const serviceKeywords = ["service", "offer", "catalog", "price", "cost", "pricing", "what do you do"];
      const isAskingForServices = serviceKeywords.some(k => message.toLowerCase().includes(k));

      if (isAskingForServices) {
        const userServices = await db.select().from(services).where(eq(services.userId, instance.userId));
        if (userServices.length > 0) {
          const serviceText = `*Our Services:*\n` + userServices.map(s => `- ${s.name}: ${s.price || 'Contact for price'}`).join('\n');
          await sendSmartMessage(evolution, instanceName, remoteJid, serviceText, instance.userId, db);
        } else {
          // Fallback to AI if no services listed
          await handleAIFallback();
        }
      } else {
        await handleAIFallback();
      }
    }

    async function handleAIFallback() {
      // AI FALLBACK SYSTEM
      console.log(`[Webhook] No match. Falling back to Groq AI...`);

      try {
        // 1. Plan-based AI limit check (handled by access check above, but re-confirming for messaging)
        if (!access.allowed) {
          await sendSmartMessage(evolution, instanceName, remoteJid, "I've reached my AI response limit. Please contact the owner directly!", instance.userId, db);
          return;
        }

        // 2. Groq Rate Limit Check
        const canCall = await canCallGroq(db, instance.userId);
        if (!canCall) {
          // Smart Fallback Response (Static)
          const fallback = "Thanks for your message! I'm currently processing many requests, but I'll get back to you shortly. 😊";
          await sendSmartMessage(evolution, instanceName, remoteJid, fallback, instance.userId, db);
          return;
        }

        const [userProfile] = await db.select().from(users).where(eq(users.id, instance.userId));
        
        // 3. Business Setup Check
        if (!userProfile?.businessName || userProfile.businessName.trim() === "") {
          const setupMsg = "I'm sorry, my owner hasn't set me up yet! Please try again later or contact them directly.";
          await sendSmartMessage(evolution, instanceName, remoteJid, setupMsg, instance.userId, db);
          return;
        }

        const userServices = await db.select().from(services).where(eq(services.userId, instance.userId));

        // Build Context...
        const servicesContext = userServices.map(s => `- ${s.name}: ${s.price} - ${s.description}`).join('\n');
        const systemPrompt = `You are a highly professional WhatsApp assistant for ${userProfile.businessName}.
STRICT GUIDELINES:
1. Stay strictly professional and helpful.
2. ONLY discuss business-related topics (services, hours, location, pricing).
3. NEVER mention the phone number 0788855067 as you are currently messaging from it.
4. If a user asks to speak to the owner or you are unsure, say: "Tadiwanashe will be with you shortly to assist you personally. Please wait a moment!"
5. If a user asks about anything non-business, politely decline and redirect them.
6. If the user sends an image, video, or file (indicated by [User sent a ...]), acknowledge it but explain that you currently only process text messages.

Business Context:
Type: ${userProfile.businessType || 'General'}
Location: ${userProfile.location || 'Not specified'}
Hours: ${userProfile.hours || 'Not specified'}
Owner: ${userProfile.ownerName || 'the manager'}
Instructions: ${userProfile.aiInstructions || 'Be polite.'}

Services Offered:
${servicesContext}

Answer briefly. Use emojis sparingly.`;

        // Get History
        const history = await db.select()
          .from(chatHistory)
          .where(and(eq(chatHistory.userId, instance.userId), eq(chatHistory.customerJid, remoteJid)))
          .orderBy(desc(chatHistory.createdAt))
          .limit(5);
        
        const reversedHistory = [...history].reverse();

        const groqMessages = [
          { role: 'system', content: systemPrompt },
          ...reversedHistory.map(m => ({ role: m.role as any, content: m.content })),
          { role: 'user', content: message }
        ];

        const aiReply = await callAI(c.env, groqMessages);
        
        if (aiReply) {
          // Save History
          await db.insert(chatHistory).values([
            { id: crypto.randomUUID(), userId: instance.userId, customerJid: remoteJid, role: 'user', content: message },
            { id: crypto.randomUUID(), userId: instance.userId, customerJid: remoteJid, role: 'assistant', content: aiReply }
          ]);

          // Update Counts
          await db.update(users).set({ aiUsageCount: (access.usage || 0) + 1 }).where(eq(users.id, instance.userId));
          
          await sendSmartMessage(evolution, instanceName, remoteJid, aiReply, instance.userId, db);
        } else {
          console.error("[AI Error] Both Groq and OpenRouter failed.");
          await logActivity(instance.userId, 'AI_ERROR', 'Both Groq and OpenRouter failed', 'error', instance.id);
          await sendSmartMessage(evolution, instanceName, remoteJid, "I'm having a bit of trouble thinking right now. Please try again in a moment!", instance.userId, db);
        }
      } catch (e: any) {
        console.error("[AI Fallback Error]:", e.message);
      }
    }

    return c.text('OK');
  } catch (err: any) {
    console.error("[Webhook Error]:", err.message);
    const { logActivity } = getTools(c.env);
    await logActivity(null, 'WEBHOOK_CRASH', err.message, 'error');
    return c.text('Internal Server Error', 500);
  }
});

// --- ADMIN API (PROTECTED) ---
const ADMIN_ID = 'user_3DIOS7jr8olpHz10a4aZLIWwhuh';

app.get('/api/admin/stats', async (c) => {
  const userId = c.req.header('x-user-id'); // We'll pass this from frontend
  if (userId !== ADMIN_ID) return c.json({ error: 'Unauthorized' }, 403);

  const { db, logActivity } = getTools(c.env);
  
  const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
  const [instanceCount] = await db.select({ count: sql`count(*)` }).from(instances);
  const [activeInstances] = await db.select({ count: sql`count(*)` }).from(instances).where(eq(instances.status, 'CONNECTED'));
  const [totalAiUsage] = await db.select({ total: sql`sum(ai_usage_count)` }).from(users);

  return c.json({
    totalUsers: userCount.count,
    totalInstances: instanceCount.count,
    activeInstances: activeInstances.count,
    totalAiUsage: totalAiUsage.total || 0
  });
});

app.get('/api/admin/users', async (c) => {
  const userId = c.req.header('x-user-id');
  if (userId !== ADMIN_ID) return c.json({ error: 'Unauthorized' }, 403);

  const { db, logActivity } = getTools(c.env);
  
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    businessName: users.businessName,
    aiUsage: users.aiUsageCount,
    instanceName: instances.instanceName,
    status: instances.status,
    planId: subscriptions.planId
  })
  .from(users)
  .leftJoin(instances, eq(users.id, instances.userId))
  .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
  .orderBy(desc(users.createdAt));

  return c.json({ users: allUsers });
});

// ADMIN ACTION: Reset AI Usage
app.post('/api/admin/users/:targetUserId/reset-usage', async (c) => {
  const userId = c.req.header('x-user-id');
  if (userId !== ADMIN_ID) return c.json({ error: 'Unauthorized' }, 403);
  
  const { targetUserId } = c.req.param();
  const { db, logActivity } = getTools(c.env);
  
  await db.update(users).set({ aiUsageCount: 0 }).where(eq(users.id, targetUserId));
  await logActivity(targetUserId, 'ADMIN_RESET_USAGE', `By admin: ${userId}`, 'info');
  return c.json({ success: true });
});

// ADMIN ACTION: Manually Update Plan
app.post('/api/admin/users/:targetUserId/update-plan', async (c) => {
  const userId = c.req.header('x-user-id');
  if (userId !== ADMIN_ID) return c.json({ error: 'Unauthorized' }, 403);
  
  const { targetUserId } = c.req.param();
  const { planId } = await c.req.json();
  const { db, logActivity } = getTools(c.env);
  
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, targetUserId));
  if (existing) {
    await db.update(subscriptions).set({ planId, status: 'ACTIVE', expiresAt: expiry }).where(eq(subscriptions.userId, targetUserId));
  } else {
    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      userId: targetUserId,
      planId,
      status: 'ACTIVE',
      expiresAt: expiry,
      startedAt: new Date().toISOString()
    });
  }
  
  await logActivity(targetUserId, 'ADMIN_PLAN_UPDATE', `Plan: ${planId} by admin: ${userId}`, 'info');
  return c.json({ success: true });
});

// ADMIN ACTION: Remote Toggle Bot
app.post('/api/admin/users/:targetUserId/toggle-bot', async (c) => {
  const userId = c.req.header('x-user-id');
  if (userId !== ADMIN_ID) return c.json({ error: 'Unauthorized' }, 403);
  
  const { targetUserId } = c.req.param();
  const { db, logActivity } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, targetUserId));
  if (!instance) return c.json({ error: 'No instance' }, 404);
  
  await db.update(instances).set({ isActive: !instance.isActive }).where(eq(instances.id, instance.id));
  await logActivity(targetUserId, 'ADMIN_TOGGLE_BOT', `Active: ${!instance.isActive} by admin: ${userId}`, 'info', instance.id);
  return c.json({ success: true, isActive: !instance.isActive });
});

// MESSAGE RETRY JOB: Process Failed Messages (FIX #14)
app.post('/api/jobs/retry-messages', async (c) => {
  const { db, evolution } = getTools(c.env);
  
  console.log('[RetryJob] Starting message retry process...');
  
  // Find pending/failed messages that haven't exceeded max retries
  // Only retry messages created less than 24 hours ago
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const failedMessages = await db.select()
    .from(messageQueue)
    .where(and(
      eq(messageQueue.status, 'pending'),
      sql`${messageQueue.retryCount} < ${messageQueue.maxRetries}`,
      sql`${messageQueue.createdAt} > '${oneDayAgo}'`
    ));

  console.log(`[RetryJob] Found ${failedMessages.length} messages to retry`);
  
  let successCount = 0;
  let failCount = 0;

  for (const msg of failedMessages) {
    try {
      // Exponential backoff: 2^retryCount seconds
      const delayMs = Math.pow(2, msg.retryCount) * 1000;
      const timeSinceLastRetry = msg.lastRetryAt 
        ? Date.now() - new Date(msg.lastRetryAt).getTime()
        : Date.now() - new Date(msg.createdAt).getTime();
      
      if (timeSinceLastRetry < delayMs) {
        console.log(`[RetryJob] Skipping ${msg.id} - backoff not elapsed (${timeSinceLastRetry}ms < ${delayMs}ms)`);
        continue;
      }

      console.log(`[RetryJob] Retrying message ${msg.id} (attempt ${msg.retryCount + 1}/${msg.maxRetries})`);
      
      // Get instance to send message
      const [instance] = await db.select().from(instances)
        .where(eq(instances.instanceName, msg.instanceName));
      
      if (!instance) {
        console.warn(`[RetryJob] Instance ${msg.instanceName} not found`);
        await db.update(messageQueue)
          .set({ 
            status: 'failed', 
            error: 'Instance not found',
            retryCount: msg.retryCount + 1,
            lastRetryAt: new Date().toISOString()
          })
          .where(eq(messageQueue.id, msg.id));
        failCount++;
        continue;
      }

      // Try to send
      await sendSmartMessage(evolution, msg.instanceName, msg.remoteJid, msg.message, msg.userId, db);
      
      // Mark as sent
      await db.update(messageQueue)
        .set({ 
          status: 'sent',
          updatedAt: new Date().toISOString()
        })
        .where(eq(messageQueue.id, msg.id));
      
      console.log(`[RetryJob] Successfully sent message ${msg.id}`);
      successCount++;
      
    } catch (e: any) {
      console.error(`[RetryJob] Failed to retry ${msg.id}:`, e.message);
      
      // Increment retry count
      await db.update(messageQueue)
        .set({ 
          status: 'pending',
          error: e.message,
          retryCount: msg.retryCount + 1,
          lastRetryAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(messageQueue.id, msg.id));
      
      failCount++;
    }
  }

  return c.json({ 
    message: 'Retry job completed',
    processed: failedMessages.length,
    succeeded: successCount,
    failed: failCount
  });
});

// HEALTH CHECK: Verify message queue
app.get('/api/jobs/message-queue-status', async (c) => {
  const { db } = getTools(c.env);
  
  const [pending] = await db.select({ count: sql`count(*)` })
    .from(messageQueue)
    .where(eq(messageQueue.status, 'pending'));
  
  const [failed] = await db.select({ count: sql`count(*)` })
    .from(messageQueue)
    .where(eq(messageQueue.status, 'failed'));
  
  const [sent] = await db.select({ count: sql`count(*)` })
    .from(messageQueue)
    .where(eq(messageQueue.status, 'sent'));

  return c.json({
    pending: pending.count || 0,
    failed: failed.count || 0,
    sent: sent.count || 0,
    total: (pending.count || 0) + (failed.count || 0) + (sent.count || 0)
  });
});

// INSTANCE CLEANUP JOB: Delete disconnected instances from engine
app.post('/api/jobs/cleanup-instances', async (c) => {
  const { db, evolution, logActivity } = getTools(c.env);
  
  try {
    const allInstances = await evolution.fetchInstances();
    const engineInstances = allInstances.instances || [];
    const dbInstances = await db.select().from(instances);
    
    let count = 0;
    for (const inst of dbInstances) {
        const existsOnEngine = engineInstances.find((ei: any) => ei.instanceName === inst.instanceName);
        if (!existsOnEngine) {
            console.warn(`[CleanupJob] Instance ${inst.instanceName} missing from engine. Wiping from DB.`);
            await db.delete(instances).where(eq(instances.id, inst.id));
            await logActivity(inst.userId, 'SYSTEM_CLEANUP', `Wiped missing instance: ${inst.instanceName}`, 'warn');
            count++;
        }
    }
    
    return c.json({ success: true, wiped: count });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// REUSABLE JOB HANDLERS
async function processScheduledMessages(env: Bindings) {
  const { db, evolution, logActivity } = getTools(env);
  const now = new Date().toISOString();
  
  const pending = await db.select()
    .from(scheduledMessages)
    .where(and(eq(scheduledMessages.status, 'pending'), sql`scheduled_at <= ${now}`));
    
  let success = 0;
  for (const msg of pending) {
    try {
        const [inst] = await db.select().from(instances).where(eq(instances.id, msg.instanceId));
        if (inst && inst.status === 'CONNECTED') {
            await sendSmartMessage(evolution, inst.instanceName, msg.remoteJid, msg.message, msg.userId, db);
            await db.update(scheduledMessages).set({ status: 'sent', updatedAt: new Date().toISOString() }).where(eq(scheduledMessages.id, msg.id));
            success++;
        }
    } catch (e: any) {
        await db.update(scheduledMessages).set({ status: 'failed', updatedAt: new Date().toISOString() }).where(eq(scheduledMessages.id, msg.id));
        await logActivity(msg.userId, 'SCHEDULED_MSG_FAILED', e.message, 'error', msg.instanceId);
    }
  }
  return { processed: pending.length, sent: success };
}

async function processRetryQueue(env: Bindings) {
  const { db, evolution } = getTools(env);
  
  const failedMessages = await db.select()
    .from(messageQueue)
    .where(and(
      eq(messageQueue.status, 'pending'),
      sql`retry_count < 5`,
      sql`datetime(last_retry_at, '+5 minutes') <= datetime('now')`
    ))
    .limit(10);

  let successCount = 0;
  for (const msg of failedMessages) {
    try {
      await sendSmartMessage(evolution, msg.instanceName, msg.remoteJid, msg.message, msg.userId, db);
      await db.update(messageQueue).set({ status: 'sent', updatedAt: new Date().toISOString() }).where(eq(messageQueue.id, msg.id));
      successCount++;
    } catch (e: any) {
      await db.update(messageQueue).set({ 
        retryCount: msg.retryCount + 1, 
        lastRetryAt: new Date().toISOString(),
        error: e.message 
      }).where(eq(messageQueue.id, msg.id));
    }
  }
  return { processed: failedMessages.length, sent: successCount };
}

// HTTP Endpoints for the same jobs
app.post('/api/jobs/process-scheduled', async (c) => {
  const results = await processScheduledMessages(c.env);
  return c.json({ success: true, ...results });
});

app.post('/api/jobs/retry-queue', async (c) => {
  const results = await processRetryQueue(c.env);
  return c.json({ success: true, ...results });
});

export default {
  fetch: (request: Request, env: Bindings, ctx: any) => app.fetch(request, env, ctx),
  async scheduled(event: any, env: Bindings, ctx: any) {
    console.log(`[Cron] Running scheduled jobs: ${event.cron}`);
    ctx.waitUntil(Promise.all([
      processScheduledMessages(env),
      processRetryQueue(env)
    ]));
  }
};
