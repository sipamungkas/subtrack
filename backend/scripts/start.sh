#!/bin/sh
# ============================================
# Subnudge Backend - Production Startup Script
# Runs migrations then starts the server
# ============================================

set -e

echo "🚀 Starting Subnudge Backend..."

# Run database migrations
echo "📦 Running database migrations..."
bun run db:migrate

echo "✅ Migrations complete!"

# Start the application
echo "🌐 Starting server on port ${PORT:-3000}..."
exec bun run dist/index.js
