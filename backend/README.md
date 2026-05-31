# Marijoa Backend

Internal company AI chat application backend — FastAPI, PostgreSQL, SQLAlchemy 2.0.

## Tech Stack

- Python 3.12+
- FastAPI
- Pydantic v2 + pydantic-settings
- Uvicorn
- PostgreSQL (self-hosted, async via psycopg)
- SQLAlchemy 2.0 (wired in a future step)
- Alembic (wired in a future step)
- pytest + httpx

## Local Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create your local .env

```bash
cp .env.example .env
```

Edit `.env` and fill in real values for your environment.

> **Important:** Never commit `.env` to version control. It is listed in `.gitignore`.

### 4. PostgreSQL setup

Before running database migrations in a future step, create the application database manually:

```sql
CREATE DATABASE "Marijoa";
CREATE USER app_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE "Marijoa" TO app_user;
```

Then update `DATABASE_URL` in your `.env` accordingly.

### 5. Run the development server

```bash
uvicorn app.main:app --reload
```

## Health Check URLs

| Endpoint | Description |
|---|---|
| `GET /` | Service info |
| `GET /health` | Basic liveness |
| `GET /api/v1/health` | API v1 health |
| `GET /docs` | Swagger UI |
| `GET /redoc` | ReDoc |

## Run Tests

```bash
pytest
```

## Notes

- `APP_ENV=production` will reject weak default secrets at startup.
- JWT secrets and DB credentials must always come from environment variables.
- SQLAlchemy engine and Alembic will be wired in Step 3.
