import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log("Applying manual fixes to 'instances' table...");
    
    // Add is_group_enabled if missing
    try {
        await client.execute("ALTER TABLE instances ADD COLUMN is_group_enabled INTEGER NOT NULL DEFAULT 0");
        console.log("✅ Added is_group_enabled");
    } catch (e) {
        console.log("⚠️ is_group_enabled already exists or error:", e.message);
    }

    console.log("Done.");
  } catch (e) {
    console.error(e);
  }
}

run();
