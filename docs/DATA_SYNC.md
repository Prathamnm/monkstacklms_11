# Moonshine LMS Data Synchronization Guide

This guide covers how to synchronize transactional data between local and production environments, manage local backups, and properly populate your local database.

## Employees are Never Seeded
The `employees` table must **never** be manually seeded, dumped, or restored. Employees are automatically created by the `/api/auth/sync` endpoint when a user logs in via Microsoft Entra ID (MSAL). This ensures that role mapping and external ID bindings remain perfectly in sync with Azure.

## Populating a Fresh Local Database
If you are starting from a completely clean slate, follow these steps to populate your local database:
1. Run `docker-compose up -d` to start the local PostgreSQL container.
2. Run Prisma migrations: `npx prisma migrate dev` or `npx prisma db push`.
3. Have each team member log into the application locally once. This will trigger the `/api/auth/sync` endpoint to generate their `employee` record.
4. (Optional) Run `npx prisma db seed` if you have safe, non-employee lookup tables.

> **Warning:** Do not use `docker-compose down -v`. The `-v` flag destroys named volumes, wiping out your local database permanently. Use `docker-compose down` to stop containers while preserving the `postgres_data` volume.

## Running the Sync Scripts

The sync scripts migrate non-employee transactional tables (like `leave_requests`, `leave_balances`, etc.) while leaving the `employees` table untouched. Ensure that you have the PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) installed and in your system PATH.

### 1. Sync Production to Local
Use this to bring fresh production data into your local development environment:
```sh
./scripts/sync-prod-to-local.sh
```
This script will safely truncate your local transactional tables and pull data from PROD. 

### 2. Sync Local to Production
Use this to push local changes to the production database:
```sh
./scripts/sync-local-to-prod.sh
```
**DANGER:** This overwrites production data. You will be asked multiple times to confirm. Use this strictly for initial migrations or urgent fixes.

### 3. Local Backups
Create a fast local backup using the custom pg dump format:
```sh
./scripts/backup-local.sh
```
Add the `--prune` flag (`./scripts/backup-local.sh --prune`) to automatically delete backups older than 7 days.

### 4. Restore Local Backup
Restore any generated backup file:
```sh
./scripts/restore-backup.sh backups/local-YYYY-MM-DD-HHMMSS.dump
```

## Azure Environment Requirements
For local sync and login flows to match production accurately, both environments must share the same `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` (and related Entra configurations). Otherwise, Entra ID groups and roles will not map correctly.
