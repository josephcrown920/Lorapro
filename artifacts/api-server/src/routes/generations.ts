import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trainingJobsTable, generationsTable } from "@workspace/db";
import type { Generation } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import Replicate from "replicate";
import { GenerateImageBody } from "@workspace/api-zod";

const router: IRouter = Router();

const FLUX_LORA_MODEL =
  "black-forest-labs/flux-dev-lora" as `${string}/${string}`;

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return new Replicate({ auth: token });
}

/* ─────────────────────────────────────────────────────────────
   Shared helper: run a single Replicate generation in the background.
   Updates the generation row to succeeded/failed when done.
───────────────────────────────────────────────────────────── */
export async function runReplicateGeneration(
  genId: number,
  outputUrl: string,
  prompt: string,
): Promise<void> {
  try {
    const replicate = getReplicate();
    const output = await replicate.run(FLUX_LORA_MODEL, {
      input: {
        prompt,
        lora_weights: outputUrl,
        lora_scale: 1,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "webp",
        guidance_scale: 3.5,
        num_inference_steps: 28,
      },
    });

    let imageUrl: string | null = null;
    const arr = Array.isArray(output) ? output : [output];
    const first = arr[0];
    if (typeof first === "string") imageUrl = first;
    else if (first && typeof (first as { url?: () => URL }).url === "function")
      imageUrl = (first as { url: () => URL }).url().toString();

    if (!imageUrl) throw new Error("No image returned from Replicate");

    await db
      .update(generationsTable)
      .set({ status: "succeeded", imageUrl })
      .where(eq(generationsTable.id, genId));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(generationsTable)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(generationsTable.id, genId));
  }
}

/* ─────────────────────────────────────────────────────────────
   Auto-preview: fire 3 preset generations sequentially when a
   training job first reaches "succeeded" status.
   Spaced 11 s apart to respect Replicate burst limits.
───────────────────────────────────────────────────────────── */
export async function triggerAutoPreview(
  jobId: number,
  triggerWord: string,
  outputUrl: string,
): Promise<void> {
  const tw = triggerWord;
  const prompts = [
    `a portrait photo of ${tw}, professional studio lighting, sharp focus, photorealistic, 8k`,
    `${tw} in streetwear, urban cityscape at night, dramatic neon lighting, cinematic`,
    `close-up portrait of ${tw}, golden hour natural light, editorial magazine cover`,
  ];

  for (const prompt of prompts) {
    try {
      const [pending] = await db
        .insert(generationsTable)
        .values({ jobId, prompt, status: "processing" })
        .returning();

      // fire-and-forget — do not await
      runReplicateGeneration(pending.id, outputUrl, prompt).catch(() => {});

      // space out requests to avoid burst rate limit
      await new Promise<void>((r) => setTimeout(r, 11_000));
    } catch {
      // best-effort — never crash the caller
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Routes
───────────────────────────────────────────────────────────── */

router.get("/jobs/:id/generations", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.jobId, id))
    .orderBy(desc(generationsTable.createdAt));

  res.json(rows);
});

router.post("/jobs/:id/generate", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [job] = await db
    .select()
    .from(trainingJobsTable)
    .where(eq(trainingJobsTable.id, id));

  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  if (job.status !== "succeeded" || !job.outputUrl) {
    res.status(400).json({ error: "Training job is not complete. Cannot generate images yet." });
    return;
  }

  // Insert the pending row and return immediately — Replicate runs in background
  const [pending] = await db
    .insert(generationsTable)
    .values({ jobId: id, prompt: parsed.data.prompt, status: "processing" })
    .returning();

  res.status(201).json(pending);

  // Non-blocking: runs after response is sent
  runReplicateGeneration(pending.id, job.outputUrl, parsed.data.prompt).catch(() => {});
});

export default router;
