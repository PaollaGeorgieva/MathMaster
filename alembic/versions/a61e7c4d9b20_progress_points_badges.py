"""progress points and badges

Revision ID: a61e7c4d9b20
Revises: f9df0b89d0ca
Create Date: 2026-08-10 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a61e7c4d9b20"
down_revision: Union[str, Sequence[str], None] = "f9df0b89d0ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BADGES = [
    {
        "code": "first_problem",
        "title": "Първа стъпка",
        "description": "Реши първата си задача.",
        "icon": "🌱",
        "order_index": 1,
    },
    {
        "code": "no_hint_problem",
        "title": "Самостоятелен старт",
        "description": "Реши задача без подсказка.",
        "icon": "🧠",
        "order_index": 2,
    },
    {
        "code": "ten_problems",
        "title": "В серия",
        "description": "Реши 10 задачи.",
        "icon": "🔟",
        "order_index": 3,
    },
    {
        "code": "fifty_problems",
        "title": "Упорит решавач",
        "description": "Реши 50 задачи.",
        "icon": "💪",
        "order_index": 4,
    },
    {
        "code": "first_level",
        "title": "Първо ниво",
        "description": "Завърши първото си учебно ниво.",
        "icon": "🏁",
        "order_index": 5,
    },
    {
        "code": "level_without_hints",
        "title": "Без подсказки",
        "description": "Завърши ниво без подсказка в официалните задачи.",
        "icon": "💡",
        "order_index": 6,
    },
    {
        "code": "first_theme",
        "title": "Първа тема",
        "description": "Завърши всички активни нива в една тема.",
        "icon": "🏆",
        "order_index": 7,
    },
    {
        "code": "test_star",
        "title": "Тест звезда",
        "description": "Постигни резултат над прага за поощрение.",
        "icon": "⭐",
        "order_index": 8,
    },
    {
        "code": "perfect_test",
        "title": "Перфектен тест",
        "description": "Постигни 100% на тест.",
        "icon": "💯",
        "order_index": 9,
    },
]


def upgrade() -> None:
    """Upgrade schema."""

    # The current stage is stored on the existing Level progress record.
    op.add_column(
        "user_level_progress",
        sa.Column("current_stage", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "user_level_progress",
        sa.Column(
            "theory_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "user_level_progress",
        sa.Column(
            "examples_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "user_level_progress",
        sa.Column(
            "practice_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "user_level_progress",
        sa.Column(
            "test_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Old completed records remain completed and unlocked. Their old schema
    # did not save completed_at, so the migration time is used when needed.
    op.execute(
        sa.text(
            """
            UPDATE user_level_progress
            SET completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
                is_unlocked = TRUE
            WHERE is_completed IS TRUE
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE user_level_progress
            SET current_stage = 'completed',
                theory_completed_at = COALESCE(
                    theory_completed_at,
                    completed_at
                ),
                examples_completed_at = COALESCE(
                    examples_completed_at,
                    completed_at
                ),
                practice_completed_at = COALESCE(
                    practice_completed_at,
                    completed_at
                ),
                test_completed_at = COALESCE(
                    test_completed_at,
                    completed_at
                )
            WHERE is_completed IS TRUE
            """
        )
    )

    # An old incomplete Level with problem attempts had already reached the
    # practical work in the previous version of the application.
    op.execute(
        sa.text(
            """
            UPDATE user_level_progress AS progress
            SET current_stage = 'practice',
                is_unlocked = TRUE,
                theory_completed_at = COALESCE(
                    theory_completed_at,
                    started_at
                ),
                examples_completed_at = COALESCE(
                    examples_completed_at,
                    started_at
                )
            WHERE progress.is_completed IS FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_problem_attempt AS attempt
                      JOIN problems AS problem
                        ON problem.id = attempt.problem_id
                      WHERE attempt.user_id = progress.user_id
                        AND problem.level_id = progress.level_id
                  )
              )
            """
        )
    )

    # A saved test attempt is the student's only allowed attempt. It is
    # therefore accepted as the final stage instead of asking for a retry.
    op.execute(
        sa.text(
            """
            INSERT INTO user_level_progress (
                user_id,
                level_id,
                is_unlocked,
                is_completed,
                started_at,
                completed_at,
                current_stage,
                theory_completed_at,
                examples_completed_at,
                practice_completed_at,
                test_completed_at
            )
            SELECT DISTINCT ON (
                       test_attempt.user_id,
                       level_test.level_id
                   )
                   test_attempt.user_id,
                   level_test.level_id,
                   TRUE,
                   TRUE,
                   test_attempt.started_at,
                   test_attempt.submitted_at,
                   'completed',
                   test_attempt.started_at,
                   test_attempt.started_at,
                   test_attempt.started_at,
                   test_attempt.submitted_at
            FROM test_attempts AS test_attempt
            JOIN level_tests AS level_test
              ON level_test.id = test_attempt.test_id
            WHERE test_attempt.submitted_at IS NOT NULL
            ORDER BY test_attempt.user_id,
                     level_test.level_id,
                     test_attempt.submitted_at ASC,
                     test_attempt.id ASC
            ON CONFLICT (user_id, level_id) DO UPDATE
            SET is_unlocked = TRUE,
                is_completed = TRUE,
                completed_at = EXCLUDED.completed_at,
                current_stage = 'completed',
                theory_completed_at = LEAST(
                    user_level_progress.started_at,
                    EXCLUDED.theory_completed_at
                ),
                examples_completed_at = LEAST(
                    user_level_progress.started_at,
                    EXCLUDED.examples_completed_at
                ),
                practice_completed_at = LEAST(
                    user_level_progress.started_at,
                    EXCLUDED.practice_completed_at
                ),
                test_completed_at = EXCLUDED.test_completed_at
            """
        )
    )

    # Keep the old progression monotonic after accepting completed records.
    op.execute(
        sa.text(
            """
            WITH ordered_levels AS (
                SELECT level.id,
                       LEAD(level.id) OVER (
                           ORDER BY theme.order_index,
                                    theme.id,
                                    level.order_index,
                                    level.id
                       ) AS next_level_id
                FROM levels AS level
                JOIN themes AS theme ON theme.id = level.theme_id
                WHERE theme.is_active IS TRUE
                  AND level.is_active IS TRUE
            ),
            next_unlocks AS (
                SELECT DISTINCT progress.user_id,
                                ordered.next_level_id AS level_id
                FROM user_level_progress AS progress
                JOIN ordered_levels AS ordered
                  ON ordered.id = progress.level_id
                WHERE progress.is_completed IS TRUE
                  AND ordered.next_level_id IS NOT NULL
            )
            INSERT INTO user_level_progress (
                user_id,
                level_id,
                is_unlocked,
                is_completed,
                current_stage
            )
            SELECT user_id,
                   level_id,
                   TRUE,
                   FALSE,
                   'theory'
            FROM next_unlocks
            ON CONFLICT (user_id, level_id) DO UPDATE
            SET is_unlocked = TRUE
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE user_level_progress
            SET current_stage = 'theory'
            WHERE current_stage IS NULL
            """
        )
    )

    op.alter_column(
        "user_level_progress",
        "current_stage",
        existing_type=sa.String(length=20),
        nullable=False,
    )
    op.create_check_constraint(
        "ck_user_level_progress_stage",
        "user_level_progress",
        (
            "current_stage IN "
            "('theory', 'examples', 'practice', 'test', 'completed')"
        ),
    )

    # Test score points and profile points are intentionally separate.
    # The existing one-attempt unique constraint is not changed.
    op.add_column(
        "test_attempts",
        sa.Column(
            "profile_points_awarded",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_test_attempt_profile_points",
        "test_attempts",
        "profile_points_awarded >= 0",
    )

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
    op.execute(
        sa.text(
            """
            WITH test_bonuses AS (
                SELECT user_id,
                       SUM(profile_points_awarded) AS awarded_points
                FROM test_attempts
                GROUP BY user_id
            )
            UPDATE students AS student
            SET points = student.points + bonuses.awarded_points
            FROM test_bonuses AS bonuses
            WHERE student.user_id = bonuses.user_id
              AND bonuses.awarded_points > 0
            """
        )
    )
    op.alter_column(
        "test_attempts",
        "profile_points_awarded",
        existing_type=sa.Integer(),
        server_default=None,
    )

    op.add_column(
        "user_problem_attempt",
        sa.Column(
            "used_hint",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.add_column(
        "user_problem_attempt",
        sa.Column(
            "points_awarded",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )

    # Renumber old attempts so the new unique constraint can be created even
    # if historical concurrent requests used the same attempt_number.
    op.execute(
        sa.text(
            """
            WITH numbered_attempts AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, problem_id
                           ORDER BY submitted_at ASC, id ASC
                       ) AS new_attempt_number
                FROM user_problem_attempt
            )
            UPDATE user_problem_attempt AS attempt
            SET attempt_number = numbered.new_attempt_number
            FROM numbered_attempts AS numbered
            WHERE attempt.id = numbered.id
            """
        )
    )

    # Existing code awarded 10 profile points only for official problems.
    # Hint usage was not stored before this migration, so it stays false.
    op.execute(sa.text("UPDATE user_problem_attempt SET points_awarded = 0"))
    op.execute(
        sa.text(
            """
            WITH first_correct_attempt AS (
                SELECT DISTINCT ON (user_id, problem_id)
                       id,
                       problem_id
                FROM user_problem_attempt
                WHERE is_correct IS TRUE
                ORDER BY user_id,
                         problem_id,
                         submitted_at ASC,
                         id ASC
            )
            UPDATE user_problem_attempt AS attempt
            SET points_awarded = 10
            FROM first_correct_attempt AS first_attempt,
                 problems AS problem
            WHERE attempt.id = first_attempt.id
              AND problem.id = first_attempt.problem_id
              AND problem.is_official IS TRUE
            """
        )
    )

    op.create_unique_constraint(
        "uq_problem_attempt_number",
        "user_problem_attempt",
        ["user_id", "problem_id", "attempt_number"],
    )
    op.create_check_constraint(
        "ck_problem_attempt_points_awarded",
        "user_problem_attempt",
        "points_awarded >= 0",
    )
    op.create_index(
        "uq_scored_problem_attempt",
        "user_problem_attempt",
        ["user_id", "problem_id"],
        unique=True,
        postgresql_where=sa.text("points_awarded > 0"),
    )
    op.alter_column(
        "user_problem_attempt",
        "used_hint",
        existing_type=sa.Boolean(),
        server_default=None,
    )
    op.alter_column(
        "user_problem_attempt",
        "points_awarded",
        existing_type=sa.Integer(),
        server_default=None,
    )

    op.create_table(
        "user_problem_progress",
        sa.Column("hint_used", sa.Boolean(), nullable=False),
        sa.Column(
            "hint_used_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "solved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("points_awarded", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "points_awarded >= 0",
            name="ck_user_problem_progress_points",
        ),
        sa.ForeignKeyConstraint(
            ["problem_id"],
            ["problems.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "problem_id"),
    )

    op.execute(
        sa.text(
            """
            INSERT INTO user_problem_progress (
                user_id,
                problem_id,
                hint_used,
                hint_used_at,
                solved_at,
                points_awarded
            )
            SELECT attempt.user_id,
                   attempt.problem_id,
                   BOOL_OR(attempt.used_hint),
                   NULL,
                   MIN(attempt.submitted_at)
                       FILTER (WHERE attempt.is_correct IS TRUE),
                   COALESCE(SUM(attempt.points_awarded), 0)
            FROM user_problem_attempt AS attempt
            GROUP BY attempt.user_id, attempt.problem_id
            """
        )
    )

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
    op.create_table(
        "user_badges",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("badge_id", sa.Integer(), nullable=False),
        sa.Column(
            "awarded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("source_level_id", sa.Integer(), nullable=True),
        sa.Column("source_test_attempt_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["badge_id"],
            ["badges.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["source_level_id"],
            ["levels.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["source_test_attempt_id"],
            ["test_attempts.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "badge_id"),
    )

    badge_table = sa.table(
        "badges",
        sa.column("code", sa.String()),
        sa.column("title", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("icon", sa.String()),
        sa.column("order_index", sa.Integer()),
    )
    op.bulk_insert(badge_table, BADGES)

    # Backfill achievements that can be proved from the old stored data.
    op.execute(
        sa.text(
            """
            INSERT INTO user_badges (user_id, badge_id)
            SELECT DISTINCT progress.user_id, badge.id
            FROM user_problem_progress AS progress
            JOIN badges AS badge ON badge.code = 'first_problem'
            WHERE progress.solved_at IS NOT NULL
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            """
            WITH solved_counts AS (
                SELECT user_id, COUNT(*) AS solved_count
                FROM user_problem_progress
                WHERE solved_at IS NOT NULL
                GROUP BY user_id
            )
            INSERT INTO user_badges (user_id, badge_id)
            SELECT solved.user_id, badge.id
            FROM solved_counts AS solved
            JOIN badges AS badge
              ON badge.code = CASE
                  WHEN solved.solved_count >= 50 THEN 'fifty_problems'
                  ELSE 'ten_problems'
              END
            WHERE solved.solved_count >= 10
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO user_badges (user_id, badge_id)
            SELECT solved.user_id, badge.id
            FROM (
                SELECT user_id, COUNT(*) AS solved_count
                FROM user_problem_progress
                WHERE solved_at IS NOT NULL
                GROUP BY user_id
            ) AS solved
            JOIN badges AS badge ON badge.code = 'ten_problems'
            WHERE solved.solved_count >= 50
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO user_badges (
                user_id,
                badge_id,
                source_level_id
            )
            SELECT DISTINCT ON (progress.user_id)
                   progress.user_id,
                   badge.id,
                   progress.level_id
            FROM user_level_progress AS progress
            JOIN badges AS badge ON badge.code = 'first_level'
            WHERE progress.is_completed IS TRUE
            ORDER BY progress.user_id,
                     progress.completed_at,
                     progress.level_id
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            """
            WITH active_theme_levels AS (
                SELECT theme.id AS theme_id,
                       COUNT(level.id) AS level_count
                FROM themes AS theme
                JOIN levels AS level ON level.theme_id = theme.id
                WHERE theme.is_active IS TRUE
                  AND level.is_active IS TRUE
                GROUP BY theme.id
            ),
            completed_theme_levels AS (
                SELECT progress.user_id,
                       level.theme_id,
                       COUNT(DISTINCT progress.level_id) AS level_count
                FROM user_level_progress AS progress
                JOIN levels AS level ON level.id = progress.level_id
                WHERE progress.is_completed IS TRUE
                  AND level.is_active IS TRUE
                GROUP BY progress.user_id, level.theme_id
            )
            INSERT INTO user_badges (user_id, badge_id)
            SELECT DISTINCT completed.user_id, badge.id
            FROM completed_theme_levels AS completed
            JOIN active_theme_levels AS active
              ON active.theme_id = completed.theme_id
             AND active.level_count = completed.level_count
            JOIN badges AS badge ON badge.code = 'first_theme'
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO user_badges (
                user_id,
                badge_id,
                source_level_id,
                source_test_attempt_id
            )
            SELECT attempt.user_id,
                   badge.id,
                   test.level_id,
                   attempt.id
            FROM test_attempts AS attempt
            JOIN level_tests AS test ON test.id = attempt.test_id
            JOIN badges AS badge ON badge.code = 'test_star'
            WHERE attempt.percentage > test.badge_threshold_percent
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO user_badges (
                user_id,
                badge_id,
                source_level_id,
                source_test_attempt_id
            )
            SELECT attempt.user_id,
                   badge.id,
                   test.level_id,
                   attempt.id
            FROM test_attempts AS attempt
            JOIN level_tests AS test ON test.id = attempt.test_id
            JOIN badges AS badge ON badge.code = 'perfect_test'
            WHERE attempt.percentage = 100
            ON CONFLICT (user_id, badge_id) DO NOTHING
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE students
            SET level = FLOOR(points / 100.0)::integer + 1
            """
        )
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_table("user_badges")
    op.drop_table("badges")
    op.drop_table("user_problem_progress")

    op.drop_index(
        "uq_scored_problem_attempt",
        table_name="user_problem_attempt",
        postgresql_where=sa.text("points_awarded > 0"),
    )
    op.drop_constraint(
        "ck_problem_attempt_points_awarded",
        "user_problem_attempt",
        type_="check",
    )
    op.drop_constraint(
        "uq_problem_attempt_number",
        "user_problem_attempt",
        type_="unique",
    )
    op.drop_column("user_problem_attempt", "points_awarded")
    op.drop_column("user_problem_attempt", "used_hint")

    op.drop_constraint(
        "ck_test_attempt_profile_points",
        "test_attempts",
        type_="check",
    )
    op.drop_column("test_attempts", "profile_points_awarded")

    op.drop_constraint(
        "ck_user_level_progress_stage",
        "user_level_progress",
        type_="check",
    )
    op.drop_column("user_level_progress", "test_completed_at")
    op.drop_column("user_level_progress", "practice_completed_at")
    op.drop_column("user_level_progress", "examples_completed_at")
    op.drop_column("user_level_progress", "theory_completed_at")
    op.drop_column("user_level_progress", "current_stage")
