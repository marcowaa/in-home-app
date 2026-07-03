#!/bin/sh
set -e

echo "Running database schema push..."
npx drizzle-kit push --force --config=drizzle.config.ts 2>&1 || echo "Schema push warning (may be OK if already up-to-date)"

echo "Starting application..."
exec node dist/index.cjs
