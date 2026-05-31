"""Developer utility: create the application PostgreSQL database if it does not exist.

Reads connection details from environment variables only — no credentials are
hardcoded or printed. Safe to run multiple times (idempotent).

Usage:
    python scripts/create_database.py

Required env vars (set in .env):
    POSTGRES_ADMIN_HOST      — host of the PostgreSQL server
    POSTGRES_ADMIN_PORT      — port (default 5432)
    POSTGRES_ADMIN_USER      — admin/superuser username
    POSTGRES_ADMIN_PASSWORD  — admin/superuser password
    POSTGRES_ADMIN_DB        — maintenance database to connect through (e.g. "postgres")
    APP_DATABASE_NAME        — name of the database to create (e.g. "Marijoa")
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow running from both the project root and the scripts/ directory.
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_PROJECT_ROOT))

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv is already a project dependency
    load_dotenv = None  # type: ignore[assignment]

import psycopg
from psycopg import sql as psql


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _load_env() -> None:
    """Load .env from the project root if python-dotenv is available."""
    env_path = _PROJECT_ROOT / ".env"
    if load_dotenv is not None and env_path.exists():
        load_dotenv(dotenv_path=env_path)


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        _abort(f"Required environment variable '{name}' is not set. Check your .env file.")
    return value


def _load_config() -> dict[str, str | int]:
    _load_env()
    return {
        "host": _require_env("POSTGRES_ADMIN_HOST"),
        "port": int(os.environ.get("POSTGRES_ADMIN_PORT", "5432")),
        "user": _require_env("POSTGRES_ADMIN_USER"),
        "password": _require_env("POSTGRES_ADMIN_PASSWORD"),
        "dbname": _require_env("POSTGRES_ADMIN_DB"),
        "app_db": _require_env("APP_DATABASE_NAME"),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _abort(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def _safe_connection_info(cfg: dict[str, str | int]) -> str:
    return f"{cfg['user']}@{cfg['host']}:{cfg['port']}/{cfg['dbname']}"


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _database_exists(conn: psycopg.Connection, db_name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        (db_name,),
    ).fetchone()
    return row is not None


def _create_database(conn: psycopg.Connection, db_name: str) -> None:
    # CREATE DATABASE cannot run inside a transaction block, so autocommit must
    # be set on the connection before this call.
    #
    # Identifiers (database names) cannot be parameterised with %s — they must
    # be injected via psycopg.sql.Identifier, which handles quoting and escaping
    # to prevent SQL injection.
    conn.execute(psql.SQL("CREATE DATABASE {}").format(psql.Identifier(db_name)))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    cfg = _load_config()
    app_db: str = cfg["app_db"]  # type: ignore[assignment]

    print(f"Connecting to maintenance database ({_safe_connection_info(cfg)}) ...")

    try:
        conn = psycopg.connect(
            host=cfg["host"],
            port=cfg["port"],
            user=cfg["user"],
            password=cfg["password"],
            dbname=cfg["dbname"],
            autocommit=True,  # Required for CREATE DATABASE
        )
    except psycopg.OperationalError as exc:
        _abort(
            f"Cannot connect to the maintenance database ({_safe_connection_info(cfg)}). "
            f"Check that PostgreSQL is running and your credentials are correct.\n"
            f"Detail: {type(exc).__name__}"
        )

    with conn:
        if _database_exists(conn, app_db):
            print(f"Database '{app_db}' already exists. No action needed.")
            return

        print(f"Database '{app_db}' does not exist. Creating...")
        try:
            _create_database(conn, app_db)
        except psycopg.Error as exc:
            _abort(
                f"Failed to create database '{app_db}'. "
                f"Detail: {type(exc).__name__}: {exc.diag.message_primary or str(exc)}"
            )

    print(f"Database '{app_db}' created successfully.")
    print("Next step: run 'alembic upgrade head' to apply migrations.")


if __name__ == "__main__":
    main()
