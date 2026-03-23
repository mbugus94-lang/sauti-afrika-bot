# African Language Chatbot

<p align="center">
  <strong>Multilingual AI chatbot for African languages - supporting Swahili, Yoruba, Zulu, Amharic and more.</strong><br>
  <em>Server + client starter for a multilingual chatbot focused on African languages</em>
</p>

## Quick start (local, no APIs)
1. Install Node 18+ and pnpm.
2. Copy `.env.example` to `.env` and keep the defaults.
3. Run `pnpm install`.
4. Run `pnpm dev:local`.
5. Open `http://localhost:3000`.

## LLM Configuration (any provider)
Use any OpenAI-compatible endpoint (local or hosted). You can also disable the external API entirely and use mock mode.

- Local Ollama: set `LLM_PROVIDER=ollama`, `LLM_BASE_URL=http://localhost:11434`, `LLM_MODEL=llama3.1:8b`.
- Mock mode (no network): set `LLM_PROVIDER=mock`.
- OpenAI/compatible: set `LLM_PROVIDER=openai`, `LLM_API_KEY=...`, and optionally `LLM_BASE_URL` if using a proxy.
- Manus/Forge: set `LLM_PROVIDER=forge` and `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`.

`LLM_BASE_URL` should be the base URL without `/v1/chat/completions`. The server appends the path automatically.

## Database options
- In-memory (default for local): `DISABLE_DB=true`.
- MySQL: set `DATABASE_URL=mysql://user:pass@host:3306/dbname` and `DISABLE_DB=false`.

## Auth options
- Local dev: `DISABLE_AUTH=true` uses a local dev user.
- Production: `DISABLE_AUTH=false` and configure `OAUTH_SERVER_URL`, `VITE_APP_ID`, and `JWT_SECRET`.
- You can switch to any auth provider by adapting `server/_core/oauth.ts` and `server/_core/sdk.ts`.

## Cost controls
Lower spend by reducing tokens and disabling optional services:

- `LLM_MAX_TOKENS`
- `LLM_THINKING_BUDGET`
- `DISABLE_TRANSLATION`
- `DISABLE_LANGUAGE_DETECTION`
- `DISABLE_VOICE`
- `DISABLE_IMAGE`

## Channel Integrations
The server includes webhook endpoints for WhatsApp, Telegram, and Discord, plus a built-in webchat API for the frontend.

Endpoints:
- Webchat: `POST /api/webchat/message`
- WhatsApp: `GET /api/webhooks/whatsapp` (verify), `POST /api/webhooks/whatsapp`
- Telegram: `POST /api/webhooks/telegram`
- Discord: `POST /api/webhooks/discord` (Interactions)

Environment variables:
- WhatsApp: `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- Discord: `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`

Notes:
- Discord uses slash command `/chat` and must be configured in your Discord app.
- Telegram supports the `x-telegram-bot-api-secret-token` header for webhook verification.
- WhatsApp requires signature verification using `WHATSAPP_WEBHOOK_SECRET`.

## Niche Training / Domain Adaptation
You can make the assistant behave like a domain expert without fine-tuning by:
- Editing the system prompt (see `DEFAULT_SYSTEM_PROMPT` in `.env` or the bot config table).
- Adding a retrieval layer (RAG) that injects knowledge from your documents before calling the LLM.

If you want true fine-tuning, we can add a training pipeline based on your provider and dataset.

## Deployment Targets
This can be deployed as:
- A web app (Vite + Node server).
- A private internal tool.
- A channel bot (WhatsApp/Telegram/Discord) using the webhook endpoints above.

Tell me the target environment and provider and I will add a deployment guide and scripts.

## Scripts
- `pnpm dev` runs the app with your `.env`.
- `pnpm dev:local` uses mock LLM, no DB, and disabled auth.
- `pnpm build` builds the client and server bundle.
- `pnpm start` serves the built server.
