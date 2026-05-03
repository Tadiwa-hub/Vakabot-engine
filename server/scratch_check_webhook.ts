import { EvolutionClient } from './src/lib/evolution';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function check() {
  const env = {
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  
  const evolution = new EvolutionClient({ url: env.EVOLUTION_API_URL, key: env.EVOLUTION_API_KEY });
  const instanceName = "vaka__AOOOQ";
  
  try {
    const url = `${env.EVOLUTION_API_URL}/webhook/find/${instanceName}`;
    const res = await fetch(url, { headers: { apikey: env.EVOLUTION_API_KEY } });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

check().catch(console.error);
