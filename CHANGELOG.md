# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Noted transitive dependency vulnerability (CVE-2025-XXXX) in esbuild via drizzle-kit -> @esbuild-kit/esm-loader chain
  - Direct esbuild dependency updated to ^0.25.12 (patched)
  - Transitive dependency from drizzle-kit still uses esbuild@0.18.20 (dev-only, low risk)
  - Monitoring for upstream fix from drizzle-kit maintainers

### Changed
- Updated development dependencies:
  - drizzle-kit: ^0.31.4 -> ^0.31.10
  - react-hook-form: ^7.64.0 -> ^7.72.0
  - @types/node: ^24.7.0 -> ^25.5.0
  - @vitejs/plugin-react: ^5.0.4 -> ^6.0.1
  - cross-env: ^7.0.3 -> ^10.1.0
  - vite: ^7.1.9 -> ^8.0.1
  - vitest: ^2.1.4 -> ^4.1.0
  - esbuild: ^0.25.10 -> ^0.25.12

## [1.0.0] - 2026-03-21

### Added
- Initial release
- Core functionality implemented
- Basic documentation

### Security
- Repository security improvements