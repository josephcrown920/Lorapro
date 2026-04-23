import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trainingJobsTable, generationsTable } from "@workspace/db";
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

router.get("/jobs/:id/generations", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.jobId, id))
    .orderBy(desc(generationsTable.createdAt));
  res.json(rows);
});

router.post("/jobs/:id/generate", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [job] = await db
    .select()
    .from(trainingJobsTable)
    .where(eq(trainingJobsTable.id, id));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status !== "succeeded" || !job.outputUrl) {
    res.status(400).json({
      error: "Training job is not complete. Cannot generate images yet.",
    });
    return;
  }

  const [pending] = await db
    .insert(generationsTable)
    .values({
      jobId: id,
      prompt: parsed.data.prompt,
      status: "processing",
    })
    .returning();

  try {
    const replicate = getReplicate();
    const output = await replicate.run(FLUX_LORA_MODEL, {
      input: {
        prompt: parsed.data.prompt,
        lora_weights: job.outputUrl,
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
    if (typeof first === "string") {
      imageUrl = first;
    } else if (first && typeof (first as { url?: () => URL }).url === "function") {
      imageUrl = (first as { url: () => URL }).url().toString();
    }

    if (!imageUrl) throw new Error("No image returned from Replicate");

    const [updated] = await db
      .update(generationsTable)
      .set({ status: "succeeded", imageUrl })
      .where(eq(generationsTable.id, pending.id))
      .returning();

    res.status(201).json(updated);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Generation failed");
    const [updated] = await db
      .update(generationsTable)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(generationsTable.id, pending.id))
      .returning();
    res.status(201).json(updated);
  }
});

export default router;
