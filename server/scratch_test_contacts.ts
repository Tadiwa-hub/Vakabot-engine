import { EvolutionClient } from './src/lib/evolution';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function testContacts() {
  const env = {
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  const instanceName = "vaka__3U9XR";

  console.log("Fetching all contacts...");
  
  try {
    const url = `${env.EVOLUTION_API_URL}/chat/findContacts/${instanceName}`;
    const res = await fetch(url, {
      method: "POST", // usually POST for Evolution API v1
      headers: { "apikey": env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await res.json();
    console.log(`Found ${data.length || 0} contacts.`);
    
    // Find the one with pushName "Tadiwa" or the lid
    const lid = "136550549598339@lid";
    const found = data.find((c: any) => c.id === lid || c.pushName === "Tadiwa" || c.name === "Tadiwa");
    console.log("Contact details:", JSON.stringify(found, null, 2));
    
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

testContacts().catch(console.error);
