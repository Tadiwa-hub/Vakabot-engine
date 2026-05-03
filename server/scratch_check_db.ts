import { getDb } from './src/db';
import { instances, autoReplies } from './src/db/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function checkDb() {
  const env = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN!,
  };
  const db = getDb(env);
  
  const allInstances = await db.select().from(instances);
  console.log("--- ALL INSTANCES ---");
  allInstances.forEach(i => console.log(i.id, "|", i.instanceName, "|", i.userId, "|", i.status));
  
  const allRules = await db.select().from(autoReplies);
  console.log("--- ALL RULES ---");
  allRules.forEach(r => console.log(JSON.stringify(r)));
}

checkDb().catch(console.error);
