const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  llmProvider: (process.env.LLM_PROVIDER ?? "forge").toLowerCase(),
  llmBaseUrl: process.env.LLM_BASE_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
  llmMaxTokens: parseNumber(process.env.LLM_MAX_TOKENS, 2048),
  llmThinkingBudget: parseNumber(process.env.LLM_THINKING_BUDGET, 0),
  llmTemperature: parseNumber(process.env.LLM_TEMPERATURE, 0.2),
  llmTimeoutMs: parseNumber(process.env.LLM_TIMEOUT_MS, 60_000),
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? "en",
  languageDetectionMode: (process.env.LANGUAGE_DETECTION_MODE ?? "llm").toLowerCase(),
  enableTranslation: !parseBoolean(process.env.DISABLE_TRANSLATION),
  enableLanguageDetection: !parseBoolean(process.env.DISABLE_LANGUAGE_DETECTION),
  enableTools: !parseBoolean(process.env.DISABLE_TOOLS),
  enableVoice: !parseBoolean(process.env.DISABLE_VOICE),
  enableImage: !parseBoolean(process.env.DISABLE_IMAGE),
  disableAuth: parseBoolean(process.env.DISABLE_AUTH),
  disableDb: parseBoolean(process.env.DISABLE_DB),
  devUserId: parseNumber(process.env.DEV_USER_ID, 1),
  devUserOpenId: process.env.DEV_USER_OPENID ?? "dev-user",
  devUserName: process.env.DEV_USER_NAME ?? "Developer",
  devUserRole: (process.env.DEV_USER_ROLE ?? "admin").toLowerCase(),
  whatsappWebhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  discordBotToken: process.env.DISCORD_BOT_TOKEN ?? "",
  discordAppId: process.env.DISCORD_APP_ID ?? "",
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY ?? "",
};
