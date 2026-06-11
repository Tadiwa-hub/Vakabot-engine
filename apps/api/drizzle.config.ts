import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load from .dev.vars (Cloudflare Workers' local env file)
dotenv.config({ path: '.dev.vars' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
