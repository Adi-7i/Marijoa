from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure the project root (backend/) is importable when Alembic runs
# from any working directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.db.base import Base             # noqa: E402
import app.db.models                     # noqa: E402, F401 — registers all models on Base.metadata

# --------------------------------------------------------------------------
# Alembic Config object
# --------------------------------------------------------------------------
config = context.config

# Override sqlalchemy.url from .env via settings — never reads it from alembic.ini
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Set up logging as declared in alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata that Alembic compares against the live database for autogenerate
target_metadata = Base.metadata


# --------------------------------------------------------------------------
# Offline migrations — generate SQL without a live DB connection
# --------------------------------------------------------------------------
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# --------------------------------------------------------------------------
# Online migrations — run against a live DB connection
# --------------------------------------------------------------------------
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Don't pool migration connections
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
