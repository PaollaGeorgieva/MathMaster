from __future__ import annotations
import uuid
from typing import List



from sqlalchemy import String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base




class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    levels: Mapped[List["Level"]] = relationship(
        back_populates="theme"
    )
    theme_tests: Mapped[List["ThemeTest"]] = relationship(
        back_populates="theme",
    )



class Level(Base):
    __tablename__ = "levels"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    theme_id: Mapped[int] = mapped_column(ForeignKey("themes.id"))

    theme: Mapped["Theme"] = relationship(
        back_populates="levels"
    )



    theories: Mapped[List["Theory"]] = relationship(
        back_populates="level",
        order_by="Theory.order_index",
    )

    problems: Mapped[List["Problem"]] = relationship(
        back_populates="level"
    )
    user_associations: Mapped[List["UserLevelProgress"]] = relationship(
        back_populates="level"
    )



class Theory(Base):
    __tablename__ = "theory"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    level_id: Mapped[int] = mapped_column(ForeignKey("levels.id"))
    level: Mapped["Level"] = relationship(
        back_populates="theories"
    )

    example_problems: Mapped[List["ExampleProblem"]] = relationship(
        back_populates="theory",
        order_by="ExampleProblem.order_index",
    )


class ExampleProblem(Base):
    __tablename__ = "examples"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    solution: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    theory_id: Mapped[int] = mapped_column(ForeignKey("theory.id"),  nullable=True)

    theory: Mapped["Theory"] = relationship(
        back_populates="example_problems",
    )


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    correct_answer: Mapped[str] = mapped_column(String(30))
    explanation: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False)

    level_id: Mapped[int] = mapped_column(ForeignKey("levels.id"))

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.id"),
        nullable=True,
        index=True,
    )

    level: Mapped["Level"] = relationship(
        back_populates="problems"
    )

    creator: Mapped["User | None"] = relationship(
        back_populates="created_problems"
    )

    user_attempts: Mapped[List["UserProblemAttempt"]] = relationship(
        back_populates="problem"
    )

    user_progress_records: Mapped[List["UserProblemProgress"]] = relationship(
        back_populates="problem",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    class_assignments: Mapped[List["ClassProblemAssignment"]] = relationship(
        back_populates="problem",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

