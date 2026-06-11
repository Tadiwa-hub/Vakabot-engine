import { Hono } from 'hono';
import { Bindings } from '../lib/types';
import { getDb } from '../db';
import { payments, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const billingApp = new Hono<{ Bindings: Bindings }>();

billingApp.get('/:userId/history', async (c) => {
  const { userId } = c.req.param();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  const history = await db.select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
    
  return c.json(history);
});

billingApp.post('/pay', async (c) => {
  const { userId, plan, amount, phone, method, email } = await c.req.json();
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  const paymentId = nanoid();
  const formattedAmount = parseFloat(amount || 0).toFixed(2);

  const paynowData = {
    resulturl: `${c.env.BACKEND_URL}/api/billing/paynow-update`,
    returnurl: 'https://velo.ai/billing', // placeholder frontend URL
    reference: paymentId,
    amount: formattedAmount,
    id: c.env.PAYNOW_INTEGRATION_ID,
    additionalinfo: `Upgrade to ${plan}`,
    authemail: email || 'customer@velo.ai',
    status: 'Message'
  };

  // For remotetransaction, order of hash is exactly as sent in body.
  // Standard Paynow order: id, reference, amount, additionalinfo, returnurl, resulturl, authemail, phone, method, status
  const orderedData: Record<string, string> = {
    id: c.env.PAYNOW_INTEGRATION_ID,
    reference: paymentId,
    amount: formattedAmount,
    additionalinfo: `Upgrade to ${plan}`,
    returnurl: 'https://velo.ai/billing',
    resulturl: `${c.env.BACKEND_URL}/api/billing/paynow-update`,
    authemail: email || 'customer@velo.ai',
    phone: phone,
    method: method || 'ecocash',
    status: 'Message'
  };

  const concatStr = Object.values(orderedData).join('') + c.env.PAYNOW_INTEGRATION_KEY;
  const msgUint8 = new TextEncoder().encode(concatStr);
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgUint8);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('').toUpperCase();

  const payload = new URLSearchParams({
    ...orderedData,
    hash: hashHex
  });

  console.log('[Paynow] Initiating transaction...', payload.toString());

  try {
    const res = await fetch('https://www.paynow.co.zw/interface/remotetransaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    const text = await res.text();
    console.log('[Paynow] Response:', text);
    const parsed = new URLSearchParams(text);
    
    if (parsed.get('status') === 'Ok' || parsed.get('status')?.toLowerCase() === 'ok') {
      await db.insert(payments).values({
        id: paymentId,
        userId,
        plan,
        amount: formattedAmount,
        method: method || 'ecocash',
        status: 'PENDING',
        reference: parsed.get('paynowreference') || '',
        createdAt: new Date().toISOString(),
      });
      return c.json({ paymentId, status: 'PENDING', pollurl: parsed.get('pollurl') });
    } else {
      return c.json({ error: parsed.get('error') || 'Paynow error' }, 400);
    }
  } catch (err: any) {
    console.error('[Paynow] Fetch Error:', err.message);
    return c.json({ error: 'Failed to initiate payment' }, 500);
  }
});

// Paynow Webhook Callback
billingApp.post('/paynow-update', async (c) => {
  const body = await c.req.parseBody();
  console.log('[Paynow] Webhook update received:', body);
  
  const reference = body.reference as string;
  const paynowreference = body.paynowreference as string;
  const status = body.status as string; // Paid, Created, Sent, Cancelled, Refunded
  
  const db = getDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);
  
  if (reference && status) {
    let internalStatus = 'PENDING';
    if (status.toLowerCase() === 'paid') internalStatus = 'PAID';
    if (status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'failed') internalStatus = 'FAILED';

    await db.update(payments)
      .set({ status: internalStatus, reference: paynowreference })
      .where(eq(payments.id, reference));

    // If PAID, upgrade the user's top-up bundle logic here
    if (internalStatus === 'PAID') {
      const [payment] = await db.select().from(payments).where(eq(payments.id, reference));
      if (payment) {
        const [user] = await db.select().from(users).where(eq(users.id, payment.userId));
        if (user) {
          // Determine purchased amount based on the plan name
          let purchasedMessages = 0;
          if (payment.plan === 'Starter') purchasedMessages = 150;
          else if (payment.plan === 'Business') purchasedMessages = 500;
          else if (payment.plan === 'Pro') purchasedMessages = 1000;
          else {
            // Fallback for custom amounts based on price if needed, e.g. $5 -> 150
            const amount = parseFloat(payment.amount);
            if (amount === 5) purchasedMessages = 150;
            if (amount === 15) purchasedMessages = 500;
            if (amount === 25) purchasedMessages = 1000;
          }

          const currentRemaining = Math.max(0, (user.aiLimit || 0) - (user.aiUsageCount || 0));
          const newLimit = currentRemaining + purchasedMessages;
          
          // Set expiry to 30 days from now
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);

          await db.update(users)
            .set({ 
              plan: payment.plan,
              aiLimit: newLimit,
              aiUsageCount: 0, // Reset usage since we merged remaining into the limit
              aiExpiryDate: expiryDate.toISOString()
            })
            .where(eq(users.id, payment.userId));
            
          console.log(`[Paynow] Topped up user ${payment.userId} with ${purchasedMessages} messages. New limit: ${newLimit}. Expires: ${expiryDate.toISOString()}`);
        }
      }
    }
  }

  return c.text('OK');
});

export default billingApp;
