import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const WEBHOOK_URL = "https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution";
const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;

async function setWebhook(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/webhook/set/${instanceName}`, {
    method: "POST",
    headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      enabled: true,
      url: WEBHOOK_URL,
      webhook_by_events: false,
      events: ["MESSAGES_UPSERT", "SEND_MESSAGE", "CONNECTION_UPDATE"]
    })
  });
  return res.json();
}

async function main() {
  // Get all CONNECTED instances
  const instances = await c.execute("SELECT id, instance_name, status, is_active FROM instances WHERE status = 'CONNECTED'");
  console.log("Connected instances:", instances.rows.map(r => r.instance_name));

  // Set webhook on ALL connected instances
  for (const instance of instances.rows) {
    const name = instance.instance_name as string;
    console.log(`\nSetting webhook on ${name}...`);
    const result = await setWebhook(name);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
