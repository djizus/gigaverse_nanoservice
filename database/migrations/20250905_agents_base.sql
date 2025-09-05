-- Simplified Daydreams schema (unprefixed)
-- Creates the minimal tables and indexes required by the current service.
-- Idempotent and safe to run multiple times.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============
-- agents
-- ===============
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  model TEXT NOT NULL,
  model_type TEXT,
  context TEXT NOT NULL,
  contexts TEXT[] DEFAULT ARRAY[]::TEXT[],
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  context_args JSONB DEFAULT '{}'::jsonb,
  capabilities JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  mcp_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION agents_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'agents_updated_at') THEN
    CREATE TRIGGER agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION agents_touch_updated_at();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- RLS (dev-friendly, adjust for prod)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow all on agents'
      AND schemaname = 'public'
      AND tablename = 'agents'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all on agents" ON public.agents FOR ALL USING (true)';
  END IF;
END $$;

-- ===============
-- sessions
-- ===============
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  daydreams_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sessions_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sessions_updated_at') THEN
    CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION sessions_touch_updated_at();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow all on sessions'
      AND schemaname = 'public'
      AND tablename = 'sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all on sessions" ON public.sessions FOR ALL USING (true)';
  END IF;
END $$;

-- ===============
-- messages
-- ===============
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow all on messages'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true)';
  END IF;
END $$;

-- ===============
-- templates
-- ===============
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  model TEXT,
  context TEXT,
  instructions TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION templates_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'templates_updated_at') THEN
    CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION templates_touch_updated_at();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow all on templates'
      AND schemaname = 'public'
      AND tablename = 'templates'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all on templates" ON public.templates FOR ALL USING (true)';
  END IF;
END $$;

COMMIT;
