# Azure Ops Checklist

## Security
- Store sensitive values only as Container Apps secrets:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `ACS_CONNECTION_STRING`
- Do not bake secrets into Docker image or commit to repository.
- Ensure Azure PostgreSQL enforces SSL (`sslmode=require`).
- Restrict PostgreSQL firewall/network access to required sources.

## Runtime Configuration
- `NODE_ENV=production`
- `PORT=3000`
- `RUN_MIGRATIONS=false` by default in steady state
- `RUN_SEED=false` by default in steady state
- Correct Entra redirect URI for deployed FQDN

## Observability
- Enable Application Insights (or Log Analytics) connection string.
- Monitor Container Apps:
  - revision health
  - restart count
  - probe failures
  - 5xx rate

Useful commands:
```bash
az containerapp logs show --name <app> --resource-group <rg> --follow
az containerapp revision list --name <app> --resource-group <rg> -o table
az containerapp show --name <app> --resource-group <rg> -o yaml
```

## Smoke Tests
- `GET /api/health/live` -> 200
- `GET /api/health/ready` -> 200
- Login flow:
  - `/auth/callback` succeeds
  - `/api/auth/sync` succeeds
  - `/api/auth/me` succeeds
- Role-based dashboard redirect works
- Notification channels:
  - Graph calls
  - ACS email path

## Rollback
- Keep single-app revisions enabled with previous revision available.
- If deployment fails:
  1. Identify last healthy revision.
  2. Route traffic back to last healthy revision.
  3. Revert image tag/env changes.
  4. Re-run smoke tests.
