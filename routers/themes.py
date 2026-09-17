
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from helpers.level_helpers import (
    build_level_access_map,
    get_active_levels,
    theme_to_read,
)
from models import User, Theme
from schemas import ThemeRead, ThemeCreate, ThemeUpdate, Message, ThemeReadAdmin
from security import get_current_user


themes_router = APIRouter(prefix="/themes", tags=["themes"])
CurrentUser = Annotated[User, Depends(get_current_user)]


@themes_router.get("/", response_model=list[ThemeRead])
def get_themes(current_user: CurrentUser,session: Session = Depends(get_db)):
    themes = session.query(Theme).filter(Theme.is_active.is_(True)).order_by(
            Theme.order_index.asc(),
            Theme.id.asc(),
        ).all()

    levels = get_active_levels(session)
    access_map = build_level_access_map(levels=levels,user=current_user,session=session)

    return [
        theme_to_read(
            theme=theme,
            access_map=access_map,
            user=current_user,
            session=session,
        )
        for theme in themes
    ]



@themes_router.get("/admin/all", response_model=list[ThemeReadAdmin])
def get_themes_admin(current_user: CurrentUser,session: Session = Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'No permission')

    themes = session.query(Theme).order_by(
            Theme.order_index.asc(),
            Theme.id.asc(),
        ).all()




    return themes



@themes_router.post("/", response_model=ThemeRead)
def create_theme(*, current_user: CurrentUser, data: ThemeCreate,session: Session = Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'Only superusers can add themes')


    theme_obj = Theme(**data.model_dump())

    session.add(theme_obj)
    session.commit()
    session.refresh(theme_obj)
    return theme_obj


@themes_router.patch("/{theme_id}", response_model=ThemeRead)
def update_theme(*, theme_id: int, current_user:CurrentUser, data: ThemeUpdate, session: Session=Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'Only superusers can update themes')

    theme = session.get(Theme, theme_id)

    if not theme:
        raise HTTPException(404, "Theme not found")

    updates = data.model_dump(exclude_unset=True, exclude_none=True)

    for field_name, new_value in updates.items():
        setattr(theme, field_name, new_value)

    session.commit()
    session.refresh(theme)

    return theme


@themes_router.patch("/{theme_id}/deactivate", response_model=Message)
def deactivate_theme(current_user: CurrentUser ,theme_id:int, session: Session = Depends(get_db) ):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only superusers can deactivate themes")

    theme = session.get(Theme, theme_id)

    if not theme:
        raise HTTPException(404, "Theme not found")


    theme.is_active = False

    session.commit()

    return  Message(message="Theme deactivated successfully")


@themes_router.patch("/{theme_id}/activate", response_model=Message)
def activate_theme(current_user: CurrentUser ,theme_id:int, session: Session = Depends(get_db) ):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only superusers can activate themes")

    theme = session.get(Theme, theme_id)

    if not theme:
        raise HTTPException(404, "Theme not found")


    theme.is_active = True

    session.commit()

    return  Message(message="Theme activated successfully")
