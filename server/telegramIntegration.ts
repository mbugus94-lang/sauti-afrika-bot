import axios from "axios";
import { ENV } from "./_core/env";
import { processUserMessage } from "./chatbot";
import { getOrCreateChannelConversation } from "./channels";

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    date: number;
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

const buildTelegramApiUrl = (path: string) =>
  `https://api.telegram.org/bot${ENV.telegramBotToken}/${path}`;

const resolveDisplayName = (update: TelegramUpdate) => {
  const from = update.message?.from;
  if (!from) return "Telegram User";
  return [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "Telegram User";
};

export async function sendTelegramMessage(chatId: number, text: string) {
  if (!ENV.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  await axios.post(buildTelegramApiUrl("sendMessage"), {
    chat_id: chatId,
    text,
  });
}

export async function processTelegramWebhook(update: TelegramUpdate) {
  if (!ENV.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const message = update.message;
  if (!message || !message.text) {
    return { ok: true };
  }

  const chatId = message.chat.id;
  const externalId = String(chatId);
  const displayName = resolveDisplayName(update);

  const conversation = await getOrCreateChannelConversation(
    "telegram",
    externalId,
    displayName
  );

  const response = await processUserMessage(
    conversation.id,
    message.text
  );

  await sendTelegramMessage(chatId, response.assistantMessage);
  return { ok: true };
}
