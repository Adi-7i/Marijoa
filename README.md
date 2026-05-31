<div align="center">

# Marijoa

**Private AI workspace for personal chat, teams, organizations, files, and enterprise AI workflows.**

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis_Cloud-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Azure Blob](https://img.shields.io/badge/Azure_Blob_Storage-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)](https://azure.microsoft.com/en-us/products/storage/blobs/)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI_Compatible_API-412991?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com/docs/api-reference)
[![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

<br/>

*Under active development — enterprise MVP backend is complete, frontend integration is in progress.*

</div>

---

## What is Marijoa?

Marijoa combines a **Claude/ChatGPT-style personal AI chat experience** with **organization-level AI workspaces** — for individuals, companies, teams, and client projects.

- A user signs up once and immediately gets a **personal workspace** with a direct AI chat experience.
- The same account can create or join **organizational workspaces**, invite team members, manage shared projects, and access enterprise-grade admin and audit controls.
- There is **one unified login system** — no separate personal/organization accounts.

The platform is built on an OpenAI-compatible AI Gateway, meaning it can front any LLM endpoint that speaks the OpenAI Responses API format.

---

## Repository Layout

```text
Marijoa/
├── src/                          # Next.js 15 frontend source
│   ├── app/                      # Next.js App Router (layout, page, global CSS)
│   ├── components/
│   │   ├── chat/                 # Chat UI components (composer, messages, sidebar history)
│   │   ├── layout/               # AppShell, MainChatPanel, Sidebar
│   │   └── ui/                   # Shared UI primitives (IconButton, …)
│   ├── hooks/                    # Custom React hooks (useChat)
│   ├── lib/                      # Utilities: cn, constants, validation
│   ├── types/                    # TypeScript types (chat domain)
│   └── __tests__/                # Vitest component tests
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api.py                # Central API router (all modules mounted here)
│   │   ├── main.py               # FastAPI app factory
│   │   ├── core/                 # Config, constants, exceptions, logging
│   │   ├── db/                   # SQLAlchemy session, base model
│   │   ├── modules/              # Feature modules (one folder per domain)
│   │   │   ├── admin/
│   │   │   ├── ai_gateway/
│   │   │   ├── artifacts/
│   │   │   ├── audit_logs/
│   │   │   ├── auth/
│   │   │   ├── chats/
│   │   │   ├── files/
│   │   │   ├── health/
│   │   │   ├── messages/
│   │   │   ├── organizations/
│   │   │   ├── personal/
│   │   │   ├── users/
│   │   │   └── workspaces/
│   │   ├── schemas/              # Shared Pydantic schemas
│   │   ├── utils/                # Shared backend utilities
│   │   └── workers/              # RQ worker bootstrap + task queues
│   ├── alembic/                  # Database migration scripts
│   ├── scripts/                  # Database creation helper
│   ├── tests/                    # Pytest test suite (35+ test files)
│   ├── requirements.txt
│   ├── alembic.ini
│   └── pytest.ini
├── public/                       # Frontend static assets
├── package.json                  # Frontend dependencies and npm scripts
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript config
├── vitest.config.ts              # Vitest test config
├── postcss.config.mjs            # PostCSS / Tailwind config
└── README.md                     # This file
```

---

## Product Modes

### Personal User Mode

When a user registers, Marijoa automatically provisions a **personal organization and workspace**. The experience is immediately useful:

- Direct, ChatGPT-style AI chat with persistent history
- Personal file storage and artifact management
- No setup required — sign up and start chatting

### Organization / Business Mode

The same account can create a **company or team organization**:

- Invite and manage team members with role-based access control
- Create multiple workspaces (projects, clients, departments)
- Shared AI context within workspaces
- Organization-scoped admin panel
- Audit logs for all significant actions
- Workspace, chat, file, and artifact permission enforcement

> Both modes share a single login system. Switching between personal and organizational contexts happens within the same session.

---

## Architecture

```mermaid
flowchart TD
    User["👤 User / Team Member"] --> FE["Next.js 15 Frontend\n(React 19 · TypeScript · Tailwind 4)"]
    FE --> API["FastAPI Backend\n/api/v1"]

    API --> Auth["Auth Module\nJWT · Refresh Tokens · RBAC"]
    API --> Personal["Personal Module\nAuto-provisioned workspace"]
    API --> Org["Organizations + Workspaces"]
    API --> Chat["Chats + Messages"]
    API --> AIGw["AI Gateway\nOpenAI-Compatible · SSE Streaming"]
    API --> Files["File Service\nUpload · SAS Download"]
    API --> Artifacts["Artifacts Module\nCRUD + Permissions"]
    API --> Admin["Admin APIs\nOrg users · Audit logs"]

    AIGw --> LLM["OpenAI-Compatible\nLLM Endpoint"]
    Files --> Blob["Azure Blob Storage\n(private container)"]

    API --> DB[("PostgreSQL\nSQLAlchemy 2.0 · Alembic")]
    API --> Redis[("Redis Cloud\nTLS · Rate Limiting")]
    Redis --> Worker["RQ Background Workers\ndefault · files · ai queues"]

    Admin --> AuditLogs["Audit Log Store"]
```

---

## Feature Matrix

| Feature | Status | Description |
|---|---|---|
| **Personal AI Chat** | ✅ Implemented | Auto-provisioned personal workspace on signup |
| **Organization Mode** | ✅ Implemented | Create orgs, invite members, role-based access |
| **Workspace / Project System** | ✅ Implemented | Multiple workspaces per organization |
| **Chat & Messages** | ✅ Implemented | Full CRUD, persistent history |
| **AI Gateway** | ✅ Implemented | OpenAI-compatible, model routing |
| **SSE Streaming** | ✅ Implemented | Real-time token streaming via Server-Sent Events |
| **Artifacts** | ✅ Implemented | Create, retrieve, and manage AI-generated artifacts |
| **Azure Blob File Upload** | ✅ Implemented | Private container, SAS token downloads, metadata in DB |
| **Audit Logs** | ✅ Implemented | Organization-scoped action log |
| **Admin APIs** | ✅ Implemented | Org user management, audit log admin |
| **Redis Cloud** | ✅ Implemented | TLS Redis, rate limiting, health checks |
| **Background Jobs (RQ)** | ✅ Implemented | default / files / ai queues via Redis |
| **Rate Limiting** | ✅ Implemented | Auth login + AI endpoint rate limits |
| **Auth (JWT + Refresh)** | ✅ Implemented | Access + refresh token flow, bcrypt hashing |
| **Frontend Chat UI** | ✅ Implemented | Composer, message list, sidebar, history, state |
| **Frontend Auth Pages** | 🚧 In Progress | Login / register pages not yet wired |
| **Frontend API Integration** | 🚧 In Progress | Chat UI exists; backend fetch layer in progress |
| **Organization Switcher UI** | 🧭 Planned | Switch between personal and org contexts |
| **Admin Dashboard UI** | 🧭 Planned | Frontend for org admin / audit log review |
| **RAG / Vector Search** | 🧭 Planned | pgvector-backed retrieval augmented generation |
| **Document Extraction** | 🧭 Planned | PDF/DOCX parsing pipeline |
| **Billing / Plans** | 🧭 Planned | Premium tier, usage limits |

---

## Tech Stack

### Frontend

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | `reactStrictMode: true` |
| Language | TypeScript 5 | Strict mode |
| UI Library | React 19 | Concurrent features |
| Styling | Tailwind CSS 4 + CSS Modules | PostCSS pipeline |
| Icons | Lucide React | `lucide-react ^0.511` |
| Utilities | clsx · tailwind-merge · zod | Class merging + validation |
| Testing | Vitest 2 + Testing Library | `jsdom` environment |
| Package manager | npm | `package-lock.json` committed |

### Backend

| Layer | Technology | Notes |
|---|---|---|
| API Framework | FastAPI | Auto-generated OpenAPI docs at `/docs` |
| Language | Python 3.11+ | Fully type-annotated |
| Database | PostgreSQL | psycopg v3 driver |
| ORM | SQLAlchemy 2.0 | Async-ready models |
| Migrations | Alembic | 9 migration files, never manually edit schema |
| Auth | JWT + Refresh Tokens | HS256, bcrypt password hashing |
| Cache / Infra | Redis Cloud | TLS (`rediss://`), key-prefixed namespacing |
| Background Jobs | RQ (Redis Queue) | `default`, `files`, `ai` queues |
| File Storage | Azure Blob Storage | Private container, SAS token access |
| AI Provider | OpenAI-Compatible API | Configurable endpoint, model, temperature |
| Tests | Pytest | 35+ test files, unit + integration markers |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis (local or Redis Cloud)
- Azure Storage account (for file features)
- An OpenAI-compatible LLM endpoint

---

### A — Clone the Repository

```bash
git clone <repository-url>
cd Marijoa
```

---

### B — Frontend Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend runs at **http://localhost:3000**

Other frontend scripts:

```bash
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run test         # Run Vitest test suite (single pass)
npm run test:watch   # Vitest in watch mode
npm run test:ui      # Vitest browser UI
npm run typecheck    # TypeScript type check (no emit)
```

---

### C — Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your actual values (see Environment Variables section)
```

Apply database migrations:

```bash
alembic upgrade head
```

Start the API server:

```bash
uvicorn app.main:app --reload
```

The backend API runs at **http://127.0.0.1:8000**

Interactive API docs: **http://127.0.0.1:8000/docs**

---

## Environment Variables

### Frontend

Create `.env.local` in the repository root:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### Backend

Create `backend/.env` from `backend/.env.example`:

```env
# ── Application ──────────────────────────────────────────────────────────────
APP_NAME=Marijoa Backend
APP_VERSION=0.1.0
APP_ENV=development
DEBUG=false
API_V1_PREFIX=/api/v1
BACKEND_CORS_ORIGINS=http://localhost:3000

# ── Database (PostgreSQL via psycopg v3) ─────────────────────────────────────
DATABASE_URL=postgresql+psycopg://app_user:change_me@localhost:5432/Marijoa

# ── Auth / JWT ────────────────────────────────────────────────────────────────
JWT_SECRET_KEY=change-me-use-a-strong-random-secret-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── OpenAI-Compatible LLM ─────────────────────────────────────────────────────
AI_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_API_KEY=change_me
OPENAI_COMPATIBLE_BASE_URL=https://your-openai-compatible-endpoint.com/openai/v1
OPENAI_COMPATIBLE_MODEL=claude-sonnet-4-6
AI_REQUEST_TIMEOUT_SECONDS=60
AI_MAX_OUTPUT_TOKENS=1200
AI_TEMPERATURE=0.4
AI_MAX_HISTORY_MESSAGES=20

# ── Azure Blob Storage ────────────────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=change_me;AccountKey=change_me;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=marijoa-files
AZURE_STORAGE_ACCOUNT_NAME=change_me
AZURE_STORAGE_PUBLIC_ACCESS=false
MAX_UPLOAD_SIZE_MB=25
ALLOWED_UPLOAD_MIME_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,image/png,image/jpeg
FILE_DOWNLOAD_SAS_EXPIRE_MINUTES=10

# ── Redis Cloud ───────────────────────────────────────────────────────────────
# Use rediss:// (double 's') for TLS-enabled Redis Cloud
# Never log REDIS_URL — it contains credentials
REDIS_URL=rediss://default:change_me@your-redis-cloud-host.redislabs.com:6380/0
REDIS_ENABLED=true
REDIS_SOCKET_TIMEOUT_SECONDS=5
REDIS_CONNECT_TIMEOUT_SECONDS=5
REDIS_KEY_PREFIX=marijoa
REDIS_HEALTHCHECK_ENABLED=true

# ── Rate Limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_ENABLED=true
AUTH_LOGIN_RATE_LIMIT=10
AUTH_LOGIN_RATE_WINDOW_SECONDS=60
AI_RATE_LIMIT=30
AI_RATE_WINDOW_SECONDS=60

# ── Background Jobs (RQ) ──────────────────────────────────────────────────────
BACKGROUND_JOBS_ENABLED=true
RQ_DEFAULT_QUEUE=default
RQ_FILE_QUEUE=files
RQ_AI_QUEUE=ai
RQ_JOB_TIMEOUT_SECONDS=600
RQ_JOB_RESULT_TTL_SECONDS=3600
RQ_JOB_FAILURE_TTL_SECONDS=86400

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL=INFO
```

> **Security:** Never commit `.env` to version control. The `.gitignore` excludes it by default.

---

## Database Setup

Create the PostgreSQL database:

```sql
CREATE DATABASE "Marijoa";
```

Then run all Alembic migrations:

```bash
cd backend
alembic upgrade head
```

> **Important:** Never manually create or alter tables in pgAdmin or via raw SQL.
> All schema changes must go through SQLAlchemy model definitions and Alembic migration scripts.

Current migrations applied in order:

| Migration | Description |
|---|---|
| `e1f2a3b4c5d6` | Initial database baseline |
| `2f46d9be096a` | Users table |
| `2634de3c5c70` | Auth + organization tables |
| `688811f0411a` | Workspaces and chats tables |
| `818152c07b8e` | Messages table |
| `3bc5dbde46c2` | Files and audit logs tables |
| `831ac06d7d26` | Artifacts table |
| `d3162f320a62` | Auth + organization refinements |
| `5191b04819c5` | Organization type for personal mode |

---

## Running the Full Stack

Open three terminals:

**Terminal 1 — Frontend**

```bash
npm run dev
# → http://localhost:3000
```

**Terminal 2 — Backend API**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
# → http://127.0.0.1:8000
# → http://127.0.0.1:8000/docs  (Swagger UI)
```

**Terminal 3 — Background Worker**

```bash
cd backend
source .venv/bin/activate
python -m app.workers.worker default files ai
```

> Redis Cloud and Azure Blob Storage must be configured in `.env` for file uploads, background jobs, and rate limiting to function.

---

## API Overview

All routes are mounted under `/api/v1` (configurable via `API_V1_PREFIX`).

| Module | Prefix | Responsibilities |
|---|---|---|
| **Health** | `/health` | Liveness and dependency health checks |
| **Auth** | `/auth` | Register, login, refresh token, logout |
| **Personal** | `/personal` | Auto-provisioned personal context for the current user |
| **Organizations** | `/organizations` | CRUD, member management, role assignment |
| **Workspaces** | `/workspaces` | CRUD, workspace membership |
| **Chats** | `/chats` | Chat session CRUD within workspaces |
| **Messages** | `/messages` | Message CRUD within chats |
| **AI Gateway** | `/chats/{id}/ai` | Send messages, streaming SSE endpoint |
| **Artifacts** | `/artifacts` | AI-generated artifact CRUD + permissions |
| **Files** | `/files` | Upload (Azure Blob), list, SAS download, delete |
| **Admin** | `/admin` | Organization user management, audit log access |

Full interactive documentation: `http://127.0.0.1:8000/docs`

---

## SSE Streaming

Marijoa's AI Gateway streams responses token-by-token via Server-Sent Events:

```bash
curl -N -X POST "http://127.0.0.1:8000/api/v1/chats/<chat_id>/ai/stream" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Reply only with: Marijoa streaming works"}'
```

The response streams as `text/event-stream`. Each `data:` line carries a partial token; the stream terminates with a `[DONE]` sentinel. The frontend consumes this via the browser's `EventSource` API or a `fetch` + `ReadableStream` reader.

---

## File Upload Architecture

```
Client → POST /api/v1/files/upload
       → FastAPI validates MIME type, size (≤ MAX_UPLOAD_SIZE_MB)
       → Uploads binary to Azure Blob Storage (private container)
       → Stores metadata (filename, size, content_type, blob_key) in PostgreSQL
       → Returns file record with ID

Client → GET /api/v1/files/{id}/download
       → FastAPI generates a time-limited SAS token (FILE_DOWNLOAD_SAS_EXPIRE_MINUTES)
       → Returns a temporary pre-signed URL
       → Client fetches directly from Azure
```

Key design decisions:
- The Azure Blob container is **private** — no permanent public URLs
- Download links expire (default: 10 minutes)
- File metadata lives in PostgreSQL; binaries live in Blob Storage
- Supported types: PDF, DOCX, plain text, CSV, PNG, JPEG (configurable)

---

## Security Model

| Control | Implementation |
|---|---|
| **Authentication** | JWT access tokens (short-lived) + refresh tokens (7-day rotation) |
| **Password storage** | bcrypt hashing — plaintext never persisted |
| **Authorization** | RBAC — role checked at the service layer, not just the router |
| **Org isolation** | All queries are scoped to the authenticated user's organization |
| **Admin APIs** | Separate admin permission layer; org-scoped, never global |
| **Rate limiting** | Redis-backed rate limits on auth and AI endpoints |
| **Audit logs** | Immutable log of significant actions per organization |
| **Error handling** | Sanitized error responses — internal details never leaked to clients |
| **File access** | SAS token download URLs, not permanent public blob links |
| **Secrets** | All secrets via environment variables — never hardcoded or committed |
| **CORS** | Explicit allowlist via `BACKEND_CORS_ORIGINS` |

---

## Testing

### Frontend

```bash
# Run full test suite (single pass)
npm run test

# Watch mode
npm run test:watch

# Browser UI
npm run test:ui
```

Frontend tests use **Vitest** + **Testing Library** with a `jsdom` environment. Test files live in `src/__tests__/`.

### Backend

```bash
cd backend
source .venv/bin/activate

# Full suite
pytest

# Verbose output
pytest -v

# Integration tests only
pytest -m integration

# Specific module
pytest tests/test_ai_gateway_service.py
```

> Default test runs must not connect to real LLM endpoints, Azure Blob Storage, Redis Cloud, or production databases. Integration tests that require live infrastructure should be marked with `@pytest.mark.integration` and excluded from CI unless those services are available.

The backend test suite covers 35+ files including: auth, organizations, workspaces, chats, messages, AI gateway, artifacts, files, audit logs, admin, Redis, workers, permissions, schemas, and security.

---

## Development Principles

- **Thin routers, fat services** — business logic lives in `service.py`, not routers
- **Repository pattern** — all database access through `repository.py` files
- **Alembic-only schema changes** — never alter the DB manually
- **Environment-based config** — no hardcoded values; all settings via `.env`
- **Pydantic validation** — request/response schemas validated at the API boundary
- **Scoped permissions** — permission checks in the service layer, enforced per resource
- **No secrets in source** — credentials via environment variables only
- **Module isolation** — each domain (auth, orgs, files, etc.) is a self-contained folder
- **Tests alongside features** — every module has a corresponding test file

---

## MVP Status

### Backend — Enterprise MVP Foundation ✅

The FastAPI backend is functionally complete at the MVP level:

- All core modules implemented (auth, personal mode, orgs, workspaces, chats, messages, AI gateway, artifacts, files, admin, audit logs)
- Full Alembic migration history
- Redis + RQ background job infrastructure
- Azure Blob Storage integration
- 35+ test files covering all modules

### Frontend — Chat UI Built, Integration Pending 🚧

The Next.js frontend has a functional chat interface:

- `AppShell` → `Sidebar` + `MainChatPanel` layout
- Chat components: `ChatComposer`, `MessageList`, `ChatMessage`, `ChatHistoryList`, `ChatArea`, `ChatGreeting`, `UserProfile`
- `useChat` hook, `validation.ts`, typed chat domain models
- Vitest tests for core components

**Not yet implemented on the frontend:**
- Authentication pages (login / register)
- Backend API fetch layer
- Organization / workspace switcher
- Admin UI

---

## Roadmap

| Item | Priority |
|---|---|
| Frontend auth pages (login, register, token refresh) | High |
| Backend API integration layer in frontend | High |
| Personal mode UX polish | High |
| Organization switcher UI | Medium |
| Admin dashboard and audit log viewer | Medium |
| RAG with pgvector + document extraction | Medium |
| File upload / management UI | Medium |
| Artifacts viewer in chat | Medium |
| Additional LLM provider support | Medium |
| Billing and premium plan system | Low |
| Deployment configuration (Docker, cloud) | Low |
| Monitoring and observability (metrics, traces) | Low |
| Mobile application | Low |

---

## Ownership

**Proprietary — Cynerza Systems Private Limited**

All rights reserved. This repository and its contents are not licensed for public use, redistribution, or modification without explicit written permission from Cynerza Systems Private Limited.

---

<div align="center">

*Built with care by the Cynerza Engineering team.*

</div>
