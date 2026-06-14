"""Add location to users

Revision ID: 003_add_user_location
Revises: 002_add_status_message
Create Date: 2024-01-03 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_add_user_location'
down_revision: Union[str, None] = '002_add_status_message'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('location', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'location')
