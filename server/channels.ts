import type { User } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getUserByOpenId, upsertUser, getOrCreateConversation } from "./db";

export type ChannelType = "webchat" | "whatsapp" | "telegram" | "discord";

const ensureUser = async (
  openId: string,
  name?: string
): Promise<User> => {
  await upsertUser({
    openId,
    name: name ?? null,
    role: openId === ENV.ownerOpenId ? "admin" : "user",
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(openId);
  if (!user) {
    throw new Error(`Failed to resolve user for ${openId}`);
  }
  return user;
};

export const getChannelOpenId = (channel: ChannelType, externalId: string) =>
  `${channel}:${externalId}`;

export const getChannelAddress = (channel: ChannelType, externalId: string) =>
  `${channel}:${externalId}`;

export async function getOrCreateChannelConversation(
  channel: ChannelType,
  externalId: string,
  name?: string,
  language: string = ENV.defaultLanguage
) {
  const openId = getChannelOpenId(channel, externalId);
  const user = await ensureUser(openId, name);
  return getOrCreateConversation(user.id, getChannelAddress(channel, externalId), language);
}
