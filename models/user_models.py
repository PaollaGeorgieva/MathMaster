from __future__ import annotations
import uuid
from typing import List



from sqlalchemy import String, Integer, Boolean,  ForeignKey

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    email: Mapped[str] = mapped_column(
        String(length=320), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(length=1024), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    role: Mapped[str] = mapped_column(String, default="student")

    student = relationship(
        "StudentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    teacher = relationship(
        "TeacherProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    level_associations: Mapped[List["UserLevelProgress"]] = relationship(
        back_populates="user"
    )
    problem_attempts: Mapped[List["UserProblemAttempt"]] = relationship(
        back_populates="user"
    )

    problem_progress_records: Mapped[List["UserProblemProgress"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    badge_associations: Mapped[List["UserBadge"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    created_problems: Mapped[List["Problem"]] = relationship(
        back_populates="creator"
    )

    test_attempts: Mapped[List["TestAttempt"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class StudentProfile(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id"), unique=True)
    class_id: Mapped[int | None] = mapped_column(
        ForeignKey("classes.id"),
        nullable=True
    )

    first_name: Mapped[str | None] = mapped_column(String(30), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(30), nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=1)
    points: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="student"
    )
    school_class: Mapped["SchoolClass"] = relationship(
        "SchoolClass",
        back_populates="students"
    )


class TeacherProfile(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id"), unique=True)

    first_name: Mapped[str | None] = mapped_column(String(30), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(30), nullable=True)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="teacher"
    )
    classes = relationship(
        "SchoolClass",
        back_populates="teacher",
        cascade="all, delete-orphan"
    )
