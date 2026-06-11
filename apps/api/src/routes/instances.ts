import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { instances, users, messages } from '../db/schema';
import { EvolutionClient } from '../lib/evolution';
import { eq } from 'drizzle-orm';

const instancesApp = new Hono<{ Bindings: Bindings }>();

const genId = () => Math.random().toString(36).substring(2, 15);

const getTools = (env: Bindings) => {
  const db = getDb(env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN);
  const evolution = new EvolutionClient(env.EVOLUTION_API_URL, env.EVOLUTION_API_KEY);
  return { db, evolution };
};

function isRealPairingCode(code: any) {
  if (!code || typeof code !== 'string') return false;
  const clean = code.replace(/-/g, '').trim();
  if (clean.length !== 8) return false;
  return !code.includes('=') && !code.includes('/') && !code.includes('+') && !code.includes(',');
}

// API: Get Instance Status & Sync
instancesApp.get('/status/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution } = getTools(c.env);
  
  try {
    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    
    if (instance) {
      // Actively check Evolution API to self-heal missed webhooks and detect native logouts
      try {
        const stateData = await evolution.getInstanceData(instance.instanceName) as any;
        const state = stateData?.instance?.state || stateData?.state;
        const reason = stateData?.instance?.statusReason || stateData?.statusReason || stateData?.instance?.error?.statusCode;
        
        if (state === 'open' && instance.status !== 'CONNECTED') {
          let backendUrl = c.env.BACKEND_URL;
          if (!backendUrl) {
            try { backendUrl = new URL(c.req.url).origin; } catch (e) { backendUrl = 'http://192.168.1.220:8787'; }
          }
          try {
            await evolution.setWebhook(instance.instanceName, `${backendUrl}/webhook/evolution?token=${c.env.EVOLUTION_API_KEY}`);
            console.log(`[Status Sync] Self-healed webhook for instance: ${instance.instanceName}`);
          } catch (whErr: any) {
            console.warn(`[Status Sync] Failed to self-heal webhook for instance ${instance.instanceName}:`, whErr.message);
          }

          await db.update(instances)
            .set({ status: 'CONNECTED', updatedAt: new Date().toISOString() })
            .where(eq(instances.id, instance.id));
          instance.status = 'CONNECTED';
        } else if (state === 'logout' || state === 'refused' || (state === 'close' && (reason === 401 || reason === 403))) {
           // Handle native logout
           await evolution.deleteInstance(instance.instanceName).catch(() => {});
           await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, instance.id));
           await db.delete(instances).where(eq(instances.id, instance.id));
           return c.json({ instance: null });
        }
      } catch (e: any) {
         // If Evolution API returns 404 or instance doesn't exist, purge it
         if (e.message?.includes('404') || e.message?.toLowerCase().includes('not found')) {
           await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, instance.id));
           await db.delete(instances).where(eq(instances.id, instance.id));
           return c.json({ instance: null });
         }
      }
      
      return c.json({ instance });
    }
    
    return c.json({ instance: null });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// API: Create Instance
instancesApp.post('/create', async (c) => {
  const { userId, phoneNumber, email } = await c.req.json();
  const { db, evolution } = getTools(c.env);
  
  try {
    // Normalize phone number (digits only, no spaces, pluses, or dashes)
    let cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    
    // Automatically prefix country code for Zimbabwe if starting with 0
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '263' + cleanNumber.substring(1);
    }

    if (!cleanNumber || cleanNumber.length < 10) {
      return c.json({ error: "Invalid phone number format. Please include your country code (e.g., 26377...)" }, 400);
    }

    await db.insert(users).values({
      id: userId, email: email || 'user@example.com', createdAt: new Date().toISOString()
    }).onConflictDoNothing();

    const existing = await db.select().from(instances).where(eq(instances.userId, userId));
    for (const inst of existing) {
      try { await evolution.deleteInstance(inst.instanceName); } catch (e) {}
      await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, inst.id));
    }
    await db.delete(instances).where(eq(instances.userId, userId));

    const instanceName = `velo_${userId.split('_')[1] || userId}_${Date.now()}`;
    
    console.log(`[Create] Provisioning instance ${instanceName} for cleaned number ${cleanNumber}`);
    await evolution.createInstance(instanceName);
    
    let backendUrl = c.env.BACKEND_URL;
    if (!backendUrl) {
      try { backendUrl = new URL(c.req.url).origin; } catch (e) { backendUrl = 'http://192.168.1.220:8787'; }
    }
    
    try {
      await evolution.setWebhook(instanceName, `${backendUrl}/webhook/evolution?token=${c.env.EVOLUTION_API_KEY}`);
    } catch (e: any) {
      console.warn("[Create] Webhook warning:", e.message);
    }

    let rawCode = "";
    let attempts = 0;
    const maxAttempts = 6;
    let lastError = null;

    // Retry loop with exponential sleep intervals to accommodate Baileys startup speed
    while (attempts < maxAttempts && !isRealPairingCode(rawCode)) {
      attempts++;
      // Sleep slightly longer on early retries to let Baileys complete initialization natively
      const sleepTime = attempts === 1 ? 1200 : attempts === 2 ? 1500 : 2000;
      await new Promise(r => setTimeout(r, sleepTime));
      
      try {
        console.log(`[Create] Requesting pairing code (Attempt ${attempts}/${maxAttempts})`);
        const pairingData = await evolution.getPairingCode(instanceName, cleanNumber) as any;
        
        if (isRealPairingCode(pairingData?.pairingCode)) rawCode = pairingData.pairingCode;
        else if (isRealPairingCode(pairingData?.code)) rawCode = pairingData.code;
        else if (isRealPairingCode(pairingData?.data?.code)) rawCode = pairingData.data.code;
        else if (isRealPairingCode(pairingData?.data?.pairingCode)) rawCode = pairingData.data.pairingCode;
        else rawCode = pairingData?.pairingCode || pairingData?.code || pairingData?.data?.pairingCode || pairingData?.data?.code || "";
      } catch (e: any) {
        lastError = e.message;
        console.warn(`[Create] Code request failed (Attempt ${attempts}):`, e.message);
      }
    }

    if (!isRealPairingCode(rawCode) && lastError) {
      try { await evolution.deleteInstance(instanceName); } catch(ex) {}
      return c.json({ error: "WhatsApp engine failed to return a code", details: lastError }, 500);
    }

    if (!isRealPairingCode(rawCode)) {
      try { await evolution.deleteInstance(instanceName); } catch (e) {}
      return c.json({ 
        error: "Failed to retrieve pairing code from WhatsApp.", 
        details: "The engine is currently busy or the number was formatted incorrectly on WhatsApp. Please verify the number and try again." 
      }, 500);
    }

    const newInstance = {
      id: genId(),
      userId,
      instanceName,
      phoneNumber: cleanNumber,
      pairingCode: rawCode,
      status: "DISCONNECTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.insert(instances).values(newInstance);

    // Return elegant step-by-step instructions so the user knows exactly what to do next
    return c.json({
      ...newInstance,
      instructions: [
        "Open WhatsApp on your phone.",
        "Tap Menu or Settings and select 'Linked Devices'.",
        "Tap 'Link a Device'.",
        "Select 'Link with phone number instead' at the bottom of the scanner screen.",
        `Enter this 8-digit code to log in: ${rawCode}`
      ]
    });
  } catch (error: any) {
    return c.json({ error: "Setup failed", details: error.message }, 500);
  }
});

// API: Cleanup
instancesApp.post('/cleanup', async (c) => {
  const { instanceName } = await c.req.json();
  const { db, evolution } = getTools(c.env);
  try {
    if (instanceName) {
      await evolution.deleteInstance(instanceName);
      const [inst] = await db.select().from(instances).where(eq(instances.instanceName, instanceName));
      if (inst) {
        await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, inst.id));
      }
      await db.delete(instances).where(eq(instances.instanceName, instanceName));
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ success: true });
  }
});

// API: Toggle Active State
instancesApp.patch('/:userId', async (c) => {
  const { userId } = c.req.param();
  const { isActive } = await c.req.json();
  const { db } = getTools(c.env);
  
  try {
    await db.update(instances)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(instances.userId, userId));
    return c.json({ success: true, isActive });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// API: Disconnect
instancesApp.post('/disconnect/:userId', async (c) => {
  const { userId } = c.req.param();
  const { db, evolution } = getTools(c.env);
  try {
    const [instance] = await db.select().from(instances).where(eq(instances.userId, userId));
    if (instance) {
      await evolution.deleteInstance(instance.instanceName);
      await db.update(messages).set({ instanceId: null }).where(eq(messages.instanceId, instance.id));
      await db.delete(instances).where(eq(instances.id, instance.id));
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ success: true });
  }
});

export default instancesApp;
