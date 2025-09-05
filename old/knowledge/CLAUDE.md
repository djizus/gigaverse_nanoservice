# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack AI agent platform with three main components:

- `llm-api/` - NestJS backend API using CommonJS modules
- `llm-front/` - React frontend with Vite and TanStack Router
- `knowledge/` - Knowledge base documents for ChromaDB indexing

## Common Development Commands

### Backend (llm-api)

```bash
cd llm-api
pnpm install                 # Install dependencies
pnpm run start:dev          # Development server with hot reload
pnpm run start:debug        # Development with debugging
pnpm run build              # Build for production
pnpm run start:prod         # Run production build
pnpm run test               # Run unit tests
pnpm run test:watch         # Run tests in watch mode
pnpm run test:cov           # Run tests with coverage
pnpm run test:e2e           # Run end-to-end tests
pnpm run lint               # Run ESLint with auto-fix
pnpm run format             # Format code with Prettier
```

### Frontend (llm-front)

```bash
cd llm-front
pnpm install                # Install dependencies
pnpm run dev                # Development server with hot reload
pnpm run build              # TypeScript check + production build
pnpm run preview            # Preview production build
pnpm run lint               # Run ESLint
```

## Core Architecture

### Key Concepts

- **Agents**: AI assistants powered by LLM providers (Anthropic Claude, OpenAI)
- **Contexts**: Define agent behavior with React-like lifecycle (chat, notion integration, etc.)
- **Actions**: Typed, validated operations agents can perform (Zod schemas)
- **Sessions**: Conversation instances between users and agents
- **Templates**: Pre-configured agent setups with variable interpolation
- **Memory**: Persistent storage using Supabase or in-memory
- **Knowledge Base**: Document indexing and retrieval using ChromaDB
- **MCP**: Model Context Protocol integration for external tool calling

### Main Modules

- **Daydreams Module** (`src/daydreams/`): Core agent orchestration using @daydreamsai/core framework
  - Contexts with lifecycle hooks: onStep, onRun, shouldContinue, onError
  - Action composition with setActions(), setInputs(), setOutputs()
  - React-like mental model for agent behavior
- **Knowledge Module** (`src/knowledge/`): Document management and vector search
- **LLM Module** (`src/llm/`): Direct LLM interaction layer

### Technology Stack

- **Backend**: NestJS 11, TypeScript 5.7+, CommonJS modules, @daydreamsai/core
- **Frontend**: React 18, Vite, TanStack Router, Shadcn/ui, Zustand, Tailwind
- **AI/LLM**: @ai-sdk/anthropic, @ai-sdk/openai
- **Database**: Supabase (PostgreSQL), ChromaDB (vector search)
- **Protocol**: Model Context Protocol (stdio, HTTP, WebSocket, SSE)

## Environment Configuration

### Required Environment Variables (llm-api)

```bash
# Core API Keys
ANTHROPIC_API_KEY=sk-ant-...     # Claude API access
DISCORD_TOKEN=...                 # Discord bot token
DISCORD_BOT_NAME=...              # Discord bot name

# Database
SUPABASE_URL=https://...          # Supabase project URL
SUPABASE_API_KEY=...              # Supabase anon/service key

# Memory Configuration
MEMORY_TYPE=supabase              # Options: supabase/mongodb/in-memory
```

### Optional Environment Variables

```bash
OPENAI_API_KEY=...                # OpenAI API access
NOTION_API_KEY=...                # Notion integration
USE_CHROMA=false                  # Disable ChromaDB if needed
KNOWLEDGE_DIR=./knowledge         # Knowledge base directory
PORT=3000                         # API server port
```

## Database Schema

### Agents Table

```sql
agents (
  id TEXT PRIMARY KEY,
  model_type TEXT NOT NULL,      -- "anthropic" or "openai"
  model_id TEXT NOT NULL,         -- e.g., "claude-3-7-sonnet-latest"
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,              -- system prompt
  contexts JSONB,                 -- available contexts like ["chat"]
  context_args JSONB,             -- context configuration
  status TEXT DEFAULT 'inactive',
  capabilities JSONB,
  stats JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Templates Table

```sql
templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Model configuration
  model_type TEXT,                -- "anthropic" or "openai"
  model_id TEXT,                  -- e.g., "claude-3-5-sonnet-latest"
  
  -- Agent behavior
  instructions TEXT,              -- System prompt/instructions
  contexts JSONB,                 -- Available contexts ["chat", "linear", "notion"]
  context_args JSONB,             -- Context-specific configuration
  capabilities JSONB,             -- Agent capabilities ["chat", "memory", "mcp"]
  
  -- Template system
  variables JSONB,                -- Template variables for interpolation
  example_prompts JSONB,          -- Example prompts for the template
  tags JSONB,                     -- Tags for organization
  version TEXT DEFAULT '1.0.0',  -- Template version
  
  -- MCP integration
  mcp_servers JSONB DEFAULT '[]', -- MCP server configurations
  
  -- Metadata
  status TEXT DEFAULT 'active',   -- active, inactive, draft, archived
  owner_id TEXT,                  -- User who created the template
  metadata JSONB DEFAULT '{}',    -- Additional metadata
  
  -- Timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT templates_status_check CHECK (status IN ('active', 'inactive', 'draft', 'archived'))
)
```

## Key Service Patterns

### Agent Management

- Agents are created via `DaydreamsService` which handles core framework integration
- Agent persistence is managed by `SupabaseStorageService`
- Templates allow dynamic agent creation with variable substitution using {{variable}} syntax

### Context System Architecture

```typescript
// Contexts use React-like lifecycle and composition
const customChatContext = context<ChatMemory>({
  type: 'chat',
  schema: chatSchema,
  instructions: state => mergeInstructions(agent, context),
  onStep: async (state, setNext) => {
    /* handle each conversation turn */
  },
  onRun: async state => {
    /* initialization */
  },
  shouldContinue: state => state.continueConversation,
  onError: async (error, state) => {
    /* error handling */
  },
});
```

### Memory Systems

The platform supports multiple memory backends:

- **Supabase**: For agent metadata, sessions, and persistent state
- **ChromaDB**: For vector-based knowledge retrieval and document search
- **In-memory**: For development/testing without external dependencies

### MCP Integration

- Supports multiple transport types: stdio, HTTP, WebSocket, SSE
- Pre-configured server templates for common tools (Notion, Linear, local servers)
- Tool calling with typed responses
- Resource reading capabilities
- Event monitoring and streaming

#### Available MCP Templates

- **Notion**: Official Notion MCP server with API key authentication
- **Linear**: Official Linear MCP server with OAuth via mcp-remote (browser auth required)
- **HTTP Server**: Generic HTTP MCP server template
- **Local Server**: Template for custom local MCP servers

#### Linear MCP Authentication Notes

The official Linear MCP server uses OAuth with dynamic client registration via mcp-remote. Authentication is handled automatically through OAuth flow when connecting. The server provides secure access to Linear issues, projects, and teams.

## Development Notes

- The project uses pnpm as the package manager across all workspaces
- Both frontend and backend use TypeScript with strict typing enabled
- The backend uses CommonJS modules - imports do not require file extensions
- The daydreams module is the core of the agent system - understand its React-like patterns first
- ChromaDB can be disabled via USE_CHROMA=false for simpler local development
- Agent templates support {{variable}} interpolation for dynamic configuration
- Knowledge documents are stored as markdown files in the knowledge/ directory
- MCP servers can be configured and managed through the UI or API
