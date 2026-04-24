# Environment Variables

This file lists **every** environment variable that is read by code in this repo. Each entry shows where it's used, what it does, and which environment it applies to.

> A separate `ENVIRONMENT.md` exists at the repo root with user-facing setup instructions. This file is the technical reference.

## Variables

### `REPLICATE_API_TOKEN` — *required, secret*
- **Used in:** `artifacts/api-server/src/routes/jobs.ts`, `artifacts/api-server/src/routes/generations.ts`
- **Purpose:** Auth token passed to the `replicate` SDK for both training and inference calls.
- **Behavior if missing:** `getReplicate()` throws `"REPLICATE_API_TOKEN is not set"` → the request fails with a 500.

### `REPLICATE_USERNAME` — *strongly recommended*
- **Used in:** `artifacts/api-server/src/routes/jobs.ts`
- **Purpose:** Namespace for the destination model that Replicate creates when training finishes — used as `${REPLICATE_USERNAME}/<trigger-word>-lora`.
- **Behavior if missing:** Falls back to the literal string `"me"`, which is not a valid Replicate account, so training will fail when Replicate tries to create the destination model.

### `DATABASE_URL` — *required, secret (Replit-managed)*
- **Used in:** `lib/db/src/index.ts`, `lib/db/drizzle.config.ts`
- **Purpose:** PostgreSQL connection string for both the runtime `pg.Pool` and Drizzle's `push`/`generate` commands.
- **Behavior if missing:** The db package throws at import time → server cannot start.

### `DEFAULT_OBJECT_STORAGE_BUCKET_ID` — *required for uploads*
- **Used in:** `artifacts/api-server/src/lib/objectStorage.ts` (referenced indirectly via the Replit object-storage sidecar configuration)
- **Purpose:** Identifies the GCS bucket Replit assigned to this project. Set automatically when object storage is provisioned.

### `PRIVATE_OBJECT_DIR` — *required for uploads*
- **Used in:** `artifacts/api-server/src/lib/objectStorage.ts`
- **Purpose:** The path inside the bucket where uploaded objects (e.g. training zips) are stored. Code reads it at call time and validates it's non-empty.

### `PUBLIC_OBJECT_SEARCH_PATHS` — *required for serving public assets*
- **Used in:** `artifacts/api-server/src/lib/objectStorage.ts`
- **Purpose:** Comma-separated list of paths searched by `searchPublicObject()` (used by `GET /api/storage/public-objects/*`).

### `PORT` — *required at runtime, set by Replit per artifact*
- **Used in:** `artifacts/api-server/src/index.ts`, `artifacts/lora-trainer/vite.config.ts`, `artifacts/mockup-sandbox/vite.config.ts`
- **Purpose:** Port the dev/prod server binds to.
- **Behavior if missing:** The api-server `throw`s `"PORT environment variable is required..."` and exits.

### `BASE_PATH` — *set by Replit per artifact*
- **Used in:** `artifacts/lora-trainer/vite.config.ts`, `artifacts/mockup-sandbox/vite.config.ts`
- **Purpose:** URL prefix the artifact is served under (e.g. `/lora-trainer`). Vite uses it as `base`. The frontend reads it via `import.meta.env.BASE_URL` and feeds it into the wouter router base.

### `NODE_ENV` — *standard*
- **Used in:** `artifacts/lora-trainer/vite.config.ts`, `artifacts/mockup-sandbox/vite.config.ts`, `artifacts/api-server/src/lib/logger.ts`, and the `dev` npm script in `artifacts/api-server/package.json` (which sets it to `development`).
- **Purpose:**
  - In `logger.ts`: enables/disables `pino-pretty` formatting (`isProduction = NODE_ENV === "production"`).
  - In Vite configs: gates Replit dev-only plugins (cartographer, dev-banner, runtime-error-modal).
- Set automatically to `production` by Replit Deployments.

### `LOG_LEVEL` — *optional*
- **Used in:** `artifacts/api-server/src/lib/logger.ts`
- **Purpose:** Pino log level. Defaults to `"info"`. Common values: `trace | debug | info | warn | error | fatal`.

### `REPL_ID` — *runtime-managed by Replit*
- **Used in:** `artifacts/lora-trainer/vite.config.ts`, `artifacts/mockup-sandbox/vite.config.ts`
- **Purpose:** Used as a guard to enable Replit-only Vite plugins. Don't set or override manually.

---

## Variables NOT used in code (but referenced in docs)

These appear in the user-facing root `ENVIRONMENT.md` but aren't directly read in the source files scanned:

- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — standard Postgres env vars, present in the Replit-managed DB environment but the code only reads `DATABASE_URL`.

---

## Environments

The codebase recognizes two environments via `NODE_ENV`. The Replit platform additionally distinguishes a **preview** environment for unpublished workspaces, but no code path branches on a `preview` value specifically.

### `development`
- `NODE_ENV=development` (set explicitly by `artifacts/api-server`'s `dev` script: `export NODE_ENV=development && pnpm run build && pnpm run start`).
- Vite enables Replit dev plugins (cartographer, dev-banner, runtime-error-modal) when `NODE_ENV !== "production"` **and** `REPL_ID !== undefined`.
- `pino-pretty` is enabled in the logger.
- Database: same `DATABASE_URL` as everything else (no separate dev DB declared in code).
- Ports: Replit assigns `PORT` per artifact and routes through path-based proxying with `BASE_PATH`.

### `preview` *(Replit workspace runtime)*
- Same code paths as `development` — there is **no `preview` branch in source**. UNKNOWN whether the user expects a separate preview environment with different secrets.
- Replit provides a preview URL via the workspace iframe; it hits the same dev server as `development`.

### `production`
- `NODE_ENV=production` (set by Replit Deployments).
- Replit dev plugins are disabled.
- `pino-pretty` is disabled — JSON logs are emitted.
- The api-server is built once with `node ./build.mjs` (esbuild) and run with `node --enable-source-maps ./dist/index.mjs`.
- The frontend is built with `vite build` and served via `vite preview` (per the `serve` script) or whatever the deployment configuration runs.
- Replit injects production-scoped secrets and a production `DATABASE_URL` (which may or may not be the same database as development — UNKNOWN; depends on how the user provisioned the deployment).

### Environment scoping in Replit Secrets

When setting variables in Replit's Secrets pane, each one is scoped to one of:

- **shared** — visible in both development and production
- **development** — only in dev
- **production** — only in deployed app

Default to **shared** unless a value should differ between environments.
