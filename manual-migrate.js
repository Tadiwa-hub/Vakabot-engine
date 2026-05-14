import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const migrationFile = path.join(process.cwd(), 'drizzle', '0003_activity_contacts_schedule.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log("Executing migration 0003 manually...");
    
    // Split by statement-breakpoint or semicolon
    const statements = sql.split('--> statement-breakpoint').flatMap(s => s.split(';')).filter(s => s.trim());
    
    for (const statement of statements) {
        try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await client.execute(statement);
            console.log("✅ Success");
        } catch (e) {
            console.log(`⚠️ Failed or already exists: ${e.message}`);
        }
    }
    
    console.log("Manual migration complete.");
  } catch (e) {
    console.error(e);
  }
}

run();
