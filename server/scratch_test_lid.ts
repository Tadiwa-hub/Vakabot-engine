import { EvolutionClient } from './src/lib/evolution';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function testResolution() {
  const env = {
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  const instanceName = "vaka__3U9XR";
  const lid = "136550549598339@lid";

  console.log("Testing various endpoints to resolve LID:", lid);

  const endpoints = [
    { method: "POST", path: `/chat/whatsappNumbers/${instanceName}`, body: { numbers: [lid] } },
    { method: "GET", path: `/chat/findContact/${instanceName}?number=${lid}` },
    { method: "POST", path: `/chat/fetchProfile/${instanceName}`, body: { number: lid } },
    { method: "POST", path: `/chat/fetchProfile/${instanceName}`, body: { numbers: [lid] } },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\nTesting ${ep.method} ${ep.path}`);
      // Hacky way to call request since it's private in EvolutionClient
      const url = `${env.EVOLUTION_API_URL}${ep.path}`;
      const res = await fetch(url, {
        method: ep.method,
        headers: { "apikey": env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });
      const data = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${data}`);
    } catch (e) {
      console.error("Failed:", e.message);
    }
  }
}

testResolution().catch(console.error);
