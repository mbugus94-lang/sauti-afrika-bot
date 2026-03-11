/**
 * WhatsApp Business API Integration
 * Handles message receiving, sending, and webhook management
 * Includes rate limiting and retry queue with exponential backoff
 */

import crypto from "crypto";
import axios from "axios";
import { logWhatsappEvent, getOrCreateConversation } from "./db";
import { processUserMessage } from "./chatbot";
import {
  whatsappRateLimiter,
  RetryQueue,
  retryWithBackoff,
  type RetryConfig,
  type RetryQueueEntry,
} from "./rateLimiting";

/**
 * WhatsApp webhook message interface
 */
export interface WhatsAppWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: "text" | "image" | "audio" | "document" | "video";
          text?: {
            body: string;
          };
          image?: {
            id: string;
            mime_type: string;
            sha256: string;
          };
          audio?: {
            id: string;
            mime_type: string;
          };
          document?: {
            id: string;
            mime_type: string;
            filename: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

/**
 * WhatsApp message sending interface
 */
export interface WhatsAppMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  [key: string]: unknown;
}

/**
 * WhatsApp message queue entry
 */
export interface WhatsAppQueueEntry {
  phoneNumberId: string;
  recipientPhoneNumber: string;
  message: string;
  accessToken: string;
  messageType: "text" | "media";
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video" | "document";
  caption?: string;
}

// Initialize retry queue for WhatsApp messages
const whatsappRetryConfig: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 1 minute
  backoffMultiplier: 2,
};

export const whatsappRetryQueue = new RetryQueue<WhatsAppQueueEntry>(
  whatsappRetryConfig
);

// Set up the retry handler
whatsappRetryQueue.setHandler(async (entry: RetryQueueEntry<WhatsAppQueueEntry>) => {
  try {
    if (entry.data.messageType === "text") {
      const result = await sendWhatsAppMessageDirect(
        entry.data.phoneNumberId,
        entry.data.recipientPhoneNumber,
        entry.data.message,
        entry.data.accessToken
      );
      return result.success;
    } else {
      const result = await sendWhatsAppMediaMessageDirect(
        entry.data.phoneNumberId,
        entry.data.recipientPhoneNumber,
        entry.data.mediaUrl!,
        entry.data.mediaType!,
        entry.data.caption,
        entry.data.accessToken
      );
      return result.success;
    }
  } catch (error) {
    console.error(`Error retrying WhatsApp message ${entry.id}:`, error);
    return false;
  }
});

// Start the retry queue processor
whatsappRetryQueue.start(2000); // Process queue every 2 seconds

/**
 * Verify WhatsApp webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  const expectedSignature = `sha256=${hash}`;
  return signature === expectedSignature;
}

/**
 * Send a text message via WhatsApp (direct, without rate limiting)
 * Used internally by retry queue
 */
async function sendWhatsAppMessageDirect(
  phoneNumberId: string,
  recipientPhoneNumber: string,
  message: string,
  accessToken: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload: WhatsAppMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: "text",
      text: {
        body: message,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      messageId: (response.data.messages as any)?.[0]?.id,
    };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Send a text message via WhatsApp with rate limiting and retry logic
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  recipientPhoneNumber: string,
  message: string,
  accessToken: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  queued?: boolean;
}> {
  // Check rate limit
  const rateLimitKey = `whatsapp:${recipientPhoneNumber}`;
  if (!whatsappRateLimiter.isAllowed(rateLimitKey)) {
    const resetTime = whatsappRateLimiter.getResetTime(rateLimitKey);
    const waitTime = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 1;

    console.warn(
      `Rate limit exceeded for ${recipientPhoneNumber}. Adding to retry queue. Wait ${waitTime}s.`
    );

    // Add to retry queue
    const queueId = `${recipientPhoneNumber}-${Date.now()}`;
    whatsappRetryQueue.add(queueId, {
      phoneNumberId,
      recipientPhoneNumber,
      message,
      accessToken,
      messageType: "text",
    });

    return {
      success: false,
      queued: true,
      error: `Rate limit exceeded. Message queued for retry.`,
    };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload: WhatsAppMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: "text",
      text: {
        body: message,
      },
    };

    const response = await retryWithBackoff(
      async () => {
        return await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      },
      {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }
    );

    return {
      success: true,
      messageId: (response.data.messages as any)?.[0]?.id,
    };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);

    // Add to retry queue on failure
    const queueId = `${recipientPhoneNumber}-${Date.now()}`;
    whatsappRetryQueue.add(queueId, {
      phoneNumberId,
      recipientPhoneNumber,
      message,
      accessToken,
      messageType: "text",
    });

    return {
      success: false,
      queued: true,
      error: `Failed to send message. Added to retry queue: ${error}`,
    };
  }
}

/**
 * Send a media message via WhatsApp (direct, without rate limiting)
 * Used internally by retry queue
 */
async function sendWhatsAppMediaMessageDirect(
  phoneNumberId: string,
  recipientPhoneNumber: string,
  mediaUrl: string,
  mediaType: "image" | "audio" | "video" | "document",
  caption?: string,
  accessToken?: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const mediaPayload: Record<string, unknown> = {
      link: mediaUrl,
    };
    if (caption) {
      mediaPayload.caption = caption;
    }

    const payload: WhatsAppMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      messageId: (response.data.messages as any)?.[0]?.id,
    };
  } catch (error) {
    console.error("Error sending WhatsApp media message:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Send a media message via WhatsApp with rate limiting and retry logic
 */
export async function sendWhatsAppMediaMessage(
  phoneNumberId: string,
  recipientPhoneNumber: string,
  mediaUrl: string,
  mediaType: "image" | "audio" | "video" | "document",
  caption?: string,
  accessToken?: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  queued?: boolean;
}> {
  if (!accessToken) {
    return {
      success: false,
      error: "Access token is required",
    };
  }

  // Check rate limit
  const rateLimitKey = `whatsapp:${recipientPhoneNumber}`;
  if (!whatsappRateLimiter.isAllowed(rateLimitKey)) {
    const resetTime = whatsappRateLimiter.getResetTime(rateLimitKey);
    const waitTime = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 1;

    console.warn(
      `Rate limit exceeded for ${recipientPhoneNumber}. Adding media to retry queue. Wait ${waitTime}s.`
    );

    // Add to retry queue
    const queueId = `${recipientPhoneNumber}-media-${Date.now()}`;
    whatsappRetryQueue.add(queueId, {
      phoneNumberId,
      recipientPhoneNumber,
      message: "",
      accessToken,
      messageType: "media",
      mediaUrl,
      mediaType,
      caption,
    });

    return {
      success: false,
      queued: true,
      error: `Rate limit exceeded. Media message queued for retry.`,
    };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const mediaPayload: Record<string, unknown> = {
      link: mediaUrl,
    };
    if (caption) {
      mediaPayload.caption = caption;
    }

    const payload: WhatsAppMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    const response = await retryWithBackoff(
      async () => {
        return await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      },
      {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }
    );

    return {
      success: true,
      messageId: (response.data.messages as any)?.[0]?.id,
    };
  } catch (error) {
    console.error("Error sending WhatsApp media message:", error);

    // Add to retry queue on failure
    const queueId = `${recipientPhoneNumber}-media-${Date.now()}`;
    whatsappRetryQueue.add(queueId, {
      phoneNumberId,
      recipientPhoneNumber,
      message: "",
      accessToken,
      messageType: "media",
      mediaUrl,
      mediaType,
      caption,
    });

    return {
      success: false,
      queued: true,
      error: `Failed to send media message. Added to retry queue: ${error}`,
    };
  }
}

/**
 * Process incoming WhatsApp webhook
 */
export async function processWhatsAppWebhook(
  webhookData: WhatsAppWebhookMessage,
  phoneNumberId: string,
  accessToken: string
): Promise<void> {
  try {
    // Extract message data from webhook
    for (const entry of webhookData.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Log the event
        await logWhatsappEvent(
          "webhook_received",
          value.metadata.display_phone_number,
          {
            type: "message_received",
            timestamp: new Date().toISOString(),
          }
        );

        // Process incoming messages
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const contactName = value.contacts && value.contacts.length > 0
              ? value.contacts[0].profile.name
              : "Unknown";
            await processIncomingMessage(
              message,
              contactName,
              phoneNumberId,
              accessToken
            );
          }
        }

        // Process message status updates
        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            await logWhatsappEvent(
              "message_status",
              value.metadata.display_phone_number,
              {
                messageId: status.id,
                status: status.status,
                timestamp: status.timestamp,
              }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    throw error;
  }
}

/**
 * Process a single incoming message
 */
export async function processIncomingMessage(
  message: NonNullable<WhatsAppWebhookMessage["entry"][0]["changes"][0]["value"]["messages"]>[0],
  senderName: string,
  phoneNumberId: string,
  accessToken: string
): Promise<void> {
  try {
    const senderPhoneNumber = message.from;

    // Log the incoming message
    await logWhatsappEvent("message_received", senderPhoneNumber, {
      messageId: message.id,
      type: message.type,
      timestamp: message.timestamp,
    });

    // For now, we'll create a placeholder user and conversation
    // In production, you would integrate with your user management system
    const userId = 1; // Placeholder user ID

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      userId,
      senderPhoneNumber,
      "en" // Default language, would be detected from user preferences
    );

    // Process different message types
    let messageContent = "";
    let messageType: "text" | "voice" | "image" | "document" = "text";
    let mediaUrl: string | undefined;

    if (message.type === "text" && message.text) {
      messageContent = message.text.body;
    } else if (message.type === "audio" && message.audio) {
      messageType = "voice";
      mediaUrl = message.audio.id; // Would need to download from WhatsApp
      messageContent = "[Voice message]";
    } else if (message.type === "image" && message.image) {
      messageType = "image";
      mediaUrl = message.image.id;
      messageContent = "[Image message]";
    } else if (message.type === "document" && message.document) {
      messageType = "document";
      mediaUrl = message.document.id;
      messageContent = `[Document: ${message.document.filename}]`;
    }

    if (!messageContent) {
      console.warn(`Unsupported message type: ${message.type}`);
      return;
    }

    // Process the message through the chatbot
    const response = await processUserMessage(
      conversation.id,
      messageContent
    );

    // Send the response back via WhatsApp
    const sendResult = await sendWhatsAppMessage(
      phoneNumberId,
      senderPhoneNumber,
      response.assistantMessage,
      accessToken
    );

    if (!sendResult.success) {
      console.error(`Failed to send WhatsApp response: ${sendResult.error}`);
      await logWhatsappEvent("message_send_failed", senderPhoneNumber, {
        error: sendResult.error,
        originalMessageId: message.id,
      });
    } else {
      await logWhatsappEvent("message_sent", senderPhoneNumber, {
        messageId: sendResult.messageId,
        originalMessageId: message.id,
        queued: sendResult.queued,
      });
    }
  } catch (error) {
    console.error("Error processing incoming message:", error);
    throw error;
  }
}

/**
 * Get WhatsApp media URL
 */
export async function getWhatsAppMediaUrl(
  mediaId: string,
  accessToken: string
): Promise<string> {
  try {
    const url = `https://graph.facebook.com/v18.0/${mediaId}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data.url;
  } catch (error) {
    console.error("Error getting WhatsApp media URL:", error);
    throw error;
  }
}
