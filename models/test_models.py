
from __future__ import annotations
import datetime
import uuid




from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, text, \
    Index, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base


class ThemeTest(Base):
    __tablename__ = "theme_tests"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    badge_threshold_percent: Mapped[int] = mapped_column(
        Integer,
        default=70,
        nullable=False,
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    theme_id: Mapped[int] = mapped_column(
        ForeignKey(
            "themes.id",
            ondelete="RESTRICT",
        ),
        index=True,
        nullable=False,
    )

    theme: Mapped["Theme"] = relationship(
        back_populates="theme_tests",
    )

    questions: Mapped[list[TestQuestion]] = relationship(
        back_populates="test",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by=lambda: TestQuestion.order_index,
    )

    attempts: Mapped[list[TestAttempt]] = relationship(
        back_populates="test",
    )

    __table_args__ = (
        UniqueConstraint(
            "theme_id",
            "version",
            name="uq_theme_test_version",
        ),
        CheckConstraint(
            "badge_threshold_percent BETWEEN 0 AND 100",
            name="ck_theme_test_badge_threshold",
        ),
        Index(
            "uq_active_theme_test",
            "theme_id",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    question_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    test_id: Mapped[int] = mapped_column(
        ForeignKey(
            "theme_tests.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    test: Mapped[ThemeTest] = relationship(
        back_populates="questions",
    )

    answers: Mapped[list[TestQuestionAnswer]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by=lambda: TestQuestionAnswer.order_index,
    )

    attempt_answers: Mapped[list[TestAttemptAnswer]] = relationship(
        back_populates="question",
    )

    __table_args__ = (
        UniqueConstraint(
            "test_id",
            "order_index",
            name="uq_test_question_order",
        ),
        CheckConstraint(
            "question_type IN ('single_choice', 'short_answer')",
            name="ck_test_question_type",
        ),
        CheckConstraint(
            "points > 0",
            name="ck_test_question_points",
        ),
    )


class TestQuestionAnswer(Base):
    __tablename__ = "test_question_answers"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    answer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey(
            "test_questions.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    question: Mapped[TestQuestion] = relationship(
        back_populates="answers",
    )

    attempt_answers: Mapped[list[TestAttemptAnswer]] = relationship(
        back_populates="selected_answer",
    )

    __table_args__ = (
        UniqueConstraint(
            "question_id",
            "order_index",
            name="uq_test_answer_order",
        ),
    )


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    submitted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    earned_points: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    max_points: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    percentage: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    test_id: Mapped[int] = mapped_column(
        ForeignKey(
            "theme_tests.id",
            ondelete="RESTRICT",
        ),
        index=True,
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "user.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    test: Mapped[ThemeTest] = relationship(
        back_populates="attempts",
    )

    user: Mapped["User"] = relationship(
        back_populates="test_attempts",
    )

    answers: Mapped[list[TestAttemptAnswer]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "test_id",
            "user_id",
            name="uq_test_attempt_user",
        ),
        CheckConstraint(
            (
                "percentage IS NULL OR "
                "(percentage >= 0 AND percentage <= 100)"
            ),
            name="ck_test_attempt_percentage",
        ),
    )


class TestAttemptAnswer(Base):
    __tablename__ = "test_attempt_answers"

    attempt_id: Mapped[int] = mapped_column(
        ForeignKey(
            "test_attempts.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey(
            "test_questions.id",
            ondelete="RESTRICT",
        ),
        primary_key=True,
    )

    selected_answer_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "test_question_answers.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
    )

    submitted_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    points_awarded: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    attempt: Mapped[TestAttempt] = relationship(
        back_populates="answers",
    )

    question: Mapped[TestQuestion] = relationship(
        back_populates="attempt_answers",
    )

    selected_answer: Mapped[TestQuestionAnswer | None] = relationship(
        back_populates="attempt_answers",
    )

    __table_args__ = (
        CheckConstraint(
            "points_awarded >= 0",
            name="ck_test_attempt_answer_points",
        ),
    )