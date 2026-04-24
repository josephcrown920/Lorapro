# Environment Variables & Secrets

This project needs a handful of secrets and environment variables to run. **Never paste actual secret values into code or commit them to the repo** — always use Replit's Secrets pane (the lock icon in the sidebar).

---

## Required secrets

You set these once in the Secrets pane and they're injected into every workflow automatically.

### `REPLICATE_API_TOKEN` *(required)*
Your personal API token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).

- Used to start training runs and run image generation.
- Without it, the "Launch Training Job" and "Generate" buttons will fail with a 500 error.

### `REPLICATE_USERNAME` *(optional but recommended)*
Your Replicate username (e.g. `johnsmith`).

- Used as the namespace when Replicate publishes your trained LoRA model.
- If missing, defaults to `me`, which will fail when Replicate tries to create the destination model. **Set this before your first training run.**

---

## Object storage (already configured)

These were set automatically when object storage was provisioned. **Don't change them** unless you re-provision the bucket.

| Variable | Purpose |
|---|---|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | The GCS bucket Replit assigned to this project |
| `PRIVATE_OBJECT_DIR` | Path inside the bucket where uploaded zips go |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Paths the storage helper searches for public assets |

---

## Database (managed by Replit)

When you provision a Replit Postgres database, these are set for you:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Full connection string used by Drizzle |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Individual connection parts |

If `DATABASE_URL` is missing, the API server won't start. Re-provision the database from the Database pane.

---

## Optional settings

### `LOG_LEVEL`
Controls server log verbosity. Defaults to `info`. Set to `debug` for more detail or `warn` to quiet things down.

### `NODE_ENV`
Set to `production` automatically when you deploy. Don't override this in development.

---

## How to add or change a secret

1. Click the **lock icon** in the Replit sidebar (Secrets pane).
2. Click **New Secret**.
3. Enter the **key** (e.g. `REPLICATE_API_TOKEN`) and **value**.
4. Click **Add Secret**.
5. Restart the affected workflow so it picks up the new value.

---

## Quick checklist before first training run

- [ ] `REPLICATE_API_TOKEN` is set
- [ ] `REPLICATE_USERNAME` is set to your Replicate username
- [ ] Database has been pushed (`pnpm --filter @workspace/db run push`)
- [ ] All three workflows show as running in the sidebar
