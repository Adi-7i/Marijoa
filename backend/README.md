# Marijoa Backend

Internal company AI chat application backend — FastAPI, PostgreSQL, SQLAlchemy 2.0, Alembic.

## Tech Stack

- Python 3.12+
- FastAPI
- Pydantic v2 + pydantic-settings
- Uvicorn
- PostgreSQL (self-hosted, psycopg v3 sync driver)
- SQLAlchemy 2.0
- Alembic
- PyJWT — access token signing (HS256)
- bcrypt — password hashing
- pytest + httpx

## Local Setup

### 1. Create a virtual environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

> **Tip (if pip fails on this machine):** use `uv` — `uv pip install -r requirements.txt`

### 3. Create your local .env

```bash
cp .env.example .env
```

Edit `.env` and fill in real values — especially `JWT_SECRET_KEY` and `DATABASE_URL`.

> **Security:** Never commit `.env`. Use a strong random `JWT_SECRET_KEY` in staging/production.

> **Driver note:** `DATABASE_URL` must use `postgresql+psycopg://` (psycopg v3). Plain `postgresql://` is auto-normalised at startup.

### 4. Create the PostgreSQL database

**Step A — Set admin credentials in `.env`:**

```
POSTGRES_ADMIN_HOST=<your-pg-host>
POSTGRES_ADMIN_PORT=5432
POSTGRES_ADMIN_USER=<admin-user>
POSTGRES_ADMIN_PASSWORD=<admin-password>
POSTGRES_ADMIN_DB=postgres
APP_DATABASE_NAME=Marijoa
```

**Step B — Run the database creation script:**

```bash
python scripts/create_database.py
```

Safe to run multiple times (idempotent).

**Step C — Verify in pgAdmin** that the `Marijoa` database appears.

Set the app connection URL in `.env`:

```
DATABASE_URL=postgresql+psycopg://app_user:your_password@localhost:5432/Marijoa
```

### 5. Apply migrations

```bash
alembic upgrade head
```

This creates all tables:
- `users`
- `refresh_tokens`
- `organizations`
- `organization_members`
- `workspaces`
- `workspace_members`
- `chats`
- `messages`
- `artifacts`
- `files`
- `audit_logs`

### 6. Run the development server

```bash
uvicorn app.main:app --reload
```

## Alembic Reference

| Command | Description |
|---|---|
| `alembic upgrade head` | Apply all pending migrations |
| `alembic downgrade -1` | Roll back the last migration |
| `alembic current` | Show current revision in the DB |
| `alembic history` | Show full revision history |
| `alembic revision --autogenerate -m "description"` | Generate migration from model changes |
| `alembic heads` | Show head revisions (no DB needed) |

> `DATABASE_URL` is always read from `.env` via settings — never from `alembic.ini`.

> **Rule:** Never create or modify tables manually in pgAdmin. All schema changes go through SQLAlchemy models + Alembic migrations.

## Migration History

| Revision | Description |
|---|---|
| `e1f2a3b4c5d6` | Initial baseline (empty) |
| `2f46d9be096a` | Create users table |
| `2634de3c5c70` | Create refresh_tokens, organizations, organization_members |
| `d3162f320a62` | Empty placeholder |
| `688811f0411a` | Create workspaces, workspace_members, chats |
| `818152c07b8e` | Create messages table |
| `831ac06d7d26` | Create artifacts table |
| `3bc5dbde46c2` | Create files and audit_logs tables |

To generate the workspace/chat migration fresh:
```bash
alembic revision --autogenerate -m "create_workspaces_and_chats_tables"
alembic upgrade head
```

## API Endpoints

### Infrastructure

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `GET` | `/health` | Basic liveness |
| `GET` | `/api/v1/health` | API v1 health |
| `GET` | `/api/v1/health/db` | Database connectivity |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/redoc` | ReDoc |

### Auth — `/api/v1/auth`

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | Create account, receive tokens |
| `POST` | `/api/v1/auth/login` | No | Authenticate, receive tokens |
| `POST` | `/api/v1/auth/refresh` | No | Rotate refresh token |
| `POST` | `/api/v1/auth/logout` | No | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | Bearer token | Current user profile |

### Organizations — `/api/v1/organizations`

| Method | Endpoint | Min role | Description |
|---|---|---|---|
| `POST` | `/api/v1/organizations` | Authenticated | Create organization |
| `GET` | `/api/v1/organizations/me` | Authenticated | My organizations |
| `GET` | `/api/v1/organizations/{org_id}` | MEMBER | Organization details |
| `GET` | `/api/v1/organizations/{org_id}/members` | MEMBER | List members |
| `POST` | `/api/v1/organizations/{org_id}/members` | ADMIN | Add member by email |
| `PATCH` | `/api/v1/organizations/{org_id}/members/{member_id}` | ADMIN | Update role/status |

### Workspaces — `/api/v1/workspaces`

| Method | Endpoint | Min role | Description |
|---|---|---|---|
| `POST` | `/api/v1/workspaces` | Org MANAGER+ | Create workspace |
| `GET` | `/api/v1/workspaces` | Authenticated | List accessible workspaces |
| `GET` | `/api/v1/workspaces/{workspace_id}` | WS MEMBER+ | Workspace details |
| `PATCH` | `/api/v1/workspaces/{workspace_id}` | WS ADMIN+ | Update workspace settings |
| `DELETE` | `/api/v1/workspaces/{workspace_id}` | WS ADMIN+ | Deactivate workspace (soft delete) |
| `GET` | `/api/v1/workspaces/{workspace_id}/members` | WS MEMBER+ | List workspace members |
| `POST` | `/api/v1/workspaces/{workspace_id}/members` | WS ADMIN+ | Add member by email |
| `PATCH` | `/api/v1/workspaces/{workspace_id}/members/{member_id}` | WS ADMIN+ | Update member role/status |

### Chats — `/api/v1/chats`

| Method | Endpoint | Min role | Description |
|---|---|---|---|
| `POST` | `/api/v1/chats` | WS MEMBER+ | Create a chat |
| `GET` | `/api/v1/chats?workspace_id=` | WS MEMBER+ | List chats in workspace |
| `GET` | `/api/v1/chats/{chat_id}` | WS MEMBER+ | Chat details |
| `PATCH` | `/api/v1/chats/{chat_id}` | Creator or WS MANAGER+ | Rename or change status |
| `DELETE` | `/api/v1/chats/{chat_id}` | Creator or WS MANAGER+ | Soft delete (status → DELETED) |

### Messages — `/api/v1/chats/{chat_id}/messages`

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| `GET` | `/api/v1/chats/{chat_id}/messages` | Bearer token | List all messages in a chat |
| `POST` | `/api/v1/chats/{chat_id}/messages` | Bearer token | Post a new message to a chat |

### AI Gateway — `/api/v1/chats/{chat_id}/ai`

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| `POST` | `/api/v1/chats/{chat_id}/ai/respond` | Bearer token | Send conversation history to the AI provider and receive an assistant reply |
| `POST` | `/api/v1/chats/{chat_id}/ai/stream` | Bearer token | Stream AI assistant reply as Server-Sent Events (SSE) |

### Artifacts — `/api/v1/artifacts`

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| `POST` | `/api/v1/artifacts` | Bearer token | Create a new artifact in a workspace |
| `GET` | `/api/v1/artifacts?workspace_id=` | Bearer token | List artifacts in a workspace (optional filters: `chat_id`, `type`, `limit`, `offset`) |
| `GET` | `/api/v1/artifacts/{artifact_id}` | Bearer token | Get a single artifact by ID |
| `PATCH` | `/api/v1/artifacts/{artifact_id}` | Bearer token | Update artifact title, content, or metadata |
| `DELETE` | `/api/v1/artifacts/{artifact_id}` | Bearer token | Soft delete an artifact (sets `is_active=false`) |

### Files — `/api/v1/files`

| Method | Endpoint | Min role | Description |
|---|---|---|---|
| `POST` | `/api/v1/files/upload` | WS MEMBER+ | Upload file to workspace |
| `GET` | `/api/v1/files` | WS MEMBER+ | List files in workspace |
| `GET` | `/api/v1/files/{file_id}` | WS MEMBER+ | File metadata |
| `DELETE` | `/api/v1/files/{file_id}` | Uploader or WS MANAGER+ | Soft delete file |
| `POST` | `/api/v1/files/{file_id}/download-url` | WS MEMBER+ | Generate SAS download URL |

## Manual API Testing with Swagger

1. Start the server: `uvicorn app.main:app --reload`
2. Open `http://localhost:8000/docs`
3. **Register** — `POST /api/v1/auth/register`
   ```json
   {"full_name": "Alice Smith", "email": "alice@example.com", "password": "Secure1@Pass"}
   ```
4. Copy the `access_token` from the response.
5. Click **Authorize** (lock icon, top right) → paste `<access_token>` → Authorize.
6. **GET /api/v1/auth/me** — verify your profile.
7. **Create organization** — `POST /api/v1/organizations`
   ```json
   {"name": "My Company"}
   ```
8. Copy the `id` from the response — this is your `organization_id`.
9. **Create workspace** — `POST /api/v1/workspaces`
   ```json
   {
     "organization_id": "<org_id>",
     "name": "Sales Team",
     "description": "Sales workspace",
     "system_instruction": "You are a helpful sales assistant."
   }
   ```
10. Copy the workspace `id`.
11. **List workspaces** — `GET /api/v1/workspaces?organization_id=<org_id>`
12. **Create chat** — `POST /api/v1/chats`
    ```json
    {"workspace_id": "<workspace_id>", "title": "Q4 Planning"}
    ```
13. **List chats** — `GET /api/v1/chats?workspace_id=<workspace_id>`
14. **Archive chat** — `PATCH /api/v1/chats/<chat_id>`
    ```json
    {"status": "ARCHIVED"}
    ```
15. **Delete chat** — `DELETE /api/v1/chats/<chat_id>` (soft delete — sets status=DELETED)
16. **Post a message** — `POST /api/v1/chats/<chat_id>/messages`
    ```json
    {"role": "user", "content": "Hello, can you help me with Q4 planning?"}
    ```
17. **List messages** — `GET /api/v1/chats/<chat_id>/messages`
18. **Call AI respond** — `POST /api/v1/chats/<chat_id>/ai/respond`
    ```json
    {}
    ```
    The endpoint uses recent message history from the chat and returns the assistant reply, which is also persisted as a new message.
19. **Stream AI response** — from a terminal (not Swagger, which does not support SSE):
    ```bash
    curl -N -X POST 'http://127.0.0.1:8000/api/v1/chats/<chat_id>/ai/stream' \
      -H 'Authorization: Bearer <access_token>' \
      -H 'Content-Type: application/json' \
      -d '{"content":"Reply only with: Marijoa streaming works"}'
    ```
    You should see `event: start`, one or more `event: token` lines, then `event: done`.
20. **Create an artifact** — `POST /api/v1/artifacts`
    ```json
    {
      "workspace_id": "<workspace_id>",
      "chat_id": "<chat_id>",
      "title": "Q4 Summary",
      "type": "document",
      "content": "This is the Q4 planning summary."
    }
    ```
    Copy the returned `id` — this is your `artifact_id`.
21. **List artifacts** — `GET /api/v1/artifacts?workspace_id=<workspace_id>`
22. **Get artifact** — `GET /api/v1/artifacts/<artifact_id>`
23. **Update artifact** — `PATCH /api/v1/artifacts/<artifact_id>`
    ```json
    {"title": "Q4 Summary (revised)"}
    ```
24. **Delete artifact** (soft delete) — `DELETE /api/v1/artifacts/<artifact_id>`
    Confirm the artifact no longer appears in the list (`is_active` is set to `false`).
25. **Upload a file** — `POST /api/v1/files/upload` (multipart/form-data)
    Use the Swagger UI form: set `workspace_id` to `<workspace_id>` and select a file.
    Copy the returned `id` — this is your `file_id`.
26. **List files** — `GET /api/v1/files?workspace_id=<workspace_id>`
27. **Get file metadata** — `GET /api/v1/files/<file_id>`
28. **Generate download URL** — `POST /api/v1/files/<file_id>/download-url`
    Returns a time-limited SAS URL. The URL expires after `FILE_DOWNLOAD_SAS_EXPIRE_MINUTES`.
29. **Delete file** (soft delete) — `DELETE /api/v1/files/<file_id>`
    Confirm the file no longer appears in the list.

## AI Gateway Configuration

The AI gateway reads all settings from `.env`. Add these variables to your local `.env` (never commit real keys):

This project uses the **OpenAI Python SDK** pointed at any OpenAI-compatible Responses API endpoint. No Azure-specific SDK is used. The SDK handles the `/responses` path automatically — do not include it in `OPENAI_COMPATIBLE_BASE_URL`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | Yes | `openai_compatible` | Provider selector. Only `openai_compatible` is supported. |
| `OPENAI_COMPATIBLE_API_KEY` | Yes | — | API key for the endpoint — **never commit** |
| `OPENAI_COMPATIBLE_BASE_URL` | Yes | — | Base URL without trailing `/responses` path |
| `OPENAI_COMPATIBLE_MODEL` | Yes | `claude-sonnet-4-6` | Model name / deployment identifier |
| `AI_REQUEST_TIMEOUT_SECONDS` | No | `60` | HTTP timeout for provider requests |
| `AI_MAX_OUTPUT_TOKENS` | No | `1200` | Maximum tokens in the assistant reply |
| `AI_TEMPERATURE` | No | `0.4` | Sampling temperature (0.0 – 2.0) |
| `AI_MAX_HISTORY_MESSAGES` | No | `20` | Recent messages sent as LLM context |

Example `.env` block:

```
AI_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_API_KEY=your_actual_key_here
OPENAI_COMPATIBLE_BASE_URL=https://your-resource.openai.azure.com/openai/v1
OPENAI_COMPATIBLE_MODEL=claude-sonnet-4-6
AI_REQUEST_TIMEOUT_SECONDS=60
AI_MAX_OUTPUT_TOKENS=1200
AI_TEMPERATURE=0.4
AI_MAX_HISTORY_MESSAGES=20
```

> **Security:** Never commit real API keys. Add `OPENAI_COMPATIBLE_API_KEY` to `.gitignore`-protected files only. Rotate any key that is accidentally exposed.

## SSE Streaming

The `/ai/stream` endpoint uses [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) to deliver the AI reply token-by-token. The response `Content-Type` is `text/event-stream`.

### Event Protocol

Each SSE message has the form:

```
event: <event_type>
data: <json_payload>

```

| Event | Payload fields | Description |
|---|---|---|
| `start` | `chat_id`, `user_message_id` | Fired once after the user message is persisted, before any tokens arrive |
| `token` | `content` | One content chunk from the provider; concatenate all chunks to reconstruct the full reply |
| `done` | `message_id`, `chat_id` | Fired once after the full reply is persisted; `message_id` is the assistant message UUID (`null` if the provider returned an empty response) |
| `error` | `code`, `message` | Fired on provider or service errors; no `done` event follows |

### Example curl

```bash
curl -N -X POST 'http://127.0.0.1:8000/api/v1/chats/{chat_id}/ai/stream' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Reply only with: Marijoa streaming works"}'
```

The `-N` flag disables curl's output buffering so events are printed as they arrive.

## Azure Blob Storage Configuration

The file upload module reads all settings from `.env`. Add these variables to your local `.env` (never commit real connection strings):

| Variable | Required | Default | Description |
|---|---|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Yes | — | Full Azure Storage connection string — **never commit** |
| `AZURE_STORAGE_CONTAINER_NAME` | Yes | — | Name of the private blob container |
| `AZURE_STORAGE_ACCOUNT_NAME` | Yes | — | Azure Storage account name |
| `AZURE_STORAGE_PUBLIC_ACCESS` | No | `false` | Must remain `false`; container is always private |
| `MAX_UPLOAD_SIZE_MB` | No | `50` | Maximum allowed upload size in megabytes |
| `ALLOWED_UPLOAD_MIME_TYPES` | No | (common types) | Comma-separated list of permitted MIME types |
| `FILE_DOWNLOAD_SAS_EXPIRE_MINUTES` | No | `60` | Lifetime of generated SAS download URLs in minutes |

> **Security:** The container is private. Do not expose permanent public URLs. SAS URLs expire after `FILE_DOWNLOAD_SAS_EXPIRE_MINUTES` and are scoped to a single blob.

## Audit Logs

Key actions across the application are automatically recorded to the `audit_logs` table. No additional configuration is required — audit logging is active by default.

Examples of audited events:

| Event | Trigger |
|---|---|
| `USER_REGISTERED` | A new user account is created |
| `USER_LOGIN` | Successful authentication |
| `FILE_UPLOADED` | A file is successfully stored in Azure Blob Storage |
| `FILE_DELETED` | A file record is soft-deleted |

Metadata stored with each log entry is sanitized before persistence — passwords, tokens, API keys, and connection strings are **never** written to audit logs.

## Verify Tables in pgAdmin

```
Database: Marijoa
Schema: public → Tables:
  alembic_version
  artifacts
  audit_logs
  chats
  files
  messages
  organization_members
  organizations
  refresh_tokens
  users
  workspace_members
  workspaces
```

> Do not manually create tables in pgAdmin. All schema changes go through SQLAlchemy models + Alembic migrations.

## Organization Role Hierarchy

```
OWNER > ADMIN > MANAGER > MEMBER
```

| Role | Can add members | Can change roles | Can remove last owner |
|---|---|---|---|
| OWNER | Yes | Yes (incl. OWNER) | No |
| ADMIN | Yes | Yes (excl. OWNER) | No |
| MANAGER | No | No | No |
| MEMBER | No | No | No |

## Workspace Role Hierarchy

```
OWNER > ADMIN > MANAGER > MEMBER > VIEWER
```

| Role | Can update workspace | Can manage members | Can manage any chat |
|---|---|---|---|
| OWNER | Yes (incl. is_active) | Yes | Yes |
| ADMIN | Yes | Yes | Yes |
| MANAGER | No | No | Yes |
| MEMBER | No | No | Own chats only |
| VIEWER | No | No | Own chats only |

## Workspace Creation Policy

- Organization **OWNER**, **ADMIN**, **MANAGER** can create workspaces.
- Organization **MEMBER** cannot create workspaces (enterprise-safe default).
- Workspace creator automatically becomes workspace **OWNER**.
- Workspace access requires explicit workspace membership — organization admins are **not** automatically members of all workspaces (principle of least privilege).

## Chat Status Lifecycle

```
ACTIVE → ARCHIVED → ACTIVE     (can toggle)
ACTIVE → DELETED               (terminal)
ARCHIVED → DELETED             (terminal)
DELETED → (no further transitions)
```

## Run Tests

```bash
pytest                    # unit + mock tests (no live DB required)
pytest -m integration     # integration tests (requires live PostgreSQL)
```

## Security Notes

- Never store plain passwords — only bcrypt hashes.
- Never commit `.env` to version control.
- Use a strong random `JWT_SECRET_KEY` in staging/production (min 32 chars).
- `APP_ENV=production` rejects weak default secrets at startup.
- Refresh tokens are stored as SHA-256 hashes — the raw token is issued once only.
- Login errors are intentionally generic to prevent user enumeration.
- Organization/workspace not-found and forbidden errors are unified (ResourceNotFoundError) to avoid revealing resource existence to non-members.
- Workspace access requires explicit membership — knowing a workspace ID is not sufficient.
- Chat soft-delete sets `status=DELETED`; rows are never physically removed.
- All schema changes go through Alembic migrations only.
- Never hardcode AI provider keys (e.g. `OPENAI_COMPATIBLE_API_KEY`) in source code or config files tracked by git.
- Rotate any AI credential immediately if it is accidentally exposed in logs, commits, or error responses.
- AI credentials are never logged by the application and are never returned in API responses.
- Streaming errors are sanitized before being sent as SSE `error` events — internal exceptions are mapped to a generic `AI_SERVICE_UNAVAILABLE` code so raw error details are never leaked to clients.
- Artifacts use soft delete only (`is_active=false`); rows are never physically removed from the database.
- Azure connection strings are never logged, never returned in API responses, and never stored in the database.
- The Azure Blob Storage container is private; permanent public URLs are never exposed to clients.
- SAS download URLs are time-limited and expire after `FILE_DOWNLOAD_SAS_EXPIRE_MINUTES`; a new request is required for each download session.
- Filenames are sanitized server-side before storage; user-provided path components are never trusted.
- Audit logs are append-only; metadata is sanitized before storage so passwords, tokens, and API keys are never written to audit records.
