import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  try {
    console.log('Creating messageQueue table...');

    // Create the message_queue table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`message_queue\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`instance_name\` text NOT NULL,
        \`remote_jid\` text NOT NULL,
        \`message\` text NOT NULL,
        \`status\` text DEFAULT 'pending' NOT NULL,
        \`retry_count\` integer DEFAULT 0,
        \`max_retries\` integer DEFAULT 5,
        \`last_retry_at\` text,
        \`error\` text,
        \`created_at\` text DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` text DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
      );
    `);

    // Create indexes for performance
    await client.execute(`CREATE INDEX IF NOT EXISTS \`message_queue_status_idx\` ON \`message_queue\` (\`status\`);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS \`message_queue_user_id_idx\` ON \`message_queue\` (\`user_id\`);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS \`message_queue_created_at_idx\` ON \`message_queue\` (\`created_at\`);`);

    console.log('✅ Table created successfully!');
    console.log('✅ Indexes created successfully!');
    console.log('\n✨ Migration complete - messageQueue table is ready in Turso');
  } catch (e: any) {
    if (e.message && e.message.includes('already exists')) {
      console.log('✅ Table already exists - skipping');
    } else {
      console.error('❌ Error:', e.message);
      throw e;
    }
  }
}

migrate().catch(console.error).finally(() => process.exit(0));
