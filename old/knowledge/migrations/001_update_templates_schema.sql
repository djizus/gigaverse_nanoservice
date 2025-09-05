-- Migration: Update templates table schema
-- Add missing columns for enhanced template functionality

-- Add MCP servers configuration
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS mcp_servers JSONB DEFAULT '[]'::jsonb;

-- Add template status (active, inactive, draft)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add owner information
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- Add template metadata
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update existing templates to have default values
UPDATE templates 
SET 
    mcp_servers = '[]'::jsonb,
    status = 'active',
    metadata = '{}'::jsonb
WHERE mcp_servers IS NULL 
   OR status IS NULL 
   OR metadata IS NULL;

-- Create index on status and owner_id for faster queries
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_owner ON templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Add constraints
ALTER TABLE templates 
ADD CONSTRAINT IF NOT EXISTS templates_status_check 
CHECK (status IN ('active', 'inactive', 'draft', 'archived'));

COMMENT ON TABLE templates IS 'Enhanced agent templates with full configuration';
COMMENT ON COLUMN templates.mcp_servers IS 'MCP server configurations for the template';
COMMENT ON COLUMN templates.status IS 'Template status: active, inactive, draft, archived';
COMMENT ON COLUMN templates.owner_id IS 'ID of the user who created this template';
COMMENT ON COLUMN templates.metadata IS 'Additional template metadata and settings';