# LoRA Forge

A web app for training Stable Diffusion **LoRA adapters** on your own images, then generating new images with the trained model — all powered by [Replicate](https://replicate.com).

Drag a folder of photos onto the page, give the concept a name and trigger word, and launch a training job. Once it's done, generate images of your subject from any prompt.

---

## What's inside

- **`artifacts/lora-trainer`** — React + Vite frontend (the UI you see)
- **`artifacts/api-server`** — Express API that talks to Replicate, the database, and cloud storage
- **`artifacts/mockup-sandbox`** — Internal design sandbox (not part of the product)
- **`lib/`** — Shared packages (database schema, API spec, generated clients)

---

## How it works

1. **Create a job** — Drag a folder of 15–30 photos onto the New Training Job page. The browser zips them and uploads the zip to cloud storage with a presigned URL.
2. **Train** — The backend kicks off a training run on Replicate using `ostris/flux-dev-lora-trainer`. You can watch progress on the dashboard.
3. **Generate** — Once training succeeds, an inference panel appears. Type a prompt (include your trigger word), and the app calls `black-forest-labs/flux-dev-lora` with your adapter to render new images.

---

## Running locally on Replit

Everything is wired up through Replit's workflow system. The three workflows are:

| Workflow | What it does |
|---|---|
| `artifacts/api-server: API Server` | Express backend on its own port |
| `artifacts/lora-trainer: web` | Vite dev server for the frontend |
| `artifacts/mockup-sandbox: Component Preview Server` | Design sandbox (optional) |

They start automatically. To restart any of them after a code change, use the workflow controls in the Replit sidebar.

### Required setup

Before training works you need:

1. **A Replicate API token** stored as the `REPLICATE_API_TOKEN` secret (see `ENVIRONMENT.md`)
2. **Object storage** provisioned (already done — the bucket and env vars are in place)
3. **The database** pushed (`pnpm --filter @workspace/db run push`)

---

## Common commands

```bash
# Regenerate the API client + zod schemas after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push database schema changes
pnpm --filter @workspace/db run push

# Typecheck everything
pnpm --filter @workspace/api-server exec tsc --noEmit
pnpm --filter @workspace/lora-trainer exec tsc --noEmit
```

---

## Tech stack

- **Frontend:** React, Vite, wouter (routing), TanStack Query, shadcn/ui, Tailwind, JSZip
- **Backend:** Express 5, Drizzle ORM, Zod v4, Orval (OpenAPI codegen)
- **Database:** PostgreSQL (Replit-managed)
- **Storage:** Google Cloud Storage via Replit's object storage sidecar
- **AI:** Replicate API (Flux LoRA trainer + inference models)

---

## Models used

- **Training:** [`ostris/flux-dev-lora-trainer`](https://replicate.com/ostris/flux-dev-lora-trainer)
- **Inference:** [`black-forest-labs/flux-dev-lora`](https://replicate.com/black-forest-labs/flux-dev-lora)

---

## Publishing

When you're ready to share this with others, use the Publish button in Replit. Your `.replit.app` URL will be publicly accessible and Replicate will fetch training zips from it.
