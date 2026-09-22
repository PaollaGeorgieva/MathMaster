import uuid
from datetime import datetime
from .school_class_schemas import ClassProblemAssignmentRead

from pydantic import BaseModel, ConfigDict, Field

class ThemeCreate(BaseModel):
    title: str
    description: str
    order_index: int
    is_active: bool


class ThemeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    order_index: int | None = None


class ThemeRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    order_index: int
    is_active: bool
    is_unlocked: bool = False
    is_completed: bool = False
    total_levels: int = 0
    completed_levels: int = 0
    progress_percentage: int = 0
    has_active_test: bool = False
    test_submitted: bool = False
    test_percentage: float | None = None
    levels: list['LevelRead'] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ThemeReadAdmin(BaseModel):
    id: int
    title: str
    description: str
    order_index: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)



class LevelCreate(BaseModel):
    title: str
    description: str
    order_index: int
    theme_id: int


class LevelUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class ExampleProblemRead(BaseModel):
    id: int
    question: str
    solution: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class ExampleProblemReadAdmin(BaseModel):
    id: int
    question: str
    solution: str
    order_index: int
    theory_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ExampleProblemCreate(BaseModel):
    question: str
    solution: str
    order_index: int
    theory_id: int = Field(gt=0)

class ExampleProblemUpdate(BaseModel):
    question: str | None = None
    solution: str | None = None
    order_index: int | None = None


class TheoryCreate(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    order_index: int = Field(ge=1)
    level_id: int = Field(gt=0)


class TheoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    content: str | None = Field(default=None, min_length=1)
    order_index: int | None = Field(default=None, ge=1)


class TheoryRead(BaseModel):
    id: int
    title: str
    content: str
    order_index: int
    level_id: int
    example_problems: list[ExampleProblemRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TheoryReadAdmin(BaseModel):
    id: int
    title: str
    content: str
    order_index: int
    level_id: int
    is_active: bool
    example_problems: list[ExampleProblemReadAdmin] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)




class ProblemCreate(BaseModel):
    question: str
    correct_answer: str
    explanation: str
    order_index: int
    level_id: int
    max_attempts: int
    hint: str | None = None
    class_ids: list[int] = Field(default_factory=list)


class ProblemUpdate(BaseModel):
    question: str | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    order_index: int | None = None
    max_attempts: int | None = None
    hint: str | None = None


class ProblemReadStudent(BaseModel):
    id: int
    question: str
    order_index: int
    max_attempts: int

    model_config = ConfigDict(from_attributes=True)


class ProblemReadAdmin(BaseModel):
    id: int
    question: str
    correct_answer: str
    explanation: str
    order_index: int
    max_attempts: int
    hint: str | None = None
    level_id: int
    is_active: bool
    created_by_id: uuid.UUID | None = None
    is_official: bool
    class_assignments: list[ClassProblemAssignmentRead] = Field(
        default_factory=list
    )

    model_config = ConfigDict(from_attributes=True)


class ProblemHint(BaseModel):
    hint: str | None = None
    used_hint: bool = False





class LevelRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    order_index: int
    is_active: bool = True
    theme_id: int
    theories: list[TheoryRead] = Field(default_factory=list)
    problems: list['ProblemReadStudent'] = Field(default_factory=list)
    is_unlocked: bool = False
    is_completed: bool = False
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class LevelReadAdmin(BaseModel):
    id: int
    title: str
    description: str
    theories: list[TheoryReadAdmin] = Field(default_factory=list)
    order_index: int
    is_active: bool
    theme_id: int

    model_config = ConfigDict(from_attributes=True)

