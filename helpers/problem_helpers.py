import uuid
from typing import Annotated

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

from gamification_helpers import award_problem_points, award_problem_badges
from models import Problem, Level, Theme, UserProblemProgress, UserProblemAttempt, User
from schemas import SubmitAnswer, AttemptResult, BadgeRead
from security import get_current_user

CurrentUser = Annotated[User, Depends(get_current_user)]


def get_problem_or_404(session: Session, problem_id: int) -> Problem:
    problem = session.query(Problem).join(Problem.level).join(Level.theme).filter(
        Problem.id == problem_id,
        Problem.is_active.is_(True),
        Level.is_active.is_(True),
        Theme.is_active.is_(True),
    ).first()

    if problem is None:
        raise HTTPException(404, "Problem not found")

    return problem


def check_already_solved(session: Session, user_id: uuid.UUID, problem_id: int):
    problem_progress = session.query(UserProblemProgress).filter_by(
        user_id=user_id,
        problem_id=problem_id,
    ).first()

    if problem_progress and problem_progress.solved_at is not None:
        raise HTTPException(400, "Problem already solved")

    correct_attempt = session.query(UserProblemAttempt).filter_by(
        user_id=user_id,
        problem_id=problem_id,
        is_correct=True,
    ).first()
    if correct_attempt:
        raise HTTPException(400, "Problem already solved")





def check_attempts_left(
    session: Session,
    user_id: uuid.UUID,
    problem: Problem,
) -> int:
    previous_attempts = session.query(UserProblemAttempt).filter_by(
        user_id=user_id,
        problem_id=problem.id,
    ).count()

    if previous_attempts >= problem.max_attempts:
        raise HTTPException(400, "You have no attempts left")

    return previous_attempts


def create_attempt(
    session: Session,
    user_id: uuid.UUID,
    problem: Problem,
    data: SubmitAnswer,
    attempt_number: int,
    used_hint: bool,
) -> UserProblemAttempt:
    is_correct = data.submitted_answer.strip() == problem.correct_answer.strip()

    attempt = UserProblemAttempt(
        user_id=user_id,
        problem_id=problem.id,
        submitted_answer=data.submitted_answer,
        is_correct=is_correct,
        attempt_number=attempt_number,
        used_hint=used_hint,
        points_awarded=0,
    )

    session.add(attempt)
    return attempt


def handle_correct_answer(
    session: Session,
    current_user: CurrentUser,
    problem: Problem,
    attempt: UserProblemAttempt,
    problem_progress: UserProblemProgress,
) -> dict:
    base_points, bonus_points, points_awarded = award_problem_points(
        session=session,
        user=current_user,
        progress=problem_progress,
    )

    attempt.points_awarded = points_awarded
    attempt.used_hint = problem_progress.hint_used

    new_badges = award_problem_badges(
        session=session,
        user_id=current_user.id,
        hint_used=problem_progress.hint_used,
    )

    return {
        "base_points": base_points,
        "bonus_points": bonus_points,
        "points_awarded": points_awarded,
        "new_badges": new_badges,
    }

def build_result(
    attempt: UserProblemAttempt,
    problem: Problem,
    current_user: User,
    reward: dict,
) -> AttemptResult:
    attempts_exhausted = not attempt.is_correct and attempt.attempt_number >= problem.max_attempts
    remaining_attempts = 0 if attempt.is_correct else max(0, problem.max_attempts - attempt.attempt_number)

    return AttemptResult(
        is_correct=attempt.is_correct,
        attempt_number=attempt.attempt_number,
        remaining_attempts=remaining_attempts,
        explanation=problem.explanation if attempts_exhausted else None,
        correct_answer=problem.correct_answer if attempts_exhausted else None,
        base_points=reward["base_points"],
        bonus_points=reward["bonus_points"],
        points_awarded=reward["points_awarded"],
        used_hint=attempt.used_hint,
        student_points=current_user.student.points,
        student_level=current_user.student.level,
        new_badges=[BadgeRead.model_validate(badge) for badge in reward["new_badges"]],
    )



def require_problem_owner_or_superuser(current_user: User,problem: Problem) -> None:
    if current_user.is_superuser:
        return

    if current_user.role != "teacher":
        raise HTTPException(403,"Only teachers and superusers can modify problems")

    if problem.created_by_id != current_user.id:
        raise HTTPException(403,"You can modify only problems created by you")




def require_problem_assignment_permission(current_user: User,problem: Problem) -> None:
    if problem.is_official:
        raise HTTPException(status_code=400, detail="Official problems cannot have class assignments")

    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can manage class assignments")

    if current_user.id != problem.created_by_id:
        raise HTTPException(status_code=403, detail="Only the problem owner can manage its class assignments")

