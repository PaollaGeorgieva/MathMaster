from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import (
    Level,
    TestAttempt,
    Theme,
    ThemeTest,
    UserLevelProgress,
    UserProblemAttempt,
)


def get_or_create_level_progress(
    *,
    session: Session,
    user_id,
    level: Level,
    is_unlocked: bool = False,
) -> UserLevelProgress:
    progress = session.query(UserLevelProgress).filter_by(
        user_id=user_id,
        level_id=level.id,
    ).first()

    if progress is None:
        progress = UserLevelProgress(
            user_id=user_id,
            level_id=level.id,
            is_unlocked=is_unlocked,
            is_completed=False,
        )
        session.add(progress)
    elif is_unlocked:
        progress.is_unlocked = True

    return progress


def get_active_theme_test(*, session: Session, theme_id: int) -> ThemeTest | None:
    return session.query(ThemeTest).filter(
        ThemeTest.theme_id == theme_id,
        ThemeTest.is_active.is_(True),
    ).first()


def get_theme_test_attempt(
    *,
    session: Session,
    user_id,
    theme_id: int,
) -> TestAttempt | None:
    test_attempt = (
        session.query(TestAttempt)
        .join(TestAttempt.test)
        .filter(
            TestAttempt.user_id == user_id,
            TestAttempt.submitted_at.is_not(None),
            ThemeTest.theme_id == theme_id,
        )
        .order_by(
            TestAttempt.submitted_at.desc(),
            TestAttempt.id.desc(),
        )
        .first()
    )
    return test_attempt



def get_official_problem_progress_query(*, session: Session, user_id, level: Level):
    problem_ids = [problem.id for problem in level.problems if problem.is_active and problem.is_official]

    solved_query = session.query(UserProblemAttempt.problem_id).filter(
        UserProblemAttempt.user_id == user_id,
        UserProblemAttempt.problem_id.in_(problem_ids),
        UserProblemAttempt.is_correct.is_(True),
    ).distinct()

    return problem_ids, solved_query


def all_official_problems_solved(*, session: Session, user_id, level: Level) -> bool:
    problem_ids, solved_query = get_official_problem_progress_query(session=session, user_id=user_id, level=level)

    if not problem_ids:
        return False

    session.flush()
    return solved_query.count() == len(problem_ids)



def require_all_theme_levels_completed(*, session: Session, user_id, theme: Theme) -> None:
    active_level_ids = [level.id for level in theme.levels if level.is_active]

    if not active_level_ids:
        raise HTTPException(403, 'Theme has no active levels')

    session.flush()

    completed_count = session.query(UserLevelProgress).filter(
        UserLevelProgress.user_id == user_id,
        UserLevelProgress.level_id.in_(active_level_ids),
        UserLevelProgress.is_completed.is_(True),
    ).count()

    if completed_count != len(active_level_ids):
        raise HTTPException(403, 'Complete all theme levels before taking the test')

def complete_level_and_unlock_next_in_theme(
    *,
    session: Session,
    user_id,
    level: Level,
    submitted_at: datetime,
) -> tuple[bool, Level | None]:
    progress = get_or_create_level_progress(
        session=session,
        user_id=user_id,
        level=level,
        is_unlocked=True,
    )

    if progress.is_completed:
        return False, None


    progress.completed_at = submitted_at
    progress.is_completed = True

    active_levels = session.query(Level).filter(
            Level.theme_id == level.theme_id,
            Level.is_active.is_(True),
        ).order_by(
        Level.order_index.asc(),
        Level.id.asc()).all()


    next_level = None

    for index, active_level in enumerate(active_levels):
        if active_level.id != level.id:
            continue

        if index + 1 < len(active_levels):
            next_level = active_levels[index + 1]
        break

    if next_level is not None:
        get_or_create_level_progress(session=session, user_id=user_id, level=next_level, is_unlocked=True)

    return True, next_level

def unlock_next_theme(*, session: Session, user_id, theme: Theme) -> Level | None:
    active_themes = session.query(Theme).filter(
        Theme.is_active.is_(True)
    ).order_by(
        Theme.order_index.asc(),
        Theme.id.asc(),
    ).all()

    current_theme_reached = False

    for active_theme in active_themes:
        if active_theme.id == theme.id:
            current_theme_reached = True
            continue

        if not current_theme_reached:
            continue

        next_level = session.query(Level).filter(
            Level.theme_id == active_theme.id,
            Level.is_active.is_(True),
        ).order_by(
            Level.order_index.asc(),
            Level.id.asc(),
        ).first()

        if next_level is not None:
            get_or_create_level_progress(
                session=session,
                user_id=user_id,
                level=next_level,
                is_unlocked=True,
            )

            return next_level

    return None