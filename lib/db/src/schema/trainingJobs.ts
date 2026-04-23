import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trainingJobStatusEnum = [
  "starting",
  "processing",
  "succeeded",
  "failed",
  "canceled",
] as const;

export const trainingJobsTable = pgTable("training_jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("starting"),
  replicateId: text("replicate_id"),
  triggerWord: text("trigger_word").notNull(),
  steps: integer("steps").notNull(),
  loraRank: integer("lora_rank").notNull(),
  imageCount: integer("image_count").notNull().default(0),
  imageZipUrl: text("image_zip_url").notNull(),
  outputUrl: text("output_url"),
  errorMessage: text("error_message"),
  logs: text("logs"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTrainingJobSchema = createInsertSchema(trainingJobsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingJob = z.infer<typeof insertTrainingJobSchema>;
export type TrainingJob = typeof trainingJobsTable.$inferSelect;
