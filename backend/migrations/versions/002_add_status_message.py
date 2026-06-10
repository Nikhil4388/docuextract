"""Add status_message to extraction_jobs

Revision ID: 002_add_status_message
Revises: 001_initial
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_add_status_message'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('extraction_jobs', sa.Column('status_message', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('extraction_jobs', 'status_message')
