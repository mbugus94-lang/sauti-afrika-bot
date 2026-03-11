import { verifyKey } from "discord-interactions";
import { ENV } from "./_core/env";
import { processUserMessage } from "./chatbot";
import { getOrCreateChannelConversation } from "./channels";

type DiscordInteraction = {
  type: number;
  id: string;
  token?: string;
  channel_id?: string;
  data?: {
    name?: string;
    options?: Array<{ name: string; value: string }>;
  };
  member?: {
    user?: {
      id: string;
      username?: string;
    };
  };
  user?: {
    id: string;
    username?: string;
  };
};

const MAX_DISCORD_MESSAGE = 2000;

const truncateDiscordMessage = (value: string) =>
  value.length > MAX_DISCORD_MESSAGE
    ? `${value.slice(0, MAX_DISCORD_MESSAGE - 1)}…`
    : value;

export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  if (!ENV.discordPublicKey) {
    throw new Error("DISCORD_PUBLIC_KEY is not configured");
  }
  return verifyKey(body, signature, timestamp, ENV.discordPublicKey);
}

const getInteractionUser = (interaction: DiscordInteraction) =>
  interaction.member?.user ?? interaction.user;

export async function handleDiscordInteraction(interaction: DiscordInteraction) {
  if (interaction.type === 1) {
    return { type: 1 };
  }

  if (interaction.type !== 2) {
    return {
      type: 4,
      data: {
        content: "Unsupported interaction type.",
      },
    };
  }

  const command = interaction.data?.name;
  if (command !== "chat") {
    return {
      type: 4,
      data: {
        content: "Unknown command. Try /chat.",
      },
    };
  }

  const options = interaction.data?.options ?? [];
  const messageOption =
    options.find(option => option.name === "message") ??
    options.find(option => option.name === "text") ??
    options[0];

  const message = messageOption?.value?.toString() ?? "";
  if (!message) {
    return {
      type: 4,
      data: {
        content: "Please provide a message.",
      },
    };
  }

  const user = getInteractionUser(interaction);
  const externalId = `${user?.id ?? "unknown"}:${interaction.channel_id ?? "unknown"}`;
  const displayName = user?.username ?? "Discord User";

  const conversation = await getOrCreateChannelConversation(
    "discord",
    externalId,
    displayName
  );

  const response = await processUserMessage(conversation.id, message);

  return {
    type: 4,
    data: {
      content: truncateDiscordMessage(response.assistantMessage),
    },
  };
}
