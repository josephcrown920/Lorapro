import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const generationsTable = pgTable("generations", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Generation = typeof generationsTable.$inferSelect;
