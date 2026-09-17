from pydantic import EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session


from models import User, StudentProfile, TeacherProfile, Level, UserLevelProgress, Theme
from security import get_password_hash, verify_password
from schemas import MyUserCreate, UserPublic


def create_user(*, user_in: MyUserCreate, session: Session):
    user = User(**user_in.model_dump(exclude={'password'}),hashed_password=get_password_hash(user_in.password))
    if user.role == "student":
        user.student = StudentProfile()

    elif user.role == "teacher":
        user.teacher = TeacherProfile()

    session.add(user)
    session.commit()
    session.refresh(user)

    if user.role == "student":
        first_level = session.query(Level).join(Level.theme).filter(
                Theme.is_active.is_(True),
                Level.is_active.is_(True),
            ).order_by(
                Theme.order_index.asc(),
                Theme.id.asc(),
                Level.order_index.asc(),
                Level.id.asc(),
            ).first()

        if first_level is not None:
            first_progress = UserLevelProgress(
                user_id=user.id,
                level_id=first_level.id,
                is_unlocked=True,
                is_completed=False,
            )
            session.add(first_progress)
            session.commit()

    return user




def get_user_by_email(*, email:str, session:Session) -> User  | None:
    user = session.query(User).filter(User.email==email).first()
    return user



def authenticate_user(email:str, password:str, session:Session)-> User  | None:
    user = get_user_by_email(email=email, session=session)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None

    return user



