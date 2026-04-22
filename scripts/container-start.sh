#!/bin/sh
set -e

if [ -z "${DATABASE_URL}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

echo "Starting Next.js server..."
exec node server.js
