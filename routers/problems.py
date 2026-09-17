

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from helpers.level_helpers import require_level_unlocked, require_problem_access
from helpers.gamification_helpers import award_level_badge,get_or_create_problem_progress,record_hint_use
from helpers.problem_helpers import get_problem_or_404, check_already_solved, check_attempts_left, create_attempt, \
    handle_correct_answer, build_result, require_problem_owner_or_superuser, require_problem_assignment_permission

from helpers.progress_helpers import all_official_problems_solved,complete_level_and_unlock_next_in_theme

from models import User, Problem, UserProblemAttempt, Level,SchoolClass, ClassProblemAssignment, \
    UserProblemProgress

from schemas import SubmitAnswer, AttemptResult, ProblemReadStudent, ProblemReadAdmin, ProblemCreate, ProblemHint, \
    ProblemUpdate, Message, ReadUserProblemAttempt, ProblemHistoryRead, ClassProblemAssignmentCreate, ProblemResultRead
from security import get_current_user


problems_router = APIRouter(prefix="/problems", tags=["problems"])
CurrentUser = Annotated[User, Depends(get_current_user)]

@problems_router.post("/", response_model=ProblemReadAdmin)
def create_problem(*, current_user: CurrentUser, data: ProblemCreate,session: Session = Depends(get_db)):
    if current_user.role != "teacher" and not current_user.is_superuser:
        raise HTTPException(403,"Only teachers and superusers can add problems")

    level = session.get(Level, data.level_id)

    if not level or not level.is_active:
        raise HTTPException(404, "Level not found")

    class_ids = set(data.class_ids)

    if current_user.is_superuser:
        if class_ids:
            raise HTTPException(400,"Official problems cannot be assigned to classes")

        assigned_classes = []
    else:
        if not class_ids:
            raise HTTPException(400,"Select at least one class")

        assigned_classes = session.query(SchoolClass).filter(
            SchoolClass.id.in_(class_ids),
            SchoolClass.teacher_id == current_user.teacher.id,
        ).all()

        if len(assigned_classes) != len(class_ids):
            raise HTTPException(403, "Invalid class or class does not belong to you")

    problem_obj = Problem(
        **data.model_dump(exclude={"class_ids"}),
        created_by_id=current_user.id,
        is_official=current_user.is_superuser,
    )

    problem_obj.class_assignments = [
        ClassProblemAssignment(school_class=school_class) for school_class in assigned_classes
    ]

    session.add(problem_obj)
    session.commit()
    session.refresh(problem_obj)

    return problem_obj


@problems_router.get( "/admin/all", response_model=list[ProblemReadAdmin])
def get_problems_admin(current_user: CurrentUser,level_id: int | None = None,session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403,"Only superusers can view all problems")

    query = session.query(Problem)

    if level_id is not None:
        query = query.filter(Problem.level_id == level_id)

    problems = query.order_by(
            Problem.level_id.asc(),
            Problem.order_index.asc(),
            Problem.id.asc(),
        ).all()


    return problems


@problems_router.get("/mine",response_model=list[ProblemReadAdmin])
def get_my_created_problems(current_user: CurrentUser,level_id: int | None = None,session: Session = Depends(get_db)):
    if current_user.role != "teacher":
        raise HTTPException(403,"Only teachers can view their created problems")

    query = session.query(Problem).filter(Problem.created_by_id == current_user.id)

    if level_id is not None:
        query = query.filter(Problem.level_id == level_id)

    problems = query.order_by(
            Problem.level_id.asc(),
            Problem.order_index.asc(),
            Problem.id.asc(),
        ).all()


    return problems


@problems_router.post("/{problem_id}/submit",response_model=AttemptResult)
def submit_answer(current_user: CurrentUser,problem_id: int, data: SubmitAnswer,session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403,"Only students can submit answers")

    problem = get_problem_or_404(session=session, problem_id=problem_id)

    require_problem_access(user=current_user,problem=problem)

    require_level_unlocked(level=problem.level,user=current_user,session=session)

    check_already_solved(session=session,user_id=current_user.id,problem_id=problem_id)

    previous_attempts = check_attempts_left(session=session,user_id=current_user.id,problem=problem)

    problem_progress = get_or_create_problem_progress(session=session,user_id=current_user.id,problem_id=problem.id,)

    reward = {
        "base_points": 0,
        "bonus_points": 0,
        "points_awarded": 0,
        "new_badges": [],
    }

    try:
        attempt = create_attempt(
            session=session,
            user_id=current_user.id,
            problem=problem,
            data=data,
            attempt_number=previous_attempts + 1,
            used_hint=problem_progress.hint_used,
        )

        if attempt.is_correct:
            reward = handle_correct_answer(
                session=session,
                current_user=current_user,
                problem=problem,
                attempt=attempt,
                problem_progress=problem_progress,
            )

            are_all_official_problems_solved = all_official_problems_solved(
                    session=session,
                    user_id=current_user.id,
                    level=problem.level,
                )

            if problem.is_official and are_all_official_problems_solved:
                newly_level_completed, _next_level = complete_level_and_unlock_next_in_theme(
                        session=session,
                        user_id=current_user.id,
                        level=problem.level,
                        submitted_at=problem_progress.solved_at,
                    )


                if newly_level_completed:
                    reward["new_badges"].extend(
                        award_level_badge(
                            session=session,
                            user_id=current_user.id,
                        )
                    )

        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(400, "This answer was already submitted")

    return build_result(attempt, problem, current_user, reward)


@problems_router.get("/{problem_id}",response_model=ProblemReadStudent)
def get_problem(current_user: CurrentUser,problem_id: int,session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403,"Only students can view problems")

    problem = get_problem_or_404(session, problem_id)

    require_problem_access(user=current_user, problem=problem)

    require_level_unlocked(level=problem.level, user=current_user,session=session)

    return problem


@problems_router.get("/{problem_id}/my-result", response_model=ProblemResultRead)
def get_my_result(problem_id: int,current_user: CurrentUser,session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students have attempts")

    problem = get_problem_or_404(session, problem_id)

    require_problem_access(user=current_user, problem=problem)

    require_level_unlocked(level=problem.level, user=current_user, session=session)

    correct_attempt = session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user_id == current_user.id,
        UserProblemAttempt.problem_id == problem_id,
        UserProblemAttempt.is_correct.is_(True),
    ).first()

    last_attempt = session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user_id == current_user.id,
        UserProblemAttempt.problem_id == problem_id,
    ).order_by(UserProblemAttempt.attempt_number.desc()).first()

    already_solved = correct_attempt is not None
    attempts_used = last_attempt.attempt_number if last_attempt else 0
    attempts_exhausted = not already_solved and attempts_used >= problem.max_attempts
    remaining_attempts = 0 if already_solved else max(0, problem.max_attempts - attempts_used)

    problem_progress = session.query(UserProblemProgress).filter_by(
        user_id=current_user.id,
        problem_id=problem_id,
    ).first()

    return ProblemResultRead(
        already_solved=already_solved,
        correct_answer=problem.correct_answer if attempts_exhausted else None,
        remaining_attempts=remaining_attempts,
        attempts_exhausted=attempts_exhausted,
        explanation=problem.explanation if attempts_exhausted else None,
        used_hint=problem_progress.hint_used if problem_progress else False,
        points_awarded=problem_progress.points_awarded if problem_progress else 0,
    )


@problems_router.get('/{problem_id}/my-attempts', response_model=list[ReadUserProblemAttempt])
def get_my_attempts(problem_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):

    if current_user.role != 'student':
        raise HTTPException(403,  'Only students have attempts')

    problem = get_problem_or_404(session, problem_id)

    require_problem_access(user=current_user, problem=problem)
    require_level_unlocked(level=problem.level, user=current_user, session=session)


    attempts = session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user_id == current_user.id,
        UserProblemAttempt.problem_id == problem_id
    ).order_by(
        UserProblemAttempt.attempt_number.asc(),
        UserProblemAttempt.submitted_at.asc(),
        UserProblemAttempt.id.asc()
    ).all()

    return attempts

@problems_router.get("/{problem_id}/hint",response_model=ProblemHint)
def get_problem_hint(current_user: CurrentUser,problem_id: int,session: Session = Depends(get_db)):
    problem = get_problem_or_404(session, problem_id)

    require_problem_access(user=current_user, problem=problem)

    require_level_unlocked(level=problem.level, user=current_user, session=session)

    used_hint = False

    if current_user.role == "student":
        progress = record_hint_use(session=session, user_id=current_user.id, problem=problem)
        used_hint = progress.hint_used
        session.commit()

    return ProblemHint(
        hint=problem.hint,
        used_hint=used_hint,
    )


@problems_router.patch("/{problem_id}",response_model=ProblemReadAdmin)
def update_problem(current_user: CurrentUser,problem_id: int,data: ProblemUpdate,session: Session = Depends(get_db)):
    problem = session.get(Problem, problem_id)

    if not problem:
        raise HTTPException(404, "Problem not found")

    require_problem_owner_or_superuser(current_user=current_user, problem=problem)

    updates = data.model_dump(
        exclude_unset=True
    )

    for field_name, new_value in updates.items():
        setattr(
            problem,
            field_name,
            new_value,
        )

    session.commit()
    session.refresh(problem)

    return problem


@problems_router.patch("/{problem_id}/deactivate",response_model=Message)
def deactivate_problem(current_user: CurrentUser,problem_id: int,session: Session = Depends(get_db)):
    problem = session.get(Problem, problem_id)

    if not problem:
        raise HTTPException(404, "Problem not found")

    require_problem_owner_or_superuser(current_user=current_user,problem=problem)

    problem.is_active = False
    session.commit()

    return Message(message="Problem deactivated successfully")


@problems_router.patch("/{problem_id}/activate",response_model=Message)
def activate_problem(current_user: CurrentUser, problem_id: int, session: Session = Depends(get_db)):
    problem = session.get(Problem, problem_id)

    if not problem:
        raise HTTPException(404, "Problem not found")

    require_problem_owner_or_superuser(current_user=current_user, problem=problem,)

    problem.is_active = True
    session.commit()

    return Message(message="Problem activated successfully")






@problems_router.get("/history/me", response_model=list[ProblemHistoryRead])
def get_my_problem_history(current_user: CurrentUser, session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students have problem history")

    all_attempts = session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user_id == current_user.id
    ).order_by(
        UserProblemAttempt.submitted_at.desc(),
        UserProblemAttempt.id.desc(),
    ).all()

    if not all_attempts:
        return []

    attempts_by_problem = {}

    for attempt in all_attempts:
        if attempt.problem_id not in attempts_by_problem:
            attempts_by_problem[attempt.problem_id] = []

        attempts_by_problem[attempt.problem_id].append(attempt)

    problem_ids = list(attempts_by_problem.keys())

    problems = session.query(Problem).filter(
        Problem.id.in_(problem_ids)
    ).all()

    problems_by_id = {problem.id: problem for problem in problems}

    progress_records = session.query(UserProblemProgress).filter(
        UserProblemProgress.user_id == current_user.id,
        UserProblemProgress.problem_id.in_(problem_ids),
    ).all()

    progress_by_problem_id = {
        progress.problem_id: progress
        for progress in progress_records
    }

    history = []

    for problem_id, attempts in attempts_by_problem.items():
        attempts.reverse()

        problem = problems_by_id[problem_id]
        progress = progress_by_problem_id.get(problem_id)

        is_solved = any(attempt.is_correct for attempt in attempts)
        attempts_used = len(attempts)
        attempts_exhausted = not is_solved and attempts_used >= problem.max_attempts
        show_solution = is_solved or attempts_exhausted

        hint_used = progress.hint_used if progress else False
        points_awarded = progress.points_awarded if progress else 0

        history.append(
            ProblemHistoryRead(
                problem_id=problem.id,
                question=problem.question,
                level_id=problem.level_id,
                is_solved=is_solved,
                attempts_used=attempts_used,
                max_attempts=problem.max_attempts,
                hint_used=hint_used,
                points_awarded=points_awarded,
                correct_answer=problem.correct_answer if show_solution else None,
                explanation=problem.explanation if show_solution else None,
                attempts=attempts,
            )
        )

    return history



@problems_router.post("/{problem_id}/class-assignments", response_model=Message)
def assign_problem(current_user: CurrentUser, problem_id: int, data: ClassProblemAssignmentCreate, session: Session = Depends(get_db)):
    problem = session.get(Problem, problem_id)

    if not problem:
        raise HTTPException(status_code=404,detail="Problem not found")

    require_problem_assignment_permission(current_user=current_user, problem=problem)

    class_ids = set(data.class_ids)

    if not class_ids:
        raise HTTPException(status_code=400, detail="Select at least one class")

    for class_id in class_ids:
        school_class = session.get(SchoolClass, class_id)

        if school_class is None or school_class.teacher_id != current_user.teacher.id:
            raise HTTPException(status_code=403,detail="Invalid class or class does not belong to you")

    existing_class_ids = {assignment.class_id for assignment in problem.class_assignments}

    class_ids_to_add = class_ids - existing_class_ids

    new_assignments = [
        ClassProblemAssignment(
            problem_id=problem.id,
            class_id=class_id,
        )
        for class_id in class_ids_to_add
    ]

    if not new_assignments:
        return Message(message="Problem is already assigned to the selected classes")

    session.add_all(new_assignments)
    session.commit()

    return Message(message=f"Problem assigned to {len(new_assignments)} class(es)")


@problems_router.delete("/{problem_id}/class-assignments/{class_id}",response_model=Message)
def delete_problem_assignment(current_user: CurrentUser, problem_id: int, class_id: int, session: Session = Depends(get_db)):
    problem = session.get(Problem, problem_id)

    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    require_problem_assignment_permission(current_user=current_user, problem=problem)

    school_class = session.get(SchoolClass, class_id)

    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")

    if school_class.teacher_id != current_user.teacher.id:
        raise HTTPException(status_code=403, detail="Class does not belong to you")

    assignment = session.get(
        ClassProblemAssignment,
        (problem_id, class_id),
    )

    if not assignment:
        raise HTTPException(status_code=404, detail="Problem is not assigned to this class")

    session.delete(assignment)
    session.commit()

    return Message(message="Problem assignment removed successfully")
