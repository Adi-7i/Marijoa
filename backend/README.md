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

Edit `.env` and fill in real values.

> **Important:** Never commit `.env` to version control. It is listed in `.gitignore`.

> **Driver note:** `DATABASE_URL` must use `postgresql+psycopg://` (psycopg v3). Plain `postgresql://` is automatically normalised at startup, but using the explicit scheme is preferred.

### 4. Create the PostgreSQL database

**Step A — Fill in the admin connection values in your `.env`:**

```
POSTGRES_ADMIN_HOST=<your-pg-host>
POSTGRES_ADMIN_PORT=5432
POSTGRES_ADMIN_USER=<admin-user>
POSTGRES_ADMIN_PASSWORD=<admin-password>
POSTGRES_ADMIN_DB=postgres
APP_DATABASE_NAME=Marijoa
```

These are used only by the creation script — the running app uses `DATABASE_URL`.

**Step B — Run the database creation script:**

```bash
python scripts/create_database.py
```

The script checks whether `Marijoa` already exists before attempting creation.
Running it multiple times is safe.

**Step C — Verify in pgAdmin** that the `Marijoa` database now appears.

Also set `DATABASE_URL` so the app can connect:

```
DATABASE_URL=postgresql+psycopg://app_user:your_password@localhost:5432/Marijoa
```

**Step D — Apply migrations (only after the database exists):**

```bash
alembic upgrade head
```

> **Manually via psql (alternative):**
> ```sql
> CREATE DATABASE "Marijoa";
> GRANT ALL PRIVILEGES ON DATABASE "Marijoa" TO app_user;
> ```

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
| `alembic history` | Show full migration history |
| `alembic revision --autogenerate -m "add_users_table"` | Generate a new migration from model changes |
| `alembic heads` | Show head revisions (no DB needed) |

> Alembic reads `DATABASE_URL` from `.env` via settings — the real URL is never stored in `alembic.ini`.

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Service info |
| `GET /health` | Basic liveness |
| `GET /api/v1/health` | API v1 health |
| `GET /api/v1/health/db` | Database connectivity check |
| `GET /docs` | Swagger UI |
| `GET /redoc` | ReDoc |

### DB health response

**Connected (HTTP 200):**
```json
{"status": "ok", "database": "connected"}
```

**Unavailable (HTTP 503):**
```json
{"status": "error", "database": "unavailable"}
```

## Run Tests

```bash
pytest                          # unit + mock tests only (no live DB required)
pytest -m integration           # requires a running PostgreSQL instance
```

## Notes

- `APP_ENV=production` rejects weak default secrets at startup.
- JWT secrets and DB credentials must always come from environment variables.
- DB connectivity errors are logged by error type only — credentials are never logged.
- SQLAlchemy uses sync sessions (psycopg v3); async sessions will be introduced in a later step if needed.
