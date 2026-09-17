import uuid
from enum import Enum

from pydantic import BaseModel, EmailStr, ConfigDict

from .school_class_schemas import SchoolClassRead

class StudentProfileRead(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    level: int
    points: int
    class_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


class TeacherProfileRead(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    classes: list[SchoolClassRead] = []

    model_config = ConfigDict(from_attributes=True)


class TeacherProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


class UserRole(str, Enum):
    teacher = "teacher"
    student = "student"


class MyUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.student


class UpdateUserEmail(BaseModel):
    current_password: str
    email: EmailStr


class UserPublic(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole

    student: StudentProfileRead | None = None
    teacher: TeacherProfileRead | None = None

    model_config = ConfigDict(from_attributes=True)

class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    is_active: bool
    is_superuser: bool
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)

class AdminUserDetailRead(AdminUserRead):
    student: StudentProfileRead | None = None
    teacher: TeacherProfileRead | None = None

    model_config = ConfigDict(from_attributes=True)


class UpdatePassword(BaseModel):
    current_password: str
    new_password: str
