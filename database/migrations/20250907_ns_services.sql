-- Namespacing fields for multi-service support
-- Safe to run multiple times

DO $$ BEGIN
  -- Add columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='run_summaries_simple' AND column_name='service_id'
  ) THEN
    ALTER TABLE run_summaries_simple ADD COLUMN service_id TEXT NOT NULL DEFAULT 'gigaverse';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='run_summaries_simple' AND column_name='developer'
  ) THEN
    ALTER TABLE run_summaries_simple ADD COLUMN developer TEXT NOT NULL DEFAULT 'daydreams';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='run_summaries_simple' AND column_name='meta'
  ) THEN
    ALTER TABLE run_summaries_simple ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Backfill NULLs to defaults for existing rows (if any)
UPDATE run_summaries_simple SET service_id = 'gigaverse' WHERE service_id IS NULL;
UPDATE run_summaries_simple SET developer = 'daydreams' WHERE developer IS NULL;
UPDATE run_summaries_simple SET meta = '{}'::jsonb WHERE meta IS NULL;

-- Indexes for service filtering
CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_service_created
  ON run_summaries_simple(service_id, created_at);

CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_dev_service_status
  ON run_summaries_simple(developer, service_id, status);

