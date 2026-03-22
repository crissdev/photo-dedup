# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (includes Prisma generation)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking

# Database
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev  # Run migrations in development

# Docker (starts PostgreSQL)
docker compose up -d

# Testing
npm run test:unit        # Unit tests (Vitest)
npm run test:ui          # Component tests (Vitest + Playwright browser)
npm run test:integration # Integration tests with real DB via Testcontainers
npm run test:e2e         # End-to-end tests (Playwright, Chrome only)

# Run a single test file
npx vitest run tests/unit/some.test.ts
```

## Environment

Requires a `.env` file with:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` — 44-char base64 key
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `POSTGRES_HOST`

`docker-compose.yml` provides a PostgreSQL 17 instance for local dev.

## Architecture

**Next.js 16 App Router** with React 19, TypeScript, Tailwind CSS 4, Radix UI, and Prisma 7 + PostgreSQL.

### Composition root

`src/lib/server/index.ts` exports `storeService` (Prisma-backed) and `loggerService`. All server-side code imports these singletons rather than instantiating dependencies directly.

### Server-side layers (`src/lib/server/`)

- **`db/`** — `Store` interface + `prisma-store.ts` adapter; unit-of-work/transaction pattern with nested transaction guards.
- **`photos/scanner.service.ts`** — 3-pass scan: collect files → MD5 hash → group duplicates. Emits progress events.
- **`photos/file-ops.service.ts`** — Soft delete (moves to `.photo-dedup-trash/`) and restore with audit trail.
- **`photos/scan-jobs.ts`** — In-memory job registry with pub/sub for SSE streaming and cancellation.
- **`photos/photos.types.ts`** — Shared domain types.

### API routes (`src/app/api/photos/`)

| Route                    | Method        | Purpose                               |
| ------------------------ | ------------- | ------------------------------------- |
| `/scan`                  | POST / DELETE | Start or cancel a scan job            |
| `/scan/[jobId]/progress` | GET           | SSE stream of scan progress           |
| `/files`                 | GET           | Directory listing with scan metadata  |
| `/duplicates`            | GET           | All duplicate groups                  |
| `/delete`                | POST          | Soft-delete files (batch)             |
| `/restore`               | POST          | Restore from trash                    |
| `/thumbnail`             | GET           | Resized image via Sharp (cached)      |
| `/media`                 | GET           | Full media with range request support |
| `/actions`               | GET           | Paginated action history              |
| `/home`                  | GET           | User home directory                   |

### Frontend (`src/app/photos/`)

Two main client components:

- `photo-explorer.tsx` — Scan controls, directory browser, duplicate viewer, grid layout.
- `action-history.tsx` — Paginated restore interface.

### Prisma schema (3 models)

- `ScannedFile` — indexed by MD5 hash, tracks each file's scan state.
- `DuplicateGroup` — links files sharing a hash.
- `FileAction` — audit log of deletions and restores.

### Testing strategy

- **Unit** (`tests/unit/`) — pure logic, uses `fake-store.ts` in-memory implementation.
- **UI** (`tests/ui/`) — Vitest + Playwright browser driver with MSW for HTTP mocking.
- **Integration** (`tests/integration/`) — hits a real PostgreSQL via Testcontainers.
- **E2E** (`tests/e2e/`) — full Playwright suite against the running app (Chrome only).
