from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .progress_schemas import BadgeRead, ReadUserProblemAttempt

class SchoolClassCreate(BaseModel):
    name: str

class SchoolClassUpdate(BaseModel):
    name: str


class SchoolClassRead(BaseModel):
    id: int
    name: str
    class_code: str

    model_config = ConfigDict(from_attributes=True)


class JoinSchoolClass(BaseModel):
    class_code: str




class ClassProblemAssignmentRead(BaseModel):
    class_id: int
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassProblemAssignmentCreate(BaseModel):
    class_ids: list[int]




class StudentInClass(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    level: int
    points: int

    model_config = ConfigDict(from_attributes=True)


class StudentProgress(BaseModel):
    level: int
    points: int
    solved_problems: int
    rank: str
    points_for_next_level: int
    level_progress_percentage: int
    hints_used: int
    tests_completed: int
    badges: list[BadgeRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class StudentThemeProgress(BaseModel):
    theme_id: int
    title: str
    solved_problems: int
    total_problems: int
    is_completed: bool


class StudentProblemAttemptsRead(BaseModel):
    student_id: int
    problem_id: int
    question: str
    correct_answer: str
    explanation: str
    attempts: list[ReadUserProblemAttempt] = Field(
        default_factory=list
    )


class ClassThemeStatistics(BaseModel):
    class_id: int
    theme_id: int
    theme_title: str
    total_students: int
    started_students: int
    completed_students: int
    average_test_percentage: float
    success_rate: float
    average_attempts_per_problem: float


class ClassProblemStatistics(BaseModel):
    class_id: int
    problem_id: int
    attempted_students: int
    solved_students: int
    success_rate: float
    average_attempts: float



