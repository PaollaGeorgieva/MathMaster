"""move tests from levels to themes

Revision ID: e4f6a8b0c2d4
Revises: d9a7c4e1f2b3
Create Date: 2026-08-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4f6a8b0c2d4"
down_revision: Union[str, Sequence[str], None] = "d9a7c4e1f2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(
        "uq_active_level_test",
        table_name="level_tests",
        postgresql_where=sa.text("is_active = true"),
    )
    op.drop_index(
        op.f("ix_level_tests_level_id"),
        table_name="level_tests",
    )
    op.drop_constraint(
        "uq_level_test_version",
        "level_tests",
        type_="unique",
    )
    op.drop_constraint(
        "ck_level_test_badge_threshold",
        "level_tests",
        type_="check",
    )
    op.drop_constraint(
        "level_tests_level_id_fkey",
        "level_tests",
        type_="foreignkey",
    )

    op.rename_table("level_tests", "theme_tests")
    op.add_column(
        "theme_tests",
        sa.Column("theme_id", sa.Integer(), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE theme_tests AS test
            SET theme_id = level.theme_id
            FROM levels AS level
            WHERE level.id = test.level_id
            """
        )
    )

    op.execute(
        sa.text(
            """
            WITH ranked_tests AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY theme_id
                           ORDER BY created_at ASC, id ASC
                       ) AS new_version
                FROM theme_tests
            )
            UPDATE theme_tests AS test
            SET version = ranked.new_version
            FROM ranked_tests AS ranked
            WHERE ranked.id = test.id
            """
        )
    )

    op.execute(
        sa.text(
            """
            WITH ranked_active_tests AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY theme_id
                           ORDER BY version DESC, id DESC
                       ) AS active_order
                FROM theme_tests
                WHERE is_active IS TRUE
            )
            UPDATE theme_tests AS test
            SET is_active = FALSE
            FROM ranked_active_tests AS ranked
            WHERE ranked.id = test.id
              AND ranked.active_order > 1
            """
        )
    )

    op.drop_column("theme_tests", "level_id")
    op.alter_column(
        "theme_tests",
        "theme_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_foreign_key(
        "theme_tests_theme_id_fkey",
        "theme_tests",
        "themes",
        ["theme_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_theme_test_version",
        "theme_tests",
        ["theme_id", "version"],
    )
    op.create_check_constraint(
        "ck_theme_test_badge_threshold",
        "theme_tests",
        "badge_threshold_percent BETWEEN 0 AND 100",
    )
    op.create_index(
        op.f("ix_theme_tests_theme_id"),
        "theme_tests",
        ["theme_id"],
        unique=False,
    )
    op.create_index(
        "uq_active_theme_test",
        "theme_tests",
        ["theme_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_active_theme_test",
        table_name="theme_tests",
        postgresql_where=sa.text("is_active = true"),
    )
    op.drop_index(
        op.f("ix_theme_tests_theme_id"),
        table_name="theme_tests",
    )
    op.drop_constraint(
        "uq_theme_test_version",
        "theme_tests",
        type_="unique",
    )
    op.drop_constraint(
        "ck_theme_test_badge_threshold",
        "theme_tests",
        type_="check",
    )
    op.drop_constraint(
        "theme_tests_theme_id_fkey",
        "theme_tests",
        type_="foreignkey",
    )

    op.add_column(
        "theme_tests",
        sa.Column("level_id", sa.Integer(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            WITH target_levels AS (
                SELECT DISTINCT ON (level.theme_id)
                       level.theme_id,
                       level.id AS level_id
                FROM levels AS level
                ORDER BY level.theme_id,
                         level.is_active DESC,
                         level.order_index DESC,
                         level.id DESC
            )
            UPDATE theme_tests AS test
            SET level_id = target.level_id
            FROM target_levels AS target
            WHERE target.theme_id = test.theme_id
            """
        )
    )
    op.alter_column(
        "theme_tests",
        "level_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column("theme_tests", "theme_id")
    op.rename_table("theme_tests", "level_tests")

    op.create_foreign_key(
        "level_tests_level_id_fkey",
        "level_tests",
        "levels",
        ["level_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_level_test_version",
        "level_tests",
        ["level_id", "version"],
    )
    op.create_check_constraint(
        "ck_level_test_badge_threshold",
        "level_tests",
        "badge_threshold_percent BETWEEN 0 AND 100",
    )
    op.create_index(
        op.f("ix_level_tests_level_id"),
        "level_tests",
        ["level_id"],
        unique=False,
    )
    op.create_index(
        "uq_active_level_test",
        "level_tests",
        ["level_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )
