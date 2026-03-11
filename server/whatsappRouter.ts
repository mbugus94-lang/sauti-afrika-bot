/**
 * WhatsApp Router
 * Handles WhatsApp webhook endpoints
 */

import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  verifyWebhookSignature,
  processWhatsAppWebhook,
  type WhatsAppWebhookMessage,
} from "./whatsappIntegration";

/**
 * WhatsApp webhook router
 * Handles incoming messages and status updates from WhatsApp
 */
export const whatsappRouter = router({
  // Webhook POST endpoint for receiving messages
  webhook: publicProcedure
    .input(
      z.object({
        body: z.record(z.string(), z.unknown()),
        signature: z.string(),
        phoneNumberId: z.string(),
        accessToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get webhook secret from environment
        const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || "";

        // Verify the signature
        const bodyString = JSON.stringify(input.body);
        const signatureHeader = `sha256=${input.signature}`;
        const isValid = verifyWebhookSignature(
          bodyString,
          signatureHeader,
          webhookSecret
        );

        if (!isValid) {
          return {
            success: false,
            error: "Invalid webhook signature",
          };
        }

        // Process the webhook
        const webhookData = input.body as unknown as WhatsAppWebhookMessage;
        await processWhatsAppWebhook(
          webhookData,
          input.phoneNumberId,
          input.accessToken
        );

        return {
          success: true,
          message: "Webhook processed successfully",
        };
      } catch (error) {
        console.error("Error processing WhatsApp webhook:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  // Webhook GET endpoint for verification (WhatsApp requires this)
  verify: publicProcedure
    .input(
      z.object({
        "hub.mode": z.string().optional(),
        "hub.challenge": z.string().optional(),
        "hub.verify_token": z.string().optional(),
      })
    )
    .query(async (opts) => {
      const { input } = opts;
      try {
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";

        // Verify the token
        if (input["hub.verify_token"] !== verifyToken) {
          return {
            success: false,
            error: "Invalid verify token",
          };
        }

        // Return the challenge for WhatsApp verification
        return {
          success: true,
          challenge: input["hub.challenge"],
        };
      } catch (error) {
        console.error("Error verifying WhatsApp webhook:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),
});
