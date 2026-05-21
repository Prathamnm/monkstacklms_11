# Azure Container Apps Deployment Guide

## Prerequisites
- Azure subscription
- Azure CLI installed and logged in (`az login`)
- Azure Container Apps extension (`az extension add --name containerapp --upgrade`)
- GitHub repo secrets/variables configured (for CI/CD path)
- Azure Database for PostgreSQL Flexible Server provisioned

## Required Environment Variables
- `DATABASE_URL` (must include `sslmode=require` for Azure PostgreSQL)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_TENANT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `ACS_CONNECTION_STRING`
- `ACS_SENDER_ADDRESS`
- `APPLICATIONINSIGHTS_CONNECTION_STRING` (optional but recommended)

## CI/CD Path (GitHub Actions)
Workflow: `.github/workflows/deploy-aca.yml`

Set GitHub secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `AZURE_AD_CLIENT_SECRET`
- `ACS_CONNECTION_STRING`

Set GitHub variables:
- `ACA_RESOURCE_GROUP`
- `ACA_APP_NAME`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_TENANT_ID`
- `ACS_SENDER_ADDRESS`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`

## Manual Deployment Path (Azure CLI)
Run:

```powershell
./scripts/deploy-aca.ps1
```

The script will:
1. Create resource group + ACR + Container Apps environment.
2. Build and push Docker image to ACR.
3. Create/update Container App with ingress on port `3000`.
4. Configure secrets and runtime env vars.
5. Apply probe configuration from `scripts/containerapp.template.yaml`.

## Health Endpoints
- Live: `/api/health/live`
- Ready: `/api/health/ready`

Use these for Container Apps probes and post-deployment smoke checks.

## Database Migrations in Container
The container startup script supports:
- `RUN_MIGRATIONS=true` to run `prisma migrate deploy` on startup.
- `RUN_SEED=true` to run `prisma db seed` after migrations.

For high-scale production, prefer a dedicated migration job in pipeline before traffic cutover.
