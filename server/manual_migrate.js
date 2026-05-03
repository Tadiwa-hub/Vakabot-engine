import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  try {
    console.log("🚀 Manually adding columns & tables to Turso (Take 3)...");
    
    try {
      await client.execute("ALTER TABLE instances ADD COLUMN webhook_url TEXT;");
      console.log("✅ Added webhook_url");
    } catch(e) { console.log("⚠️ webhook_url might exist:", e.message); }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS auto_replies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        instance_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        reply_text TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Created auto_replies table");

  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    process.exit();
  }
}

migrate();
