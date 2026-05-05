#!/bin/sh
set -e

if ! command -v pg_restore >/dev/null 2>&1; then echo "Error: pg_restore is not installed or not in PATH."; exit 1; fi

if [ -z "$1" ]; then
    echo "Usage: $0 [filepath]"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "Error: File not found: $1"
    exit 1
fi

LOCAL_DB="${LOCAL_DATABASE_URL:-postgresql://moonshine:moonshine@localhost:5433/moonshine_lms}"

echo "This will overwrite local transactional data. Continue? (y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then echo "Aborted."; exit 0; fi

echo "==> Restoring backup to local database..."
pg_restore -d "$LOCAL_DB" --clean "$1" || true

echo "==> Restore complete!"
