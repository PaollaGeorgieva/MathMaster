from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Level, Problem, Theme, User, UserLevelProgress
from helpers.progress_helpers import get_active_theme_test, get_theme_test_attempt
from schemas import ExampleProblemRead, TheoryRead, LevelRead, ProblemReadStudent, ThemeRead


@dataclass(frozen=True)
class LevelAccess:
    is_unlocked: bool
    is_completed: bool
    completed_at: datetime | None = None


def get_active_levels(session: Session) -> list[Level]:
    levels = session.query(Level).join(Level.theme).filter(
        Theme.is_active.is_(True),
        Level.is_active.is_(True)).order_by(
        Theme.order_index.asc(),
        Theme.id.asc(),
        Level.order_index.asc(),
        Level.id.asc()).all()

    return levels


def get_first_level(session: Session) -> Level | None:
    return session.query(Level).join(Level.theme).filter(
        Theme.is_active.is_(True),
        Level.is_active.is_(True)).order_by(
        Theme.order_index.asc(),
        Theme.id.asc(),
        Level.order_index.asc(),
        Level.id.asc()).first()



def build_level_access_map(*, levels: list[Level], user: User, session: Session) -> dict[int, LevelAccess]:
    if user.is_superuser or user.role == "teacher":
        return {level.id: LevelAccess(is_unlocked=True, is_completed=False) for level in levels}

    progress_records = session.query(UserLevelProgress).filter(UserLevelProgress.user_id == user.id).all()
    progress_by_level = {progress.level_id: progress for progress in progress_records}

    first_level = get_first_level(session)
    if first_level is not None and first_level.id not in progress_by_level:
        first_progress = UserLevelProgress(user_id=user.id, level_id=first_level.id, is_unlocked=True, is_completed=False)
        session.add(first_progress)
        session.commit()
        progress_by_level[first_level.id] = first_progress

    level_access_map = {
        level.id: LevelAccess(
            is_unlocked=progress_by_level[level.id].is_unlocked if level.id in progress_by_level else False,
            is_completed=progress_by_level[level.id].is_completed if level.id in progress_by_level else False,
            completed_at=progress_by_level[level.id].completed_at if level.id in progress_by_level else None
        )
        for level in levels
    }

    return level_access_map

def level_to_read(*, level: Level, access: LevelAccess, user: User) -> LevelRead:
    response = LevelRead.model_validate(level)
    response.is_unlocked = access.is_unlocked
    response.is_completed = access.is_completed
    response.completed_at = access.completed_at

    if not access.is_unlocked:
        response.description = None
        response.theories = []
        response.problems = []
        return response

    response.theories = [
        theory_to_read(theory)
        for theory in sorted(level.theories, key=lambda item: (item.order_index, item.id))
        if theory.is_active
    ]
    response.problems = [
        ProblemReadStudent.model_validate(problem)
        for problem in level.problems
        if problem.is_active and can_user_access_problem(user, problem)
    ]
    response.problems.sort(key=lambda problem: problem.order_index)
    return response


def theory_to_read(theory) -> TheoryRead:
    response = TheoryRead.model_validate(theory)
    response.example_problems = [
        ExampleProblemRead.model_validate(example)
        for example in sorted(theory.example_problems, key=lambda item: (item.order_index, item.id))
        if example.is_active
    ]
    return response


def theme_to_read(*, theme: Theme, access_map: dict[int, LevelAccess], user: User, session: Session) -> ThemeRead:
    active_levels = [level for level in theme.levels if level.is_active]
    active_levels.sort(key=lambda level: (level.order_index, level.id))

    level_accesses = [access_map[level.id] for level in active_levels]
    total_levels = len(active_levels)
    completed_levels = sum(1 for access in level_accesses if access.is_completed)
    is_unlocked = any(access.is_unlocked for access in level_accesses)
    are_levels_completed = total_levels > 0 and completed_levels == total_levels

    active_test = get_active_theme_test(session=session, theme_id=theme.id)

    test_attempt = get_theme_test_attempt(
        session=session,
        user_id=user.id,
        theme_id=theme.id,
    ) if user.role == "student" else None

    test_submitted = test_attempt is not None
    total_steps = total_levels + 1
    can_access_test = user.is_superuser or user.role == "teacher" or are_levels_completed

    response = ThemeRead.model_validate(theme)
    response.is_unlocked = is_unlocked
    response.total_levels = total_levels
    response.completed_levels = completed_levels
    response.is_completed = test_submitted
    response.progress_percentage = 100 if test_submitted else int(completed_levels / total_steps * 100)
    response.has_active_test = active_test is not None and can_access_test
    response.test_submitted = test_submitted
    response.test_percentage = test_attempt.percentage if test_attempt is not None else None

    if not is_unlocked:
        response.description = None
        response.levels = []
        return response

    response.levels = [
        level_to_read(level=level, access=access_map[level.id], user=user)
        for level in active_levels
    ]

    return response

def require_level_unlocked(*, level: Level, user: User, session: Session) -> None:
    if user.is_superuser or user.role == "teacher":
        return

    progress = session.query(UserLevelProgress).filter_by(user_id=user.id, level_id=level.id).first()

    if progress is None or not progress.is_unlocked:
        raise HTTPException(403, "Level is locked")


def can_user_access_problem(user: User, problem: Problem) -> bool:
    if user.is_superuser:
        return True
    if problem.is_official:
        return True
    if user.role == "teacher":
        return problem.created_by_id == user.id
    if user.role != "student" or user.student is None or user.student.class_id is None:
        return False
    return any(assignment.class_id == user.student.class_id for assignment in problem.class_assignments)


def require_problem_access(user: User, problem: Problem) -> None:
    if not can_user_access_problem(user=user, problem=problem):
        raise HTTPException(403, "Access denied")
