"""
 --- > Used SQLAlchemyBaseUserTableUUID class from fastapi_user.db
 --- > Add Profile Model with first_name, last_name, profile_picture


"""
from __future__ import annotations
import datetime
import uuid




from sqlalchemy import String, Integer, Boolean,DateTime, ForeignKey, CheckConstraint, UniqueConstraint, text,Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base










class UserLevelProgress(Base):
    __tablename__ = "user_level_progress"

    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id"),
        primary_key=True
    )
    level_id: Mapped[int] = mapped_column(
        ForeignKey("levels.id"),
        primary_key=True
    )

    user: Mapped["User"] = relationship(
        back_populates="level_associations"
    )
    level: Mapped["Level"] = relationship(
        back_populates="user_associations"
    )

class UserProblemProgress(Base):
    __tablename__ = "user_problem_progress"

    hint_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    hint_used_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    solved_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    points_awarded: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "user.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    problem_id: Mapped[int] = mapped_column(
        ForeignKey(
            "problems.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    user: Mapped["User"] = relationship(
        back_populates="problem_progress_records",
    )

    problem: Mapped["Problem"] = relationship(
        back_populates="user_progress_records",
    )

    __table_args__ = (
        CheckConstraint(
            "points_awarded >= 0",
            name="ck_user_problem_progress_points",
        ),
    )


class UserProblemAttempt(Base):
    __tablename__ = "user_problem_attempt"

    id: Mapped[int] = mapped_column(primary_key=True)
    submitted_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    submitted_answer: Mapped[str] = mapped_column(String)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    attempt_number: Mapped[int] = mapped_column(Integer)
    used_hint: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    points_awarded: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id"))
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id"))

    user: Mapped["User"] = relationship(
        back_populates="problem_attempts"
    )
    problem: Mapped["Problem"] = relationship(
        back_populates="user_attempts"
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "problem_id",
            "attempt_number",
            name="uq_problem_attempt_number",
        ),
        CheckConstraint(
            "points_awarded >= 0",
            name="ck_problem_attempt_points_awarded",
        ),
        Index(
            "uq_scored_problem_attempt",
            "user_id",
            "problem_id",
            unique=True,
            postgresql_where=text("points_awarded > 0"),
        ),
    )


class UserBadge(Base):
    __tablename__ = "user_badges"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "user.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    code: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
    )
    awarded_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    user: Mapped["User"] = relationship(
        back_populates="badge_associations",
    )

    __table_args__ = (
        CheckConstraint(
            "code IN ('first_problem', 'no_hint_problem', 'first_level', 'test_star')",
            name="ck_user_badges_code",
        ),
    )



