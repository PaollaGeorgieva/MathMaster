import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from helpers.gamification_helpers import (
    get_level_progress_percentage,
    get_points_to_next_level,
    get_student_rank,
)
from models import User, UserProblemAttempt, UserLevelProgress, Problem, StudentProfile, TestAttempt, UserBadge, \
    UserProblemProgress
from schemas import UserPublic, Message, UpdateUserEmail, UpdatePassword, StudentProfileRead, TeacherProfileRead, \
    StudentProfileUpdate, TeacherProfileUpdate, StudentProgress, AdminUserRead, UserRole, AdminUserDetailRead, BadgeRead
from security import get_current_user, verify_password, get_password_hash
from crud import get_user_by_email

# SessionDep = Annotated[Session, Depends(get_db)]

users_router = APIRouter(prefix="/users", tags=["users"])
CurrentUser = Annotated[User, Depends(get_current_user)]



@users_router.get("/me", response_model=UserPublic)
def get_user_me( current_user:CurrentUser):
    return current_user

@users_router.get("/me/progress", response_model=StudentProgress)
def get_progress_me(current_user:CurrentUser, session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students have progress")

    solved_problems = session.query(UserProblemAttempt.problem_id).filter(
        UserProblemAttempt.user_id == current_user.id,
        UserProblemAttempt.is_correct.is_(True),
    ).distinct().count()

    hints_used = session.query(UserProblemProgress).filter(
        UserProblemProgress.user_id == current_user.id,
        UserProblemProgress.hint_used.is_(True),
    ).count()

    tests_completed = session.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.submitted_at.is_not(None),
    ).count()

    earned_badges = session.query(UserBadge).filter(
        UserBadge.user_id == current_user.id,
    ).order_by(UserBadge.awarded_at.desc()).all()

    badges = [BadgeRead.model_validate(badge) for badge in earned_badges]

    student = current_user.student

    result = StudentProgress(
        level=student.level,
        points=student.points,
        solved_problems=solved_problems,
        rank=get_student_rank(student.level),
        points_for_next_level=get_points_to_next_level(student.points),
        level_progress_percentage=get_level_progress_percentage(student.points),
        hints_used=hints_used,
        tests_completed=tests_completed,
        badges=badges,
    )

    return result

@users_router.patch("/me",response_model=StudentProfileRead | TeacherProfileRead)
def update_profile_me(*,session: Session = Depends(get_db), current_user: CurrentUser, profile_in: StudentProfileUpdate | TeacherProfileUpdate):
    if current_user.role == "student":
        profile = current_user.student
    elif current_user.role == "teacher":
        profile = current_user.teacher
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    session.commit()
    session.refresh(profile)

    return profile


@users_router.patch("/me/email", response_model=UserPublic)
def update_user_email_me(*, session:Session=Depends(get_db), user_in:UpdateUserEmail, current_user:CurrentUser):

    existing_user = get_user_by_email(email=user_in.email, session=session)
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    if user_in.email == current_user.email:
        raise HTTPException(status_code=400, detail="You are using the same email")

    if not verify_password(user_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    current_user.email = user_in.email

    session.commit()

    session.refresh(current_user)

    return current_user



@users_router.patch("/me/password", response_model=Message)
def update_password_me(*, session:Session=Depends(get_db), body: UpdatePassword, current_user:CurrentUser):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    if verify_password(body.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400,detail="New password cannot be the same as the current one")

    new_hashed_password = get_password_hash(body.new_password)

    current_user.hashed_password = new_hashed_password

    session.commit()

    return Message(message="Password updated successfully")

# soft delete
@users_router.delete("/me", response_model=Message)
def delete_user_me(*,session:Session=Depends(get_db), current_user:CurrentUser):
    if current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super users are not allowed to delete themselves")

    current_user.is_active = False

    session.commit()

    return Message(message="User deleted successfully")


@users_router.get(
    "/admin",
    response_model=list[AdminUserRead],
)
def get_users(current_user: CurrentUser,
    role: UserRole | None = None,
    is_active: bool | None = None,
    email: str | None = None,
    session: Session = Depends(get_db),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403,detail="Admin access required")

    query = session.query(User)

    if role is not None:
        query = query.filter(User.role == role.value)

    if is_active is not None:
        query = query.filter(User.is_active.is_(is_active))

    if email:
        email_search = email.strip()

        if email_search:
            query = query.filter(User.email.ilike(f"%{email_search}%"))

    return query.order_by(User.email.asc()).all()


@users_router.get("/admin/{user_id}",response_model=AdminUserDetailRead)
def get_user_details_admin(user_id: uuid.UUID,current_user: CurrentUser,session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403,detail="Admin access required")

    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404,detail="User not found")

    return user


@users_router.patch("/admin/{user_id}/activate",response_model=AdminUserRead)
def activate_user(user_id: uuid.UUID,current_user: CurrentUser,session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True

    session.commit()
    session.refresh(user)

    return user


@users_router.delete("/admin/{user_id}", response_model=Message)
def delete_user(user_id: uuid.UUID, current_user: CurrentUser, session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, "Admin access required")

    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(404, "User not found")

    if user.id == current_user.id:
        raise HTTPException(403, "Superusers cannot delete themselves")

    session.query(UserProblemAttempt).filter(
        UserProblemAttempt.user == user
    ).delete(synchronize_session=False)

    session.query(UserLevelProgress).filter(
        UserLevelProgress.user == user
    ).delete(synchronize_session=False)

    session.query(Problem).filter(Problem.creator == user).update(
        {Problem.created_by_id: None},
        synchronize_session=False,
    )

    if user.teacher:
        class_ids = [school_class.id for school_class in user.teacher.classes]

        if class_ids:
            session.query(StudentProfile).filter(
                StudentProfile.class_id.in_(class_ids)
            ).update(
                {StudentProfile.class_id: None},
                synchronize_session=False,
            )

    session.delete(user)
    session.commit()

    return Message(message="User permanently deleted successfully")