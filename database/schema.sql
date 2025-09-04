-- Gigaverse Nanoservice Database Schema
-- Real-time dungeon runs with event logging

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main dungeon runs table
-- Tracks session-level dungeon runs with payment info
CREATE TABLE IF NOT EXISTS dungeon_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_address TEXT NOT NULL,
  context TEXT NOT NULL,
  total_runs INTEGER NOT NULL CHECK (total_runs > 0),
  completed_runs INTEGER DEFAULT 0 CHECK (completed_runs >= 0),
  dungeon_id INTEGER NOT NULL,
  is_juiced BOOLEAN DEFAULT false,
  consumables JSONB DEFAULT '[]'::jsonb,
  gear_instance_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT completed_runs_lte_total CHECK (completed_runs <= total_runs)
);

-- Individual run logs within a dungeon session
-- Tracks detailed stats for each individual run
CREATE TABLE IF NOT EXISTS run_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dungeon_run_id UUID NOT NULL REFERENCES dungeon_runs(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL CHECK (run_number > 0),
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'processing', 'completed', 'died', 'error')),
  rooms_cleared INTEGER DEFAULT 0 CHECK (rooms_cleared >= 0),
  battles_won INTEGER DEFAULT 0 CHECK (battles_won >= 0),
  battles_lost INTEGER DEFAULT 0 CHECK (battles_lost >= 0),
  items_gained INTEGER DEFAULT 0 CHECK (items_gained >= 0),
  moves TEXT[] DEFAULT ARRAY[]::TEXT[],
  loot_choices TEXT[] DEFAULT ARRAY[]::TEXT[],
  player_stats JSONB,
  error_message TEXT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(dungeon_run_id, run_number)
);

-- Real-time events for live updates
-- Logs individual actions and events during runs
CREATE TABLE IF NOT EXISTS run_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dungeon_run_id UUID NOT NULL REFERENCES dungeon_runs(id) ON DELETE CASCADE,
  run_log_id UUID REFERENCES run_logs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure event_type uses the allowed set, including agent-specific events
ALTER TABLE run_events DROP CONSTRAINT IF EXISTS run_events_event_type_check;
ALTER TABLE run_events ADD CONSTRAINT run_events_event_type_check CHECK (
  event_type IN (
    'run_started',
    'room_entered',
    'combat_move',
    'battle_result',
    'loot_phase',
    'loot_selected',
    'room_cleared',
    'run_completed',
    'all_runs_completed',
    'error',
    'agent_decision_move',
    'agent_decision_loot',
    'agent_error'
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dungeon_runs_player_status ON dungeon_runs(player_address, status);
CREATE INDEX IF NOT EXISTS idx_dungeon_runs_created_at ON dungeon_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_run_logs_dungeon_run ON run_logs(dungeon_run_id);
CREATE INDEX IF NOT EXISTS idx_run_events_dungeon_run ON run_events(dungeon_run_id);
CREATE INDEX IF NOT EXISTS idx_run_events_timestamp ON run_events(timestamp);

-- Triggers to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dungeon_runs_updated_at 
  BEFORE UPDATE ON dungeon_runs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) setup for Supabase
-- Enable RLS on all tables
ALTER TABLE dungeon_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (adjust as needed)
-- Allow all operations for now - customize based on your security needs
CREATE POLICY "Allow all operations on dungeon_runs" ON dungeon_runs
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on run_logs" ON run_logs  
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on run_events" ON run_events
  FOR ALL USING (true);

-- Optional: Sample data for testing
-- INSERT INTO dungeon_runs (
--   player_address,
--   context,
--   total_runs,
--   dungeon_id
-- ) VALUES (
--   '0x1234567890123456789012345678901234567890',
--   'Test aggressive combat strategy',
--   3,
--   1
-- );
