# Product

## Purpose

**LoRA Forge** is a web app for training custom **Stable Diffusion LoRA adapters** on a user's own images and then generating new images with the trained adapter.

It wraps the [Replicate](https://replicate.com) API into a friendly UI so you don't have to deal with command-line tools, Python environments, or manually packaging training data.

The app uses two Replicate models (hardcoded in the backend):

- **Training:** `ostris/flux-dev-lora-trainer` (pinned to version `e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497`)
- **Inference:** `black-forest-labs/flux-dev-lora` *(referenced in `artifacts/api-server/src/routes/generations.ts` — UNKNOWN if version is pinned without re-reading)*

## Target Users

Based on the UI copy, branding ("LoRA Forge", "ML vibe"), and feature set, the intended audience is:

- Hobbyists and creators who want to fine-tune image models on a person, character, style, or object
- People who already have a Replicate account and API token
- Single-user / personal use — there is **no authentication system, no user accounts, and no multi-tenancy** in the codebase

> **UNKNOWN:** No explicit persona, marketing copy, or pricing model exists in the repo.

## Core Features

All features below are implemented in the codebase and exposed via the UI.

### 1. Dashboard (`/`)
*(`artifacts/lora-trainer/src/pages/dashboard.tsx`)*

- Summary stat cards for job counts grouped by status (`total`, `starting`, `processing`, `succeeded`, `failed`, `canceled`) — pulled from `GET /api/jobs/stats`.
- Table of all training jobs with name, status badge, trigger word, steps, and relative timestamp — pulled from `GET /api/jobs`.
- "New Training Job" CTA in header.

### 2. Create Training Job (`/jobs/new`)
*(`artifacts/lora-trainer/src/pages/job-new.tsx`)*

Form fields:
- **Model name** (string, min 2 chars)
- **Trigger word** (alphanumeric/underscore, min 2 chars)
- **Training steps** (slider, range from `CreateJobBody` schema: `100`–`4000`)
- **LoRA rank** (`4`, `8`, `16`, or `32`)
- **Training images** — drag-and-drop or click-to-browse. Multiple images accepted (jpg/png/webp). UI text recommends 15–30 photos.

Upload pipeline (browser-side):
1. Files are zipped client-side with **JSZip** (STORE compression — no recompression).
2. The browser requests a presigned upload URL from `POST /api/storage/uploads/request-url`.
3. The zip is `PUT` directly to the presigned URL with a live progress bar.
4. The resulting `objectPath` is converted into a publicly fetchable URL (`${window.location.origin}/api/storage${objectPath}`) and stored in the `imageZipUrl` form field.

On submit, `POST /api/jobs` creates the job, calls Replicate to start training, and persists the row to the `training_jobs` table. The user is redirected to the job detail page.

### 3. Job Detail (`/jobs/:id`)
*(`artifacts/lora-trainer/src/pages/job-detail.tsx`)*

Shows the live state of one training run, including:
- Status badge, trigger word, step count, LoRA rank, image-zip URL
- Output URL (the trained `.safetensors` weights URL on Replicate, when available)
- Logs from Replicate
- Error message (if any)
- A **Sync** action that calls `POST /api/jobs/:id/sync` to refresh status from Replicate
- A **Cancel** action that calls `DELETE /api/jobs/:id`

When `status === "succeeded"`, an **inference panel** appears that lets the user:
- Type a prompt (must include the trigger word to activate the concept)
- Submit via `POST /api/jobs/:id/generate` — the backend calls `black-forest-labs/flux-dev-lora` with the trained weights
- View the gallery of past generations from `GET /api/jobs/:id/generations`

### 4. Object Storage Endpoints
*(`artifacts/api-server/src/routes/storage.ts`)*

- `POST /api/storage/uploads/request-url` — returns a presigned GCS upload URL + object path
- `GET /api/storage/objects/*` — streams private objects (currently unauthenticated; ACL check is commented out as a template)
- `GET /api/storage/public-objects/*` — streams public assets

## User Flow

```
┌──────────────┐    ┌────────────────┐    ┌────────────────────────┐    ┌──────────────────┐
│  Dashboard   │───▶│  New Training  │───▶│  Drag photos → zip →   │───▶│ Submit form →    │
│  (overview)  │    │  Job form      │    │  upload to GCS         │    │ Replicate train  │
└──────────────┘    └────────────────┘    └────────────────────────┘    └──────────────────┘
       ▲                                                                          │
       │                                                                          ▼
       │                                                              ┌────────────────────┐
       │                                                              │  Job Detail page   │
       │                                                              │  (poll/sync status)│
       │                                                              └────────────────────┘
       │                                                                          │
       │                                                            (status = succeeded)
       │                                                                          │
       │                                                                          ▼
       │                                                              ┌────────────────────┐
       └──────────────────────────────────────────────────────────────│  Generate images   │
                                                                      │  with prompt + LoRA│
                                                                      └────────────────────┘
```

Plain-language version:

1. **Land on the Dashboard.** See current jobs and stats.
2. **Click "New Training Job".** Fill in name, trigger word, steps, rank.
3. **Drop a folder of photos.** They're zipped and uploaded in the browser.
4. **Hit "Launch Training Job".** The backend starts a Replicate training run and stores the job row.
5. **Watch the Job Detail page.** Click Sync (or wait for polling — UNKNOWN if there's an automatic poll interval; the Sync button is the explicit refresh path) until status becomes `succeeded`.
6. **Generate images.** Type a prompt that includes your trigger word, hit Generate, see the result in the gallery.
