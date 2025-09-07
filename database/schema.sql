-- Gigaverse Nanoservice Database Schema
-- Real-time dungeon runs with event logging

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- (Legacy tables removed — using a single summaries table below)

-- Single-table summary for production analytics (canonical)
CREATE TABLE IF NOT EXISTS run_summaries_simple (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_address TEXT NOT NULL,
  context TEXT NOT NULL,
  llm_model TEXT NOT NULL DEFAULT 'google-vertex/gemini-2.5-flash',
  total_runs INTEGER NOT NULL CHECK (total_runs > 0),
  completed_runs INTEGER DEFAULT 0 CHECK (completed_runs >= 0),
  dungeon_id INTEGER NOT NULL,
  is_juiced BOOLEAN DEFAULT false,
  consumables JSONB DEFAULT '[]'::jsonb,
  gear_instance_ids JSONB DEFAULT '[]'::jsonb,
  -- Namespacing for multi-service support (added via migration for existing DBs)
  service_id TEXT NOT NULL DEFAULT 'gigaverse',
  developer TEXT NOT NULL DEFAULT 'daydreams',
  meta JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','processing','completed','failed','aborted')),
  error_message TEXT,
  details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_player_status ON run_summaries_simple(player_address, status);
CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_created_at ON run_summaries_simple(created_at);
-- Ensure namespacing columns exist before creating namespacing indexes (for existing DBs)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='run_summaries_simple' AND column_name='service_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_service_created ON run_summaries_simple(service_id, created_at);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='run_summaries_simple' AND column_name='developer'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_dev_service_status ON run_summaries_simple(developer, service_id, status);
  END IF;
END $$;

-- Triggers to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'run_summaries_simple_updated_at') THEN
    CREATE TRIGGER run_summaries_simple_updated_at BEFORE UPDATE ON run_summaries_simple FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- Row Level Security (RLS)
ALTER TABLE run_summaries_simple ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow all on run_summaries_simple'
      AND schemaname = 'public'
      AND tablename = 'run_summaries_simple'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all on run_summaries_simple" ON public.run_summaries_simple FOR ALL USING (true)';
  END IF;
END $$;

-- Optional: Sample data
-- INSERT INTO run_summaries_simple (player_address, context, llm_model, total_runs, dungeon_id)
-- VALUES ('0x1234...', 'Be aggressive in combat', 'google-vertex/gemini-2.5-flash', 2, 1);
