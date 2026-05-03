import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // This will be the Clerk User ID
  email: text("email").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const instances = sqliteTable("instances", {
  id: text("id").primaryKey(), // Unique ID for our system
  userId: text("user_id").notNull().references(() => users.id),
  instanceName: text("instance_name").notNull().unique(), // Evolution API instance name
  phoneNumber: text("phone_number"),
  qrcode: text("qrcode"), // Cached base64 QR code
  webhookUrl: text("webhook_url"), // User's custom webhook URL
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
