import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

async function getSwagger() {
  const env = {
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL!,
  };

  const urlsToTry = [
    `${env.EVOLUTION_API_URL}/docs-json`,
    `${env.EVOLUTION_API_URL}/swagger.json`,
    `${env.EVOLUTION_API_URL}/api-docs-json`,
  ];

  for (const url of urlsToTry) {
    try {
      console.log(`Trying ${url}...`);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const paths = Object.keys(data.paths);
        const contactPaths = paths.filter(p => p.includes('contact') || p.includes('profile') || p.includes('chat'));
        console.log("Found endpoints related to contacts/profiles/chat:", JSON.stringify(contactPaths, null, 2));
        return;
      }
      console.log(`Failed with status: ${res.status}`);
    } catch (e) {
      console.error("Failed:", e.message);
    }
  }
}

getSwagger().catch(console.error);
