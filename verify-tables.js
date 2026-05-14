import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const tables = ['activity_logs', 'contacts', 'scheduled_messages'];
    console.log("Checking for existence of new tables...");
    
    for (const table of tables) {
        try {
            await client.execute(`SELECT 1 FROM ${table} LIMIT 1`);
            console.log(`✅ Table ${table} exists`);
        } catch (e) {
            console.log(`❌ Table ${table} is MISSING: ${e.message}`);
        }
    }
  } catch (e) {
    console.error(e);
  }
}

run();
