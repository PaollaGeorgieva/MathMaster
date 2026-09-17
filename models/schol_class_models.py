from __future__ import annotations
import datetime
import uuid
from typing import List



from sqlalchemy import String,DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base





class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("teachers.id"),
        index=True
    )

    name: Mapped[str] = mapped_column(String(30))
    class_code: Mapped[str] = mapped_column(
        String(10),
        unique=True,
        index=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    teacher: Mapped["TeacherProfile"] = relationship(
        "TeacherProfile",
        back_populates="classes"
    )
    students = relationship(
        "StudentProfile",
        back_populates="school_class"
    )

    problem_assignments: Mapped[List["ClassProblemAssignment"]] = relationship(
        back_populates="school_class",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )



class ClassProblemAssignment(Base):
    __tablename__ = "class_problem_assignments"

    problem_id: Mapped[int] = mapped_column(
        ForeignKey(
            "problems.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    class_id: Mapped[int] = mapped_column(
        ForeignKey(
            "classes.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    assigned_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    problem: Mapped["Problem"] = relationship(
        back_populates="class_assignments",
    )

    school_class: Mapped["SchoolClass"] = relationship(
        back_populates="problem_assignments",
    )
