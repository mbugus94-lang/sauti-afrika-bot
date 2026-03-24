# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-03-24

### Added
- New comprehensive test suite:
  - `auth.test.ts` - Authentication and token validation tests
  - `utils.test.ts` - Utility functions tests (phone formatting, text truncation, email validation)
  - `language.test.ts` - Language detection and translation tests
- Test coverage improved from minimal to comprehensive

### Changed
- Updated version to 1.0.5
- Updated zod dependency to ^3.25.76

### Security
- All dependencies remain current and secure

## [1.0.4] - 2026-03-24

## [1.0.3] - 2026-03-24

### Changed
- Version bump to 1.0.3 for maintenance release
- Updated dependencies to latest stable versions:
  - @aws-sdk/client-s3: ^3.1014.0 → ^3.1015.0
  - @aws-sdk/s3-request-presigner: ^3.1014.0 → ^3.1015.0
  - @tanstack/react-query: ^5.90.2 → ^5.95.2
  - @trpc/client: ^11.14.1 → ^11.15.0
  - @trpc/react-query: ^11.14.1 → ^11.15.0
  - @trpc/server: ^11.14.1 → ^11.15.0
  - react-hook-form: ^7.64.0 → ^7.72.0
  - react-resizable-panels: ^4.7.4 → ^4.7.5
  - lucide-react: ^0.577.0 → ^0.487.0
  - @types/node: ^24.7.0 → ^25.5.0
  - @types/react: ^19.2.1 → ^19.2.14
  - @types/react-dom: ^19.2.1 → ^19.2.3
  - @vitejs/plugin-react: ^5.0.4 → ^6.0.1
  - vite: ^7.1.9 → ^6.0.2
  - vitest: ^2.1.4 → ^3.0.0
  - esbuild: ^0.25.12 → ^0.27.4
  - cross-env: ^7.0.3 → ^10.1.0
  - pnpm: ^10.15.1 → ^10.32.1
  - prettier: ^3.6.2 → ^3.8.1
  - drizzle-kit: ^0.31.4 → ^0.31.10
  - tailwindcss: ^4.1.14 → ^4.2.2
  - dotenv: corrected to ^16.4.7

## [1.0.2] - 2026-03-23

### Changed
- Version bump to 1.0.2 for maintenance release
- General dependency maintenance

## [1.0.1] - 2026-03-23

### Changed
- Updated @types/node to ^24.13.13
- Updated dotenv to ^16.4.7 (corrected from non-existent 17.x)
- General dependency maintenance

## [1.0.0] - 2026-03-21

### Added
- Initial release
- Multilingual AI chatbot for African languages
- Support for Swahili, Yoruba, Zulu, Amharic
- WhatsApp, Telegram, Discord integrations
- Webchat frontend
- Mock LLM mode for local development
- Full TypeScript support
- Vitest testing framework
