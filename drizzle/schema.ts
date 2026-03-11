import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Conversation table to track user sessions and conversations
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  whatsappPhoneNumber: varchar("whatsappPhoneNumber", { length: 20 }).notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(), // ISO 639-1 code
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Message table to store conversation history
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  language: varchar("language", { length: 10 }).notNull(), // Original language of the message
  translatedContent: text("translatedContent"), // Content translated to English for processing
  messageType: mysqlEnum("messageType", ["text", "voice", "image", "document"]).default("text").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 500 }), // URL for voice/image/document messages
  whatsappMessageId: varchar("whatsappMessageId", { length: 100 }).unique(), // WhatsApp message ID for tracking
  toolCalls: text("toolCalls"), // JSON array of tool calls made for this message
  metadata: text("metadata"), // JSON metadata (confidence scores, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Bot configuration table
export const botConfigs = mysqlTable("botConfigs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt").notNull(), // System prompt for the LLM
  supportedLanguages: text("supportedLanguages").notNull(), // JSON array of supported language codes
  enableTranslation: mysqlEnum("enableTranslation", ["true", "false"]).default("true").notNull(),
  enableVoice: mysqlEnum("enableVoice", ["true", "false"]).default("true").notNull(),
  enableTools: mysqlEnum("enableTools", ["true", "false"]).default("true").notNull(),
  maxContextMessages: int("maxContextMessages").default(10).notNull(),
  responseTimeout: int("responseTimeout").default(30000).notNull(), // milliseconds
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotConfig = typeof botConfigs.$inferSelect;
export type InsertBotConfig = typeof botConfigs.$inferInsert;

// User preferences table
export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("en"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  enableNotifications: mysqlEnum("enableNotifications", ["true", "false"]).default("true"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// WhatsApp webhook events log table
export const whatsappEvents = mysqlTable("whatsappEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 50 }).notNull(), // message, status, error, etc.
  whatsappPhoneNumber: varchar("whatsappPhoneNumber", { length: 20 }).notNull(),
  eventData: text("eventData").notNull(), // JSON data from WhatsApp webhook
  processed: mysqlEnum("processed", ["true", "false"]).default("false"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsappEvent = typeof whatsappEvents.$inferSelect;
export type InsertWhatsappEvent = typeof whatsappEvents.$inferInsert;