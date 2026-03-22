# photo-dedup

A web application for finding and cleaning up duplicate photos and videos across a directory tree.

## Features

- **Directory scanning** — recursively scan any local directory for duplicate media files
- **Duplicate detection** — identifies exact duplicates using MD5 hash comparison
- **Real-time progress** — scan progress streamed via Server-Sent Events, with cancellation support
- **Visual explorer** — browse scanned files in a grid, with thumbnail previews and duplicate badges
- **Soft delete** — move duplicates to a `.photo-dedup-trash/` folder instead of permanently deleting
- **Action history** — review and restore any previously deleted files
- **Supported formats** — JPEG, PNG, GIF, WebP, HEIC/HEIF, TIFF, BMP, AVIF, MP4, MOV, AVI, MKV, WebM, MPEG, 3GP, WMV

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma 7](https://www.prisma.io) + PostgreSQL 17
- [Tailwind CSS 4](https://tailwindcss.com) + Radix UI
- [Sharp](https://sharp.pixelplumbing.com) for thumbnail generation

## Prerequisites

- Node.js 18+ and [pnpm](https://pnpm.io) v10
- PostgreSQL 17 (or Docker)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   Copy `.env.sample` to `.env` and fill in the values:

   ```bash
   cp .env.sample .env
   ```

   Required variables:

   | Variable                             | Description                                                        |
   | ------------------------------------ | ------------------------------------------------------------------ |
   | `DATABASE_URL`                       | PostgreSQL connection string (`postgres://user:pass@host:port/db`) |
   | `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | 44-character base64 key — generate with `openssl rand -base64 32`  |
   | `POSTGRES_USER`                      | PostgreSQL username                                                |
   | `POSTGRES_PASSWORD`                  | PostgreSQL password                                                |
   | `POSTGRES_DB`                        | Database name                                                      |
   | `POSTGRES_PORT`                      | Database port (default: `5432`)                                    |
   | `POSTGRES_HOST`                      | Database host (default: `localhost`)                               |

3. **Run database migrations**

   ```bash
   pnpm prisma migrate deploy
   ```

4. **Start the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Docker

To run the full stack (app + PostgreSQL) with Docker Compose:

```bash
docker compose up
```

This starts PostgreSQL, runs migrations, seeds the database, and starts the Next.js dev server with hot reload.

## Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm dev`       | Start development server       |
| `pnpm build`     | Build for production           |
| `pnpm start`     | Start production server        |
| `pnpm lint`      | Run ESLint                     |
| `pnpm typecheck` | Run TypeScript type checking   |
| `pnpm test:unit` | Run unit tests                 |
| `pnpm test:ui`   | Run component tests in browser |
| `pnpm test:e2e`  | Run Playwright E2E tests       |
