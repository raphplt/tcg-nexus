# TCG Nexus — Agent & Developer Guidelines (`AGENTS.md`)

Welcome to the **TCG Nexus** codebase. This document outlines the architectural standards, development workflow, coding conventions, and documentation rules for all AI agents and human contributors working on this monorepo.

---

## 1. Repository Architecture & Structure

TCG Nexus is structured as a TypeScript monorepo powered by **Turborepo** and **npm workspaces**.

### Applications (`apps/`)

- **`apps/api`**: Core NestJS backend server.
  - **Database**: PostgreSQL with TypeORM and `pgvector` extension for visual/vector embeddings.
  - **Features**: Authentication (JWT & sessions), Card Catalog & Multi-Language Localization, Collection Management, Marketplace (Listings, Checkout & Orders), Tournament Management (Brackets, Seeding, State Transitions, Standings), Live Game Engine & WebSockets (`mini-game`, online play), AI Deck Analysis, Card Scanning (OCR & Vision pipeline).
- **`apps/web`**: Next.js web application (Frontend).
- **`apps/mobile`**: Expo / React Native mobile application.
- **`apps/vision`**: Microservice handling card image processing, ROI cropping, OCR, and CLIP feature vectorization.
- **`apps/fetch`**: Express-based data fetching microservice for third-party catalog sync.
- **`apps/docs`**: Technical documentation web portal.

### Shared Packages (`packages/`)

- **`packages/scan-contract`**: Shared TypeScript contracts, DTOs, and type definitions for the card scanner API.
- **`packages/effect-parser`**: Parser and rule engine for Pokémon card attack and ability effects.
- **`packages/pokemon-dataset`**: Localized dataset definitions and card seed data.
- **`packages/ui`**: Shared React UI component library.
- **`packages/typescript-config`**: Shared `tsconfig.json` bases across apps and packages.

---

## 2. The 5 Golden Rules of Code Documentation & Quality

All AI agents and developers must strictly adhere to the following 5 Golden Rules across all codebase files:

### Rule 1: Single Language — 100% English

- **Zero Non-English Comments**: ALL code comments, TSDoc annotations, commit messages, and internal notes MUST be written in **English**. No French or other languages allowed in source code comments.
- **Runtime Messages**: User-facing error messages in localized responses (DTOs, exception messages) follow localization policies, but code-level documentation is strictly English.

### Rule 2: Noise Removal & Clean Code

- **No Dead Code**: Remove all commented-out code blocks (dead code) before finalizing edits.
- **No Redundant Syntax Echoing**: Remove superficial comments that merely repeat what the code line does (e.g. avoid `// Increment i` or `// Declare variable`).
- **Focus on Intent & Rationale**: Retain only high-value comments explaining _why_ a design decision was made, complex domain rules, or non-obvious algorithms.

### Rule 3: Standardized TSDoc / JSDoc for Public API

- Add clean, standardized TSDoc comment blocks above all **exported** functions, methods, classes, interfaces, and types.
- Format example:
  ```typescript
  /**
   * Executes state transitions for a tournament, validating rules and side-effects.
   *
   * @param id - Tournament unique identifier.
   * @param targetStatus - Next target status transition.
   * @returns Updated tournament entity.
   * @throws NotFoundException If tournament does not exist.
   * @throws BadRequestException If transition is invalid according to state machine rules.
   */
  ```

### Rule 4: Standardized Tagging (`TODO` / `FIXME` / `NOTE`)

- Use standardized uppercase tags for inline operational notes:
  - `// TODO: <actionable description>`
  - `// FIXME: <known bug or edge-case to fix>`
  - `// NOTE: <important architectural constraint>`

### Rule 5: Zero-Breaking & Verified Compilation

- **Preserve Runtime Contracts**: Never alter public API signatures or expected error contract formats without explicit coordination.
- **Always Verify**: Run compilation checks (`npx tsc --noEmit` or `npm run check-types`) to ensure 0 TypeScript or build errors before completing any task.

---

## 3. Backend Conventions (`apps/api`)

### NestJS Module Architecture

- Organize code into domain-focused NestJS feature modules (`src/<domain>/`).
- Each feature module should contain its respective `controller.ts`, `service.ts`, `module.ts`, entities, DTOs, and specs (`.spec.ts`).
- Use dependency injection (`@Injectable()`) for services, guards, interceptors, and repositories.

### DTOs & Validation

- Always define explicit Data Transfer Objects (DTOs) for request bodies and query parameters.
- Decorate DTO properties with `class-validator` rules (`@IsString()`, `@IsNumber()`, `@IsOptional()`, `@IsEnum()`, `@ValidateNested()`).
- Transform request payloads using `class-transformer` (`@Type()`).

### Database & TypeORM Guidelines

- **Transactions & Concurrency**: Use `manager.transaction(...)` or `queryRunner` for critical operations modifying multiple entities.
- **Pessimistic Locking**: Use pessimistic write locks (`lock: { mode: "pessimistic_write" }`) when claiming limited resources (e.g. tournament slot registration, marketplace stock updates).
- **Error Exceptions**: Throw standard NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException`, `UnauthorizedException`).

---

## 4. Frontend & Design Conventions (`apps/web` & `apps/mobile`)

- **Design Aesthetics**: Deliver clean, modern UI designs using structured design tokens, responsive layouts, subtle animations, and accessible contrast ratio.
- **Shared Contracts**: Import scanner contracts, payload types, and shared data schemas directly from workspace packages (e.g. `@repo/scan-contract`).
- **Type Safety**: Avoid using `any` or loose casts in React components and custom hooks.

---

## 5. Development & Verification Workflow

### Command Cheatsheet

```bash
# Install dependencies
npm install

# Start development servers (Turborepo)
npm run dev

# Run type check across monorepo
npm run check-types

# Run backend compilation check without emitting files
cd apps/api && npx tsc --noEmit

# Run seed data population
npm run seed

# Run code formatter
npm run format

# Run test suites
npm run test:cov
```

### Quality Assurance Checklist Before Finalizing Code:

1. [ ] Are all code comments and TSDoc annotations in **English**?
2. [ ] Have all dead/commented-out code blocks been removed?
3. [ ] Are exported functions and interfaces documented with proper TSDoc?
4. [ ] Does `npx tsc --noEmit` pass with zero errors?
5. [ ] Have existing tests passed cleanly?
