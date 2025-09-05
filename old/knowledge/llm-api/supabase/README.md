# Supabase Database Migrations

This directory contains all SQL migrations for the LLM-API project.

## Structure

```
supabase/
├── migrations/
│   ├── 00001_initial_schema.sql    # Core tables: agents, templates, sessions, documents
│   └── 00002_auth_updates.sql      # Authentication and user management
└── README.md
```

## Running Migrations

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order
4. Execute the SQL

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Using psql

```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
\i supabase/migrations/00001_initial_schema.sql
\i supabase/migrations/00002_auth_updates.sql
```

## Migration Files

### 00001_initial_schema.sql
- Creates core tables: `agents`, `templates`, `sessions`, `documents`
- Sets up indexes for performance
- Configures Row Level Security (RLS)
- Creates update timestamp triggers

### 00002_auth_updates.sql
- Adds user approval system
- Creates `user_profiles` table
- Adds helper functions for auth checks
- Updates RLS policies with approval requirements

## Creating New Migrations

Name your migration files with a sequential number prefix:
```
00003_your_migration_name.sql
```

## Notes

- Always test migrations in a development environment first
- Migrations are designed to be idempotent (safe to run multiple times)
- Make sure to backup your database before running migrations in production
- The service role key bypasses RLS, use it only in your backend