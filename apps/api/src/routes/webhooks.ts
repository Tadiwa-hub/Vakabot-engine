import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { instances, keywords, services, users, messages, activityLogs } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { EvolutionClient } from '../lib/evolution';
import { AIClient } from '../lib/ai';
import { nanoid } from 'nanoid';

const webhooksApp = new Hono<{ Bindings: Bindings }>();

webhooksApp.post('/evolution', async (c) => {
  const token = c.req.query('token');
  if (!token || token !== c.env.EVOLUTION_API_KEY) {
    console.warn(`[Webhook] Unauthorized access attempt blocked.`);
    return c.text('Unauthorized', 401);
  }

  const body = await c.req.json() as any;
  const { event, instance: instanceName, data } = body;
  
  console.log(`[Webhook] RECEIVED EVENT: ${event} from instance: ${instanceName}`);
  
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  const evolution = new EvolutionClient(c.env.EVOLUTION_API_URL, c.env.EVOLUTION_API_KEY);

  // 1. Sync Connection Status
  if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
    const state = data?.state || data?.status;
    const reason = data?.statusReason || data?.reason || data?.error?.statusCode || data?.error?.output?.statusCode;
    
    let newStatus = null;
    
    // Check for explicit logout or a closed connection with a 401/403 reason code
    if (state === 'logout' || state === 'refused' || (state === 'close' && (reason === 401 || reason === 403))) {
      console.log(`[Webhook] Instance ${instanceName} logged out natively (Reason: ${reason}). Deleting from DB and Engine.`);
      try { await evolution.deleteInstance(instanceName); } catch (e) {}
      const [inst] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
      if (inst) {
        await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, inst.id));
      }
      await db.delete(instances).where(eq(instances.instanceName, instanceName));
      return c.text('OK');
    } else if (state === 'open') {
      newStatus = 'CONNECTED';
    } else if (state) {
      newStatus = 'DISCONNECTED';
    }

    if (newStatus) {
      await db.update(instances)
        .set({ status: newStatus, updatedAt: new Date().toISOString() })
        .where(eq(instances.instanceName, instanceName));
      console.log(`[Webhook] Instance ${instanceName} is now ${newStatus}`);
    }
  }

  // 2. Process Incoming Messages
  if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
    // Evolution API sends the message directly in `data` (or sometimes in `data.messages[0]`)
    const msg = Array.isArray(data?.messages) ? data.messages[0] : (data?.message?.key ? data.message : data);
    
    if (!msg) return c.text('OK');

    const isFromMe = msg?.key?.fromMe || msg?.fromMe;
    if (isFromMe) return c.text('OK');

    const remoteJid = msg?.key?.remoteJid;
    const content = msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || msg?.text || "";
    const pushName = msg?.pushName || "User";

    if (!content || !remoteJid) {
      console.log(`[Webhook] Dropped message: Missing content or JID.`, { remoteJid, content });
      return c.text('OK');
    }

    const messageId = msg?.key?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Instantly trigger composing/typing status so the customer sees the bot typing immediately!
    try {
      await evolution.sendPresence(instanceName, remoteJid, "composing", 3500);
      console.log(`[Webhook] Instant typing indicator triggered for ${remoteJid}`);
    } catch (pErr: any) {
      console.warn(`[Webhook] Failed to trigger instant typing:`, pErr.message);
    }

    // Push to background queue for reliable processing
    try {
      await c.env.MESSAGE_QUEUE.send({
        instanceName,
        remoteJid,
        content,
        pushName,
        messageId
      });
      console.log(`[Webhook] Enqueued message ${messageId} from ${remoteJid}`);
    } catch (err: any) {
      console.error("[Webhook] Failed to enqueue message:", err.message);
    }
  }

  return c.text('OK');
});

export default webhooksApp;
