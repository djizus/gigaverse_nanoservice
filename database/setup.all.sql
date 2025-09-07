-- Full, idempotent setup for nanoservice DB (runs + events summary)
-- Safe to run multiple times on Supabase/Postgres

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Table (create or ensure columns)
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
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','processing','completed','failed','aborted')),
  error_message TEXT,
  details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2b) Add namespacing columns if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='run_summaries_simple' AND column_name='service_id'
  ) THEN
    ALTER TABLE run_summaries_simple ADD COLUMN service_id TEXT NOT NULL DEFAULT 'gigaverse';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='run_summaries_simple' AND column_name='developer'
  ) THEN
    ALTER TABLE run_summaries_simple ADD COLUMN developer TEXT NOT NULL DEFAULT 'daydreams';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='run_summaries_simple' AND column_name='meta'
  ) THEN
    ALTER TABLE run_summaries_simple ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3) Trigger to keep updated_at fresh
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
END $$;

-- 4) RLS (demo policy enables all; tighten in production)
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

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_player_status ON run_summaries_simple(player_address, status);
CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_created_at ON run_summaries_simple(created_at);
CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_service_created ON run_summaries_simple(service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_run_summaries_simple_dev_service_status ON run_summaries_simple(developer, service_id, status);

-- Done

