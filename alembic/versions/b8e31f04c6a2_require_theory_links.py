"""Require theory links for problems and examples.

Revision ID: b8e31f04c6a2
Revises: 7192acbbfd01
"""
from alembic import op
import sqlalchemy as sa


revision = "b8e31f04c6a2"
down_revision = "7192acbbfd01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("examples", "theory_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("problems", "theory_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("problems", "theory_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("examples", "theory_id", existing_type=sa.Integer(), nullable=True)
