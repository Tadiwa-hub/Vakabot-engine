import { Bindings } from './types';
import { getDb } from '../db';
import { instances, keywords, services, users, messages } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { EvolutionClient } from './evolution';
import { AIClient } from './ai';
import { nanoid } from 'nanoid';

export type QueueMessage = {
  instanceName: string;
  remoteJid: string;
  content: string;
  pushName: string;
  messageId?: string;
};

export async function processWebhookMessage(msg: QueueMessage, env: Bindings) {
  const { instanceName, remoteJid, content, pushName, messageId } = msg;
  const db = getDb(env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN);
  const evolution = new EvolutionClient(env.EVOLUTION_API_URL, env.EVOLUTION_API_KEY);

  // 1. Check duplicate processing (Idempotency)
  if (messageId) {
    const [existing] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (existing) return;
  }

  // Find instance and user
  const [instance] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
  if (!instance || !instance.isActive) return;

  const [user] = await db.select().from(users).where(eq(users.id, instance.userId));
  if (!user) return;

  const managerId = env.MANAGER.idFromName('default');
  const manager = env.MANAGER.get(managerId);

  const broadcastEvent = async (type: string, data: any) => {
    try {
      await manager.fetch("http://local/broadcast", {
        method: "POST",
        body: JSON.stringify({ type, userId: user.id, data })
      });
    } catch (e: any) {
      console.warn("[Queue] Broadcast failed:", e.message);
    }
  };

  const incomingMessage = {
    id: messageId || nanoid(),
    userId: user.id,
    instanceId: instance.id,
    remoteJid,
    pushName,
    content,
    fromMe: false,
    timestamp: Math.floor(Date.now() / 1000),
    createdAt: new Date().toISOString()
  };

  // 2. Human Takeover Check: If the owner typed manually in the last 1 hour, mute the AI bot!
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
  const [latestManual] = await db.select().from(messages).where(
    and(
      eq(messages.instanceId, instance.id),
      eq(messages.remoteJid, remoteJid),
      eq(messages.fromMe, true),
      eq(messages.responseType, 'manual'),
      sql`timestamp > ${oneHourAgo}`
    )
  ).orderBy(desc(messages.timestamp)).limit(1);

  if (latestManual) {
    console.log(`[Queue] Human takeover active. Muting bot replies for ${remoteJid}.`);
    await db.insert(messages).values(incomingMessage);
    await broadcastEvent("NEW_MESSAGE", {
      id: incomingMessage.id,
      phone: remoteJid.split('@')[0],
      message: content,
      time: new Date(incomingMessage.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'incoming'
    });
    return;
  }

  // Log and broadcast incoming message
  await db.insert(messages).values(incomingMessage);
  await broadcastEvent("NEW_MESSAGE", {
    id: incomingMessage.id,
    phone: remoteJid.split('@')[0],
    message: content,
    time: new Date(incomingMessage.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'incoming'
  });

  // Helper: Elegant typing indicator + send message handler to eliminate glitchy indicators
  const sendTypingReply = async (replyTextStr: string, respType: string) => {
    const typingTime = Math.min(Math.max(replyTextStr.length * 15, 800), 2200);
    try {
      await evolution.sendPresence(instanceName, remoteJid, "composing", typingTime);
      await new Promise(r => setTimeout(r, typingTime));
      // Explicitly pause/terminate Baileys composing to avoid glitchy trailing displays
      await evolution.sendPresence(instanceName, remoteJid, "paused");
    } catch (e) {}

    const outMsg = {
      id: nanoid(),
      userId: user.id,
      instanceId: instance.id,
      remoteJid,
      pushName: user.businessName || "Assistant",
      content: replyTextStr,
      fromMe: true,
      responseType: respType,
      timestamp: Math.floor(Date.now() / 1000),
      createdAt: new Date().toISOString()
    };

    await evolution.sendMessage(instanceName, remoteJid, replyTextStr);
    await db.insert(messages).values(outMsg);

    await broadcastEvent("NEW_MESSAGE", {
      id: outMsg.id,
      phone: remoteJid.split('@')[0],
      message: replyTextStr,
      time: new Date(outMsg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: respType
    });
  };

  // 3. Separate Business & Personal (On-The-Fly Dynamic Gatekeeper)
  const historyList = await db.select().from(messages).where(
    and(eq(messages.instanceId, instance.id), eq(messages.remoteJid, remoteJid))
  ).orderBy(desc(messages.timestamp)).limit(15);

  const previousMessages = historyList.filter(m => m.id !== incomingMessage.id);

  const hasPassedGate = previousMessages.some(m => 
    m.responseType === 'ai' || 
    m.responseType === 'keyword' || 
    m.responseType === 'gatekeeper_passed'
  );

  const lastMyMsg = previousMessages.find(m => m.fromMe);

  if (!hasPassedGate) {
    const isGatekeeperPending = lastMyMsg && lastMyMsg.responseType === 'gatekeeper';

    if (!isGatekeeperPending) {
      const gatekeeperGreeting = `Hello! Is this inquiry business-related?\n\nReply *1* or *Business* for business assistance.\nReply *2* or *Personal* to reach the owner directly.`;
      await sendTypingReply(gatekeeperGreeting, "gatekeeper");
      return;
    }

    const cleanContent = content.trim().toLowerCase();
    const isBusiness = cleanContent === '1' || cleanContent.includes('bus') || cleanContent.includes('yes') || cleanContent.includes('y');
    const isPersonal = cleanContent === '2' || cleanContent.includes('pers') || cleanContent.includes('no') || cleanContent.includes('n');

    if (isBusiness) {
      // Create a marker log indicating gatekeeper was passed
      await db.insert(messages).values({
        id: nanoid(),
        userId: user.id,
        instanceId: instance.id,
        remoteJid,
        pushName: user.businessName || "Assistant",
        content: "Passed gatekeeper: Business inquiry confirmed.",
        fromMe: true,
        responseType: 'gatekeeper_passed',
        timestamp: Math.floor(Date.now() / 1000) - 1,
        createdAt: new Date().toISOString()
      });
      console.log(`[Queue] ${remoteJid} passed the gatekeeper. Proceeding to reply.`);
      // Continue to AI / Keyword processing below!
    } else if (isPersonal) {
      const personalText = `Understood! Please wait for the owner of the WhatsApp account to get back to you directly.`;
      await sendTypingReply(personalText, "gatekeeper_personal");
      return;
    } else {
      const remindText = `Please let us know if this is business-related to route your message correctly:\n\nReply *1* or *Business* for business assistance.\nReply *2* or *Personal* to reach the owner directly.`;
      await sendTypingReply(remindText, "gatekeeper");
      return;
    }
  }

  let replyText = "";
  let responseType: "ai" | "keyword" | "fallback" = "fallback";

  // A. Check Keywords
  const userKeywords = await db.select().from(keywords).where(and(eq(keywords.userId, user.id), eq(keywords.isActive, true)));
  for (const kw of userKeywords) {
    const triggers = kw.triggers.split(',').map(t => t.trim().toLowerCase());
    const isMatch = kw.matchType === 'exact' 
      ? triggers.includes(content.toLowerCase())
      : triggers.some(t => content.toLowerCase().includes(t));

    if (isMatch) {
      replyText = kw.response;
      responseType = "keyword";
      await db.update(keywords).set({ usageCount: (kw.usageCount || 0) + 1 }).where(eq(keywords.id, kw.id));
      break;
    }
  }

  // B. Check AI if no keyword match
  if (!replyText && (env.GROQ_API_KEY || env.CEREBRAS_API_KEY)) {
    const isExpired = user.aiExpiryDate && Date.now() > new Date(user.aiExpiryDate).getTime();
    if ((user.aiUsageCount || 0) >= (user.aiLimit || 25) || isExpired) {
       replyText = "We are currently unavailable. Please contact us directly.";
       responseType = "fallback";
    } else {
      try {
        const userServices = await db.select().from(services).where(and(eq(services.userId, user.id), eq(services.isActive, true)));
        
        // Filter history properly (latest 10 messages, clean, ordered)
        const recentMsgs = await db.select().from(messages)
          .where(and(
            eq(messages.instanceId, instance.id), 
            eq(messages.remoteJid, remoteJid),
            sql`responseType IS NULL OR responseType IN ('ai', 'keyword')` // Keep conversation clean
          ))
          .orderBy(desc(messages.timestamp))
          .limit(10);
        
        recentMsgs.reverse();
        
        const conversationHistory = recentMsgs.map(m => ({
          role: m.fromMe ? 'assistant' : 'user',
          content: m.content
        }));

        const systemPrompt = `
          You are a helpful AI business assistant for "${user.businessName || 'our business'}".
          Your goal is to answer customer inquiries professionally and concisely.
          
          BUSINESS DETAILS:
          - Business Name: ${user.businessName || 'N/A'}
          - Availability: ${user.availability || 'N/A'}
          
          SERVICES WE OFFER:
          ${userServices.map(s => `- ${s.name}: ${s.description} ${s.price ? `(Price: ${s.price})` : '(Price: Not listed)'}`).join('\n')}
          
          CRITICAL INSTRUCTIONS (MANDATORY):
          1. STRICT KNOWLEDGE BOUNDARY: Speak ONLY about facts, services, or details explicitly mentioned in the "BUSINESS DETAILS" and "SERVICES WE OFFER" sections above. If a customer asks about something you do not know, or that is not explicitly listed, state politely that you do not have that information and that the business owner will get back to them. DO NOT speculate or invent any details.
          2. PRICING POLICY: Do NOT quote any pricing, fees, or charges for services that are "Not listed" (or have no price specified in the services list above). If a service does not have a listed price, state politely that the owner will quote the price shortly.
          3. WhatsApp Style: Keep responses short, warm, and friendly.
          4. No AI Mention: DO NOT mention you are an AI unless explicitly asked.
        `;

        const ai = new AIClient(env.GROQ_API_KEY, env.CEREBRAS_API_KEY);
        replyText = await ai.generateResponse(systemPrompt, conversationHistory);
        responseType = "ai";

        await db.update(users)
          .set({ aiUsageCount: sql`${users.aiUsageCount} + 1` })
          .where(eq(users.id, user.id));
      } catch (err: any) {
        console.error("[Queue] AI Error:", err.message);
        replyText = "Thank you for your message. A human team member will get back to you shortly.";
      }
    }
  } else if (!replyText) {
    replyText = "Thank you for contacting us! We'll get back to you soon.";
  }

  // C. Send Reply
  if (replyText) {
    try {
      await sendTypingReply(replyText, responseType);
    } catch (err: any) {
      console.error("[Queue] Send Error:", err.message);
      throw err;
    }
  }
}
