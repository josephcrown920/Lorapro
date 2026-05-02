import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trainingJobsTable, generationsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import Replicate from "replicate";
import { triggerAutoPreview } from "./generations.js";
import {
  CreateJobBody,
  GetJobParams,
  CancelJobParams,
  SyncJobParams,
  ListJobsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const REPLICATE_MODEL_OWNER = "ostris";
const REPLICATE_MODEL_NAME = "flux-dev-lora-trainer";
const REPLICATE_MODEL_VERSION =
  "e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497";

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return new Replicate({ auth: token });
}

function mapReplicateStatus(
  status: string,
): "starting" | "processing" | "succeeded" | "failed" | "canceled" {
  switch (status) {
    case "starting":
      return "starting";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "processing";
  }
}

router.get("/jobs/stats", async (req, res) => {
  const rows = await db
    .select({
      status: trainingJobsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(trainingJobsTable)
    .groupBy(trainingJobsTable.status);

  const stats = {
    total: 0,
    starting: 0,
    processing: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };

  for (const row of rows) {
    const s = row.status as keyof typeof stats;
    if (s in stats) stats[s] = row.count;
    stats.total += row.count;
  }

  res.json(stats);
});

router.get("/jobs", async (req, res) => {
  const parsed = ListJobsQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;

  const rows = await db
    .select()
    .from(trainingJobsTable)
    .where(status ? eq(trainingJobsTable.status, status) : undefined)
    .orderBy(desc(trainingJobsTable.createdAt));

  res.json(rows);
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, triggerWord, steps, loraRank, imageZipUrl } = parsed.data;

  const replicate = getReplicate();

  const destOwner = process.env.REPLICATE_USERNAME || "me";
  // Replicate model names must be lowercase, alphanumeric or dashes
  const destName = `${triggerWord.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}-lora`;
  const destination = `${destOwner}/${destName}` as `${string}/${string}`;

  // Replicate requires the destination model to exist BEFORE you can train into it.
  // Try to create it; ignore "already exists" responses so re-training works.
  try {
    await replicate.models.create(destOwner, destName, {
      visibility: "private",
      hardware: "cpu",
      description: `LoRA adapter for trigger word "${triggerWord}" — created by LoRA Forge`,
    });
    req.log.info({ destination }, "Created Replicate destination model");
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const alreadyExists =
      /already exists|name already taken|already a model/i.test(errMsg);
    if (!alreadyExists) {
      req.log.error({ err, destination }, "Failed to create destination model");
      res.status(500).json({
        error: `Could not create destination model "${destination}" on Replicate: ${errMsg}`,
      });
      return;
    }
    req.log.info({ destination }, "Destination model already exists — reusing");
  }

  let training;
  try {
    training = await replicate.trainings.create(
      REPLICATE_MODEL_OWNER,
      REPLICATE_MODEL_NAME,
      REPLICATE_MODEL_VERSION,
      {
        destination,
        input: {
          steps,
          lora_rank: loraRank,
          optimizer: "adamw8bit",
          batch_size: 1,
          resolution: "512,768,1024",
          autocaption: true,
          input_images: imageZipUrl,
          trigger_word: triggerWord,
          learning_rate: 0.0004,
          wandb_project: "flux_train_replicate",
          wandb_save_interval: 100,
          caption_dropout_rate: 0.05,
          cache_latents_to_disk: false,
          wandb_sample_interval: 100,
        },
      },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to create Replicate training");
    res.status(500).json({ error: `Replicate error: ${errMsg}` });
    return;
  }

  const [job] = await db
    .insert(trainingJobsTable)
    .values({
      name,
      triggerWord,
      steps,
      loraRank,
      imageZipUrl,
      imageCount: 0,
      status: "starting",
      replicateId: training.id,
    })
    .returning();

  res.status(201).json(job);
});

router.get("/jobs/:id", async (req, res) => {
  const parsed = GetJobParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [job] = await db
    .select()
    .from(trainingJobsTable)
    .where(eq(trainingJobsTable.id, parsed.data.id));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(job);
});

router.delete("/jobs/:id", async (req, res) => {
  const parsed = CancelJobParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [job] = await db
    .select()
    .from(trainingJobsTable)
    .where(eq(trainingJobsTable.id, parsed.data.id));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.replicateId) {
    try {
      const replicate = getReplicate();
      await replicate.trainings.cancel(job.replicateId);
    } catch (err) {
      req.log.warn({ err }, "Failed to cancel Replicate training");
    }
  }

  const [updated] = await db
    .update(trainingJobsTable)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(trainingJobsTable.id, parsed.data.id))
    .returning();

  res.json(updated);
});

router.post("/jobs/:id/sync", async (req, res) => {
  const parsed = SyncJobParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [job] = await db
    .select()
    .from(trainingJobsTable)
    .where(eq(trainingJobsTable.id, parsed.data.id));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (!job.replicateId) {
    res.json(job);
    return;
  }

  try {
    const replicate = getReplicate();
    const training = await replicate.trainings.get(job.replicateId);

    const newStatus = mapReplicateStatus(training.status);
    const outputUrl =
      training.output &&
      typeof training.output === "object" &&
      "weights" in training.output
        ? String((training.output as Record<string, unknown>).weights)
        : job.outputUrl;
    const errorMessage = training.error
      ? String(training.error)
      : job.errorMessage;
    const logs = training.logs ?? job.logs;

    const prevStatus = job.status;

    const [updated] = await db
      .update(trainingJobsTable)
      .set({
        status: newStatus,
        outputUrl: outputUrl ?? undefined,
        errorMessage: errorMessage ?? undefined,
        logs: logs ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(trainingJobsTable.id, parsed.data.id))
      .returning();

    res.json(updated);

    // Auto-preview: when a job first reaches "succeeded", fire 3 preset
    // generations in the background so the gallery is never empty.
    if (
      newStatus === "succeeded" &&
      prevStatus !== "succeeded" &&
      updated.outputUrl
    ) {
      const existing = await db
        .select({ id: generationsTable.id })
        .from(generationsTable)
        .where(eq(generationsTable.jobId, parsed.data.id))
        .limit(1);

      if (existing.length === 0) {
        req.log.info({ jobId: parsed.data.id }, "Triggering auto-preview generations");
        triggerAutoPreview(
          parsed.data.id,
          updated.triggerWord,
          updated.outputUrl,
        ).catch(() => {});
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to sync with Replicate");
    res.json(job);
  }
});

export default router;
