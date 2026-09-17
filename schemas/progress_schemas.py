from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field



class BadgeRead(BaseModel):
    code: str
    awarded_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ReadLevelProgress(BaseModel):
    level_id: int
    is_unlocked: bool
    is_completed: bool
    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SubmitAnswer(BaseModel):
    submitted_answer: str


class AttemptResult(BaseModel):
    is_correct: bool
    attempt_number: int
    remaining_attempts: int
    explanation: str | None = None
    correct_answer: str | None = None
    base_points: int = 0
    bonus_points: int = 0
    points_awarded: int = 0
    used_hint: bool = False
    student_points: int
    student_level: int
    new_badges: list[BadgeRead] = Field(default_factory=list)


class ReadUserProblemAttempt(BaseModel):
    problem_id: int
    submitted_answer: str
    is_correct: bool
    attempt_number: int
    used_hint: bool = False
    points_awarded: int = 0
    submitted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProblemHistoryRead(BaseModel):
    problem_id: int
    question: str
    level_id: int

    is_solved: bool
    attempts_used: int
    max_attempts: int
    hint_used: bool = False
    points_awarded: int = 0

    correct_answer: str | None = None
    explanation: str | None = None

    attempts: list[ReadUserProblemAttempt] = Field(
        default_factory=list
    )


class ProblemResultRead(BaseModel):
    already_solved: bool
    correct_answer: str | None = None
    remaining_attempts: int
    attempts_exhausted: bool
    explanation: str | None = None
    used_hint: bool = False
    points_awarded: int = 0


class LevelProgressSummary(BaseModel):
    level_id: int
    solved_problems: int
    total_problems: int
    percentage: int
    is_completed: bool
