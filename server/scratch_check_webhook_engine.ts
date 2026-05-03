import { EvolutionClient } from './src/lib/evolution';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function checkWebhook() {
  const evolution = new EvolutionClient({ 
    url: process.env.EVOLUTION_API_URL!, 
    key: process.env.EVOLUTION_API_KEY! 
  });
  
  const instanceName = "vaka__3U9XR";
  console.log(`Fetching webhook for ${instanceName}...`);
  try {
    const result = await evolution.request(`/webhook/find/${instanceName}`);
    console.log("Webhook Config:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

checkWebhook().catch(console.error);
