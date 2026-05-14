import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log("Seeding default plans...");
    
    const plans = [
      { id: 'free', name: 'Free Starter', price_usd: 0, ai_responses_limit: 20, whatsapp_numbers_limit: 1, keywords_limit: 5 },
      { id: 'basic', name: 'Basic Business', price_usd: 15, ai_responses_limit: 500, whatsapp_numbers_limit: 1, keywords_limit: 50 },
      { id: 'pro', name: 'Pro Enterprise', price_usd: 45, ai_responses_limit: 5000, whatsapp_numbers_limit: 3, keywords_limit: 500 }
    ];

    for (const plan of plans) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO plans (id, name, price_usd, ai_responses_limit, whatsapp_numbers_limit, keywords_limit) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [plan.id, plan.name, plan.price_usd, plan.ai_responses_limit, plan.whatsapp_numbers_limit, plan.keywords_limit]
      });
      console.log(`✅ Seeded plan: ${plan.id}`);
    }

    console.log("Seeding complete.");
  } catch (e) {
    console.error("❌ Seeding failed:", e.message);
  }
}

run();
