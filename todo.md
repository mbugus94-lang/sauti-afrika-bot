# African Language Chatbot - Project TODO

## Phase 1: Project Structure & Database Schema
- [x] Define database schema for messages, conversations, users, and bot configurations
- [x] Create Drizzle ORM schema with tables for message history, user sessions, and settings
- [x] Set up environment variables for API keys (WhatsApp, LLM, Whisper, etc.)

## Phase 2: Language Processing APIs
- [x] Implement language detection endpoint (detect African language from text)
- [x] Implement translation API using NLLB-200 or similar for African language translation
- [x] Integrate Whisper API for speech-to-text (ASR) from voice messages
- [x] Integrate TTS service (Vapi or Google Cloud TTS) for voice response generation
- [x] Create language utilities module for language code mapping and validation

## Phase 3: LLM Integration & Tool Orchestration
- [x] Set up LLM integration layer with context management
- [x] Implement conversation context storage and retrieval
- [x] Build tool orchestration system using LangChain for external API calls
- [x] Create tool definitions for common actions (weather, news, web search, etc.)
- [x] Implement function calling and tool execution logic
- [x] Add error handling and fallback mechanisms for tool failures

## Phase 4: WhatsApp Business API Integration
- [x] Set up WhatsApp Business API webhook endpoints
- [x] Implement message receiving and parsing logic
- [x] Create message sending functionality with media support
- [x] Implement webhook signature verification for security
- [x] Handle different message types (text, voice, media, documents)
- [x] Add rate limiting and retry logic for message delivery

## Phase 5: Message History & User Session Management
- [ ] Implement message storage in database with metadata
- [ ] Create user session management with conversation context
- [ ] Build conversation retrieval and history endpoints
- [ ] Implement session timeout and cleanup logic
- [ ] Add user preferences storage (language, timezone, etc.)

## Phase 6: Admin Dashboard
- [ ] Create admin authentication and role-based access control
- [ ] Build conversation monitoring dashboard with real-time stats
- [ ] Implement bot configuration management interface
- [ ] Add analytics and reporting features (message volume, languages, etc.)
- [ ] Create user management interface
- [ ] Build conversation search and filtering interface
- [ ] Add system health monitoring and logs viewer

## Phase 7: Testing & Documentation
- [ ] Write unit tests for language processing APIs
- [ ] Write integration tests for WhatsApp API integration
- [ ] Write tests for LLM context management
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Write deployment guide and setup instructions
- [ ] Create user guide for admin dashboard

## Phase 4.5: Rate Limiting & Throttling (NEW)
- [x] Create rate limiting module with exponential backoff
- [x] Implement request throttling middleware for tRPC
- [x] Add per-user and per-phone-number rate limits
- [x] Integrate rate limiting into WhatsApp message sending
- [x] Add retry queue with exponential backoff for failed messages
- [x] Write tests for rate limiting and throttling (24 tests passing)
