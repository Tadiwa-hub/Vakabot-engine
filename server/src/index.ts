import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db';
import { EvolutionClient } from './lib/evolution';
import { instances, autoReplies } from './db/schema';
import { eq } from 'drizzle-orm';

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Helper to get tools
const getTools = (env: Bindings) => {
  const db = getDb(env);
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  return { db, evolution };
};

// API: Get Instance
app.get('/api/instance/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  
  if (instance && instance.status !== "CONNECTED") {
    try {
      const engineData = await evolution.getConnectData(instance.instanceName);
      const engineStatus = engineData.instance?.state || engineData.instance?.status;
      
      let newStatus = "DISCONNECTED";
      let newQr = instance.qrcode;

      if (engineStatus === "open") newStatus = "CONNECTED";
      else if (engineStatus === "connecting") newStatus = "CONNECTING";
      else {
        const qrFromEngine = engineData.base64 || engineData.qrcode?.base64;
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

  return c.json({ instance: instance || null });
});

// API: Create Instance
app.post('/api/instance', async (c) => {
  const { userId, phoneNumber } = await c.req.json();
  const { db, evolution } = getTools(c.env);
  
  const instanceName = `vaka__${Math.random().toString(36).substring(7).toUpperCase()}`;
  const engineResponse = await evolution.createInstance(instanceName);
  const initialQr = engineResponse.base64 || engineResponse.qrcode?.base64 || null;

  const newInstance = {
    id: crypto.randomUUID(),
    userId,
    instanceName,
    phoneNumber,
    qrcode: initialQr,
    status: "DISCONNECTED",
    isActive: true
  };

  await db.insert(instances).values(newInstance);

  // Automatically set the webhook for this instance
  // Note: We use the backend's own URL for the webhook
  const backendUrl = new URL(c.req.url).origin;
  try {
    await evolution.setWebhook(instanceName, `${backendUrl}/webhook/evolution`);
  } catch (e) {
    console.error("Failed to set initial webhook:", e);
  }

  // Migrate any existing auto-reply rules for this user to the new instance
  await db.update(autoReplies)
    .set({ instanceId: newInstance.id })
    .where(eq(autoReplies.userId, userId));

  return c.json(newInstance);
});

// API: Configure Webhook
app.post('/api/webhook/config', async (c) => {
  const { userId, webhookUrl } = await c.req.json();
  const { db, evolution } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  await evolution.setWebhook(instance.instanceName, webhookUrl);
  await db.update(instances).set({ webhookUrl, updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));

  return c.json({ success: true, webhookUrl });
});

// API: Disconnect Instance
app.post('/api/instance/:userId/disconnect', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution } = getTools(c.env);
  
  const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
  if (!instance) return c.json({ error: "Instance not found" }, 404);

  try { await evolution.logoutInstance(instance.instanceName); } catch(e) {}
  try { await evolution.deleteInstance(instance.instanceName); } catch(e) {}

  await db.update(instances).set({ status: "DISCONNECTED", qrcode: null, isActive: false, updatedAt: new Date().toISOString() }).where(eq(instances.id, instance.id));

  return c.json({ success: true });
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

app.get('/ping', (c) => {
  console.log("PING LOG TEST - Bot is awake!");
  return c.text("PONG");
});

// WEBHOOK: Evolution API Receiver
app.post('/webhook/evolution', async (c) => {
  try {
    const body = await c.req.json();
    console.log("[Webhook Raw Body]:", JSON.stringify(body, null, 2));
    
    const { event, instance: instanceName, data } = body;
    const { db, evolution } = getTools(c.env);

    const isMessageEvent = event === 'messages.upsert' || event === 'MESSAGES_UPSERT' || event === 'messages-upsert';

    if (!isMessageEvent) {
      console.log(`[Webhook] Ignoring non-message event: ${event}`);
      return c.text('OK');
    }

    // Extract message text carefully
    const message = data.message?.conversation || 
                    data.message?.extendedTextMessage?.text || 
                    data.message?.imageMessage?.caption || 
                    "";
                    
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
    // Normalize botJid by stripping any leading '+' from the DB phone number
    const normalizedPhone = instance.phoneNumber.replace(/^\+/, '');
    const botJid = `${normalizedPhone}@s.whatsapp.net`;
    const fromMe = data.key?.fromMe;

    console.log(`[Webhook] Raw remoteJid: ${remoteJid}, BotJid: ${botJid}, fromMe: ${fromMe}`);

    // If it's a message from the bot itself, skip
    if (fromMe || remoteJid === botJid) {
        console.log(`[Webhook] Skipping self-message: fromMe=${fromMe}, remoteJid=${remoteJid}`);
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

    if (!message || !remoteJid) {
        console.log(`[Webhook] Skipping: message=${!!message}, remoteJid=${remoteJid}`);
        return c.text('OK');
    }

    const rulesList = await db.select().from(autoReplies).where(eq(autoReplies.instanceId, instance.id));
    console.log(`[Webhook] Checking ${rulesList.length} rules...`);

    const match = rulesList.find(r => 
      r.isActive && 
      message.toLowerCase().trim().includes(r.keyword.toLowerCase().trim())
    );

    if (match) {
      console.log(`[Webhook] MATCH! Sending: ${match.replyText}`);
      await evolution.sendMessage(instanceName, remoteJid, match.replyText);
    } else {
      console.log(`[Webhook] No keyword match for: "${message.toLowerCase().trim()}"`);
    }

    return c.text('OK');
  } catch (err) {
    console.error("[Webhook Error]:", err);
    return c.text('OK'); // Always return 200
  }
});

export default app;
