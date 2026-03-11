/**
 * Conversation Context Management
 * Handles conversation state, history, and context for the LLM
 */

import {
  getConversationHistory,
  getConversationById,
  saveMessage,
} from "./db";
import type { Message } from "../drizzle/schema";

/**
 * Conversation context interface
 */
export interface ConversationContext {
  conversationId: number;
  userId: number;
  userLanguage: string;
  messageHistory: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  metadata: {
    createdAt: Date;
    lastMessageAt: Date | null;
    messageCount: number;
    userPreferences?: Record<string, unknown>;
  };
}

/**
 * Load conversation context from database
 */
export async function loadConversationContext(
  conversationId: number,
  maxMessages: number = 10
): Promise<ConversationContext | null> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return null;
    }

    const messages = await getConversationHistory(conversationId, maxMessages);

    // Convert database messages to LLM message format
    const messageHistory = messages.map((msg: Message) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.translatedContent || msg.content, // Use translated content if available
    }));

    return {
      conversationId,
      userId: conversation.userId,
      userLanguage: conversation.language,
      messageHistory,
      metadata: {
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
        messageCount: messages.length,
      },
    };
  } catch (error) {
    console.error("Error loading conversation context:", error);
    return null;
  }
}

/**
 * Add message to conversation context
 */
export async function addMessageToContext(
  conversationId: number,
  role: "user" | "assistant" | "system",
  content: string,
  language: string,
  translatedContent?: string,
  messageType: ("text" | "voice" | "image" | "document") = "text",
  mediaUrl?: string,
  whatsappMessageId?: string
): Promise<number> {
  try {
    const messageId = await saveMessage(
      conversationId,
      role,
      content,
      language,
      messageType,
      mediaUrl,
      whatsappMessageId
    );

    // Update translated content if provided
    if (translatedContent && translatedContent !== content) {
      // In a real implementation, you would update the message with translated content
      // For now, we'll just log it
      console.log(`Message ${messageId} translated from ${language} to English`);
    }

    return messageId;
  } catch (error) {
    console.error("Error adding message to context:", error);
    throw error;
  }
}

/**
 * Build system prompt with context
 */
export function buildSystemPrompt(
  basePrompt: string,
  context: ConversationContext,
  additionalContext?: Record<string, unknown>
): string {
  let systemPrompt = basePrompt;

  // Add language context
  systemPrompt += `\n\nUser's language: ${context.userLanguage}`;
  systemPrompt += `\nRespond in the user's language: ${context.userLanguage}`;

  // Add conversation context
  if (context.messageHistory.length > 0) {
    systemPrompt += `\n\nThis is a continuation of an ongoing conversation with ${context.messageHistory.length} previous messages.`;
  }

  // Add additional context if provided
  if (additionalContext) {
    systemPrompt += `\n\nAdditional context:`;
    for (const [key, value] of Object.entries(additionalContext)) {
      systemPrompt += `\n- ${key}: ${JSON.stringify(value)}`;
    }
  }

  return systemPrompt;
}

/**
 * Format conversation history for LLM
 */
export function formatConversationHistory(
  context: ConversationContext,
  maxMessages: number = 10
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  // Get the most recent messages
  const recentMessages = context.messageHistory.slice(-maxMessages);

  return recentMessages;
}

/**
 * Extract context from conversation history
 * Identifies key topics, entities, and preferences mentioned in the conversation
 */
export function extractContextFromHistory(
  context: ConversationContext
): {
  topics: string[];
  entities: string[];
  preferences: Record<string, unknown>;
  sentiment: "positive" | "neutral" | "negative";
} {
  const topics: string[] = [];
  const entities: string[] = [];
  const preferences: Record<string, unknown> = {};
  let sentiment: "positive" | "neutral" | "negative" = "neutral";

  // Simple extraction logic (in production, use NLP)
  for (const message of context.messageHistory) {
    if (message.role === "user") {
      // Extract common topics from user messages
      if (message.content.includes("weather")) topics.push("weather");
      if (message.content.includes("news")) topics.push("news");
      if (message.content.includes("help")) topics.push("help");

      // Sentiment analysis (simplified)
      if (
        message.content.includes("great") ||
        message.content.includes("good")
      ) {
        sentiment = "positive";
      } else if (
        message.content.includes("bad") ||
        message.content.includes("terrible")
      ) {
        sentiment = "negative";
      }
    }
  }

  return {
    topics: Array.from(new Set(topics)), // Remove duplicates
    entities,
    preferences,
    sentiment,
  };
}

/**
 * Summarize conversation context
 * Creates a brief summary of the conversation for context
 */
export function summarizeConversationContext(
  context: ConversationContext
): string {
  const messageCount = context.messageHistory.length;
  const userMessages = context.messageHistory.filter(
    (m) => m.role === "user"
  ).length;
  const assistantMessages = context.messageHistory.filter(
    (m) => m.role === "assistant"
  ).length;

  return `Conversation Summary: ${messageCount} total messages (${userMessages} user, ${assistantMessages} assistant). User language: ${context.userLanguage}. Last message: ${context.metadata.lastMessageAt ? new Date(context.metadata.lastMessageAt).toLocaleString() : "No messages yet"}.`;
}

/**
 * Check if conversation context needs refresh
 * Returns true if context is stale or incomplete
 */
export function isContextStale(
  context: ConversationContext,
  maxAgeMinutes: number = 30
): boolean {
  if (!context.metadata.lastMessageAt) {
    return true;
  }

  const lastMessageTime = new Date(context.metadata.lastMessageAt).getTime();
  const currentTime = new Date().getTime();
  const ageMinutes = (currentTime - lastMessageTime) / (1000 * 60);

  return ageMinutes > maxAgeMinutes;
}

/**
 * Merge contexts
 * Combines multiple conversation contexts (useful for multi-turn conversations)
 */
export function mergeContexts(
  ...contexts: ConversationContext[]
): ConversationContext {
  if (contexts.length === 0) {
    throw new Error("At least one context is required");
  }

  const primaryContext = contexts[0];
  const mergedHistory: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }> = [];

  // Merge all message histories
  for (const context of contexts) {
    mergedHistory.push(...context.messageHistory);
  }

  return {
    ...primaryContext,
    messageHistory: mergedHistory,
    metadata: {
      ...primaryContext.metadata,
      messageCount: mergedHistory.length,
    },
  };
}
