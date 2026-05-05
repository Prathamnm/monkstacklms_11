#!/bin/sh
set -e

if ! command -v pg_dump >/dev/null 2>&1; then echo "Error: pg_dump is not installed or not in PATH."; exit 1; fi

mkdir -p backups

LOCAL_DB="${LOCAL_DATABASE_URL:-postgresql://moonshine:moonshine@localhost:5433/moonshine_lms}"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_FILE="backups/local-${TIMESTAMP}.dump"

echo "==> Creating backup of local database..."
pg_dump -d "$LOCAL_DB" --format=custom -f "$BACKUP_FILE"

echo "Backup created at: $BACKUP_FILE"

if [ "$1" = "--prune" ]; then
    echo "==> Pruning backups older than 7 days..."
    if command -v find >/dev/null 2>&1; then
        find backups -name "local-*.dump" -type f -mtime +7 -exec rm {} \;
    fi
fi
