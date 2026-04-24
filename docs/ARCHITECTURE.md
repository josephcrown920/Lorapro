# Architecture

## Folder Structure

```
workspace/                              # pnpm monorepo root
├── package.json                        # workspace scripts (typecheck, build)
├── pnpm-workspace.yaml                 # workspace + catalog config
├── tsconfig.base.json                  # shared TS config
├── tsconfig.json                       # references to all packages
├── replit.md                           # short stack notes
├── README.md
├── ENVIRONMENT.md
│
├── artifacts/                          # runnable apps (each is a workflow)
│   ├── api-server/                     # Express 5 backend
│   │   ├── build.mjs                   # esbuild bundler config
│   │   └── src/
│   │       ├── index.ts                # entry — reads PORT, calls app.listen
│   │       ├── app.ts                  # express() instance, mounts /api router
│   │       ├── routes/
│   │       │   ├── index.ts            # composes all sub-routers
│   │       │   ├── health.ts
│   │       │   ├── jobs.ts             # CRUD + sync for training jobs
│   │       │   ├── generations.ts      # inference (text-to-image with LoRA)
│   │       │   ├── uploads.ts          # legacy presign endpoint
│   │       │   └── storage.ts          # GCS presigned uploads + serving
│   │       ├── lib/
│   │       │   ├── logger.ts           # pino logger
│   │       │   ├── objectStorage.ts    # GCS service wrapper (Replit sidecar)
│   │       │   └── objectAcl.ts        # ACL helpers (currently commented out)
│   │       └── middlewares/            # (empty)
│   │
│   ├── lora-trainer/                   # React + Vite frontend
│   │   ├── vite.config.ts              # reads PORT, BASE_PATH from env
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx                 # router + providers
│   │       ├── index.css               # design tokens (see DESIGN_SYSTEM.md)
│   │       ├── pages/
│   │       │   ├── dashboard.tsx       # /
│   │       │   ├── job-new.tsx         # /jobs/new
│   │       │   ├── job-detail.tsx      # /jobs/:id
│   │       │   └── not-found.tsx
│   │       ├── components/
│   │       │   ├── layout.tsx          # sidebar + main shell
│   │       │   ├── theme-provider.tsx
│   │       │   └── ui/                 # shadcn components (50+)
│   │       ├── hooks/                  # use-toast, use-mobile, etc.
│   │       └── lib/                    # utils (cn, etc.)
│   │
│   └── mockup-sandbox/                 # internal design sandbox (not product)
│
├── lib/                                # shared workspace packages
│   ├── api-spec/                       # OpenAPI source of truth
│   │   ├── openapi.yaml
│   │   ├── orval.config.ts             # codegen config
│   │   └── package.json                # exposes `codegen` script
│   ├── api-zod/                        # generated zod schemas (orval output)
│   ├── api-client-react/               # generated TanStack Query hooks (orval)
│   ├── db/                             # Drizzle ORM
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts                # pg Pool + drizzle() instance
│   │       └── schema/
│   │           ├── index.ts
│   │           ├── trainingJobs.ts     # training_jobs table
│   │           └── generations.ts      # generations table
│   └── object-storage-web/             # frontend helpers (currently unused)
│
├── scripts/                            # post-merge.sh + helpers
├── docs/                               # this folder
└── attached_assets/                    # user-uploaded reference files
```

## Tech Stack

| Layer | Choice |
|---|---|
| **Monorepo** | pnpm workspaces + catalog versions |
| **Language** | TypeScript 5.9 |
| **Node** | 24 |
| **Frontend framework** | React 19 *(catalog version)* + Vite 7 |
| **Routing** | `wouter` 3.x |
| **Server state / data fetching** | `@tanstack/react-query` (catalog) |
| **Forms & validation** | `react-hook-form` + `zod` v4 (`zod/v4`) + `@hookform/resolvers` |
| **UI components** | shadcn/ui (Radix primitives) |
| **Styling** | Tailwind CSS 4 + `@tailwindcss/vite` + `tw-animate-css` |
| **Icons** | `lucide-react` |
| **Animations** | `framer-motion`, `tw-animate-css` |
| **Browser zip** | `jszip` 3.x |
| **Backend framework** | Express 5 |
| **Backend bundler** | `esbuild` + `esbuild-plugin-pino` (single-file CJS-ish ESM bundle) |
| **Logging** | `pino` + `pino-http` + `pino-pretty` |
| **CORS** | `cors` |
| **Database** | PostgreSQL (Replit-managed) |
| **ORM** | Drizzle ORM + `drizzle-zod` |
| **Object storage** | Google Cloud Storage via Replit sidecar (`@google-cloud/storage`, `google-auth-library`) |
| **AI / training** | `replicate` SDK |
| **API contract** | OpenAPI 3.1 → codegen via **Orval** → `api-zod` (zod schemas) + `api-client-react` (TanStack Query hooks) |

## State Management

There is **no global client store** (Redux, Zustand, etc.). State is managed in three layers:

1. **Server state — TanStack Query.**
   The single `QueryClient` instance is created in `App.tsx` and provided via `<QueryClientProvider>`. All data reads (jobs, stats, generations) use generated hooks like `useListJobs`, `useGetJobStats`, `useGetJob`, `useListGenerations`. Mutations (`useCreateJob`, `useGenerateImage`, `useCancelJob`, etc.) invalidate the relevant query keys (e.g. `getListJobsQueryKey()`, `getGetJobStatsQueryKey()`) on success.

2. **Local UI state — React `useState`.**
   Form drafts, drag/upload progress, dropzone hover state, etc.

3. **Form state — React Hook Form.**
   Each form (`job-new.tsx`, generation prompt) owns its own `useForm` instance with a zod resolver pointed at a generated schema (`CreateJobBody`, `GenerateImageBody`).

Theme state is held by `next-themes` and persisted to `localStorage` under the key `vite-ui-theme`.

## API Structure

### Source of truth

`lib/api-spec/openapi.yaml` is the **single source of truth**. Running `pnpm --filter @workspace/api-spec run codegen` regenerates:

- `lib/api-zod/src/generated/api.ts` — runtime zod schemas (used by both server and client for validation)
- `lib/api-client-react/src/generated/api.ts` — typed TanStack Query hooks + raw fetch functions (`requestUploadUrl`, etc.)

> **Note:** Orval rewrites `lib/api-zod/src/index.ts` on every codegen, so a `postcodegen` step in `lib/api-spec/package.json` writes a stub `lib/api-zod/src/generated/api.schemas.ts` containing `export {}` to satisfy the re-export.

### Endpoints

All endpoints are mounted under `/api` (`app.ts`: `app.use("/api", router)`).

| Method | Path | Operation ID | Description |
|---|---|---|---|
| GET | `/healthz` | `healthCheck` | Health probe |
| GET | `/jobs` | `listJobs` | List training jobs (optional `?status=` filter) |
| POST | `/jobs` | `createJob` | Start a new training job on Replicate |
| GET | `/jobs/{id}` | `getJob` | Get one job |
| DELETE | `/jobs/{id}` | `cancelJob` | Cancel via Replicate, mark `canceled` in DB |
| POST | `/jobs/{id}/sync` | `syncJob` | Pull latest status/logs/output from Replicate |
| GET | `/jobs/stats` | `getJobStats` | Counts grouped by status |
| POST | `/jobs/{id}/generate` | `generateImage` | Run inference using the trained LoRA |
| GET | `/jobs/{id}/generations` | `listGenerations` | List generated images for a job |
| POST | `/storage/uploads/request-url` | `requestUploadUrl` | Get a presigned GCS PUT URL |
| GET | `/storage/objects/*` | `getStorageObject` | Stream a private object (auth currently disabled) |
| GET | `/storage/public-objects/*` | *(not in OpenAPI but in code)* | Stream a public asset |
| POST | `/uploads/presign` | `presignUpload` | Legacy presign endpoint — UNKNOWN if still used by UI |

### Database schema

Two tables, both defined in `lib/db/src/schema/`:

**`training_jobs`** (`trainingJobs.ts`)
```
id              serial PK
name            text not null
status          text not null default 'starting'   -- starting|processing|succeeded|failed|canceled
replicate_id    text                                -- Replicate training run ID
trigger_word    text not null
steps           integer not null
lora_rank       integer not null
image_count     integer not null default 0
image_zip_url   text not null                       -- public URL to the training zip
output_url      text                                -- URL of the trained .safetensors weights
error_message   text
logs            text
created_at      timestamp not null default now()
updated_at      timestamp not null default now()
```

**`generations`** (`generations.ts`)
```
id             serial PK
job_id         integer not null                     -- references training_jobs.id (no FK constraint declared)
prompt         text not null
image_url      text                                 -- output image URL from Replicate
status         text not null default 'processing'
error_message  text
created_at     timestamp not null default now()
```

> **UNKNOWN:** No explicit foreign key constraint between `generations.job_id` and `training_jobs.id` is declared in the schema files.

## Data Flow

### 1. Creating a training job

```
Browser (job-new.tsx)
  │
  │  1. User drops images
  │     → JSZip.generateAsync()  (in-browser, STORE compression)
  │
  │  2. POST /api/storage/uploads/request-url   (api-zod: RequestUploadUrlBody)
  ▼
Express (storage.ts)
  │
  │  ObjectStorageService.getObjectEntityUploadURL()
  │    └─▶ Replicate sidecar HTTP API (signed-object-url)
  │              └─▶ Google Cloud Storage
  │
  │  Returns { uploadURL, objectPath }
  ▼
Browser
  │
  │  3. XHR PUT zipBlob → uploadURL  (direct to GCS, with progress)
  │
  │  4. publicUrl = `${origin}/api/storage${objectPath}`
  │
  │  5. POST /api/jobs   (api-zod: CreateJobBody)
  ▼
Express (jobs.ts)
  │
  │  6. replicate.trainings.create(
  │       "ostris", "flux-dev-lora-trainer", VERSION,
  │       { destination: "<REPLICATE_USERNAME>/<trigger>-lora",
  │         input: { input_images: imageZipUrl, trigger_word, steps, lora_rank, ... } }
  │     )
  │              └─▶ Replicate fetches the zip via the public URL
  │
  │  7. INSERT INTO training_jobs (...) RETURNING *
  ▼
Browser
  │
  │  8. TanStack Query invalidates list/stats keys → UI refreshes
  │  9. setLocation(`/jobs/${id}`)
```

### 2. Polling / syncing status

The Job Detail page calls `useGetJob(id)` (TanStack Query). A **Sync** button triggers `POST /api/jobs/:id/sync` which:

1. Looks up the job in Postgres
2. Calls `replicate.trainings.get(replicateId)`
3. Maps the Replicate status into the local enum
4. Extracts `output.weights` if present, plus `error` and `logs`
5. `UPDATE training_jobs SET status, output_url, error_message, logs, updated_at` and returns the row
6. The hook updates the cache → UI re-renders

> **UNKNOWN:** Whether there's an automatic background poll interval — only the explicit Sync action is verified.

### 3. Generating an image

When `status === "succeeded"`, `outputUrl` holds the trained weights URL. The user submits a prompt → `POST /api/jobs/:id/generate` → `generations.ts` calls `black-forest-labs/flux-dev-lora` with the weights, persists a row in `generations`, and returns it. The UI invalidates the generations list and renders the new image when ready.

### 4. Routing & static serving

- The frontend Vite dev server is exposed by Replit on its own path (`BASE_PATH` env var, e.g. `/lora-trainer`). `App.tsx` reads `import.meta.env.BASE_URL` and feeds it into `<WouterRouter base={...}>` so all client routes are prefixed correctly.
- Browser → frontend dev server: served on `PORT` (set by Replit per artifact).
- Browser → API: proxied through the same `${origin}/api/...` path (the `cors()` middleware also allows direct cross-origin calls).
