import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

async function testConnection() {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;

  console.log(`Testing connection to: ${url}`);
  console.log(`Using API Key: ${key}`);

  try {
    const res = await fetch(`${url}/instance/fetchInstances`, {
      headers: { 'apikey': key }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("Success! Instances:", data);
    } else {
      const text = await res.text();
      console.error(`Error: ${res.status} - ${text}`);
    }
  } catch (e) {
    console.error("Connection failed:", e);
  }
}

testConnection();
