# Moonshine LMS — Leave Management System

Enterprise HR & Leave Management System built with Next.js 14, Prisma, PostgreSQL, and Microsoft Entra ID.

## Features

- **Microsoft Entra ID SSO** — Sign in with Microsoft, role-based access
- **4 Role Dashboards** — Employee, Manager, HR, Admin
- **Accrual-based Leave** — 18 standard + 2 emergency days, monthly accrual
- **Approval Workflow** — Manager approves/rejects, HR can revoke
- **Project & Availability** — Team availability tracking per project
- **Outlook Email Notifications** — via Microsoft Graph API
- **Audit Logging** — Complete immutable audit trail
- **Reports Export** — CSV & Excel exports for HR

## Quick Start

### 1. Clone and install
```bash
npm install
```

### 2. Start PostgreSQL (Docker)
```bash
docker-compose up -d
```

### 3. Configure environment
```bash
cp .env.example .env.local
# Fill in your Azure AD credentials in .env.local
```

### 4. Setup database
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start development server
```bash
npm run dev
# App runs at http://localhost:3000
# pgAdmin at http://localhost:5050 (admin@moonshine.local / admin)
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` | Entra App Registration Client ID |
| `NEXT_PUBLIC_AZURE_AD_TENANT_ID` | Entra Tenant ID |
| `AZURE_AD_CLIENT_SECRET` | App Secret for server-side Graph calls |
| `GRAPH_SENDER_EMAIL` | Email address for sending notifications |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion
- **Components**: shadcn/ui, Lucide Icons, Recharts
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **Auth**: Microsoft Entra ID (MSAL), jose JWT validation
- **Email**: Microsoft Graph API (Outlook)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── employee/      # Employee pages
│   │   ├── manager/       # Manager pages
│   │   ├── hr/            # HR pages
│   │   └── admin/         # Admin pages
│   └── api/               # Backend API routes
├── components/            # React components
├── lib/                   # Utilities, services
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
└── constants/             # App constants
```

## Azure Container Apps Deployment

This project is container-ready for Azure Container Apps with:
- Next.js standalone output
- Prisma client generation in image build
- startup support for `prisma migrate deploy`
- health endpoints for probes:
  - `/api/health/live`
  - `/api/health/ready`

### Recommended architecture
- Azure Container Apps for app runtime
- Azure Database for PostgreSQL Flexible Server for database
- Azure Container Registry (ACR) for image storage

### Deployment options
- CI/CD: [`.github/workflows/deploy-aca.yml`](.github/workflows/deploy-aca.yml)
- Manual CLI: [`scripts/deploy-aca.ps1`](scripts/deploy-aca.ps1)

### Deployment docs
- [`docs/deploy/azure-container-apps.md`](docs/deploy/azure-container-apps.md)
- [`docs/deploy/azure-ops-checklist.md`](docs/deploy/azure-ops-checklist.md)

### Production notes
- Use `DATABASE_URL` from Azure PostgreSQL Flexible Server and include `sslmode=require`.
- Configure secrets in Container Apps secret store, not in image.
- Keep `NEXTAUTH_URL` and Entra redirect URI aligned with the deployed ACA FQDN.
