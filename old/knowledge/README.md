# AI Agent Platform

A full-stack platform for building and managing AI agents with multiple LLM providers, context-aware behaviors, and tool integration.

## 🚀 Features

- **Multi-Provider LLM Support**: Anthropic Claude and OpenAI integration
- **Agent Management**: Create, configure, and manage AI agents with custom behaviors
- **Context System**: React-like lifecycle for agent behaviors (onStep, onRun, shouldContinue)
- **Action Framework**: Typed, validated operations with Zod schemas
- **Memory Persistence**: Multiple backend support (Supabase, MongoDB, in-memory)
- **Knowledge Base**: Document indexing and vector search with ChromaDB
- **Model Context Protocol**: MCP integration for external tool calling
- **Real-time Communication**: WebSocket support for live agent interactions
- **Template System**: Pre-configured agent setups with variable interpolation

## 🛠️ Tech Stack

### Backend

- **Framework**: NestJS 11 with ESM modules
- **Language**: TypeScript 5.7+
- **AI Framework**: @daydreamsai/core
- **LLM SDKs**: @ai-sdk/anthropic, @ai-sdk/openai
- **Database**: Supabase (PostgreSQL), ChromaDB (vector search)
- **Real-time**: WebSockets, Server-Sent Events

### Frontend

- **Framework**: React 18 with Vite
- **Routing**: TanStack Router
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📁 Project Structure

```
.
├── llm-api/          # NestJS backend API
│   ├── src/
│   │   ├── daydreams/    # Core agent orchestration
│   │   ├── knowledge/    # Document management
│   │   └── llm/          # Direct LLM interaction
│   └── templates/        # Agent templates
├── llm-front/        # React frontend application
│   └── src/
│       ├── components/   # UI components
│       ├── routes/       # Application routes
│       └── services/     # API services
└── knowledge/        # Knowledge base documents (gitignored)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- PostgreSQL (via Supabase) or MongoDB
- ChromaDB (optional, for vector search)

### Backend Setup

```bash
cd llm-api
pnpm install
cp .env.example .env
# Configure your environment variables
pnpm run start:dev
```

### Frontend Setup

```bash
cd llm-front
pnpm install
pnpm run dev
```

## 🔧 Configuration

### Required Environment Variables

```bash
# API Keys
ANTHROPIC_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key  # Optional

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_API_KEY=your-supabase-key

# Memory Configuration
MEMORY_TYPE=supabase  # Options: supabase, mongodb, in-memory

# Optional
USE_CHROMA=false      # Disable ChromaDB if not needed
KNOWLEDGE_DIR=./knowledge
PORT=3000
```

## 🔐 User Authentication & Approval System

The platform includes a user approval system where new users must be approved by an administrator before they can access the application.

### User Registration Flow

1. **User Registration**: Users register through the frontend
2. **Account Creation**: Account is created with `approved: false` status
3. **Pending Approval**: User cannot login until approved by admin
4. **Admin Approval**: Administrator approves the user
5. **Access Granted**: User can now login and access the platform

### How to Approve Users

#### Method 1: API Endpoint (Recommended)

```bash
# List pending users
curl -X GET http://localhost:3000/auth/users/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Approve a specific user
curl -X PUT http://localhost:3000/auth/users/USER_ID/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Method 2: Supabase SQL Editor

```sql
-- View all users with approval status
SELECT * FROM public.user_approval_list;

-- Approve a user by email
SELECT public.approve_user('user@example.com');

-- Revoke approval if needed
SELECT public.revoke_user_approval('user@example.com');
```

### Admin Configuration

Currently, admin users are defined in the backend code. To add or modify admin users, edit the `ADMIN_EMAILS` array in `llm-api/src/auth/auth.controller.ts`:

```typescript
const ADMIN_EMAILS = ['admin@example.com', 'another-admin@example.com'];
```

### Security Features

- **Admin-only approval**: Only users with admin emails can approve new users
- **JWT protection**: All admin endpoints require valid authentication
- **Approval verification**: Login system checks approval status before allowing access
- **Audit trail**: User approval status is tracked in Supabase metadata

### Database Setup

Run the following SQL in your Supabase SQL Editor to enable user approval functions:

```sql
-- Function to approve a user by email
CREATE OR REPLACE FUNCTION public.approve_user(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"approved": true}'::jsonb,
        updated_at = NOW()
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke user approval
CREATE OR REPLACE FUNCTION public.revoke_user_approval(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"approved": false}'::jsonb,
        updated_at = NOW()
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to list all users with approval status
CREATE OR REPLACE VIEW public.user_approval_list AS
SELECT
    id,
    email,
    COALESCE((raw_user_meta_data->>'approved')::boolean, false) as is_approved,
    raw_user_meta_data->>'full_name' as full_name,
    created_at,
    last_sign_in_at,
    email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
ORDER BY created_at DESC;
```

## 📚 Core Concepts

### Agents

AI assistants powered by LLM providers with configurable behaviors and capabilities.

### Contexts

Define agent behavior using a React-like lifecycle:

- `onStep`: Handle each conversation turn
- `onRun`: Initialize the context
- `shouldContinue`: Determine if conversation should continue
- `onError`: Handle errors gracefully

### Actions

Typed, validated operations that agents can perform, defined using Zod schemas.

### Templates

Pre-configured agent setups that support variable interpolation using `{{variable}}` syntax.

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# Test coverage
pnpm run test:cov

# E2E tests
pnpm run test:e2e
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source. See the LICENSE file for details.
