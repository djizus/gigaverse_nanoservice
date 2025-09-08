-- Add per-user ownership to daydreams entities (agents/sessions)
-- Idempotent: checks for column existence before altering

BEGIN;

-- agents.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='agents' AND column_name='user_id'
  ) THEN
    ALTER TABLE agents ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
  END IF;
END $$;

-- sessions.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='user_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  END IF;
END $$;

COMMIT;

