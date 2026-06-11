import { createClient } from "@libsql/client";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function reset() {
  console.log("Dropping old tables...");
  try {
    await client.execute("PRAGMA foreign_keys = OFF;");
  } catch (e) {
    // Some drivers might not support PRAGMA via execute, ignoring for now
  }
  const tables = ['users', 'keywords', 'instances', 'services', 'messages', 'payments', 'activity_logs', 'chat_history', 'plans', 'subscriptions', 'groq_usage', 'chat_meta', 'contacts'];
  for (const table of tables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS ${table};`);
      console.log(`Dropped ${table}`);
    } catch (e) {
      console.error(`Failed to drop ${table}: ${e.message}`);
    }
  }
  console.log("\nDatabase cleared! Now run: cd apps/api; npx drizzle-kit push");
  process.exit(0);
}

reset();
