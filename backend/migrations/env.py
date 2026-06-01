from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context
import os
import sys

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get the DATABASE_URL and convert asyncpg to psycopg2 if needed
database_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:[REDACTED]@localhost:5432/docuextract')
if 'postgresql+asyncpg://' in database_url:
    # Convert asyncpg URL to psycopg2
    database_url = database_url.replace('postgresql+asyncpg://', 'postgresql+psycopg2://')

config.set_main_option("sqlalchemy.url", database_url)

# For 'autogenerate' support, set the target_metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    sqlalchemy_url = config.get_main_option("sqlalchemy.url")
    
    # Create engine with explicit psycopg2 driver
    connectable = create_engine(
        sqlalchemy_url,
        poolclass=pool.NullPool
    )

    with connectable.begin() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
