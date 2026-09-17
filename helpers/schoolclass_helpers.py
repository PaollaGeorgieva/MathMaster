
from typing import Annotated

from fastapi import  Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import User, StudentProfile, SchoolClass
from security import get_current_user

import random
import string

CurrentUser = Annotated[User, Depends(get_current_user)]



def generate_class_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def generate_unique_class_code(session: Session) -> str:
    for _ in range(10):
        class_code = generate_class_code()

        if get_class_by_code(class_code=class_code, session=session) is None:
            return class_code

    raise HTTPException(500, "Could not generate a unique class code")

def get_class_by_code(*, class_code: str, session: Session):
    school_class = session.query(SchoolClass).filter(SchoolClass.class_code == class_code).first()
    return school_class




def check_class_access(current_user: User, target_class: SchoolClass):
    if current_user.is_superuser:
        return

    if current_user.role == "student":
        if current_user.student is None or current_user.student.class_id != target_class.id:
            raise HTTPException(403, "You are not in this class")
        return

    if current_user.role == "teacher":
        if  target_class.teacher_id != current_user.teacher.id:
            raise HTTPException(403, "Not your class")
        return

    raise HTTPException(403, "Unauthorized")

def get_class_for_teacher(class_id: int, current_user: User, session:Session):
    if current_user.role != 'teacher':
        raise HTTPException(403, 'Only teachers have permission')

    school_class = session.get(SchoolClass, class_id)

    if not school_class:
        raise HTTPException(404, 'Class not found')

    if school_class.teacher_id != current_user.teacher.id:
        raise HTTPException(403, 'Not your class')

    return school_class



def get_student_for_teacher(student_id :int ,current_user:User, session: Session) -> StudentProfile:


    if current_user.role != "teacher" and not current_user.is_superuser:
        raise HTTPException(403, "Only teachers can view progress")

    student = session.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    if student.class_id is None:
        raise HTTPException(400, "Student is not in a class")

    if student.school_class.teacher_id != current_user.teacher.id:
        raise HTTPException(403, "Not your student")

    return student