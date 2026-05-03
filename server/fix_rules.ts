import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // The instance that is actually receiving messages
  const activeInstanceName = "vaka__3U9XR";
  
  const inst = await c.execute(`SELECT id FROM instances WHERE instance_name = '${activeInstanceName}'`);
  const activeInstanceId = inst.rows[0].id as string;
  console.log(`Active instance ID: ${activeInstanceId}`);

  // Move ALL auto-reply rules to this instance
  const result = await c.execute(`UPDATE auto_replies SET instance_id = '${activeInstanceId}'`);
  console.log(`Updated ${result.rowsAffected} auto-reply rules to use ${activeInstanceName}`);

  // Verify
  const rules = await c.execute("SELECT * FROM auto_replies");
  console.log("Current rules:", JSON.stringify(rules.rows, null, 2));
}

main().catch(console.error);
