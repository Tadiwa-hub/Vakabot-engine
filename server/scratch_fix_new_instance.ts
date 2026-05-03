import { EvolutionClient } from './src/lib/evolution';
import { getDb } from './src/db';
import { instances, autoReplies } from './src/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function fix() {
  const env = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN!,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  
  const db = getDb(env);
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  
  const newInstanceName = "vaka__AOOOQ";
  const newInstanceId = "a6bb9b31-73bc-489e-b05a-ad5a935b538e";
  const oldInstanceId = "0d9fd635-a5b8-4720-a932-072b9c1783bc";
  const webhookUrl = "https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution";

  try {
    console.log(`Setting webhook for ${newInstanceName}...`);
    await evolution.setWebhook(newInstanceName, webhookUrl);
    
    console.log("Updating DB with webhook...");
    await db.update(instances).set({ webhookUrl }).where(eq(instances.id, newInstanceId));
    
    console.log(`Migrating rules from ${oldInstanceId} to ${newInstanceId}...`);
    await db.update(autoReplies).set({ instanceId: newInstanceId }).where(eq(autoReplies.instanceId, oldInstanceId));
    
    console.log("Done!");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

fix().catch(console.error);
