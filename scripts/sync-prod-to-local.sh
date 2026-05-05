#!/bin/sh
set -e

if ! command -v pg_dump >/dev/null 2>&1; then echo "Error: pg_dump is not installed or not in PATH."; exit 1; fi
if ! command -v pg_restore >/dev/null 2>&1; then echo "Error: pg_restore is not installed or not in PATH."; exit 1; fi
if ! command -v psql >/dev/null 2>&1; then echo "Error: psql is not installed or not in PATH."; exit 1; fi

if [ -f .env.prod ]; then . .env.prod; fi
if [ -f .env ]; then export $(grep -v '^#' .env | grep -v '^$' | xargs) >/dev/null 2>&1 || true; fi
if [ -f .env.local ]; then export $(grep -v '^#' .env.local | grep -v '^$' | xargs) >/dev/null 2>&1 || true; fi

PROD_DB="${PROD_DATABASE_URL:-}"
LOCAL_DB="${LOCAL_DATABASE_URL:-postgresql://moonshine:moonshine@localhost:5433/moonshine_lms}"

if [ -z "$PROD_DB" ]; then echo "Error: PROD_DATABASE_URL is not set."; exit 1; fi

echo "This will overwrite local transactional data. Continue? (y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then echo "Aborted."; exit 0; fi

DUMP_FILE=$(mktemp)
TABLES="-t leave_requests -t leave_balances -t leave_ledger_entries -t notifications -t audit_logs -t announcements -t public_holidays -t attendance_records"

echo "==> Exporting data from production..."
pg_dump -d "$PROD_DB" $TABLES --data-only --disable-triggers -Fc -f "$DUMP_FILE"

echo "==> Truncating local tables..."
psql "$LOCAL_DB" -c "
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE leave_ledger_entries CASCADE;
TRUNCATE TABLE leave_requests CASCADE;
TRUNCATE TABLE leave_balances CASCADE;
TRUNCATE TABLE announcements CASCADE;
TRUNCATE TABLE public_holidays CASCADE;
TRUNCATE TABLE attendance_records CASCADE;
"

echo "==> Restoring data into local database..."
pg_restore -d "$LOCAL_DB" --data-only --disable-triggers "$DUMP_FILE" || true

rm -f "$DUMP_FILE"
echo "==> Sync complete!"
