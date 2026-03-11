/**
 * Main Chatbot Module
 * Orchestrates the complete conversation flow including language processing,
 * context management, LLM integration, and tool execution
 */

import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import {
  detectLanguageFromText,
  processMessageLanguage,
  translateResponseToUserLanguage,
} from "./languageProcessing";
import {
  loadConversationContext,
  addMessageToContext,
  buildSystemPrompt,
  formatConversationHistory,
  extractContextFromHistory,
} from "./conversationContext";
import {
  generateResponseWithTools,
  processToolCalls,
} from "./toolOrchestration";
import { getActiveBotConfig } from "./db";
import type { ConversationContext } from "./conversationContext";

/**
 * Chatbot response interface
 */
export interface ChatbotResponse {
  conversationId: number;
  userMessage: string;
  detectedLanguage: string;
  assistantMessage: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  metadata: {
    processingTime: number;
    contextUsed: boolean;
    translationUsed: boolean;
  };
}

/**
 * Process a user message and generate a response
 */
export async function processUserMessage(
  conversationId: number,
  userMessage: string,
  userLanguage?: string
): Promise<ChatbotResponse> {
  const startTime = Date.now();

  try {
    // Step 1: Load conversation context
    const context = await loadConversationContext(conversationId);
    if (!context) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Step 2: Detect language if not provided
    let detectedLanguage =
      userLanguage || context.userLanguage || ENV.defaultLanguage;
    if (!userLanguage && ENV.enableLanguageDetection) {
      detectedLanguage = await detectLanguageFromText(userMessage);
    }

    // Step 3: Get bot configuration
    const botConfig = await getActiveBotConfig();
    if (!botConfig) {
      throw new Error("No active bot configuration found");
    }

    // Step 4: Process message language (translate if needed)
    const processedMessage = await processMessageLanguage(
      userMessage,
      detectedLanguage,
      botConfig.enableTranslation === "true" && ENV.enableTranslation
    );

    // Step 5: Save user message to database
    await addMessageToContext(
      conversationId,
      "user",
      userMessage,
      detectedLanguage,
      processedMessage.translatedText,
      "text"
    );

    // Step 6: Build system prompt with context
    const contextInfo = extractContextFromHistory(context);
    const systemPrompt = buildSystemPrompt(
      botConfig.systemPrompt,
      context,
      {
        topics: contextInfo.topics,
        userSentiment: contextInfo.sentiment,
      }
    );

    // Step 7: Prepare messages for LLM
    const maxContextMessages =
      Number(botConfig.maxContextMessages) > 0
        ? Number(botConfig.maxContextMessages)
        : 10;
    const conversationHistory = formatConversationHistory(
      context,
      maxContextMessages
    );
    const llmMessages = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: processedMessage.translatedText || userMessage,
      },
    ];

    // Step 8: Generate response with tools
    const enableTools =
      botConfig.enableTools === "true" && ENV.enableTools;
    const { response: assistantMessage, toolCalls } =
      await generateResponseWithTools(
        llmMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        systemPrompt,
        enableTools
      );

    // Step 9: Translate response back to user's language if needed
    let finalResponse = assistantMessage;
    let translationUsed = false;

    if (
      detectedLanguage !== "en" &&
      botConfig.enableTranslation === "true" &&
      ENV.enableTranslation
    ) {
      finalResponse = await translateResponseToUserLanguage(
        assistantMessage,
        detectedLanguage
      );
      translationUsed = true;
    }

    // Step 10: Save assistant message to database
    await addMessageToContext(
      conversationId,
      "assistant",
      finalResponse,
      detectedLanguage,
      assistantMessage, // Store English version as translated content
      "text"
    );

    const processingTime = Date.now() - startTime;

    return {
      conversationId,
      userMessage,
      detectedLanguage,
      assistantMessage: finalResponse,
      toolCalls,
      metadata: {
        processingTime,
        contextUsed: !!context,
        translationUsed,
      },
    };
  } catch (error) {
    console.error("Error processing user message:", error);
    throw error;
  }
}

/**
 * Generate a response for a voice message
 */
export async function processVoiceMessage(
  conversationId: number,
  audioUrl: string,
  language?: string
): Promise<ChatbotResponse & { audioResponse?: string }> {
  try {
    // This would integrate with transcribeAudioToText from languageProcessing
    // For now, we'll throw an error indicating it needs to be implemented
    throw new Error("Voice message processing requires audio transcription setup");
  } catch (error) {
    console.error("Error processing voice message:", error);
    throw error;
  }
}

/**
 * Get conversation summary
 */
export async function getConversationSummary(
  conversationId: number
): Promise<{
  conversationId: number;
  messageCount: number;
  topics: string[];
  lastMessage: string;
  createdAt: Date;
}> {
  try {
    const context = await loadConversationContext(conversationId);
    if (!context) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const contextInfo = extractContextFromHistory(context);
    const lastMessage =
      context.messageHistory.length > 0
        ? context.messageHistory[context.messageHistory.length - 1].content
        : "No messages";

    return {
      conversationId,
      messageCount: context.messageHistory.length,
      topics: contextInfo.topics,
      lastMessage,
      createdAt: context.metadata.createdAt,
    };
  } catch (error) {
    console.error("Error getting conversation summary:", error);
    throw error;
  }
}

/**
 * Clear conversation history
 */
export async function clearConversationHistory(
  conversationId: number
): Promise<void> {
  try {
    // In a real implementation, you would delete messages from the database
    // For now, this is a placeholder
    console.log(`Clearing conversation history for ${conversationId}`);
  } catch (error) {
    console.error("Error clearing conversation history:", error);
    throw error;
  }
}

/**
 * Export conversation as JSON
 */
export async function exportConversation(
  conversationId: number
): Promise<{
  conversationId: number;
  messages: Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>;
}> {
  try {
    const context = await loadConversationContext(conversationId, 1000);
    if (!context) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // This would need to be enhanced to include actual timestamps
    const messages = context.messageHistory.map((msg, index) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(), // Would need actual timestamp from DB
    }));

    return {
      conversationId,
      messages,
    };
  } catch (error) {
    console.error("Error exporting conversation:", error);
    throw error;
  }
}
