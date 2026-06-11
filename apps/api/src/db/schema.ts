import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  businessName: text('business_name'),
  availability: text('availability'),
  plan: text('plan').notNull().default('TRIAL'),
  aiUsageCount: integer('ai_usage_count').default(0),
  aiLimit: integer('ai_limit').default(25),
  aiExpiryDate: text('ai_expiry_date'), // ISO String for bundle expiry
  createdAt: text('created_at').notNull(),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  amount: text('amount').notNull(),
  plan: text('plan').notNull(),
  status: text('status').notNull().default('PENDING'), // PAID, FAILED, PENDING
  method: text('method').notNull(), // ecocash
  reference: text('reference'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdIdx: index('payments_user_id_idx').on(table.userId),
}));

export const instances = sqliteTable('instances', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  instanceName: text('instance_name').notNull().unique(),
  phoneNumber: text('phone_number'),
  status: text('status').notNull().default('DISCONNECTED'), // CONNECTED, DISCONNECTED, CONNECTING
  pairingCode: text('pairing_code'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  userIdIdx: index('instances_user_id_idx').on(table.userId),
}));

export const keywords = sqliteTable('keywords', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  triggers: text('triggers').notNull(), // Comma separated
  matchType: text('match_type').notNull().default('contains'), // exact, contains
  response: text('response').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  usageCount: integer('usage_count').default(0),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdIdx: index('keywords_user_id_idx').on(table.userId),
}));

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: text('price'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdIdx: index('services_user_id_idx').on(table.userId),
}));

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  instanceId: text('instance_id').references(() => instances.id),
  remoteJid: text('remote_jid').notNull(),
  pushName: text('push_name'),
  content: text('content').notNull(),
  fromMe: integer('from_me', { mode: 'boolean' }).default(false),
  responseType: text('response_type'), // ai, keyword, fallback, manual
  timestamp: integer('timestamp').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  userIdIdx: index('messages_user_id_idx').on(table.userId),
  instanceIdIdx: index('messages_instance_id_idx').on(table.instanceId),
  remoteJidIdx: index('messages_remote_jid_idx').on(table.remoteJid),
  timestampIdx: index('messages_timestamp_idx').on(table.timestamp),
}));

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // message_received, ai_reply, keyword_match, etc.
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull(),
});

export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // SUGGEST_KEYWORD, LOW_USAGE_KEYWORD, UPSELL_OPPORTUNITY, etc.
  title: text('title').notNull(),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON string holding context
  isDismissed: integer('is_dismissed').notNull().default(0),
  createdAt: text('created_at').notNull(),
});
