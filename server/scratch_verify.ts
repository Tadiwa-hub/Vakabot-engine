import { EvolutionClient } from './src/lib/evolution';
import { getDb } from './src/db';
import { instances, autoReplies } from './src/db/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function checkAll() {
  const env = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN!,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  
  const db = getDb(env);
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  
  try {
    console.log("--- ENGINE INSTANCES ---");
    const engineInstances = await evolution.fetchInstances();
    console.log(JSON.stringify(engineInstances, null, 2));

    console.log("\n--- DB INSTANCES ---");
    const dbInstances = await db.select().from(instances);
    const activeInstances = dbInstances.filter(i => i.status === 'CONNECTED' || i.isActive);
    for (const i of activeInstances) {
      console.log(`${i.id} | ${i.instanceName} | Webhook: ${i.webhookUrl} | Status: ${i.status}`);
      const rules = await db.select().from(autoReplies).where({ instanceId: i.id } as any);
      // drizzle doesn't support object syntax for where like that usually, using eq:
      // wait, I'll use raw or just fetch all rules
    }
    
    console.log("\n--- DB RULES ---");
    const allRules = await db.select().from(autoReplies);
    allRules.forEach(r => console.log(`${r.instanceId} -> ${r.keyword}`));
    
  } catch (e) {
    console.error("Error:", e.message);
  }
}

checkAll().catch(console.error);
