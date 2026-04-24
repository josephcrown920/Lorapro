# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: LoRA Forge

Self-serve Stable Diffusion FLUX LoRA trainer. Frontend in `artifacts/lora-trainer` (React + Vite, glassmorphism + framer-motion), API in `artifacts/api-server` (Express, Drizzle, Replicate SDK).

### Architecture
- Frontend zips images via JSZip, uploads to GCS via presigned URL from `/api/uploads/presign`, then POSTs metadata + zip URL to `/api/jobs`.
- `POST /api/jobs` first calls `replicate.models.create()` to ensure the destination model `<REPLICATE_USERNAME>/<sanitized-trigger>-lora` exists (catches "already exists" errors), then calls `replicate.trainings.create()` against `ostris/flux-dev-lora-trainer`.
- `POST /api/jobs/:id/sync` polls `replicate.trainings.get()` and updates status/logs/output.

### Environment secrets required
`REPLICATE_API_TOKEN`, `REPLICATE_USERNAME`, `DATABASE_URL`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`.

### Docs
- `docs/PRODUCT.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/ENVIRONMENT.md`, `docs/MARKETING.md`.

### Known launch blockers (must fix before public deploy)
1. **No auth / multi-tenancy** — every endpoint is open; any visitor consumes the owner's Replicate credits.
2. **No rate limiting; CORS open** — bot abuse risk.
3. **Object storage routes unprotected** — uploaded training ZIP URLs leak across users.
For private/personal use, current state is fine. For a public Product Hunt-style launch, address the three above first.
