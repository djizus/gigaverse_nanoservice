#!/bin/bash

# Import templates from context-proposals to database

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Template Import Script${NC}"
echo "========================"

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_API_KEY" ]; then
    echo -e "${RED}Error: Please set SUPABASE_URL and SUPABASE_API_KEY environment variables${NC}"
    echo ""
    echo "Example:"
    echo "export SUPABASE_URL=https://your-project.supabase.co"
    echo "export SUPABASE_API_KEY=your-api-key"
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables configured"
echo ""

# Navigate to the script directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "../node_modules/@supabase/supabase-js" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd ..
    pnpm add @supabase/supabase-js
    cd scripts
fi

# Run the TypeScript import script
echo -e "${BLUE}Running template import...${NC}"
npx tsx import-templates.ts

echo -e "\n${GREEN}Done!${NC}"