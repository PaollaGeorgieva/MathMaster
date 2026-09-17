
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from helpers.gamification_helpers import get_level_progress_percentage, get_points_to_next_level, get_student_rank
from models import User, StudentProfile, SchoolClass, UserProblemAttempt, Theme, Problem, Level, \
    TestAttempt, UserProblemProgress, UserBadge, ThemeTest
from schemas import SchoolClassRead, SchoolClassCreate, Message, JoinSchoolClass, StudentInClass, StudentProgress, \
    StudentThemeProgress, StudentProblemAttemptsRead, ClassThemeStatistics, \
    ClassProblemStatistics, SchoolClassUpdate, BadgeRead
from helpers.schoolclass_helpers import check_class_access, get_student_for_teacher, generate_unique_class_code, \
    get_class_by_code, get_class_for_teacher
from security import get_current_user



classes_router = APIRouter(prefix="/classes", tags=["classes"])
CurrentUser = Annotated[User, Depends(get_current_user)]



@classes_router.get('/{class_id}', response_model=SchoolClassRead)
def get_class(class_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    target_class = session.get(SchoolClass, class_id)

    if not target_class:
        raise HTTPException(404, "Class not found")

    check_class_access(current_user, target_class)

    return target_class


@classes_router.get('/{class_id}/students', response_model=list[StudentInClass])
def get_class_students(class_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    target_class: SchoolClass | None = session.get(SchoolClass, class_id)

    if not target_class:
        raise HTTPException(404, "Class not found")

    check_class_access(current_user, target_class)

    return target_class.students





@classes_router.get('/students/{student_id}/progress', response_model=StudentProgress)
def student_progress(student_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    student = get_student_for_teacher(student_id, current_user, session)

    solved_problems = session.query(UserProblemAttempt.problem_id).filter(
        UserProblemAttempt.user_id == student.user_id,
        UserProblemAttempt.is_correct.is_(True),
    ).distinct().count()

    hints_used = session.query(UserProblemProgress).filter(
        UserProblemProgress.user_id == student.user_id,
        UserProblemProgress.hint_used.is_(True),
    ).count()

    tests_completed = session.query(TestAttempt).filter(
        TestAttempt.user_id == student.user_id,
        TestAttempt.submitted_at.is_not(None),
    ).count()

    earned_badges = session.query(UserBadge).filter(
        UserBadge.user_id == student.user_id,
    ).order_by(UserBadge.awarded_at.desc()).all()

    badges = [BadgeRead.model_validate(badge) for badge in earned_badges]

    return StudentProgress(
        level=student.level,
        points=student.points,
        solved_problems=solved_problems,
        rank=get_student_rank(student.level),
        points_for_next_level=get_points_to_next_level(student.points),
        level_progress_percentage=get_level_progress_percentage(student.points),
        hints_used=hints_used,
        tests_completed=tests_completed,
        badges=badges,
    )


@classes_router.post('/', response_model=SchoolClassRead)
def create_class(current_user: CurrentUser, new_class: SchoolClassCreate, session: Session = Depends(get_db)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create classes")

    class_name = new_class.name.strip()

    if not class_name:
        raise HTTPException(400, "Class name cannot be empty")

    existing_class = session.query(SchoolClass).filter_by(
        teacher_id=current_user.teacher.id,
        name=class_name,
    ).first()

    if existing_class:
        raise HTTPException(409, "You already have a class with this name")

    class_obj = SchoolClass(
        name=new_class.name,
        teacher=current_user.teacher,
        class_code=generate_unique_class_code(session),
    )

    session.add(class_obj)
    session.commit()
    session.refresh(class_obj)
    return class_obj


@classes_router.post('/join', response_model=Message)
def join_class(
    current_user: CurrentUser,
    data: JoinSchoolClass,
    session: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(403, "Only students can join classes")

    target_class = get_class_by_code(class_code=data.class_code, session=session)

    if not target_class:
        raise HTTPException(404, "Class not found")

    if current_user.student.class_id == target_class.id:
        raise HTTPException(400, "Already in this class")

    if current_user.student.class_id is not None:
        raise HTTPException(400, "Already in another class")

    current_user.student.class_id = target_class.id

    session.commit()

    return Message(message="Joined successfully")


@classes_router.get("/students/{student_id}/progress/themes", response_model=list[StudentThemeProgress])
def get_student_theme_progress(student_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    student = get_student_for_teacher(student_id, current_user, session)

    themes = session.query(Theme).filter(Theme.is_active.is_(True)).order_by(
        Theme.order_index.asc(),
        Theme.id.asc(),
    ).all()

    theme_progress = []

    for theme in themes:
        problem_rows = session.query(Problem.id).join(Problem.level).filter(
            Level.theme_id == theme.id,
            Level.is_active.is_(True),
            Problem.is_active.is_(True),
            Problem.is_official.is_(True),
        ).all()

        problem_ids = [row.id for row in problem_rows]
        total_problems = len(problem_ids)

        solved_problems = 0

        if problem_ids:
            solved_problems = session.query(UserProblemAttempt.problem_id).filter(
                UserProblemAttempt.user_id == student.user_id,
                UserProblemAttempt.problem_id.in_(problem_ids),
                UserProblemAttempt.is_correct.is_(True),
            ).distinct().count()

        test_submitted = session.query(TestAttempt.id).join(TestAttempt.test).filter(
            TestAttempt.user_id == student.user_id,
            TestAttempt.submitted_at.is_not(None),
            ThemeTest.theme_id == theme.id,
        ).first() is not None

        theme_progress.append(
            StudentThemeProgress(
                theme_id=theme.id,
                title=theme.title,
                solved_problems=solved_problems,
                total_problems=total_problems,
                is_completed=test_submitted,
            )
        )

    return theme_progress




@classes_router.get('/students/{student_id}/problems/{problem_id}/attempts', response_model=StudentProblemAttemptsRead)
def get_student_problem_attempts(student_id: int, problem_id: int, current_user: CurrentUser, session: Session=Depends(get_db)):
    student = get_student_for_teacher(student_id, current_user, session)

    problem = session.get(Problem, problem_id)

    if not problem:
        raise HTTPException(404, "Problem not found")

    problem_attempts = session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user_id==student.user_id,
        UserProblemAttempt.problem_id==problem_id
    ).order_by(
        UserProblemAttempt.attempt_number.asc(),
        UserProblemAttempt.submitted_at.asc(),
        UserProblemAttempt.id.asc()
    ).all()

    return StudentProblemAttemptsRead(
        student_id=student.id,
        problem_id=problem.id,
        question=problem.question,
        correct_answer=problem.correct_answer,
        explanation=problem.explanation,
        attempts=problem_attempts,
    )

@classes_router.get("/{class_id}/themes/{theme_id}/statistics", response_model=ClassThemeStatistics)
def get_class_theme_statistics(class_id: int, theme_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    school_class = get_class_for_teacher(class_id, current_user, session)

    theme = session.get(Theme, theme_id)

    if theme is None:
        raise HTTPException(404, "Theme not found")

    student_user_ids = [student.user_id for student in school_class.students]
    total_students = len(student_user_ids)
    active_level_ids = [level.id for level in theme.levels if level.is_active]

    theme_attempts = session.query(UserProblemAttempt).join(UserProblemAttempt.problem).filter(
        UserProblemAttempt.user_id.in_(student_user_ids),
        Problem.level_id.in_(active_level_ids),
        Problem.is_active.is_(True),
    ).all()

    started_students = len({attempt.user_id for attempt in theme_attempts})

    submitted_test_attempts = session.query(TestAttempt).join(TestAttempt.test).filter(
        TestAttempt.user_id.in_(student_user_ids),
        TestAttempt.submitted_at.is_not(None),
        ThemeTest.theme_id == theme.id,
    ).all()

    completed_students = len({attempt.user_id for attempt in submitted_test_attempts})

    total_attempts = len(theme_attempts)
    correct_attempts = sum(attempt.is_correct for attempt in theme_attempts)
    success_rate = round(correct_attempts / total_attempts * 100, 2) if total_attempts else 0.0

    student_problem_pairs = {
        (attempt.user_id, attempt.problem_id) for attempt in theme_attempts
    }

    average_attempts_per_problem = (
        round(total_attempts / len(student_problem_pairs), 2)
        if student_problem_pairs else 0.0
    )

    test_percentages = [attempt.percentage for attempt in submitted_test_attempts if attempt.percentage is not None]

    average_test_percentage = (round(sum(test_percentages) / len(test_percentages), 2) if test_percentages else 0.0)


    return ClassThemeStatistics(
        class_id=school_class.id,
        theme_id=theme.id,
        theme_title=theme.title,
        total_students=total_students,
        started_students=started_students,
        completed_students=completed_students,
        average_test_percentage=average_test_percentage,
        success_rate=success_rate,
        average_attempts_per_problem=average_attempts_per_problem,
    )

@classes_router.get("/{class_id}/problems/{problem_id}/statistics", response_model=ClassProblemStatistics)
def get_class_problem_statistics(class_id: int, problem_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    school_class = get_class_for_teacher(class_id, current_user, session)

    problem = session.get(Problem, problem_id)

    if problem is None or not problem.is_active:
        raise HTTPException(404, "Problem not found")

    is_assigned_to_class = any(assignment.class_id == school_class.id for assignment in problem.class_assignments)

    if not problem.is_official and not is_assigned_to_class:
        raise HTTPException(403, "Problem is not assigned to this class")

    student_user_ids = [student.user_id for student in school_class.students]

    attempts = session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user_id.in_(student_user_ids),
        UserProblemAttempt.problem_id == problem.id,
    ).all()

    attempted_students = len({attempt.user_id for attempt in attempts})
    solved_students = len({attempt.user_id for attempt in attempts if attempt.is_correct})

    success_rate = round(solved_students / attempted_students * 100, 2) if attempted_students else 0.0
    average_attempts = round(len(attempts) / attempted_students, 2) if attempted_students else 0.0

    return ClassProblemStatistics(
        class_id=school_class.id,
        problem_id=problem.id,
        attempted_students=attempted_students,
        solved_students=solved_students,
        success_rate=success_rate,
        average_attempts=average_attempts,
    )


@classes_router.patch( "/{class_id}",response_model=Message,)
def rename_class(class_id: int,
                 data:SchoolClassUpdate,
                 current_user: CurrentUser,
                 session: Session = Depends(get_db)):
    school_class = get_class_for_teacher(class_id, current_user, session)

    new_name = data.name.strip()

    if not new_name:
        raise HTTPException(400, 'Name cannot be empty')

    existing_class = session.query(SchoolClass).filter(
        SchoolClass.teacher_id == school_class.teacher_id,
        SchoolClass.name == new_name,
        SchoolClass.id != school_class.id,
    ).first()

    if existing_class:
        raise HTTPException(409, "You already have a class with this name")

    school_class.name = new_name
    session.commit()
    session.refresh(school_class)

    return Message(message="Renamed successfully")

@classes_router.delete("/{class_id}/students/{student_id}", response_model=Message)
def remove_student(class_id, student_id, current_user: CurrentUser, session: Session = Depends(get_db)):
    school_class = get_class_for_teacher(class_id, current_user, session)

    student = session.query(StudentProfile).filter(
        StudentProfile.id == student_id,
        StudentProfile.class_id == school_class.id,
    ).first()

    if student is None:
        raise HTTPException(404, 'Student not found')


    student.class_id = None

    session.commit()

    return Message(message="Removed successfully")


@classes_router.delete("/me/membership", response_model=Message)
def leave_class(current_user: CurrentUser, session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students can leave classes")

    student = current_user.student

    if student.class_id is None:
        raise HTTPException(400, "You are not in a class")

    student.school_class = None
    session.commit()

    return Message(message="Left class successfully")


@classes_router.delete("/{class_id}", response_model=Message)
def delete_class(class_id: int, current_user: CurrentUser, session: Session=Depends(get_db)):
    school_class = get_class_for_teacher(class_id, current_user, session)

    for student in list(school_class.students):
        student.school_class = None

    session.delete(school_class)
    session.commit()
    return Message(message="Class deleted successfully")
