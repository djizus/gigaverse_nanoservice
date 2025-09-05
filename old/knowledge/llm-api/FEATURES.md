# LLM-API Features Documentation

This document presents all features identified through test analysis and their implementation locations in the codebase.

## Core Architecture Features

### Agent Management System

**Location**: `src/daydreams/daydreams.service.ts:398-772`

- **Agent Creation**: Create AI agents with specific configurations and contexts
  - Basic agent creation with model type, instructions, and contexts
  - Template-based agent creation with variable interpolation
  - Support for Anthropic Claude and OpenAI models
  - MCP (Model Context Protocol) integration support

- **Agent Configuration**: Comprehensive configuration options
  - Model selection (claude-3-7-sonnet-latest, etc.)
  - Context assignment (chat, chat-with-actions, notion)
  - Custom instructions and descriptions
  - Status management (active/inactive)
  - Capability definitions

- **Agent Communication**: Send messages and receive responses
  - Context-aware messaging
  - Input/output processing with typed schemas
  - Error handling for non-existent agents
  - Response streaming support

- **Agent Persistence**: Database storage and retrieval
  - Supabase integration for agent metadata
  - Agent configuration caching
  - Bulk operations support

### Template System

**Location**: `src/daydreams/template.service.ts:52-439`

- **Template Management**: CRUD operations for agent templates
  - Default templates (General Assistant, Code Assistant, Creative Writer)
  - Custom template creation and modification
  - Template versioning and metadata

- **Variable Interpolation**: Dynamic content generation
  - Required and optional variables with default values
  - `{{variable}}` syntax for template placeholders
  - Template rendering with variable substitution
  - Validation for missing required variables

- **Storage Flexibility**: Multiple storage backends
  - Supabase database storage
  - In-memory fallback for development
  - Graceful error handling and fallbacks

### Memory & Conversation Management

**Location**: `src/daydreams/services/memory.service.ts:65-439`

- **Memory Store Types**: Multiple storage backends
  - In-memory storage for development/testing
  - Supabase PostgreSQL for production
  - ChromaDB for vector-based knowledge retrieval
- **Conversation Persistence**: Chat session management
  - Session creation and retrieval
  - Message history storage
  - Conversation metadata (titles, tags, activity status)
  - Session cleanup and deletion

- **Memory Configuration**: Environment-based setup
  - `MEMORY_TYPE` environment variable support
  - Automatic fallback mechanisms
  - Connection validation and error handling

## Document Management Features

**Location**: `src/daydreams/services/documents.service.ts:12-433`

### Document CRUD Operations

- **Document Creation**: Create shared documents with metadata
  - Title, content, creator tracking
  - Manager notes and status management
  - Automatic timestamp generation

- **Document Retrieval**: Flexible document access
  - Individual document retrieval by ID
  - Bulk listing with optional status filtering
  - Sorted by modification time

- **Document Updates**: Partial and full document modifications
  - Content and metadata updates
  - Status transitions (draft → published → archived)
  - Version control through timestamps

### Collaborative Features

- **Collaborator Assignment**: Multi-agent collaboration
  - Agent assignment to documents with specific roles
  - Task description and status tracking
  - Role-based permissions (reviewer, editor, etc.)

- **Collaboration Management**:
  - Collaborator status updates
  - Task reassignment capabilities
  - Removal of collaborators from documents

## Model Context Protocol (MCP) Integration

**Location**: `src/daydreams/services/mcp.service.ts:30-250`

### Server Management

- **MCP Server Templates**: Pre-configured server types
  - Notion integration servers
  - Local development servers
  - Custom server configurations

- **Connection Management**: Dynamic server connections
  - Support for multiple transport types (stdio, HTTP, WebSocket, SSE)
  - Connection pooling and cleanup
  - Health monitoring and reconnection

### Tool Integration

- **Tool Calling**: External service integration
  - Dynamic tool discovery from connected servers
  - Typed tool parameters and responses
  - Error handling for unavailable services

- **Resource Access**: External data retrieval
  - File system access through MCP servers
  - API integrations via MCP protocol
  - Streaming data support

## Context System

**Location**: Multiple context files in `src/daydreams/context/`

### Available Contexts

- **Chat Context**: Basic conversational interaction
  - Message processing and response generation
  - Session state management
  - Memory integration for conversation history

- **Chat with Actions Context**: Extended chat with tool calling
  - Action composition and execution
  - Input/output schema validation
  - Enhanced capability exposure

- **Notion Context**: Notion workspace integration
  - Page creation, reading, and updating
  - Database queries and filtering
  - Search functionality across workspaces

### Context Lifecycle

- **React-like Architecture**: Familiar component patterns
  - `onRun`: Context initialization
  - `onStep`: Per-message processing
  - `shouldContinue`: Flow control logic
  - `onError`: Error handling and recovery

## API Endpoints

### Agent Management

**Location**: `src/daydreams/controllers/agents.controller.ts`

- `GET /daydreams/agents` - List all agents
- `POST /daydreams/agents` - Create new agent
- `GET /daydreams/agents/:id` - Get agent details
- `DELETE /daydreams/agents/:id` - Delete agent
- `POST /daydreams/agents/:id/send` - Send message to agent
- `GET /daydreams/agents/:id/actions` - Get agent actions
- `GET /daydreams/agents/:id/memory/conversations` - Get conversations
- `DELETE /daydreams/agents` - Bulk delete agents

### Template Management

**Location**: `src/daydreams/template.controller.ts`

- `GET /templates` - List all templates
- `GET /templates/:id` - Get specific template
- `POST /templates` - Create new template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/render` - Render template with variables
- `POST /templates/import` - Import template from JSON

### Document Management

**Location**: `src/daydreams/controllers/documents.controller.ts`

- `GET /documents` - List documents (with optional status filter)
- `POST /documents` - Create new document
- `GET /documents/:id` - Get document by ID
- `PUT /documents/:id` - Update document
- `DELETE /documents/:id` - Delete document
- `POST /documents/:id/collaborators` - Assign collaborator
- `PUT /documents/:id/collaborators/:agentId` - Update collaborator
- `DELETE /documents/:id/collaborators/:agentId` - Remove collaborator

### MCP Server Management

**Location**: `src/daydreams/controllers/mcp.controller.ts`

- MCP server connection management
- Tool discovery and execution
- Server template management
- Resource access endpoints

### Session Management

**Location**: `src/daydreams/controllers/sessions.controller.ts`

- Conversation session management
- Message history retrieval
- Session metadata operations

## Storage & Database Features

### Database Schema & Migrations

**Location**: `/supabase/migrations/`

- **Centralized SQL Migrations**: All database schemas in one place
  - `00001_initial_schema.sql`: Core tables (agents, templates, sessions, documents)
  - `00002_auth_updates.sql`: Authentication system with user approval
  - Migration runner script: `run-migrations.sh`

- **Tables Structure**:
  - `agents`: AI agent configurations and states
  - `templates`: Pre-configured agent templates with variables
  - `sessions`: Conversation history and metadata
  - `documents`: Knowledge base documents per agent
  - `user_profiles`: Extended user information and permissions

- **Security Features**:
  - Row Level Security (RLS) on all tables
  - Service role and authenticated user policies
  - User approval system for restricted access

### Supabase Integration

**Location**: `src/daydreams/services/supabase-storage.service.ts`

#### Database Schema Support

- **Agents Table**: Agent metadata and configuration
  - Model type and ID storage
  - Instructions and context configuration
  - Status and capability tracking
  - Statistics and usage metrics

- **Templates Table**: Template definitions and variables
  - Template metadata and versioning
  - Variable definitions with validation
  - Tag-based categorization

- **Documents Table**: Shared document storage
  - Document content and metadata
  - Status workflow management
  - Creator and timestamp tracking

- **Conversations Table**: Chat session persistence
  - Message history storage
  - Session metadata management
  - Cross-agent conversation support

### ChromaDB Vector Storage

- **Knowledge Base Integration**: Document similarity search
- **Semantic Search**: Vector-based content retrieval
- **Document Indexing**: Automatic content processing

## Testing Infrastructure

### Unit Tests

- **Service Layer Testing**: Comprehensive service mocking
  - DaydreamsService: Agent lifecycle and communication
  - TemplateService: Template CRUD and rendering
  - MemoryService: Multi-backend memory initialization
  - DocumentsService: Document and collaboration management
  - McpService: Server connection and tool calling

### Integration Tests (E2E)

- **API Endpoint Testing**: Full request/response validation
  - Agent creation, retrieval, and deletion workflows
  - Template management with variable rendering
  - Document collaboration scenarios
  - Error handling and edge cases

### Test Configuration

- **Environment Isolation**: Test-specific configurations
  - In-memory storage for testing
  - Mock external dependencies
  - Isolated test environments

## Configuration & Environment

### Environment Variables

**Required**:

- `ANTHROPIC_API_KEY`: Claude API access
- `DISCORD_TOKEN`: Discord bot integration
- `SUPABASE_URL`: Database connection
- `SUPABASE_API_KEY`: Database authentication

**Optional**:

- `OPENAI_API_KEY`: OpenAI model access
- `NOTION_API_KEY`: Notion integration
- `MEMORY_TYPE`: Memory backend selection (supabase/in-memory/chroma)
- `USE_CHROMA`: ChromaDB integration toggle
- `KNOWLEDGE_DIR`: Knowledge base directory

### Development Features

- **Hot Reload**: Development server with automatic restart
- **Debug Mode**: Enhanced logging and error details
- **Testing Modes**: In-memory backends for testing
- **Health Checks**: Service availability monitoring

## Security & Validation

### Input Validation

- **Schema Validation**: Zod-based input validation
- **Type Safety**: Full TypeScript implementation
- **API Validation**: Request/response validation
- **Environment Validation**: Required configuration checks

### Error Handling

- **Graceful Degradation**: Fallback mechanisms
- **Service Isolation**: Independent service failure handling
- **Comprehensive Logging**: Debug and error tracking
- **User-Friendly Errors**: Clear error messages and codes

## Extension Points

### Custom Contexts

- **Context Templates**: Reusable context patterns
- **Action Composition**: Custom agent capabilities
- **Lifecycle Hooks**: Custom processing logic

### MCP Extensions

- **Server Templates**: Custom server configurations
- **Tool Definitions**: Custom external integrations
- **Transport Protocols**: Multiple connection methods

### Storage Extensions

- **Custom Memory Stores**: Alternative backends
- **Vector Store Integration**: Enhanced search capabilities
- **Caching Layers**: Performance optimizations
