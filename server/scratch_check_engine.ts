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
  
  try {
    const instances = await evolution.fetchInstances();
    console.log(JSON.stringify(instances, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

check().catch(console.error);
