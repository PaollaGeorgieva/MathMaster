from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.orm import Session


import crud
import security

from config import settings

from database import get_db
from models import User

from schemas import UserPublic, MyUserCreate, Token
from schemas.user_schemas import AdminUserCreate, AdminUserRead

auth_router = APIRouter(prefix="/auth", tags=["auth"])
CurrentUser = Annotated[User, Depends(security.get_current_user)]


@auth_router.post('/', response_model=UserPublic)
def create_user(user_in:MyUserCreate, session:Session=Depends(get_db)):
    user=crud.get_user_by_email(email=user_in.email, session=session)

    if user:
        raise HTTPException(status_code=400, detail="The user with this email already exists in the system")

    user = crud.create_user(user_in=user_in, session=session)
    return user
@auth_router.post('/admin', response_model=AdminUserRead)
def create_user_by_admin(user: CurrentUser, user_in: AdminUserCreate, session:Session=Depends(get_db)):
    if not user.is_superuser:
        raise HTTPException(403, 'Only admin has access')
    user = crud.get_user_by_email(email=user_in.email, session=session)

    if user:
        raise HTTPException(status_code=400, detail="The user with this email already exists in the system")

    user = crud.create_user(user_in=user_in, session=session)
    return user




@auth_router.post("/token")
def login_access_token(
     form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session:Session=Depends(get_db)
) -> Token:

    user = crud.authenticate_user(email=form_data.username, password=form_data.password,session=session)

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = security.create_access_token(
        {"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    return Token(
        access_token=access_token,
        token_type="bearer"
    )


