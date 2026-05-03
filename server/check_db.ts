import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Check all instances
  const instances = await c.execute("SELECT id, instance_name, status, is_active FROM instances");
  console.log("=== INSTANCES ===");
  console.log(JSON.stringify(instances.rows, null, 2));

  // Check all auto-replies
  const rules = await c.execute("SELECT * FROM auto_replies");
  console.log("\n=== AUTO REPLIES ===");
  console.log(JSON.stringify(rules.rows, null, 2));
}

main().catch(console.error);
