"""Initial schema creation from models

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types (idempotent: skip if the type already exists)
    op.execute(
        "DO " + "$" + "$ BEGIN "
        "CREATE TYPE authprovider AS ENUM ('email', 'google', 'microsoft', 'apple'); "
        "EXCEPTION WHEN duplicate_object THEN null; END " + "$" + "$;"
    )
    op.execute(
        "DO " + "$" + "$ BEGIN "
        "CREATE TYPE userrole AS ENUM ('admin', 'user', 'viewer'); "
        "EXCEPTION WHEN duplicate_object THEN null; END " + "$" + "$;"
    )
    op.execute(
        "DO " + "$" + "$ BEGIN "
        "CREATE TYPE jobstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled'); "
        "EXCEPTION WHEN duplicate_object THEN null; END " + "$" + "$;"
    )
    op.execute(
        "DO " + "$" + "$ BEGIN "
        "CREATE TYPE storageprovider AS ENUM ('local', 's3', 'google_drive', 'dropbox'); "
        "EXCEPTION WHEN duplicate_object THEN null; END " + "$" + "$;"
    )
    op.execute(
        "DO " + "$" + "$ BEGIN "
        "CREATE TYPE llmprovider AS ENUM ('claude', 'openai'); "
        "EXCEPTION WHEN duplicate_object THEN null; END " + "$" + "$;"
    )

    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('role', sa.Enum('admin', 'user', 'viewer', name='userrole'), nullable=False, server_default='user'),
        sa.Column('auth_provider', sa.Enum('email', 'google', 'microsoft', 'apple', name='authprovider'), nullable=False, server_default='email'),
        sa.Column('oauth_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verification_token', sa.String(255), nullable=True),
        sa.Column('reset_token', sa.String(255), nullable=True),
        sa.Column('reset_token_expires', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('anthropic_api_key_enc', sa.Text(), nullable=True),
        sa.Column('openai_api_key_enc', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_oauth_id'), 'users', ['oauth_id'], unique=False)

    # Create column_templates table
    op.create_table('column_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('columns', sa.JSON(), nullable=False),
        sa.Column('sample_pdf_path', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create extraction_jobs table
    op.create_table('extraction_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', 'cancelled', name='jobstatus'), nullable=False, server_default='pending'),
        sa.Column('storage_provider', sa.Enum('local', 's3', 'google_drive', 'dropbox', name='storageprovider'), nullable=False, server_default='local'),
        sa.Column('storage_path', sa.Text(), nullable=True),
        sa.Column('storage_credentials_enc', sa.Text(), nullable=True),
        sa.Column('llm_provider', sa.Enum('claude', 'openai', name='llmprovider'), nullable=False, server_default='claude'),
        sa.Column('llm_model', sa.String(100), nullable=True),
        sa.Column('use_user_api_key', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('total_files', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('processed_files', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_files', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('celery_task_id', sa.String(255), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['template_id'], ['column_templates.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create extraction_results table
    op.create_table('extraction_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_name', sa.String(500), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('extracted_data', sa.JSON(), nullable=True),
        sa.Column('confidence_scores', sa.JSON(), nullable=True),
        sa.Column('ocr_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['job_id'], ['extraction_jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=True),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('metadata_obj', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['job_id'], ['extraction_jobs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('extraction_results')
    op.drop_table('extraction_jobs')
    op.drop_table('column_templates')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS llmprovider')
    op.execute('DROP TYPE IF EXISTS storageprovider')
    op.execute('DROP TYPE IF EXISTS jobstatus')
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS authprovider')
