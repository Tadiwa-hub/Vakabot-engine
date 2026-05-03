import { EvolutionClient } from './src/lib/evolution';
import { getDb } from './src/db';
import { instances } from './src/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function fixWebhook() {
  const env = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN!,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  
  const db = getDb(env);
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  
  const instanceName = "vaka__KUKVUP";
  const webhookUrl = "https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution";
  
  console.log(`Setting webhook for ${instanceName} to ${webhookUrl}...`);
  
  try {
    const result = await evolution.setWebhook(instanceName, webhookUrl);
    console.log("Evolution API Result:", JSON.stringify(result, null, 2));
    
    await db.update(instances).set({ webhookUrl }).where(eq(instances.instanceName, instanceName));
    console.log("Database updated.");
  } catch (e) {
    console.error("Error:", e);
  }
}

fixWebhook().catch(console.error);
