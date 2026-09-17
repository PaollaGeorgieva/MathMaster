"""simplify progress and badges

Revision ID: d9a7c4e1f2b3
Revises: a61e7c4d9b20
Create Date: 2026-08-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d9a7c4e1f2b3"
down_revision: Union[str, Sequence[str], None] = "a61e7c4d9b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_user_level_progress_stage", "user_level_progress", type_="check")
    op.drop_column("user_level_progress", "test_completed_at")
    op.drop_column("user_level_progress", "practice_completed_at")
    op.drop_column("user_level_progress", "examples_completed_at")
    op.drop_column("user_level_progress", "theory_completed_at")
    op.drop_column("user_level_progress", "current_stage")

    op.execute(
        sa.text(
            """
            WITH bonuses AS (
                SELECT user_id, SUM(profile_points_awarded) AS points
                FROM test_attempts
                GROUP BY user_id
            )
            UPDATE students AS student
            SET points = GREATEST(0, student.points - bonuses.points)
            FROM bonuses
            WHERE student.user_id = bonuses.user_id
              AND bonuses.points > 0
            """
        )
    )
    op.execute(sa.text("UPDATE students SET level = FLOOR(points / 100.0)::integer + 1"))
    op.drop_constraint("ck_test_attempt_profile_points", "test_attempts", type_="check")
    op.drop_column("test_attempts", "profile_points_awarded")

    op.add_column("user_badges", sa.Column("code", sa.String(length=50), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE user_badges AS user_badge
            SET code = badge.code
            FROM badges AS badge
            WHERE badge.id = user_badge.badge_id
            """
        )
    )
    op.execute(
        sa.text(
            """
            DELETE FROM user_badges
            WHERE code NOT IN ('first_problem', 'no_hint_problem', 'first_level', 'test_star')
               OR code IS NULL
            """
        )
    )
    op.drop_constraint("user_badges_source_test_attempt_id_fkey", "user_badges", type_="foreignkey")
    op.drop_constraint("user_badges_source_level_id_fkey", "user_badges", type_="foreignkey")
    op.drop_constraint("user_badges_badge_id_fkey", "user_badges", type_="foreignkey")
    op.drop_constraint("user_badges_pkey", "user_badges", type_="primary")
    op.alter_column("user_badges", "code", existing_type=sa.String(length=50), nullable=False)
    op.drop_column("user_badges", "source_test_attempt_id")
    op.drop_column("user_badges", "source_level_id")
    op.drop_column("user_badges", "badge_id")
    op.create_primary_key("user_badges_pkey", "user_badges", ["user_id", "code"])
    op.create_check_constraint(
        "ck_user_badges_code",
        "user_badges",
        "code IN ('first_problem', 'no_hint_problem', 'first_level', 'test_star')",
    )
    op.drop_table("badges")


def downgrade() -> None:
    op.create_table(
        "badges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon", sa.String(length=100), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_badges_code"),
    )
    badge_table = sa.table(
        "badges",
        sa.column("code", sa.String()),
        sa.column("title", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("icon", sa.String()),
        sa.column("order_index", sa.Integer()),
    )
    op.bulk_insert(
        badge_table,
        [
            {"code": "first_problem", "title": "First problem", "description": "Solve a problem.", "icon": "first_problem", "order_index": 1},
            {"code": "no_hint_problem", "title": "No hint", "description": "Solve without a hint.", "icon": "no_hint_problem", "order_index": 2},
            {"code": "first_level", "title": "First level", "description": "Complete a level.", "icon": "first_level", "order_index": 3},
            {"code": "test_star", "title": "Test star", "description": "Get a good test result.", "icon": "test_star", "order_index": 4},
        ],
    )

    op.add_column("user_badges", sa.Column("badge_id", sa.Integer(), nullable=True))
    op.add_column("user_badges", sa.Column("source_level_id", sa.Integer(), nullable=True))
    op.add_column("user_badges", sa.Column("source_test_attempt_id", sa.Integer(), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE user_badges AS user_badge
            SET badge_id = badge.id
            FROM badges AS badge
            WHERE badge.code = user_badge.code
            """
        )
    )
    op.drop_constraint("ck_user_badges_code", "user_badges", type_="check")
    op.drop_constraint("user_badges_pkey", "user_badges", type_="primary")
    op.alter_column("user_badges", "badge_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("user_badges", "code")
    op.create_primary_key("user_badges_pkey", "user_badges", ["user_id", "badge_id"])
    op.create_foreign_key("user_badges_badge_id_fkey", "user_badges", "badges", ["badge_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("user_badges_source_level_id_fkey", "user_badges", "levels", ["source_level_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("user_badges_source_test_attempt_id_fkey", "user_badges", "test_attempts", ["source_test_attempt_id"], ["id"], ondelete="SET NULL")

    op.add_column("test_attempts", sa.Column("profile_points_awarded", sa.Integer(), server_default=sa.text("0"), nullable=False))
    op.execute(
        sa.text(
            """
            UPDATE test_attempts AS attempt
            SET profile_points_awarded = 10
            FROM level_tests AS test
            WHERE test.id = attempt.test_id
              AND attempt.percentage > test.badge_threshold_percent
            """
        )
    )
    op.alter_column("test_attempts", "profile_points_awarded", existing_type=sa.Integer(), server_default=None)
    op.create_check_constraint("ck_test_attempt_profile_points", "test_attempts", "profile_points_awarded >= 0")

    op.add_column("user_level_progress", sa.Column("current_stage", sa.String(length=20), nullable=True))
    op.add_column("user_level_progress", sa.Column("theory_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_level_progress", sa.Column("examples_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_level_progress", sa.Column("practice_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_level_progress", sa.Column("test_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(sa.text("UPDATE user_level_progress SET current_stage = CASE WHEN is_completed THEN 'completed' ELSE 'theory' END"))
    op.alter_column("user_level_progress", "current_stage", existing_type=sa.String(length=20), nullable=False)
    op.create_check_constraint(
        "ck_user_level_progress_stage",
        "user_level_progress",
        "current_stage IN ('theory', 'examples', 'practice', 'test', 'completed')",
    )
