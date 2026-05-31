# Marijoa Backend

Internal company AI chat application backend — MVP 1.1.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Database | PostgreSQL (psycopg v3) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Auth | JWT (PyJWT) + refresh tokens |
| Cache / Jobs | Redis Cloud |
| Background Jobs | RQ |
| File Storage | Azure Blob Storage |
| AI | OpenAI-compatible endpoint (Azure OpenAI / Claude) |
| Validation | Pydantic v2 |
| Tests | Pytest |

---

## User Mode Architecture

Marijoa supports two modes from a single user account — no separate login systems.

### Personal Mode (default after registration)

Every user gets a personal organization and workspace created automatically on signup:

```
User (one identity)
└── Personal Organization  (type: PERSONAL, auto-created)
    └── "Personal Chat" Workspace  (auto-created)
        └── Chats / AI responses
```

The frontend can call `GET /api/v1/me/personal-context` immediately after login to get the workspace ID needed to start an AI chat — no manual setup required.

### Organization / Business Mode

The same user can also create company organizations:

```
User
└── Acme Corp Organization  (type: COMPANY, manually created)
    ├── Marketing Workspace
    ├── Engineering Workspace
    └── ...
```

Company organizations support:
- Multiple members with roles (OWNER / ADMIN / MANAGER / MEMBER)
- Multiple workspaces
- Admin analytics, audit logs, usage summaries

---

## Organization Types

| Type | Created by | Supports members | Admin APIs |
|---|---|---|---|
| `PERSONAL` | Automatically at registration | Owner only | Blocked (403) |
| `COMPANY` | User via `POST /api/v1/organizations` | Yes | Yes |

**Security constraint:** Public API clients cannot create `PERSONAL` organizations directly. Personal orgs are created exclusively by the internal registration/onboarding service.

---

## Environment Setup

```bash
cp .env.example .env
# Edit .env and fill in real values
```

### Required environment variables

**Application**
```
APP_NAME=Marijoa Backend
APP_ENV=development
DEBUG=false
API_V1_PREFIX=/api/v1
BACKEND_CORS_ORIGINS=http://localhost:3000
```

**Database**
```
DATABASE_URL=postgresql+psycopg://app_user:password@localhost:5432/Marijoa
```

**Auth / JWT**
```
JWT_SECRET_KEY=<strong-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**OpenAI-Compatible LLM**
```
AI_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_API_KEY=<api-key>
OPENAI_COMPATIBLE_BASE_URL=https://your-endpoint.com/openai/v1
OPENAI_COMPATIBLE_MODEL=claude-sonnet-4-6
AI_REQUEST_TIMEOUT_SECONDS=60
AI_MAX_OUTPUT_TOKENS=1200
AI_TEMPERATURE=0.4
AI_MAX_HISTORY_MESSAGES=20
```

**Azure Blob Storage**
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=marijoa-files
AZURE_STORAGE_ACCOUNT_NAME=<account>
AZURE_STORAGE_PUBLIC_ACCESS=false
MAX_UPLOAD_SIZE_MB=25
ALLOWED_UPLOAD_MIME_TYPES=application/pdf,...
FILE_DOWNLOAD_SAS_EXPIRE_MINUTES=10
```

**Redis Cloud**
```
REDIS_URL=rediss://default:<password>@<host>:<port>/0
REDIS_ENABLED=true
REDIS_KEY_PREFIX=marijoa
```
Use `rediss://` (double `s`) for TLS-enabled Redis Cloud endpoints.

**Background Jobs**
```
BACKGROUND_JOBS_ENABLED=true
RQ_DEFAULT_QUEUE=default
RQ_FILE_QUEUE=files
RQ_AI_QUEUE=ai
RQ_JOB_TIMEOUT_SECONDS=600
RQ_JOB_RESULT_TTL_SECONDS=3600
RQ_JOB_FAILURE_TTL_SECONDS=86400
```

**Rate Limiting**
```
RATE_LIMIT_ENABLED=true
AUTH_LOGIN_RATE_LIMIT=10
AUTH_LOGIN_RATE_WINDOW_SECONDS=60
AI_RATE_LIMIT=30
AI_RATE_WINDOW_SECONDS=60
```

---

## Database Setup

```bash
# Create the database (first time only)
createdb Marijoa

# Apply all migrations
alembic upgrade head

# Check current migration
alembic current
```

### MVP 1.1 Migration

```bash
# The migration was added in MVP 1.1 — run if upgrading from MVP 1.0
alembic upgrade head
```

This migration:
- Adds `type` column to `organizations` (`PERSONAL` | `COMPANY`)
- Backfills existing organizations as `COMPANY`
- Adds a partial unique index ensuring one `PERSONAL` org per owner

> Do NOT manually create tables. All schema changes go through Alembic.

---

## Run the API Server

```bash
uvicorn app.main:app --reload
```

Swagger UI: http://localhost:8000/docs

---

## Run the Background Worker

```bash
python -m app.workers.worker default files ai
```

Queue names:
- `default` — generic background tasks
- `files` — future file processing, extraction, metadata
- `ai` — future longer-running AI tasks

---

## Run Tests

```bash
# All unit + mocked service tests (no external services required)
pytest

# Integration tests only (require real PostgreSQL, Redis, Azure, LLM)
pytest -m integration

# Personal mode tests only
pytest tests/test_personal_mode.py -v
```

Default `pytest` run does **not** require any real external services.

---

## API Routes

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/` | Root health check |
| GET | `/health` | Service health |
| GET | `/api/v1/health` | API v1 health |
| GET | `/api/v1/health/db` | Database connectivity |
| GET | `/api/v1/health/redis` | Redis connectivity |

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register user (auto-creates personal org + workspace) |
| POST | `/api/v1/auth/login` | Login, get access + refresh token |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Current user info |

### Personal Mode
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/me/personal-context` | Get personal org + workspace (creates if missing) |

### Organizations
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/organizations` | Create COMPANY organization |
| GET | `/api/v1/organizations/me` | List user's organizations (includes `type` field) |
| GET | `/api/v1/organizations/{org_id}` | Get organization |
| GET | `/api/v1/organizations/{org_id}/members` | List members |
| POST | `/api/v1/organizations/{org_id}/members` | Add member (blocked for PERSONAL orgs) |
| PATCH | `/api/v1/organizations/{org_id}/members/{member_id}` | Update member role |

### Workspaces
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/workspaces` | List workspaces |
| GET | `/api/v1/workspaces/{workspace_id}` | Get workspace |
| PATCH | `/api/v1/workspaces/{workspace_id}` | Update workspace |
| DELETE | `/api/v1/workspaces/{workspace_id}` | Delete workspace |

### Chats
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/chats` | Create chat |
| GET | `/api/v1/chats` | List chats |
| GET | `/api/v1/chats/{chat_id}` | Get chat |
| PATCH | `/api/v1/chats/{chat_id}` | Update chat |
| DELETE | `/api/v1/chats/{chat_id}` | Delete chat |

### Messages
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/chats/{chat_id}/messages` | List messages |
| POST | `/api/v1/chats/{chat_id}/messages` | Send message |

### AI
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/chats/{chat_id}/ai/respond` | AI response (blocking) |
| POST | `/api/v1/chats/{chat_id}/ai/stream` | AI response (SSE stream) |

### Artifacts
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/artifacts` | Create artifact |
| GET | `/api/v1/artifacts` | List artifacts |
| GET | `/api/v1/artifacts/{artifact_id}` | Get artifact |
| PATCH | `/api/v1/artifacts/{artifact_id}` | Update artifact |
| DELETE | `/api/v1/artifacts/{artifact_id}` | Delete artifact |

### Files
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/files/upload` | Upload file to Azure Blob |
| GET | `/api/v1/files` | List files |
| GET | `/api/v1/files/{file_id}` | Get file + download URL |
| DELETE | `/api/v1/files/{file_id}` | Delete file |

### Admin (OWNER or ADMIN role, COMPANY orgs only)
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/organizations/{org_id}/users` | List org users |
| GET | `/api/v1/admin/organizations/{org_id}/audit-logs` | List audit logs |
| GET | `/api/v1/admin/organizations/{org_id}/usage` | Usage summary |

---

## Manual Swagger Flow

### Personal Mode (simplest path)

1. `POST /api/v1/auth/register` — create account
2. `POST /api/v1/auth/login` — get `access_token`
3. Click **Authorize** → paste `Bearer <access_token>`
4. `GET /api/v1/me/personal-context` — get `personal_workspace.id`
5. `POST /api/v1/chats` — create chat using `workspace_id` from step 4
6. `POST /api/v1/chats/{chat_id}/messages` — send user message
7. `POST /api/v1/chats/{chat_id}/ai/respond` — get AI response
8. `POST /api/v1/chats/{chat_id}/ai/stream` — stream AI response (SSE)

### Company / Organization Mode

1. `POST /api/v1/auth/register` + login
2. `POST /api/v1/organizations` — create org (`type` will be `COMPANY`)
3. `GET /api/v1/organizations/me` — list all orgs with their `type` field
4. `POST /api/v1/workspaces` — create workspace (pass `organization_id`)
5. `POST /api/v1/organizations/{org_id}/members` — add team members by email
6. `POST /api/v1/chats` — create chat under workspace
7. `GET /api/v1/admin/organizations/{org_id}/usage` — view usage (COMPANY only)
8. `GET /api/v1/admin/organizations/{org_id}/audit-logs` — view audit logs

### Verifying Organization Types

`GET /api/v1/organizations/me` response shows both personal and company orgs:
```json
[
  {
    "id": "...",
    "name": "Aditya's Personal Workspace",
    "type": "PERSONAL",
    "current_user_role": "OWNER"
  },
  {
    "id": "...",
    "name": "Acme Corp",
    "type": "COMPANY",
    "current_user_role": "OWNER"
  }
]
```

---

## Security Notes

- **Never commit `.env`** — it contains real credentials
- **Rotate any exposed keys immediately**
- Use `rediss://` (TLS) for Redis Cloud production endpoints
- Azure Storage container should have private access (`AZURE_STORAGE_PUBLIC_ACCESS=false`)
- File download URLs use time-limited SAS tokens (`FILE_DOWNLOAD_SAS_EXPIRE_MINUTES`)
- Admin APIs are restricted to OWNER/ADMIN members of **COMPANY** organizations only
- PERSONAL organizations block all admin API access with a 403 response
- PERSONAL organizations cannot have members added via the public API
- PERSONAL organizations are created internally — public clients cannot specify `type=PERSONAL`
- All sensitive metadata (passwords, tokens, connection strings) is sanitized before audit log storage
- Password hashes are never returned in API responses
- JWT secrets must be strong and random in staging/production
- All schema changes go through Alembic — never manually alter tables

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | User accounts |
| `refresh_tokens` | JWT refresh token records |
| `organizations` | Organizations (tenants) — `type` column: PERSONAL \| COMPANY |
| `organization_members` | Org membership + roles |
| `workspaces` | Workspaces within an org |
| `workspace_members` | Workspace membership + roles |
| `chats` | Chat threads |
| `messages` | Chat messages |
| `artifacts` | Text/code/image artifacts |
| `files` | Uploaded file metadata |
| `audit_logs` | Security and access audit events |
| `alembic_version` | Migration tracking |

---

## Background Jobs Architecture

Three named queues backed by Redis Cloud:

```
default  — generic tasks, health checks
files    — file processing pipeline (MVP 1.5)
ai       — long-running AI tasks (future)
```

Start worker:
```bash
python -m app.workers.worker default files ai
```

After file upload, a placeholder `process_uploaded_file` job is enqueued on the `files` queue. Actual text extraction and embedding are not implemented in MVP 1.

If Redis is unavailable, `enqueue_job()` logs a warning and continues — upload succeeds regardless.

---

## Personal Mode — Legacy User Repair

For users created before MVP 1.1 (who don't have a personal org/workspace), the system repairs automatically:

1. User calls `GET /api/v1/me/personal-context`
2. `ensure_personal_context()` detects missing personal org/workspace
3. Creates them idempotently within the current request transaction
4. Returns the complete context

No manual backfill script is required for existing users.

---

## MVP 1.1 Limitations

- Personal org is not hidden from `GET /organizations/me` — frontend must filter by `type`
- Adding members to PERSONAL orgs is blocked — designed for single-owner use
- Admin APIs block PERSONAL orgs entirely — business features are COMPANY-only
- No auto-creation of personal chat — frontend creates the first chat under `personal_workspace.id`
- Personal org workspace is named "Personal Chat" and cannot currently be renamed via the API

---

## MVP 1 / 1.1 Limitations

- No RAG / vector search / embeddings
- No document text extraction (placeholder only)
- No production deployment config (Docker, nginx, k8s)
- No WebSocket presence
- No billing or usage limits enforcement
- Background file processing is a placeholder — returns `"status": "skipped"`

---

## Recommended Next Steps (MVP 1.5+)

1. File text extraction pipeline (pypdf, python-docx)
2. Embeddings + pgvector RAG
3. Advanced admin analytics dashboard
4. Production deployment (Docker Compose → Kubernetes)
5. More LLM providers (Gemini, Mistral, local Ollama)
6. Organization settings and branding
7. Frontend integration
