# TCG Nexus — Automated Testing & Code Coverage Guide (`TESTING.md`)

This guide provides a comprehensive overview of the testing infrastructure, code coverage benchmarks, and execution commands across all applications, microservices, and shared packages in the TCG Nexus monorepo.

---

## 1. Monorepo Testing Overview

TCG Nexus maintains **1,408 automated unit and integration tests** ensuring zero runtime regressions, strict state validation, and high test coverage.

| Application / Package | Technology | Test Engine | Coverage Engine | Line Coverage | Test Count |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **`apps/api`** | NestJS | Jest | v8 / Jest | **82.33%** | 1,220 tests (142 suites) |
| **`apps/web`** | Next.js / React 19 | Vitest | v8 / Vitest | **83.58%** | 131 tests (28 suites) |
| **`apps/mobile`** | Expo / React Native | Node / `tsx` | v8 / Node test | **98.37%** | 14 tests (6 suites) |
| **`apps/fetch`** | Express / TS | Node / `tsx` | v8 / Node test | **82.05%** | 16 tests (3 suites) |
| **`packages/effect-parser`** | TypeScript Rule Engine | Node / `tsx` | v8 / Node test | **74.00%** | 21 tests (4 suites) |
| **`apps/vision`** | Python FastAPI | `unittest` | Python `trace` | **53.80%** | 6 tests (2 suites) |
| **TOTAL MONOREPO** | Monorepo All-in-One | Multi-engine | Aggregated | **>82%** across apps | **1,408 tests (100% Pass)** |

---

## 2. Command Cheatsheet (Root Workspace)

All test and coverage commands can be executed **directly from the root directory** without navigating between folders:

### 🌟 Global Test & Coverage Commands

```bash
# Run ALL 1,408 tests across the entire monorepo:
npm test
# (or)
npm run test:all

# Run code coverage for ALL modules and display the unified summary table:
npm run test:cov
```

---

### 🎯 Module-Specific Coverage Commands (From Root)

Run coverage for any single module directly from the root:

```bash
# Backend NestJS API (apps/api)
npm run test:cov:api

# Frontend Next.js Web Application (apps/web)
npm run test:cov:web

# Data Ingestion Microservice (apps/fetch)
npm run test:cov:fetch

# Effect Parser AST & Rules Engine (packages/effect-parser)
npm run test:cov:effect-parser

# Mobile Expo Application Logic (apps/mobile)
npm run test:cov:mobile

# Vision & OCR Python Microservice (apps/vision)
npm run test:cov:vision
```

---

## 3. Scope & Coverage Details by Workspace

### `apps/api` — NestJS Backend
- **Location**: `apps/api/src/**/*.spec.ts`
- **Scope**:
  - **Match Engine**: Turn transitions, attack calculations, ability triggers, deck validation, status condition resolvers.
  - **Tournaments**: Swiss pairing, single/double elimination brackets, tiebreakers, slot registration locks.
  - **Marketplace**: Order checkout, inventory locks, condition helpers, escrow management.
  - **Deck AI & OCR**: AI analysis engine, vision preprocessor delegation, fallback strategies.
- **Coverage Report**: Generates `coverage/coverage-summary.json` and a formatted summary box in the terminal.

### `apps/web` — Next.js Frontend
- **Location**: `apps/web/test/**/*.{test,spec}.{ts,tsx}`
- **Scope**:
  - **Zustand Stores**: `cart.store.ts` (optimistic updates, currency conversion totals) and `currency.store.ts`.
  - **Services**: `auth.service.ts`, `collection.service.ts`, `pokemonCard.service.ts`, `user-follow.service.ts`.
  - **Components**: `PriceSuggestionHint`, `ShippingPolicyNotice`, `ReferencePrices`, `AddToCollectionDialog`, `PaginatedNav`, `Titles`.
  - **Utilities**: Pricing formatters (`price.ts`), API error translations (`api-error.ts`), order helpers (`order.ts`).
- **Coverage Report**: Generates `coverage/coverage-summary.json` with terminal output.

### `apps/fetch` — Data Ingestion Microservice
- **Location**: `apps/fetch/*.test.ts`
- **Scope**:
  - **Sealed Product Names**: Bilingually composed English names from French catalog descriptions (`sealed-names.test.ts`).
  - **Vocabulary & Join Keys**: Join dictionaries mapping Pokécardex series identifiers to TCGdex sets (`sealed-vocabulary.test.ts`).
  - **R2 Storage**: Key prefix calculation for Cloudflare R2 bucket asset uploads (`r2.test.ts`).

### `packages/effect-parser` — AST Effect Parser
- **Location**: `packages/effect-parser/tests/**/*.test.ts`
- **Scope**:
  - **Zod Schemas**: Strict validation of 20+ card effect types (`DAMAGE`, `HEAL`, `COIN_FLIP`, `SEARCH_DECK`, etc.).
  - **Rule-Based Engine**: Regex and natural-language pattern matching for French attack descriptions and Pokémon talents.

### `apps/mobile` — React Native Application
- **Location**: `apps/mobile/test/**/*.test.ts`
- **Scope**:
  - **Auth Validation**: Email formatting, password strength scoring, registration mismatch rules (`authValidation.test.ts`).
  - **Error Normalization**: Network error detection and Axios error parsing (`apiError.test.ts`).

### `apps/vision` — Vision & OCR Microservice
- **Location**: `apps/vision/test_*.py`
- **Scope**:
  - **SSRF URL Guard**: Blocks private IP ranges (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`), cloud metadata (`169.254.169.254`), and invalid protocols.
  - **Pipeline Test**: Normalization, perspective correction, and ROI crop verification.

---

## 4. Verification & Quality Assurance Rules

Before pushing or merging code, ensure the following checks pass:

1. **All Tests Pass**: `npm test` finishes with `0 failures`.
2. **Type Safety**: `npm run check-types` reports `0 errors`.
3. **No Coverage Degradation**: `npm run test:cov` maintains `>80%` on core modules.
4. **Code Guidelines (`AGENTS.md`)**: All source code comments and TSDoc annotations remain **100% in English** with zero dead code.
