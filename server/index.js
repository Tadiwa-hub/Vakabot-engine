import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { evolution } from './src/lib/evolution.js';
import { db } from './src/db/index.js';
import { instances } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// API: Get Instance for User (Smart Sync)
app.get('/api/instance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    
    if (!instance) return res.json({ instance: null });

    // If already connected, just return the DB state (very fast)
    if (instance.status === "CONNECTED") {
      return res.json({ instance });
    }

    // If NOT connected, sync with the engine in the background
    try {
      const engineData = await evolution.getConnectData(instance.instanceName);
      console.log("GET ENGINE DATA:", JSON.stringify(engineData, null, 2));
      const engineStatus = engineData.instance?.state || engineData.instance?.status;
      
      let newStatus = "DISCONNECTED";
      let newQr = instance.qrcode;

      if (engineStatus === "open") {
        newStatus = "CONNECTED";
        newQr = null;
      } else if (engineStatus === "connecting") {
        newStatus = "CONNECTING";
      } else {
        // If we got a new QR from the engine, update our cache
        const qrFromEngine = engineData.base64 || engineData.qrcode?.base64;
        if (qrFromEngine) {
          newQr = qrFromEngine;
        }
      }

      // Update DB if anything changed
      if (newStatus !== instance.status || newQr !== instance.qrcode) {
        await db.update(instances)
          .set({ status: newStatus, qrcode: newQr, updatedAt: new Date().toISOString() })
          .where(eq(instances.id, instance.id));
        
        // Return updated data
        return res.json({ 
          instance: { ...instance, status: newStatus, qrcode: newQr } 
        });
      }
    } catch (e) {
      console.error("Sync Error:", e.message);
    }

    // Return the (possibly cached) instance
    res.json({ instance });
  } catch (error) {
    console.error("GET Instance Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Create Instance
app.post('/api/instance', async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const instanceName = `vaka_${nanoid(8)}`;
    
    // 1. Create on Evolution Engine
    const engineResponse = await evolution.createInstance(instanceName);
    console.log("CREATE ENGINE RESPONSE:", JSON.stringify(engineResponse, null, 2));
    const initialQr = engineResponse.base64 || engineResponse.qrcode?.base64 || null;

    // 2. Save to Database
    const newInstance = {
      id: nanoid(),
      userId,
      instanceName,
      phoneNumber: phoneNumber || null,
      qrcode: initialQr,
      isActive: true,
      status: "CONNECTING"
    };

    await db.insert(instances).values(newInstance);

    res.json(newInstance);
  } catch (error) {
    console.error("POST Instance Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Configure Webhook
app.post('/api/webhook/config', async (req, res) => {
  try {
    const { userId, webhookUrl } = req.body;
    if (!userId || !webhookUrl) return res.status(400).json({ error: "Missing required fields" });

    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    if (!instance) return res.status(404).json({ error: "Instance not found" });

    // Update in Evolution API
    await evolution.setWebhook(instance.instanceName, webhookUrl);

    // Update in Database
    await db.update(instances)
      .set({ webhookUrl, updatedAt: new Date().toISOString() })
      .where(eq(instances.id, instance.id));

    res.json({ success: true, webhookUrl });
  } catch (error) {
    console.error("Webhook Config Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Disconnect Instance
app.post('/api/instance/:userId/disconnect', async (req, res) => {
  try {
    const { userId } = req.params;
    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    if (!instance) return res.status(404).json({ error: "Instance not found" });

    // Logout and Delete from Evolution API (Fail gracefully if already deleted)
    try { await evolution.logoutInstance(instance.instanceName); } catch(e) {}
    try { await evolution.deleteInstance(instance.instanceName); } catch(e) {}

    // Reset Database State
    await db.update(instances)
      .set({ status: "DISCONNECTED", qrcode: null, isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(instances.id, instance.id));

    res.json({ success: true });
  } catch (error) {
    console.error("Disconnect Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Toggle Bot Status (Active/Paused)
app.post('/api/instance/:userId/toggle', async (req, res) => {
  try {
    const { userId } = req.params;
    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    if (!instance) return res.status(404).json({ error: "Instance not found" });

    const newStatus = !instance.isActive;
    await db.update(instances)
      .set({ isActive: newStatus, updatedAt: new Date().toISOString() })
      .where(eq(instances.id, instance.id));

    res.json({ success: true, isActive: newStatus });
  } catch (error) {
    console.error("Toggle Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Fetch Auto-Replies
app.get('/api/auto-replies/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const rules = await db.select().from(autoReplies).where(eq(autoReplies.userId, userId));
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Add Auto-Reply
app.post('/api/auto-replies', async (req, res) => {
  try {
    const { userId, keyword, replyText } = req.body;
    
    // Find the instance for this user
    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    if (!instance) return res.status(404).json({ error: "Instance not found" });

    const newRule = {
      id: crypto.randomUUID(),
      userId,
      instanceId: instance.id,
      keyword: keyword.toLowerCase(),
      replyText,
      isActive: true
    };

    await db.insert(autoReplies).values(newRule);
    res.json({ success: true, rule: newRule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Delete Auto-Reply
app.delete('/api/auto-replies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(autoReplies).where(eq(autoReplies.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WEBHOOK: Evolution API Receiver (The Brain)
app.post('/webhook/evolution', async (req, res) => {
  try {
    const { event, instance: instanceName, data } = req.body;
    console.log(`[Webhook] Event: ${event} from ${instanceName}`);

    // We only care about incoming messages (MESSAGES_UPSERT)
    if (event !== 'messages.upsert') return res.sendStatus(200);

    const message = data.message?.conversation || data.message?.extendedTextMessage?.text;
    const remoteJid = data.key?.remoteJid;
    const fromMe = data.key?.fromMe;

    if (!message || !remoteJid || fromMe) return res.sendStatus(200);

    console.log(`[Message] "${message}" from ${remoteJid}`);

    // 1. Find the instance and check if it's ACTIVE
    const [instance] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
    if (!instance || !instance.isActive) {
      console.log(`[Bot] Ignored (Instance not active or not found)`);
      return res.sendStatus(200);
    }

    // 2. Search for a matching Auto-Reply rule
    const rulesList = await db.select().from(autoReplies).where(eq(autoReplies.instanceId, instance.id));
    const match = rulesList.find(r => r.isActive && message.toLowerCase().includes(r.keyword.toLowerCase()));

    if (match) {
      console.log(`[Bot] Match found! Sending reply: "${match.replyText}"`);
      await evolution.sendMessage(instanceName, remoteJid, match.replyText);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Processing Error:", error);
    res.sendStatus(200); // Always return 200 to Evolution API to prevent retries
  }
});

app.listen(PORT, () => {
  console.log(`🚀 VakaBot Backend Bridge running on http://localhost:${PORT}`);
});
