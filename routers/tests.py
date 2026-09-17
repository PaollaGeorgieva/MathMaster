from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from helpers.gamification_helpers import award_test_badge

from models import Theme, ThemeTest, TestQuestion, TestQuestionAnswer, User, TestAttempt, \
    SchoolClass, StudentProfile
from helpers.progress_helpers import require_all_theme_levels_completed, unlock_next_theme
from schemas import ThemeTestAdminRead, ThemeTestCreate, TestQuestionAdminRead, TestQuestionCreate, TestQuestionType, \
    TestQuestionUpdate, Message, ThemeTestStudentRead, TestAnswerOptionRead, TestQuestionStudentRead, TestResultRead, \
    TestSubmission, TestHistoryItemRead, TeacherStudentTestResultRead
from security import get_current_user
from helpers.test_helpers import check_test_editable, validate_answers, reorder_test_question, build_test_result, \
    get_test_for_submission, validate_test_submission, create_test_attempt

tests_router = APIRouter(prefix='/tests', tags=['tests'])
CurrentUser = Annotated[User, Depends(get_current_user)]




@tests_router.post('/admin', response_model=ThemeTestAdminRead)
def create_test_admin(*, current_user: CurrentUser, data: ThemeTestCreate, session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, 'Admin access required')

    theme = session.get(Theme, data.theme_id)

    if not theme:
        raise HTTPException(404, 'Theme not found')

    versions = [theme_test.version for theme_test in theme.theme_tests]
    new_version = max(versions, default=0) + 1

    new_test = ThemeTest(
        title=data.title,
        version=new_version,
        theme_id=data.theme_id,
        badge_threshold_percent=data.badge_threshold_percent,
        is_active=False,
    )

    session.add(new_test)
    session.commit()
    session.refresh(new_test)

    return new_test


@tests_router.post('/admin/{test_id}/questions', response_model=TestQuestionAdminRead)
def add_test_question(test_id: int, current_user: CurrentUser, data: TestQuestionCreate,session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, 'Admin access required')

    test = session.get(ThemeTest, test_id)

    if not test:
        raise HTTPException(404, 'Test not found')

    check_test_editable(test)

    if len(test.questions) >= 12:
        raise HTTPException(400, 'Cannot add more than 12 questions')

    for existing_question in test.questions:
        if existing_question.order_index == data.order_index:
            raise HTTPException(400, 'Question order index already exists')

    validate_answers(data.question_type, data.answers)

    new_question = TestQuestion(
        question=data.question,
        question_type=data.question_type.value,
        points=data.points,
        order_index=data.order_index,
        test_id=test_id,
    )

    for answer_data in data.answers:
        new_answer = TestQuestionAnswer(
            answer=answer_data.answer,
            is_correct=answer_data.is_correct,
            order_index=answer_data.order_index,
        )
        new_question.answers.append(new_answer)

    session.add(new_question)
    session.commit()
    session.refresh(new_question)

    return new_question

@tests_router.patch('/admin/questions/{question_id}', response_model=TestQuestionAdminRead)
def update_test_question(question_id: int, current_user: CurrentUser, data: TestQuestionUpdate,session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, 'Admin access required')

    question = session.get(TestQuestion, question_id)

    if question is None:
        raise HTTPException(404, 'Question not found')

    test = question.test
    check_test_editable(test)

    if data.question_type is not None and data.answers is None:
        raise HTTPException(400,'Answers are required when changing the question type')

    if data.answers is not None:
        question_type = (
            data.question_type
            if data.question_type is not None
            else TestQuestionType(question.question_type)
        )
        validate_answers(question_type, data.answers)

        question.answers.clear()

        session.flush()

        question.answers.extend(
            TestQuestionAnswer(
                answer=answer_data.answer,
                is_correct=answer_data.is_correct,
                order_index=answer_data.order_index,
            )
            for answer_data in data.answers
        )

    if data.order_index is not None:
        reorder_test_question(question, data.order_index, session)


    updates = data.model_dump(
        exclude={"answers", "order_index"},
        exclude_unset=True,
        exclude_none=True,
    )

    for field, value in updates.items():
        setattr(question, field, value)

    session.commit()
    session.refresh(question)

    return question



@tests_router.patch('/admin/{test_id}/activate', response_model=Message)
def activate_test_admin(test_id: int, current_user:CurrentUser, session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, 'Admin access required')

    test = session.get(ThemeTest, test_id)

    if not test:
        raise HTTPException(404, 'Test not found')

    theme = test.theme

    if len(test.questions) != 12:
        raise HTTPException(400, 'Test must have exactly 12 questions')

    for theme_test in theme.theme_tests:
        theme_test.is_active = False

    test.is_active = True

    session.commit()
    return Message(
        message="Test activated successfully"
    )





@tests_router.patch('/admin/{test_id}/deactivate', response_model=Message)
def deactivate_test_admin(test_id: int, current_user:CurrentUser, session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, 'Admin access required')

    test = session.get(ThemeTest, test_id)

    if not test:
        raise HTTPException(404, 'Test not found')

    test.is_active = False


    session.commit()
    return Message(
        message="Test deactivated successfully"
    )



@tests_router.get('/theme/{theme_id}/active', response_model=ThemeTestStudentRead)
def get_active_test_for_student(theme_id: int, current_user:CurrentUser, session:Session=Depends(get_db)):
    if current_user.role != 'student':
        raise HTTPException(403, 'Only students can take tests')

    theme = session.get(Theme, theme_id)

    if not theme or not theme.is_active:
        raise HTTPException(404, 'Theme not found')

    require_all_theme_levels_completed(
        session=session,
        user_id=current_user.id,
        theme=theme,
    )

    test = session.query(ThemeTest).filter(
        ThemeTest.theme_id == theme_id,
        ThemeTest.is_active == True
    ).first()

    if not test:
        raise HTTPException(404, 'Test not found')

    ready_questions = []

    existing_attempt = session.query(TestAttempt).filter_by(
        test_id=test.id,
        user_id=current_user.id,
    ).first()

    questions = test.questions if existing_attempt is None else []


    for question in questions:
        answers = []
        if question.question_type == TestQuestionType.single_choice.value:
            for answer in question.answers:
                answer_for_student = TestAnswerOptionRead(
                    id=answer.id,
                    answer=answer.answer,
                    order_index=answer.order_index,
                )

                answers.append(answer_for_student)



        ready_question = TestQuestionStudentRead(
            id = question.id,
            question = question.question,
            question_type= question.question_type,
            points=question.points,
            order_index=question.order_index,
            options=answers
        )

        ready_questions.append(ready_question)

    result = ThemeTestStudentRead(
        id=test.id,
        title=test.title,
        version=test.version,
        theme_id=theme.id,
        badge_threshold_percent=test.badge_threshold_percent,
        already_submitted=existing_attempt is not None,
        submitted_percentage=(
            existing_attempt.percentage
            if existing_attempt is not None
            else None
        ),
        badge_earned=(
            existing_attempt is not None
            and existing_attempt.percentage > test.badge_threshold_percent
        ),
        questions=ready_questions,
    )


    return result

@tests_router.post('/{test_id}/submit', response_model=TestResultRead)
def submit_test(test_id: int, data: TestSubmission, current_user: CurrentUser,session: Session = Depends(get_db)):
    if current_user.role != 'student':
        raise HTTPException(403, 'Only students can submit tests')

    test = get_test_for_submission(session=session, test_id=test_id, user_id=current_user.id)

    submitted_answers = validate_test_submission(test, data)

    test_attempt, result_answers = create_test_attempt(test=test, user_id=current_user.id,submitted_answers=submitted_answers)

    try:
        session.add(test_attempt)
        session.flush()

        new_badges = award_test_badge(
            session=session,
            user_id=current_user.id,
            percentage=test_attempt.percentage,
            threshold=test.badge_threshold_percent,
        )

        unlock_next_theme(session=session, user_id=current_user.id,theme=test.theme)

        session.commit()

    except IntegrityError:
        session.rollback()
        raise HTTPException(400, 'Students have only one attempt')

    session.refresh(test_attempt)

    result = build_test_result(
        test=test,
        test_attempt=test_attempt,
        current_user=current_user,
        new_badges=new_badges,
        result_answers=result_answers,
    )

    return result

@tests_router.get('/history', response_model=list[TestHistoryItemRead])
def get_my_test_history(current_user: CurrentUser, session: Session = Depends(get_db)):
    if current_user.role != 'student':
        raise HTTPException(403, 'Only students have test history')

    attempts = session.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.submitted_at.is_not(None),
    ).order_by(TestAttempt.submitted_at.desc()).all()

    history = []

    for attempt in attempts:
        history_item = TestHistoryItemRead(
            attempt_id=attempt.id,
            test_id=attempt.test_id,
            test_title=attempt.test.title,
            theme_id=attempt.test.theme_id,
            earned_points=attempt.earned_points,
            max_points=attempt.max_points,
            percentage=attempt.percentage,
            badge_earned=attempt.percentage > attempt.test.badge_threshold_percent,
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
        )

        history.append(history_item)

    return history


@tests_router.get('/teacher/classes/{class_id}/results',response_model=list[TeacherStudentTestResultRead])
def get_class_test_results(class_id: int,current_user: CurrentUser,session: Session = Depends(get_db)):

    if current_user.role != 'teacher':
        raise HTTPException(403, 'Only teachers can view test results')

    target_class = session.get(SchoolClass, class_id)

    if not target_class:
        raise HTTPException(404, 'Class not found')

    if target_class.teacher_id != current_user.teacher.id:
        raise HTTPException(403, 'Not your class')

    attempts = session.query(TestAttempt).join(TestAttempt.user).join(User.student).filter(
        StudentProfile.class_id == target_class.id,
        TestAttempt.submitted_at.is_not(None),
    ).order_by(TestAttempt.submitted_at.desc()).all()

    results = []

    for attempt in attempts:
        student = attempt.user.student

        result = TeacherStudentTestResultRead(
            attempt_id=attempt.id,
            test_id=attempt.test_id,
            test_title=attempt.test.title,
            theme_id=attempt.test.theme_id,
            student_user_id=attempt.user_id,
            student_email=attempt.user.email,
            student_first_name=student.first_name,
            student_last_name=student.last_name,
            class_id=target_class.id,
            earned_points=attempt.earned_points,
            max_points=attempt.max_points,
            percentage=attempt.percentage,
            badge_earned=attempt.percentage > attempt.test.badge_threshold_percent,
            submitted_at=attempt.submitted_at,
        )

        results.append(result)

    return results

