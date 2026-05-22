-- Add updated_at column to outbox_events for rescue cutoff
ALTER TABLE "outbox_events"
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Set initial updated_at = created_at for existing rows
UPDATE "outbox_events" SET "updated_at" = "created_at" WHERE "updated_at" = "created_at" IS NOT TRUE;

-- Rebuild index for rescue queries (status, updated_at) instead of (status, created_at)
DROP INDEX IF EXISTS "outbox_events_status_created_at_idx";
CREATE INDEX "outbox_events_status_updated_at_idx" ON "outbox_events" ("status", "updated_at");
