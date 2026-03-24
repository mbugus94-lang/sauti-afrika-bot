# Sauti Afrika Bot - African Language Chatbot

<p align="center">
  <strong>Multilingual AI chatbot for African languages</strong><br>
  <em>Supporting Swahili, Yoruba, Zulu, Amharic and more</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18+-yellow?logo=node.js" alt="Node.js">
  <img src="[[Image 1: unavailable (https://img.shields.io/github/actions/workflow/status/mbugus94-lang/sauti-afrika-bot/ci.yml)]]" alt="CI Status">
</p>

---

## ✨ Features

- 🤖 **Multilingual AI** - Support for Swahili, Yoruba, Zulu, Amharic, and more
- 💬 **Multi-channel** - Webchat, WhatsApp, Telegram, Discord integrations
- 🔐 **Flexible Auth** - OAuth or local dev mode
- 💾 **Database Options** - MySQL or in-memory
- ⚡ **Cost Controls** - Token limits and feature toggles
- 🌍 **African-focused** - Designed for African languages and contexts

---

## 🚀 Quick Start

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mbugus94-lang/sauti-afrika-bot.git
cd sauti-afrika-bot
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev:local
```

5. Open `http://localhost:3000`

---

## 🔍 Health Checks

The API includes a health check endpoint for monitoring:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

---

## 🤖 LLM Configuration (Any Provider)

Use any OpenAI-compatible endpoint (local or hosted). You can also disable the external API entirely and use mock mode.

### Local Ollama
```bash
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.1:8b
```

### Mock Mode (No Network)
```bash
LLM_PROVIDER=mock
```

### OpenAI / Compatible
```bash
LLM_PROVIDER=openai
LLM_API_KEY=your_api_key
# Optionally set LLM_BASE_URL for proxies
```

### Manus/Forge
```bash
LLM_PROVIDER=forge
BUILT_IN_FORGE_API_URL=your_url
BUILT_IN_FORGE_API_KEY=your_key
```

**Note:** `LLM_BASE_URL` should be the base URL without `/v1/chat/completions`. The server appends the path automatically.

---

## 💾 Database Options

- **In-memory** (default for local): `DISABLE_DB=true`
- **MySQL**: Set `DATABASE_URL=mysql://user:pass@host:3306/dbname` and `DISABLE_DB=false`

---

## 🔐 Auth Options

- **Local Dev**: `DISABLE_AUTH=true` uses a local dev user
- **Production**: `DISABLE_AUTH=false` and configure:
  - `OAUTH_SERVER_URL`
  - `VITE_APP_ID`
  - `JWT_SECRET`

You can switch to any auth provider by adapting `server/_core/oauth.ts` and `server/_core/sdk.ts`.

---

## 💰 Cost Controls

Lower spend by reducing tokens and disabling optional services:

| Variable | Description |
|----------|-------------|
| `LLM_MAX_TOKENS` | Maximum tokens per request |
| `LLM_THINKING_BUDGET` | Token budget for thinking |
| `DISABLE_TRANSLATION` | Disable translation feature |
| `DISABLE_LANGUAGE_DETECTION` | Disable language detection |
| `DISABLE_VOICE` | Disable voice features |
| `DISABLE_IMAGE` | Disable image generation |

---

## 📱 Channel Integrations

The server includes webhook endpoints for WhatsApp, Telegram, and Discord, plus a built-in webchat API for the frontend.

### Endpoints

| Channel | Endpoint | Method |
|---------|----------|--------|
| Webchat | `/api/webchat/message` | POST |
| WhatsApp Verify | `/api/webhooks/whatsapp` | GET |
| WhatsApp Messages | `/api/webhooks/whatsapp` | POST |
| Telegram | `/api/webhooks/telegram` | POST |
| Discord | `/api/webhooks/discord` | POST |

### Environment Variables

**WhatsApp:**
- `WHATSAPP_WEBHOOK_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

**Telegram:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

**Discord:**
- `DISCORD_BOT_TOKEN`
- `DISCORD_APP_ID`
- `DISCORD_PUBLIC_KEY`

**Notes:**
- Discord uses slash command `/chat` and must be configured in your Discord app
- Telegram supports the `x-telegram-bot-api-secret-token` header for webhook verification
- WhatsApp requires signature verification using `WHATSAPP_WEBHOOK_SECRET`

---

## 🎓 Niche Training / Domain Adaptation

You can make the assistant behave like a domain expert without fine-tuning by:
- Editing the system prompt (see `DEFAULT_SYSTEM_PROMPT` in `.env` or the bot config table)
- Adding a retrieval layer (RAG) that injects knowledge from your documents before calling the LLM

If you want true fine-tuning, we can add a training pipeline based on your provider and dataset.

---

## 🚀 Deployment Targets

This can be deployed as:
- A web app (Vite + Node server)
- A private internal tool
- A channel bot (WhatsApp/Telegram/Discord) using the webhook endpoints above

### Environment-Specific Deployment

**Vercel:**
```bash
npm run build
vercel --prod
```

**Docker:**
```bash
docker build -t sauti-bot .
docker run -p 3000:3000 --env-file .env sauti-bot
```

**Traditional Server:**
```bash
npm run build
npm start
```

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Change the port
PORT=3001 npm run dev:local
```

**Database connection errors:**
- Check `DATABASE_URL` format
- Ensure MySQL is running and accessible
- Or set `DISABLE_DB=true` for local development

**Authentication errors:**
- For local dev, use `DISABLE_AUTH=true`
- For production, ensure all OAuth variables are set

**LLM not responding:**
- Check `LLM_PROVIDER` is set correctly
- Verify API keys for your chosen provider
- Try `LLM_PROVIDER=mock` to test without external APIs

**Build failures:**
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run with your `.env` |
| `pnpm dev:local` | Mock LLM, no DB, disabled auth |
| `pnpm build` | Build client and server bundle |
| `pnpm start` | Serve the built server |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run test suite |
| `pnpm db:push` | Generate and run migrations |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/mbugus94-lang">David Gakere</a>
</p>