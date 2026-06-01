#!/usr/bin/env python
import os
import sys
from alembic.config import Config
from alembic import command

def run_migrations():
    alembic_cfg = Config('/app/alembic.ini')
    
    # Get the DATABASE_URL and convert asyncpg to psycopg2 if needed
    database_url = os.environ.get('DATABASE_URL', '')
    if database_url.startswith('postgresql+asyncpg://'):
        # Convert asyncpg URL to psycopg2 for alembic
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')
    
    alembic_cfg.set_main_option('sqlalchemy.url', database_url)
    
    try:
        command.upgrade(alembic_cfg, 'head')
        print("Migrations completed successfully")
    except Exception as e:
        print(f"Migration failed: {e}", file=sys.stderr)
        raise

if __name__ == '__main__':
    run_migrations()
