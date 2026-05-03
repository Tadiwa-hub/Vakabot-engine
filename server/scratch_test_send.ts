import { EvolutionClient } from './src/lib/evolution';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function testSend() {
  const env = {
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY!,
  };
  const instanceName = "vaka__AOOOQ";
  const lid = "136550549598339@lid";

  console.log("Testing message sending to LID on v1.8.2:", lid);

  const payloads = [
    { 
      name: "With quoted message", 
      payload: { 
        number: lid, 
        options: { 
          quoted: { 
            key: { 
              id: "ACFB1EA4ABB455774348A98AC83DE73F", 
              remoteJid: lid, 
              fromMe: false 
            }, 
            message: { conversation: "Hello" } 
          } 
        }, 
        textMessage: { text: "test with quote" } 
      } 
    }
  ];

  for (const test of payloads) {
    try {
      console.log(`\nTesting: ${test.name}`);
      const url = `${env.EVOLUTION_API_URL}/message/sendText/${instanceName}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "apikey": env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(test.payload)
      });
      const data = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${data}`);
    } catch (e) {
      console.error("Failed:", e.message);
    }
  }
}

testSend().catch(console.error);
