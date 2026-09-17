from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import Problem, StudentProfile, User, UserBadge, UserProblemProgress


BASE_PROBLEM_POINTS = 10
NO_HINT_BONUS_POINTS = 5
POINTS_PER_LEVEL = 100


def calculate_problem_points(hint_used: bool) -> tuple[int, int, int]:
    base_points = BASE_PROBLEM_POINTS
    bonus_points = 0 if hint_used else NO_HINT_BONUS_POINTS
    return base_points, bonus_points, base_points + bonus_points


def calculate_student_level(points: int) -> int:
    return points // POINTS_PER_LEVEL + 1


def get_student_rank(level: int) -> str:
    if level <= 5:
        return "Beginner"
    if level <= 10:
        return "Explorer"
    if level <= 20:
        return "Solver"
    if level <= 30:
        return "Mathematician"
    return "Master"


def get_points_to_next_level(points: int) -> int:
    return POINTS_PER_LEVEL - points % POINTS_PER_LEVEL


def get_level_progress_percentage(points: int) -> int:
    return points % POINTS_PER_LEVEL


def add_profile_points(*, session: Session, user: User, points: int) -> None:
    if points <= 0:
        return

    student = session.query(StudentProfile).filter_by(user_id=user.id).populate_existing().with_for_update().first()
    if student is None:
        return

    student.points += points
    student.level = calculate_student_level(student.points)


def get_or_create_problem_progress(*, session: Session, user_id, problem_id: int) -> UserProblemProgress:
    progress = session.query(UserProblemProgress).filter_by(user_id=user_id, problem_id=problem_id).first()
    if progress is None:
        progress = UserProblemProgress(user_id=user_id, problem_id=problem_id)
        session.add(progress)
    return progress


def record_hint_use(*, session: Session, user_id, problem: Problem) -> UserProblemProgress:
    progress = get_or_create_problem_progress(session=session, user_id=user_id, problem_id=problem.id)
    if progress.solved_at is None and problem.hint:
        progress.hint_used = True
        if progress.hint_used_at is None:
            progress.hint_used_at = datetime.now(timezone.utc)
    return progress


def award_problem_points(*, session: Session, user: User, progress: UserProblemProgress) -> tuple[int, int, int]:
    if progress.solved_at is not None:
        return 0, 0, 0

    base_points, bonus_points, total_points = calculate_problem_points(progress.hint_used)
    progress.solved_at = datetime.now(timezone.utc)
    progress.points_awarded = total_points
    add_profile_points(session=session, user=user, points=total_points)
    return base_points, bonus_points, total_points


def award_badge(*, session: Session, user_id, code: str) -> UserBadge | None:
    if session.get(UserBadge, (user_id, code)) is not None:
        return None

    badge = UserBadge(user_id=user_id, code=code)
    session.add(badge)
    return badge


def award_problem_badges(*, session: Session, user_id, hint_used: bool) -> list[UserBadge]:
    badge_codes = ["first_problem"]
    if not hint_used:
        badge_codes.append("no_hint_problem")

    new_badges = []
    for code in badge_codes:
        badge = award_badge(session=session, user_id=user_id, code=code)
        if badge is not None:
            new_badges.append(badge)
    return new_badges


def award_test_badge(*, session: Session, user_id, percentage: float, threshold: int) -> list[UserBadge]:
    if percentage <= threshold:
        return []

    badge = award_badge(session=session, user_id=user_id, code="test_star")
    return [badge] if badge is not None else []


def award_level_badge(*, session: Session, user_id) -> list[UserBadge]:
    badge = award_badge(session=session, user_id=user_id, code="first_level")
    return [badge] if badge is not None else []
