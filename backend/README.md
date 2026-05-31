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

## Verify Tables in pgAdmin

```
Database: Marijoa
Schema: public → Tables:
  alembic_version
  chats
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
