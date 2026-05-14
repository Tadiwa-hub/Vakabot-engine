import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // This will be the Clerk User ID
  email: text("email").notNull(),
  businessName: text("business_name"),
  businessType: text("business_type"),
  location: text("location"),
  hours: text("hours"),
  ownerName: text("owner_name"),
  aiInstructions: text("ai_instructions"),
  aiUsageCount: integer("ai_usage_count").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const instances = sqliteTable("instances", {
  id: text("id").primaryKey(), // Unique ID for our system
  userId: text("user_id").notNull().references(() => users.id),
  instanceName: text("instance_name").notNull().unique(), // Evolution API instance name
  phoneNumber: text("phone_number"),
  qrcode: text("qrcode"), // Cached base64 QR code
  pairingCode: text("pairing_code"), // Cached 8-digit pairing code
  webhookUrl: text("webhook_url"), // User's custom webhook URL
  isGroupEnabled: integer("is_group_enabled", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("DISCONNECTED"), // CONNECTED, DISCONNECTED, CONNECTING
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const autoReplies = sqliteTable("auto_replies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  instanceId: text("instance_id").notNull().references(() => instances.id),
  keyword: text("keyword").notNull(),
  replyText: text("reply_text").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price"), // Stored as text for flexibility (e.g. "$50", "Contact for price")
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const chatHistory = sqliteTable("chat_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  customerJid: text("customer_jid").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// SaaS: Subscription Plans
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // free, basic, pro
  priceUsd: integer("price_usd").notNull(),
  aiResponsesLimit: integer("ai_responses_limit").notNull(),
  whatsappNumbersLimit: integer("whatsapp_numbers_limit").notNull(),
  keywordsLimit: integer("keywords_limit").notNull(),
});

// SaaS: Business Subscriptions
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  planId: text("plan_id").notNull().references(() => plans.id),
  status: text("status").notNull().default("active"), // active, expired, cancelled
  startedAt: text("started_at").default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
  paynowReference: text("paynow_reference"),
});

// SaaS: Payments Log
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  planId: text("plan_id"), // Added this
  amount: integer("amount").notNull(),
  currency: text("currency").default("USD"),
  reference: text("reference"), // Added this
  method: text("method"), // Added this (ecocash/onemoney)
  pollUrl: text("poll_url"), // Renamed for simplicity
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Usage: Groq API Tracking
export const groqUsage = sqliteTable("groq_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // Nullable for global tracking
  date: text("date").notNull(), // YYYY-MM-DD
  minuteTimestamp: text("minute_timestamp").notNull(), // YYYY-MM-DD HH:mm
  requestsCount: integer("requests_count").default(0),
  tokensCount: integer("tokens_count").default(0),
});

// Usage: Anti-Ban Instance Tracking
export const instanceUsage = sqliteTable("instance_usage", {
  id: text("id").primaryKey(),
  instanceId: text("instance_id").notNull().references(() => instances.id),
  date: text("date").notNull(), // YYYY-MM-DD
  hour: text("hour").notNull(), // 0-23
  messageCount: integer("message_count").default(0),
});
// Chat Management: Human Takeover & Pausing
export const chatMeta = sqliteTable("chat_meta", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  customerJid: text("customer_jid").notNull(),
  pausedUntil: text("paused_until"), // ISO timestamp
  lastHumanInteractionAt: text("last_human_interaction_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Message Queue: Retry Logic for Failed Messages
export const messageQueue = sqliteTable("message_queue", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  instanceName: text("instance_name").notNull(),
  remoteJid: text("remote_jid").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(5),
  lastRetryAt: text("last_retry_at"),
  error: text("error"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Activity Logs: Tracking system and user events
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  instanceId: text("instance_id").references(() => instances.id),
  event: text("event").notNull(), // e.g., 'INSTANCE_CREATED', 'PAYMENT_SUCCESS', 'WEBHOOK_ERROR'
  details: text("details"),
  level: text("level").notNull().default("info"), // info, warn, error
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Contacts: Simplified contact management
export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  jid: text("jid").notNull(),
  name: text("name"),
  phoneNumber: text("phone_number"),
  lastInteractionAt: text("last_interaction_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Scheduled Messages: For bulk and planned broadcasts
export const scheduledMessages = sqliteTable("scheduled_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  instanceId: text("instance_id").notNull().references(() => instances.id),
  remoteJid: text("remote_jid").notNull(), // or 'ALL' for broadcast
  message: text("message").notNull(),
  scheduledAt: text("scheduled_at").notNull(), // ISO timestamp
  status: text("status").notNull().default("pending"), // pending, sent, failed, cancelled
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});


