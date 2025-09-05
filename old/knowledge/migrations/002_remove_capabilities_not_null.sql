-- Remove NOT NULL constraint from capabilities column in agents table
ALTER TABLE agents 
ALTER COLUMN capabilities DROP NOT NULL;

-- Set default value to empty array for capabilities
ALTER TABLE agents 
ALTER COLUMN capabilities SET DEFAULT '[]'::jsonb;

-- Update any existing NULL values to empty array
UPDATE agents 
SET capabilities = '[]'::jsonb 
WHERE capabilities IS NULL;