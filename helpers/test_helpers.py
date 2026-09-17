
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import ThemeTest, Theme, TestAttempt, TestQuestion, TestAttemptAnswer, User
from helpers.progress_helpers import require_all_theme_levels_completed
from schemas import TestSubmission, TestQuestionSubmission, TestQuestionResultRead, TestQuestionType, TestResultRead, \
    BadgeRead


def get_test_for_submission(session: Session,test_id: int,user_id: UUID) -> ThemeTest:

    test = session.query(ThemeTest).join(ThemeTest.theme).filter(
        ThemeTest.id == test_id,
        ThemeTest.is_active.is_(True),
        Theme.is_active.is_(True)
    ).first()

    if test is None:
        raise HTTPException(404, 'Test not found')


    require_all_theme_levels_completed(session=session, user_id=user_id, theme=test.theme)

    existing_attempt = session.query(TestAttempt).filter(
        TestAttempt.test_id == test.id,
        TestAttempt.user_id == user_id,
    ).first()

    if existing_attempt is not None:
        raise HTTPException(400, 'Students have only one attempt')

    return test


def validate_test_submission(test: ThemeTest, data: TestSubmission) -> dict[int, TestQuestionSubmission]:
    submitted_question_ids = {answer.question_id for answer in data.answers}

    if len(submitted_question_ids) != len(data.answers):
        raise HTTPException(400,'Each question must be answered only once')

    test_question_ids = {question.id for question in test.questions}

    if submitted_question_ids != test_question_ids:
        raise HTTPException(400,'All test questions must be answered')

    return {answer.question_id: answer for answer in data.answers}


def evaluate_test_question(question: TestQuestion,submitted_answer: TestQuestionSubmission
                           ) -> tuple[TestAttemptAnswer, TestQuestionResultRead]:
    correct_answer = None

    for answer_option in question.answers:
        if answer_option.is_correct:
            correct_answer = answer_option
            break


    selected_answer_id = None
    submitted_text = None

    if question.question_type == TestQuestionType.single_choice.value:
        if submitted_answer.selected_answer_id is None:
            raise HTTPException(400, 'Selected answer is required')

        selected_answer = None

        for answer_option in question.answers:
            if answer_option.id == submitted_answer.selected_answer_id:
                selected_answer = answer_option
                break

        if selected_answer is None:
            raise HTTPException(400,'Selected answer does not belong to this question')

        selected_answer_id = selected_answer.id
        result_answer_text = selected_answer.answer
        is_correct = selected_answer.is_correct

    elif question.question_type == TestQuestionType.short_answer.value:
        if submitted_answer.submitted_text is None:
            raise HTTPException(400, 'Submitted text is required')

        submitted_text = submitted_answer.submitted_text.strip()

        if not submitted_text:
            raise HTTPException(400, 'Submitted text cannot be empty')

        correct_text = correct_answer.answer.strip()
        result_answer_text = submitted_text
        is_correct = submitted_text.casefold() == correct_text.casefold()

    else:
        raise HTTPException(500, 'Unsupported question type')

    points_awarded = question.points if is_correct else 0

    attempt_answer = TestAttemptAnswer(
        question_id=question.id,
        selected_answer_id=selected_answer_id,
        submitted_text=submitted_text,
        is_correct=is_correct,
        points_awarded=points_awarded,
    )

    result_answer = TestQuestionResultRead(
        question_id=question.id,
        question=question.question,
        order_index=question.order_index,
        submitted_answer=result_answer_text,
        correct_answer=correct_answer.answer,
        is_correct=is_correct,
        points_awarded=points_awarded,
        possible_points=question.points,
    )

    return attempt_answer, result_answer


def create_test_attempt(test: ThemeTest,user_id: UUID,submitted_answers: dict[int, TestQuestionSubmission]
                        ) -> tuple[TestAttempt, list[TestQuestionResultRead]]:
    test_attempt = TestAttempt(test_id=test.id, user_id=user_id,submitted_at=datetime.now(timezone.utc))

    earned_points = 0
    max_points = 0
    result_answers = []

    for question in test.questions:
        attempt_answer, result_answer = evaluate_test_question(
            question=question,
            submitted_answer=submitted_answers[question.id])

        test_attempt.answers.append(attempt_answer)
        result_answers.append(result_answer)

        earned_points += attempt_answer.points_awarded
        max_points += question.points

    test_attempt.earned_points = earned_points
    test_attempt.max_points = max_points
    test_attempt.percentage = round(earned_points / max_points * 100,2)

    return test_attempt, result_answers


def build_test_result(
    test: ThemeTest,
    test_attempt: TestAttempt,
    current_user: User,
    new_badges,
    result_answers: list[TestQuestionResultRead],
) -> TestResultRead:

    test_result = TestResultRead(
        attempt_id=test_attempt.id,
        test_id=test.id,
        test_title=test.title,
        theme_id=test.theme_id,
        earned_points=test_attempt.earned_points,
        max_points=test_attempt.max_points,
        percentage=test_attempt.percentage,
        badge_earned=(
            test_attempt.percentage > test.badge_threshold_percent
        ),
        student_points=current_user.student.points,
        student_level=current_user.student.level,
        theme_completed=True,
        completed_at=test_attempt.submitted_at,
        new_badges=[
            BadgeRead.model_validate(badge)
            for badge in new_badges
        ],
        started_at=test_attempt.started_at,
        submitted_at=test_attempt.submitted_at,
        answers=result_answers,
    )
    return test_result

def check_test_editable(test: ThemeTest):
    if test.is_active:
        raise HTTPException(400, 'Cannot modify an active test')

    if test.attempts:
        raise HTTPException(400, 'Cannot modify a test with attempts')


def validate_answers(question_type: TestQuestionType, answers):
    order_indexes = [answer.order_index for answer in answers]

    if len(order_indexes) != len(set(order_indexes)):
        raise HTTPException(400, 'Answer order indexes must be unique')

    correct_answers_count = sum(answer.is_correct for answer in answers)

    if question_type == TestQuestionType.single_choice:
        if len(answers) < 2:
            raise HTTPException(400, 'Single choice questions require at least two answers')

        if correct_answers_count != 1:
            raise HTTPException(400, 'Single choice questions require exactly one correct answer')

    if question_type == TestQuestionType.short_answer:
        if len(answers) != 1:
            raise HTTPException(400, 'Short answer questions require exactly one answer')

        if correct_answers_count != 1:
            raise HTTPException(400, 'The short answer must be marked as correct')


def reorder_test_question(question: TestQuestion,new_order_index: int,session: Session) -> None:
    questions = sorted(question.test.questions,key=lambda item: item.order_index)

    if not 1 <= new_order_index <= len(questions):
        raise HTTPException(400,f'Question order index must be between 1 and {len(questions)}')

    questions.remove(question)
    questions.insert(new_order_index - 1, question)

    changed_questions = [
        (item, index)
        for index, item in enumerate(questions, start=1)
        if item.order_index != index
    ]

    if not changed_questions:
        return


    used_indexes = {item.order_index for item in questions}
    temporary_index = len(questions) + 1

    for item, _ in changed_questions:
        while temporary_index in used_indexes:
            temporary_index += 1

        item.order_index = temporary_index
        temporary_index += 1


    session.flush()

    for item, index in changed_questions:
        item.order_index = index