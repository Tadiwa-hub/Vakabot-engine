const { execSync } = require('child_process');
const path = require('path');

// Load environment variables from the ignored root .env file
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const secrets = {
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || "vakabot123",
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  PAYNOW_INTEGRATION_ID: process.env.PAYNOW_INTEGRATION_ID || "23885",
  PAYNOW_INTEGRATION_KEY: process.env.PAYNOW_INTEGRATION_KEY,
  BACKEND_URL: "https://velo-api.zimbabwe.workers.dev"
};

for (const [key, value] of Object.entries(secrets)) {
  if (!value) {
    console.warn(`[Warning] Skipping ${key} as it is not set in your .env file.`);
    continue;
  }
  console.log(`Setting ${key}...`);
  execSync(`npx wrangler secret put ${key}`, { 
    input: value, 
    stdio: ['pipe', 'inherit', 'inherit'] 
  });
}
