import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from .progress_schemas import BadgeRead

# ----------------------------
# TESTS
# ----------------------------

class TestQuestionType(str, Enum):
    single_choice = "single_choice"
    short_answer = "short_answer"


# ----------------------------
# ADMIN INPUT SCHEMAS
# ----------------------------

class ThemeTestCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=100,
    )
    theme_id: int
    badge_threshold_percent: int = Field(
        default=70,
        ge=0,
        le=100,
    )


class ThemeTestUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    badge_threshold_percent: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )


class TestQuestionAnswerCreate(BaseModel):
    answer: str = Field(
        min_length=1,
    )
    is_correct: bool = False
    order_index: int = Field(
        ge=1,
    )


class TestQuestionCreate(BaseModel):
    question: str = Field(
        min_length=1,
    )
    question_type: TestQuestionType
    points: int = Field(
        gt=0,
    )
    order_index: int = Field(
        ge=1,
    )
    answers: list[TestQuestionAnswerCreate] = Field(
        min_length=1,
    )


class TestQuestionUpdate(BaseModel):
    question: str | None = Field(
        default=None,
        min_length=1,
    )
    question_type: TestQuestionType | None = None
    points: int | None = Field(
        default=None,
        gt=0,
    )
    order_index: int | None = Field(
        default=None,
        ge=1,
    )
    answers: list[TestQuestionAnswerCreate] | None = None


# ----------------------------
# ADMIN RESPONSE SCHEMAS
# ----------------------------

class TestQuestionAnswerAdminRead(BaseModel):
    id: int
    answer: str
    is_correct: bool
    order_index: int

    model_config = ConfigDict(
        from_attributes=True,
    )


class TestQuestionAdminRead(BaseModel):
    id: int
    question: str
    question_type: TestQuestionType
    points: int
    order_index: int
    test_id: int
    answers: list[TestQuestionAnswerAdminRead] = Field(
        default_factory=list,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


class ThemeTestAdminRead(BaseModel):
    id: int
    title: str
    version: int
    theme_id: int
    is_active: bool
    badge_threshold_percent: int
    created_at: datetime
    questions: list[TestQuestionAdminRead] = Field(
        default_factory=list,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


# ----------------------------
# STUDENT TEST SCHEMAS
# ----------------------------

class TestAnswerOptionRead(BaseModel):
    id: int
    answer: str
    order_index: int

    model_config = ConfigDict(
        from_attributes=True,
    )


class TestQuestionStudentRead(BaseModel):
    id: int
    question: str
    question_type: TestQuestionType
    points: int
    order_index: int
    options: list[TestAnswerOptionRead] = Field(
        default_factory=list,
    )


class ThemeTestStudentRead(BaseModel):
    id: int
    title: str
    version: int
    theme_id: int
    badge_threshold_percent: int
    already_submitted: bool = False
    submitted_percentage: float | None = None
    badge_earned: bool = False
    questions: list[TestQuestionStudentRead] = Field(
        default_factory=list,
    )


class TestAttemptStartRead(BaseModel):
    attempt_id: int
    started_at: datetime
    test: ThemeTestStudentRead


# ----------------------------
# STUDENT SUBMISSION SCHEMAS
# ----------------------------

class TestQuestionSubmission(BaseModel):
    question_id: int
    selected_answer_id: int | None = None
    submitted_text: str | None = None


class TestSubmission(BaseModel):
    answers: list[TestQuestionSubmission] = Field(
        min_length=1,
    )


# ----------------------------
# RESULT SCHEMAS
# ----------------------------

class TestQuestionResultRead(BaseModel):
    question_id: int
    question: str
    order_index: int

    submitted_answer: str | None = None
    correct_answer: str

    is_correct: bool
    points_awarded: int
    possible_points: int


class TestResultRead(BaseModel):
    attempt_id: int
    test_id: int
    test_title: str
    theme_id: int

    earned_points: int
    max_points: int
    percentage: float
    badge_earned: bool
    student_points: int
    student_level: int
    theme_completed: bool
    completed_at: datetime | None = None
    new_badges: list[BadgeRead] = Field(default_factory=list)

    started_at: datetime
    submitted_at: datetime

    answers: list[TestQuestionResultRead] = Field(
        default_factory=list,
    )


# ----------------------------
# STUDENT HISTORY SCHEMAS
# ----------------------------

class TestHistoryItemRead(BaseModel):
    attempt_id: int
    test_id: int
    test_title: str
    theme_id: int

    earned_points: int
    max_points: int
    percentage: float
    badge_earned: bool

    started_at: datetime
    submitted_at: datetime


# ----------------------------
# TEACHER RESULT SCHEMAS
# ----------------------------

class TeacherStudentTestResultRead(BaseModel):
    attempt_id: int
    test_id: int
    test_title: str
    theme_id: int

    student_user_id: uuid.UUID
    student_email: EmailStr
    student_first_name: str | None = None
    student_last_name: str | None = None
    class_id: int

    earned_points: int
    max_points: int
    percentage: float
    badge_earned: bool
    submitted_at: datetime
