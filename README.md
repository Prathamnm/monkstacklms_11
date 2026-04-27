# Moonshine LMS — Leave Management System

![Moonshine LMS](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)
![Azure](https://img.shields.io/badge/Microsoft_Azure-0089D6?style=for-the-badge&logo=microsoft-azure)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

An Enterprise HR & Leave Management System built with **Next.js 14**, **Prisma**, **PostgreSQL**, and **Microsoft Entra ID** (Azure AD).

---

## 🌟 Features

- **🔒 Microsoft Entra ID SSO** — Secure authentication using Microsoft Entra ID with role-based access control.
- **👥 4 Role-Based Dashboards** — Tailored portals for **Employee**, **Manager**, **HR**, and **Admin**.
- **📅 Accrual-Based Leave System** — Automated leave tracking: 18 standard days + 2 emergency days, with monthly accrual.
- **✅ Approval Workflow** — Streamlined leave requests where Managers can approve/reject and HR can revoke.
- **📈 Project & Availability Tracking** — Monitor team availability and capacity across various projects.
- **📧 Outlook Email Notifications** — Automated email alerts seamlessly integrated via the Microsoft Graph API.
- **📜 Audit Logging** — A complete and immutable audit trail for all leave-related actions.
- **📊 Reports Export** — Comprehensive CSV & Excel exports for HR and management.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Prathamnm/monkstacklms_11.git
cd monkstacklms_11
npm install
```

### 2. Start PostgreSQL (Docker)
Ensure Docker is running, then spin up the database:
```bash
docker-compose up -d
```

### 3. Configure Environment
Copy the example environment file and fill in your Azure AD credentials:
```bash
cp .env.example .env.local
```

### 4. Setup Database
Initialize your database schema and seed initial data:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start Development Server
```bash
npm run dev
```
- App runs at `http://localhost:3000`
- pgAdmin at `http://localhost:5050` (Login: `admin@moonshine.local` / `admin`)

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` | Entra App Registration Client ID |
| `NEXT_PUBLIC_AZURE_AD_TENANT_ID` | Entra Tenant ID |
| `AZURE_AD_CLIENT_SECRET` | App Secret for server-side Graph calls |
| `GRAPH_SENDER_EMAIL` | Email address for sending notifications |

---

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion
- **UI Components:** shadcn/ui, Lucide Icons, Recharts
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL 15
- **Auth:** Microsoft Entra ID (MSAL), jose JWT validation
- **Email:** Microsoft Graph API (Outlook)

---

## 📂 Project Structure

```text
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── employee/       # Employee portal
│   │   ├── manager/        # Manager portal
│   │   ├── hr/             # HR portal
│   │   └── admin/          # Admin portal
│   └── api/                # Backend API routes
├── components/             # Reusable UI components
├── lib/                    # Core utilities and services
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript definitions
└── constants/              # Application constants
```

---

## ☁️ Azure Container Apps Deployment

This application is architected and container-ready for **Azure Container Apps** with:
- Next.js standalone output
- Prisma client generation during the Docker image build
- Startup support for `prisma migrate deploy`
- Health endpoints configured for deployment probes (`/api/health/live`, `/api/health/ready`)

### Recommended Architecture
- **Azure Container Apps** for scalable application runtime.
- **Azure Database for PostgreSQL Flexible Server** for managed database storage.
- **Azure Container Registry (ACR)** for secure image storage.

### Deployment Guides
- **CI/CD Pipeline:** [`.github/workflows/deploy-aca.yml`](.github/workflows/deploy-aca.yml)
- **Manual Deployment Script:** [`scripts/deploy-aca.ps1`](scripts/deploy-aca.ps1)
- **Deployment Documentation:** [`docs/deploy/azure-container-apps.md`](docs/deploy/azure-container-apps.md)
- **Operations Checklist:** [`docs/deploy/azure-ops-checklist.md`](docs/deploy/azure-ops-checklist.md)

### Production Notes
- Use the `DATABASE_URL` provided by Azure PostgreSQL Flexible Server and ensure `sslmode=require` is appended.
- Store sensitive configuration in the **Container Apps secret store**, rather than baking them into the container image.
- Ensure `NEXTAUTH_URL` and the Entra Redirect URI perfectly align with your deployed ACA Fully Qualified Domain Name (FQDN).
