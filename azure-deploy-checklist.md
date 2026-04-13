# Moonshine LMS v3.0 Deployment Checklist (Azure)

## Prerequisites
- [] Azure Subscription
- [] Azure App Service (Linux Web App, Node 20)
- [] Azure PostgreSQL Flexible Server (v14+)
- [] Azure Entra ID Application Registration
- [] Microsoft Graph API Permissions applied

## 1. Environment Configuration

### Required App Settings in Azure App Service
| Key | Example Value | Description |
|---|---|---|
| `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` | `...` | Your Application (client) ID |
| `NEXT_PUBLIC_AZURE_AD_TENANT_ID` | `...` | Your Directory (tenant) ID |
| `AZURE_AD_CLIENT_SECRET` | `...` | Your generic App secret |
| `DATABASE_URL` | `postgresql://...` | Connection String for PostgreSQL |
| `NODE_ENV` | `production` | Ensure it is in production mode |
| `DEV_BYPASS_AUTH` | `false` | Extremely critical to have false in production |

## 2. Entra ID Architecture
Ensure the following groups exist and names exactly match:
- `LMS_ADMIN` (Contains the admin accounts)
- `LMS_HR`
- `LMS_MANAGER`
- `LMS_EMPLOYEE`

Ensure API permissions:
- `User.Read`
- `Directory.Read.All`
- `GroupMember.ReadWrite.All`
- `Mail.Send`

## 3. Database Migration
Run this command from inside the CI/CD pipeline or directly on the PostgreSQL instance before deployment starts.
```bash
npx prisma migrate deploy
npx prisma db seed
```

## 4. CI/CD Integration
If using GitHub Actions:
- Follow standard setup with `docker build` targeting `Dockerfile`
- Ensure Prisma schema generation is done within Docker build
- Update App Service configuration to pull from Container Registry

## 5. Security Checklist
- [ ] Entra App is restricted to allowed tenants
- [ ] Database connection string is set via KeyVault or strict ENV rules
- [ ] `DEV_BYPASS_AUTH` is NOT present or `false`
- [ ] VNet integration enabled between App Service and DB if strict isolation required
