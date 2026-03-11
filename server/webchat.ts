import { ENV } from "./_core/env";
import { processUserMessage } from "./chatbot";
import { getOrCreateChannelConversation } from "./channels";

export type WebchatMessageRequest = {
  message: string;
  sessionId: string;
  conversationId?: number;
  language?: string;
};

export type WebchatMessageResponse = {
  conversationId: number;
  reply: string;
  detectedLanguage: string;
};

export async function handleWebchatMessage(
  payload: WebchatMessageRequest
): Promise<WebchatMessageResponse> {
  if (!payload.message || payload.message.trim().length === 0) {
    throw new Error("Message is required");
  }
  if (!payload.sessionId || payload.sessionId.trim().length === 0) {
    throw new Error("sessionId is required");
  }

  let conversationId = payload.conversationId;
  if (!conversationId) {
    const conversation = await getOrCreateChannelConversation(
      "webchat",
      payload.sessionId,
      "Web Chat User",
      payload.language || ENV.defaultLanguage
    );
    conversationId = conversation.id;
  }

  const response = await processUserMessage(
    conversationId,
    payload.message,
    payload.language
  );

  return {
    conversationId,
    reply: response.assistantMessage,
    detectedLanguage: response.detectedLanguage,
  };
}
