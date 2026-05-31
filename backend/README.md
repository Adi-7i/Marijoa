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

This creates all tables: `users`, `refresh_tokens`, `organizations`, `organization_members`.

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

> Auth is **not** implemented yet in Step 9+ (workspace/chat). Only user identity and organization membership are in scope.

### Organizations — `/api/v1/organizations`

| Method | Endpoint | Min role | Description |
|---|---|---|---|
| `POST` | `/api/v1/organizations` | Authenticated | Create organization |
| `GET` | `/api/v1/organizations/me` | Authenticated | My organizations |
| `GET` | `/api/v1/organizations/{org_id}` | MEMBER | Organization details |
| `GET` | `/api/v1/organizations/{org_id}/members` | MEMBER | List members |
| `POST` | `/api/v1/organizations/{org_id}/members` | ADMIN | Add member by email |
| `PATCH` | `/api/v1/organizations/{org_id}/members/{member_id}` | ADMIN | Update role/status |

## Manual API testing with Swagger

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
8. **List my organizations** — `GET /api/v1/organizations/me`

## Role hierarchy

```
OWNER > ADMIN > MANAGER > MEMBER
```

| Role | Can add members | Can change roles | Can remove last owner |
|---|---|---|---|
| OWNER | Yes | Yes (incl. OWNER) | No |
| ADMIN | Yes | Yes (excl. OWNER) | No |
| MANAGER | No | No | No |
| MEMBER | No | No | No |

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
- Organization not-found and forbidden errors are unified (ResourceNotFoundError) to avoid revealing org existence to non-members.
- All schema changes go through Alembic migrations only.
