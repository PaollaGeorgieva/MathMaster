
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from helpers.level_helpers import (
    build_level_access_map,
    get_active_levels,
    level_to_read,
    require_level_unlocked,
)
from models import User, Level, UserLevelProgress,  Theme
from helpers.progress_helpers import get_official_problem_progress_query
from schemas import ReadLevelProgress, LevelRead, LevelProgressSummary, LevelCreate, LevelUpdate, Message, \
    LevelReadAdmin
from security import get_current_user


levels_router = APIRouter(prefix="/levels", tags=["levels"])
CurrentUser = Annotated[User, Depends(get_current_user)]


@levels_router.get("/", response_model=list[LevelRead])
def get_levels(current_user: CurrentUser,session: Session = Depends(get_db)):
    levels = get_active_levels(session)
    access_map = build_level_access_map(levels=levels,user=current_user,session=session)

    if current_user.is_superuser or current_user.role == "teacher":
        visible_levels = levels
    else:
        unlocked_theme_ids = {level.theme_id for level in levels if access_map[level.id].is_unlocked}
        visible_levels = [level for level in levels if level.theme_id in unlocked_theme_ids]

    return [
        level_to_read(
            level=level,
            access=access_map[level.id],
            user=current_user,
        )
        for level in visible_levels
    ]

@levels_router.get("/admin/all", response_model=list[LevelReadAdmin])
def get_levels_admin(current_user: CurrentUser,theme_id: int | None = None,session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, 'No permission')

    query = session.query(Level)

    if theme_id is not None:
        query = query.filter(Level.theme_id == theme_id)

    levels = query.order_by(
        Level.theme_id.asc(),
        Level.order_index.asc(),
        Level.id.asc(),
    ).all()

    response = [LevelReadAdmin.model_validate(level) for level in levels]

    return response


@levels_router.get("/{level_id}", response_model=LevelRead)
def get_level(level_id: int,current_user: CurrentUser, session: Session = Depends(get_db)):
    level = session.get(Level, level_id)

    if not level or not level.is_active or not level.theme.is_active:
        raise HTTPException(404, "Level not found")

    levels = get_active_levels(session)
    access_map = build_level_access_map(levels=levels,user=current_user,session=session)

    return level_to_read(level=level,access=access_map[level.id],user=current_user)

@levels_router.get("/{level_id}/progress", response_model=ReadLevelProgress)
def get_level_progress(current_user: CurrentUser,level_id: int,session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students have progress")

    level = session.get(Level, level_id)
    if not level or not level.is_active:
        raise HTTPException(404, "Level not found")

    require_level_unlocked(level=level, user=current_user,session=session)

    progress = session.query(UserLevelProgress).filter_by(user_id=current_user.id,level_id=level_id).first()

    return progress



@levels_router.get("/{level_id}/summary", response_model=LevelProgressSummary)
def get_level_summary(current_user: CurrentUser, level_id: int, session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students have progress")

    level = session.get(Level, level_id)
    if not level or not level.is_active:
        raise HTTPException(404, "Level not found")

    require_level_unlocked(level=level, user=current_user, session=session)

    progress = session.query(UserLevelProgress).filter_by(user_id=current_user.id, level_id=level_id).first()
    active_problem_ids, solved_query =  get_official_problem_progress_query(level=level, user_id=current_user.id, session=session)

    solved = solved_query.count() if active_problem_ids else 0
    total = len(active_problem_ids)
    percentage = int(solved / total * 100) if total else 0

    return LevelProgressSummary(
        level_id=level_id,
        solved_problems=solved,
        total_problems=total,
        percentage=percentage,
        is_completed=progress.is_completed,
    )


@levels_router.get("/{level_id}/solved-problems", response_model=list[int])
def get_student_solved_problems(current_user: CurrentUser, level_id: int, session: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(403, "Only students have progress")

    level = session.get(Level, level_id)
    if not level or not level.is_active:
        raise HTTPException(404, "Level not found")

    require_level_unlocked(level=level, user=current_user, session=session)

    active_problem_ids, solved_query = get_official_problem_progress_query(level=level, user_id=current_user.id, session=session)

    if not active_problem_ids:
        return []

    solved = solved_query.all()
    return [row.problem_id for row in solved]





@levels_router.post("/", response_model=LevelRead)
def create_level(*, current_user: CurrentUser, data: LevelCreate,session: Session = Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'Only superusers can add levels')

    theme = session.get(Theme, data.theme_id)

    if not theme:
        raise HTTPException(404, "Theme not found")


    level_obj = Level(**data.model_dump())

    session.add(level_obj)
    session.commit()
    session.refresh(level_obj)
    return level_obj


@levels_router.patch("/{level_id}", response_model=LevelRead)
def update_level(*, level_id: int, current_user:CurrentUser, data: LevelUpdate, session: Session=Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'Only superusers can update levels')

    level = session.get(Level, level_id)

    if not level:
        raise HTTPException(404, "Level not found")

    updates = data.model_dump(exclude_unset=True, exclude_none=True)

    for field_name, new_value in updates.items():
        setattr(level, field_name, new_value)

    session.commit()
    session.refresh(level)

    return level


@levels_router.patch("/{level_id}/deactivate", response_model=Message)
def deactivate_level(*, level_id: int, current_user:CurrentUser, session: Session=Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'Only superusers can update levels')

    level = session.get(Level, level_id)

    if not level:
        raise HTTPException(404, "Level not found")

    level.is_active = False

    session.commit()

    return Message(message="Level deactivated successfully")



@levels_router.patch("/{level_id}/activate", response_model=Message)
def activate_level(*, level_id: int, current_user:CurrentUser, session: Session=Depends(get_db)):

    if not current_user.is_superuser:
        raise HTTPException(403, 'Only superusers can update levels')

    level = session.get(Level, level_id)

    if not level:
        raise HTTPException(404, "Level not found")

    level.is_active = True

    session.commit()

    return Message(message="Level activated successfully")
