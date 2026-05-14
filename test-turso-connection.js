import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Testing Turso connection...');
console.log('Database URL:', databaseUrl);

if (!databaseUrl || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

try {
  const client = createClient({
    url: databaseUrl,
    authToken: authToken
  });

  console.log('✅ Connection created successfully');

  // Read and execute migration
  const migrationPath = path.join(process.cwd(), 'drizzle', '0002_stiff_marvel_boy.sql');
  const migration = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration...');
  const result = await client.batch(
    migration.split('--').filter(s => s.trim()).map(stmt => ({ sql: stmt }))
  );

  console.log('✅ Migration executed successfully');
  console.log('Result:', result);
  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  console.error(e);
  process.exit(1);
}
