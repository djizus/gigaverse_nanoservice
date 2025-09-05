#!/bin/bash

# Run all Supabase migrations
# Usage: ./supabase/run-migrations.sh

set -e

echo "🚀 Running Supabase migrations..."

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL environment variable is not set"
    echo "Please set it to your Supabase database URL"
    echo "Example: export SUPABASE_DB_URL='postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres'"
    exit 1
fi

# Run migrations in order
for migration in $(ls -1 supabase/migrations/*.sql | sort); do
    echo "📝 Running migration: $(basename $migration)"
    psql "$SUPABASE_DB_URL" -f "$migration"
    if [ $? -eq 0 ]; then
        echo "✅ Migration completed: $(basename $migration)"
    else
        echo "❌ Migration failed: $(basename $migration)"
        exit 1
    fi
done

echo "✨ All migrations completed successfully!"