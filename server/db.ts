import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  botConfigs,
  conversations,
  messages,
  userPreferences,
  users,
  whatsappEvents,
} from "../drizzle/schema";
import type {
  BotConfig,
  Conversation,
  InsertUser,
  Message,
  User,
  UserPreferences,
  WhatsappEvent,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

type MemoryStore = {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  botConfigs: BotConfig[];
  userPreferences: UserPreferences[];
  whatsappEvents: WhatsappEvent[];
  counters: {
    users: number;
    conversations: number;
    messages: number;
    botConfigs: number;
    userPreferences: number;
    whatsappEvents: number;
  };
};

const memoryStore: MemoryStore = {
  users: [],
  conversations: [],
  messages: [],
  botConfigs: [],
  userPreferences: [],
  whatsappEvents: [],
  counters: {
    users: 1,
    conversations: 1,
    messages: 1,
    botConfigs: 1,
    userPreferences: 1,
    whatsappEvents: 1,
  },
};

const now = () => new Date();

const ensureRole = (user: InsertUser): "user" | "admin" => {
  if (user.role === "admin" || user.role === "user") return user.role;
  return user.openId === ENV.ownerOpenId ? "admin" : "user";
};

const getDefaultBotConfig = (): BotConfig => {
  const createdAt = now();
  return {
    id: memoryStore.counters.botConfigs++,
    name: "Default",
    description: "Auto-generated default configuration",
    systemPrompt:
      process.env.DEFAULT_SYSTEM_PROMPT ??
      "You are a helpful multilingual assistant for African languages.",
    supportedLanguages: JSON.stringify(["en"]),
    enableTranslation: ENV.enableTranslation ? "true" : "false",
    enableVoice: ENV.enableVoice ? "true" : "false",
    enableTools: ENV.enableTools ? "true" : "false",
    maxContextMessages: 10,
    responseTimeout: 30_000,
    isActive: "true",
    createdAt,
    updatedAt: createdAt,
  };
};

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (ENV.disableDb) {
    return null;
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const existing = memoryStore.users.find(u => u.openId === user.openId);
    if (!existing) {
      const createdAt = now();
      memoryStore.users.push({
        id: memoryStore.counters.users++,
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: ensureRole(user),
        createdAt,
        updatedAt: createdAt,
        lastSignedIn: user.lastSignedIn ?? createdAt,
      });
      return;
    }

    if (user.name !== undefined) existing.name = user.name ?? null;
    if (user.email !== undefined) existing.email = user.email ?? null;
    if (user.loginMethod !== undefined) existing.loginMethod = user.loginMethod ?? null;
    if (user.lastSignedIn !== undefined) existing.lastSignedIn = user.lastSignedIn;
    existing.role = ensureRole(user);
    existing.updatedAt = now();
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return memoryStore.users.find(user => user.openId === openId);
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation queries
export async function getOrCreateConversation(
  userId: number,
  whatsappPhoneNumber: string,
  language: string = "en"
) {
  const db = await getDb();
  if (!db) {
    const existing = memoryStore.conversations.find(
      convo =>
        convo.userId === userId &&
        convo.whatsappPhoneNumber === whatsappPhoneNumber
    );
    if (existing) return existing;

    const createdAt = now();
    const conversation: Conversation = {
      id: memoryStore.counters.conversations++,
      userId,
      whatsappPhoneNumber,
      language,
      isActive: "true",
      lastMessageAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    memoryStore.conversations.push(conversation);
    return conversation;
  }

  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.whatsappPhoneNumber, whatsappPhoneNumber)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new conversation
  const result = await db.insert(conversations).values({
    userId,
    whatsappPhoneNumber,
    language,
    isActive: "true",
  });

  return {
    id: result[0].insertId as number,
    userId,
    whatsappPhoneNumber,
    language,
    isActive: "true",
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getConversationById(conversationId: number) {
  const db = await getDb();
  if (!db) {
    return (
      memoryStore.conversations.find(convo => convo.id === conversationId) ??
      null
    );
  }

  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Message queries
export async function saveMessage(
  conversationId: number,
  role: "user" | "assistant" | "system",
  content: string,
  language: string,
  messageType: "text" | "voice" | "image" | "document" = "text",
  mediaUrl?: string,
  whatsappMessageId?: string
) {
  const db = await getDb();
  if (!db) {
    const createdAt = now();
    const message: Message = {
      id: memoryStore.counters.messages++,
      conversationId,
      role,
      content,
      language,
      translatedContent: null,
      messageType,
      mediaUrl: mediaUrl ?? null,
      whatsappMessageId: whatsappMessageId ?? null,
      toolCalls: null,
      metadata: null,
      createdAt,
    };
    memoryStore.messages.push(message);
    return message.id;
  }

  const result = await db.insert(messages).values({
    conversationId,
    role,
    content,
    language,
    messageType,
    mediaUrl,
    whatsappMessageId,
  });

  return result[0].insertId;
}

export async function getConversationHistory(
  conversationId: number,
  limit: number = 10
) {
  const db = await getDb();
  if (!db) {
    return memoryStore.messages
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(m => m.createdAt)
    .limit(limit);
}

export async function getMessageById(messageId: number) {
  const db = await getDb();
  if (!db) {
    return memoryStore.messages.find(message => message.id === messageId);
  }

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Bot configuration queries
export async function getBotConfig(botConfigId: number) {
  const db = await getDb();
  if (!db) {
    return (
      memoryStore.botConfigs.find(config => config.id === botConfigId) ?? null
    );
  }

  const result = await db
    .select()
    .from(botConfigs)
    .where(eq(botConfigs.id, botConfigId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getActiveBotConfig() {
  const db = await getDb();
  if (!db) {
    let active = memoryStore.botConfigs.find(cfg => cfg.isActive === "true");
    if (!active) {
      active = getDefaultBotConfig();
      memoryStore.botConfigs.push(active);
    }
    return active;
  }

  const result = await db
    .select()
    .from(botConfigs)
    .where(eq(botConfigs.isActive, "true"))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllBotConfigs() {
  const db = await getDb();
  if (!db) {
    return memoryStore.botConfigs;
  }

  return db.select().from(botConfigs);
}

export async function createBotConfig(
  name: string,
  systemPrompt: string,
  supportedLanguages: string[]
) {
  const db = await getDb();
  if (!db) {
    const createdAt = now();
    const config: BotConfig = {
      id: memoryStore.counters.botConfigs++,
      name,
      description: null,
      systemPrompt,
      supportedLanguages: JSON.stringify(supportedLanguages),
      enableTranslation: "true",
      enableVoice: "true",
      enableTools: "true",
      maxContextMessages: 10,
      responseTimeout: 30_000,
      isActive: "true",
      createdAt,
      updatedAt: createdAt,
    };
    memoryStore.botConfigs.push(config);
    return config.id;
  }

  const result = await db.insert(botConfigs).values({
    name,
    systemPrompt,
    supportedLanguages: JSON.stringify(supportedLanguages),
    enableTranslation: "true",
    enableVoice: "true",
    enableTools: "true",
    isActive: "true",
  });

  return result[0].insertId;
}

// User preferences queries
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) {
    return memoryStore.userPreferences.find(pref => pref.userId === userId) ?? null;
  }

  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function upsertUserPreferences(
  userId: number,
  preferredLanguage?: string,
  timezone?: string
) {
  const db = await getDb();
  if (!db) {
    const existing = memoryStore.userPreferences.find(pref => pref.userId === userId);
    if (existing) {
      existing.preferredLanguage = preferredLanguage || existing.preferredLanguage;
      existing.timezone = timezone || existing.timezone;
      existing.updatedAt = now();
      return;
    }
    const createdAt = now();
    memoryStore.userPreferences.push({
      id: memoryStore.counters.userPreferences++,
      userId,
      preferredLanguage: preferredLanguage || "en",
      timezone: timezone || "UTC",
      enableNotifications: "true",
      createdAt,
      updatedAt: createdAt,
    });
    return;
  }

  const existing = await getUserPreferences(userId);

  if (existing) {
    await db
      .update(userPreferences)
      .set({
        preferredLanguage: preferredLanguage || existing.preferredLanguage,
        timezone: timezone || existing.timezone,
      })
      .where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({
      userId,
      preferredLanguage: preferredLanguage || "en",
      timezone: timezone || "UTC",
    });
  }
}

// WhatsApp events queries
export async function logWhatsappEvent(
  eventType: string,
  whatsappPhoneNumber: string,
  eventData: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) {
    const createdAt = now();
    const event: WhatsappEvent = {
      id: memoryStore.counters.whatsappEvents++,
      eventType,
      whatsappPhoneNumber,
      eventData: JSON.stringify(eventData),
      processed: "false",
      createdAt,
    };
    memoryStore.whatsappEvents.push(event);
    return event;
  }

  return db.insert(whatsappEvents).values({
    eventType,
    whatsappPhoneNumber,
    eventData: JSON.stringify(eventData),
    processed: "false",
  });
}

export async function getUnprocessedWhatsappEvents(limit: number = 100) {
  const db = await getDb();
  if (!db) {
    return memoryStore.whatsappEvents
      .filter(event => event.processed === "false")
      .slice(0, limit);
  }

  return db
    .select()
    .from(whatsappEvents)
    .where(eq(whatsappEvents.processed, "false"))
    .limit(limit);
}

export async function markWhatsappEventAsProcessed(eventId: number) {
  const db = await getDb();
  if (!db) {
    const event = memoryStore.whatsappEvents.find(e => e.id === eventId);
    if (event) {
      event.processed = "true";
    }
    return event;
  }

  return db
    .update(whatsappEvents)
    .set({ processed: "true" })
    .where(eq(whatsappEvents.id, eventId));
}
