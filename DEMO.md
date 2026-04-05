# 🌍 Sauti Afrika Bot - Demo Guide

## Overview

Sauti Afrika Bot is a multilingual AI chatbot supporting African languages: Swahili, Yoruba, Zulu, Amharic, and more. Built with TypeScript, Node.js, Fastify, and OpenAI.

## 🎥 Demo Options

### 1. Interactive Web Demo
Open `public/demo.html` in your browser for an interactive chat experience showcasing:
- Multilingual chat interface
- Language switching (5+ African languages)
- Sample conversation starters
- Channel integration showcase

### 2. API Demo (Command Line)

#### Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

#### WebChat Message
```bash
curl -X POST "http://localhost:3000/api/webchat/message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Habari, unasema Kiswahili?",
    "userId": "demo-user-001",
    "language": "sw"
  }'
```

**Expected Response:**
```json
{
  "reply": "Ndio, nasema Kiswahili vizuri! Unahitaji msaada gani leo?",
    "language": "sw",
    "detected": true,
    "confidence": 0.98
}
```

#### AI Chat with Context
```bash
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Tell me about Yoruba culture" }
    ],
    "language": "en"
  }'
```

## 🖼️ UI Demo

### Chat Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 Sauti Afrika Bot                                    🇰🇪 SW  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🤖 Hello! I'm Sauti Afrika Bot. I can speak multiple          │
│     African languages including Swahili, Yoruba, Zulu,         │
│     and Amharic. How can I help you today?                     │
│                                                                 │
│  👤 What's the weather in Nairobi?                             │
│                                                                 │
│  🤖 Nairobi is currently experiencing warm weather with        │
│     temperatures around 24°C (75°F). It's sunny with           │
│     occasional clouds - a beautiful day!                       │
│                                                                 │
│  👤 Habari za asubuhi?                                         │
│                                                                 │
│  🤖 Habari za asubuhi! Mchana mzuri. Unahitaji msaada gani    │
│     leo?                                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 📝 Type your message...                      [Send ➤]            │
└─────────────────────────────────────────────────────────────────┘
```

### Language Selection
```
┌──────────────────────────────────────────────────────────────┐
│  🌍 Select Language / Chagua Lugha / Ẹ kọ èdè              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  🇬🇧      │ │  🇰🇪      │ │  🇳🇬      │ │  🇿🇦      │       │
│  │ English  │ │Kiswahili │ │ Yorùbá   │ │ isiZulu  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌──────────┐ ┌──────────┐                                  │
│  │  🇪🇹      │ │  🇫🇷      │                                  │
│  │ አማርኛ     │ │ Français │                                  │
│  └──────────┘ └──────────┘                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Supported Channels
```
┌─────────────────────────────────────────────────────────────────┐
│  🔌 Supported Channels                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 Web Chat          ● Active    (Built-in interface)         │
│  📱 WhatsApp          ○ Available (Webhook integration)        │
│  ✈️ Telegram          ○ Available (Bot API)                    │
│  🎮 Discord           ○ Available (Slash commands)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL (optional - can use in-memory)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/mbugus94-lang/sauti-afrika-bot.git
cd sauti-afrika-bot

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev:local    # Mock LLM, no DB, disabled auth
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-your-key-here

# Database (optional)
DATABASE_URL=mysql://user:pass@localhost:3306/sautibot
DISABLE_DB=true  # Use in-memory for local dev

# Auth (optional for local)
DISABLE_AUTH=true

# LLM Provider
LLM_PROVIDER=openai
LLM_MODEL=gpt-4

# Optional: Channel Webhooks
WHATSAPP_WEBHOOK_SECRET=your-secret
TELEGRAM_BOT_TOKEN=your-telegram-token
DISCORD_BOT_TOKEN=your-discord-token
```

## 📱 Channel Integration Examples

### WhatsApp Webhook
```bash
# Verify webhook
curl "https://your-domain.com/api/webhooks/whatsapp?\
  hub.mode=subscribe&\
  hub.verify_token=YOUR_VERIFY_TOKEN&\
  hub.challenge=12345"

# Send message
curl -X POST "http://localhost:3000/api/webhooks/whatsapp" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "254712345678",
            "body": "Habari"
          }]
        }
      }]
    }]
  }'
```

### Telegram Bot
```bash
# Set webhook
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -d "url=https://your-domain.com/api/webhooks/telegram"

# Bot automatically responds to messages via webhook
```

### Discord Slash Command
```bash
# User types /chat in Discord
# Bot responds with AI-generated message
```

## 🗣️ Supported Languages

| Language | Code | Sample Greeting | Status |
|----------|------|-----------------|----------|
| English | en | "Hello!" | ✅ Full |
| Swahili | sw | "Habari!" | ✅ Full |
| Yoruba | yo | "Ẹ ku àárọ!" | ✅ Full |
| Zulu | zu | "Sawubona!" | ✅ Full |
| Amharic | am | "ሰላም!" | ✅ Full |
| French | fr | "Bonjour!" | ✅ Full |

## 🔧 Architecture

```
sauti-afrika-bot/
├── server/
│   ├── _core/
│   │   ├── llm.ts          # LLM integration (OpenAI, Ollama, Mock)
│   │   ├── sdk.ts          # Main SDK for chat
│   │   ├── oauth.ts        # Authentication
│   │   ├── trpc.ts         # tRPC router
│   │   └── ...
│   ├── whatsappRouter.ts   # WhatsApp webhook
│   ├── telegramRouter.ts   # Telegram bot
│   └── language.ts         # Language utilities
├── client/                  # Frontend UI
│   └── src/
│       └── components/
└── public/
    └── demo.html           # Interactive demo
```

## 🎯 Key Features Demo

| Feature | Demo | Description |
|---------|------|-------------|
| Multilingual | `public/demo.html` | Chat in 5+ African languages |
| Auto Detection | API `/api/detect` | Automatically detects input language |
| Context Memory | Chat thread | Maintains conversation context |
| Knowledge RAG | `/api/knowledge` | Retrieval-augmented generation |
| Voice Input | `/api/voice` | Speech-to-text via Whisper |
| Image Gen | `/api/image` | DALL-E image generation |

## 💰 Cost Controls

To reduce API spend:

```bash
# Limit tokens
LLM_MAX_TOKENS=500
LLM_THINKING_BUDGET=200

# Disable expensive features
DISABLE_IMAGE=true
DISABLE_VOICE=true

# Use local Ollama (free)
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
```

## 🧪 Testing

```bash
# Run test suite
npm test

# Type checking
npm run check

# With coverage
npm run test:coverage
```

## 📊 Performance

- **Response Time**: < 2s (OpenAI) / < 500ms (Ollama local)
- **Concurrent Users**: 100+ per instance
- **Memory Usage**: ~150MB (idle), ~300MB (active)
- **Languages**: 5+ supported

## 🎬 Recording a Demo

To create a demo GIF:

1. Open `public/demo.html` in Chrome
2. Start screen recording (Loom, OBS, etc.)
3. Showcase:
   - Language switching (🇬🇧 → 🇰🇪 → 🇳🇬)
   - Sample conversations
   - Channel integration cards
4. Export as GIF or video

## 🔗 API Documentation

When running, access docs at:
- tRPC Panel: http://localhost:3000/api/trpc
- Health Check: http://localhost:3000/health

## 🛣️ Roadmap

- [x] Core multilingual chat
- [x] WhatsApp integration
- [x] Telegram integration
- [x] Discord integration
- [x] WebChat interface
- [x] Language auto-detection
- [ ] More languages (Igbo, Hausa, Xhosa)
- [ ] Voice responses (TTS)
- [ ] Knowledge base expansion
- [ ] Fine-tuning for African contexts

---

**Built with ❤️ by Sam Dwayne**

Connecting Africa through AI 🌍
