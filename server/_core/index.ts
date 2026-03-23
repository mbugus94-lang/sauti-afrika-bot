import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { handleWebchatMessage } from "../webchat";
import {
  processWhatsAppWebhook,
  verifyWebhookSignature,
} from "../whatsappIntegration";
import { processTelegramWebhook } from "../telegramIntegration";
import {
  handleDiscordInteraction,
  verifyDiscordSignature,
} from "../discordIntegration";

type RawBodyRequest = Request & { rawBody?: string };

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = buf.toString("utf8");
      },
    })
  );
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Webchat endpoint (no auth required)
  app.post("/api/webchat/message", async (req: Request, res: Response) => {
    try {
      const { message, sessionId, conversationId, language } = req.body ?? {};
      const response = await handleWebchatMessage({
        message,
        sessionId,
        conversationId,
        language,
      });
      res.status(200).json(response);
    } catch (error) {
      console.error("[Webchat] Failed to process message:", error);
      res.status(400).json({ error: String(error) });
    }
  });

  // WhatsApp webhook verification
  app.get("/api/webhooks/whatsapp", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === ENV.whatsappVerifyToken) {
      res.status(200).send(challenge ?? "");
      return;
    }

    res.status(403).json({ error: "Verification failed" });
  });

  // WhatsApp webhook receiver
  app.post("/api/webhooks/whatsapp", async (req: RawBodyRequest, res: Response) => {
    try {
      if (!ENV.whatsappWebhookSecret) {
        res.status(500).json({ error: "WHATSAPP_WEBHOOK_SECRET is not configured" });
        return;
      }
      if (!ENV.whatsappPhoneNumberId || !ENV.whatsappAccessToken) {
        res.status(500).json({ error: "WhatsApp credentials are not configured" });
        return;
      }

      const signature = req.header("x-hub-signature-256") ?? "";
      const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        ENV.whatsappWebhookSecret
      );

      if (!isValid) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }

      await processWhatsAppWebhook(
        req.body,
        ENV.whatsappPhoneNumberId,
        ENV.whatsappAccessToken
      );
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[WhatsApp] Webhook error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Telegram webhook receiver
  app.post("/api/webhooks/telegram", async (req: Request, res: Response) => {
    try {
      if (!ENV.telegramBotToken) {
        res.status(500).json({ error: "TELEGRAM_BOT_TOKEN is not configured" });
        return;
      }

      if (ENV.telegramWebhookSecret) {
        const secret = req.header("x-telegram-bot-api-secret-token");
        if (secret !== ENV.telegramWebhookSecret) {
          res.status(401).json({ error: "Invalid Telegram webhook secret" });
          return;
        }
      }

      await processTelegramWebhook(req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Telegram] Webhook error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Discord interactions endpoint
  app.post("/api/webhooks/discord", async (req: RawBodyRequest, res: Response) => {
    try {
      const signature = req.header("x-signature-ed25519") ?? "";
      const timestamp = req.header("x-signature-timestamp") ?? "";
      const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});

      const isValid = verifyDiscordSignature(rawBody, signature, timestamp);
      if (!isValid) {
        res.status(401).json({ error: "Invalid Discord signature" });
        return;
      }

      const response = await handleDiscordInteraction(req.body);
      res.status(200).json(response);
    } catch (error) {
      console.error("[Discord] Webhook error:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(), 
      uptime: process.uptime() 
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
