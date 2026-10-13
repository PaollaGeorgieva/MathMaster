from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from helpers.delete_helpers import delete_theory_content
from helpers.level_helpers import require_level_unlocked, theory_to_read
from helpers.progress_helpers import recalculate_level_progress
from models import Level, Theory, User, Theme
from schemas import TheoryCreate, TheoryUpdate, TheoryRead, TheoryReadAdmin, Message
from security import get_current_user

theories_router = APIRouter(prefix="/theories", tags=["theories"])
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: User):
    if not user.is_superuser:
        raise HTTPException(403, "Only superusers can manage theories")


def get_theory_or_404(session: Session, theory_id: int) -> Theory:
    theory = session.get(Theory, theory_id)
    if theory is None:
        raise HTTPException(404, "Theory not found")
    return theory

def get_active_theory(session:Session, theory_id:int):
    theory = session.query(Theory).join(Theory.level).join(Level.theme).filter(
        Theory.id == theory_id,
        Theory.is_active.is_(True),
        Level.is_active.is_(True),
        Theme.is_active.is_(True)
    ).first()
    if theory is None:
        raise HTTPException(404, "Theory not found")

    return theory


@theories_router.get('/admin/all', response_model=list[TheoryReadAdmin])
def get_theories_admin(current_user: CurrentUser, level_id: int | None = None, session: Session = Depends(get_db)):
    require_admin(current_user)
    query = session.query(Theory)
    if level_id is not None:
        query = query.filter(Theory.level_id == level_id)
    return query.order_by(Theory.level_id, Theory.order_index, Theory.id).all()


@theories_router.post('/', response_model=TheoryReadAdmin)
def create_theory(data: TheoryCreate, current_user: CurrentUser, session: Session = Depends(get_db)):
    require_admin(current_user)
    level = session.get(Level, data.level_id)
    if level is None:
        raise HTTPException(404, "Level not found")
    theory = Theory(**data.model_dump())
    session.add(theory)
    session.commit()
    session.refresh(theory)
    return theory


@theories_router.get('/{theory_id}', response_model=TheoryRead)
def get_theory(theory_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    theory = get_active_theory(session, theory_id)
    require_level_unlocked(level=theory.level, user=current_user, session=session)
    return theory_to_read(theory, current_user)


@theories_router.patch('/{theory_id}', response_model=TheoryReadAdmin)
def update_theory(theory_id: int, data: TheoryUpdate, current_user: CurrentUser, session: Session = Depends(get_db)):
    require_admin(current_user)
    theory = get_theory_or_404(session, theory_id)
    for name, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(theory, name, value)
    session.commit()
    session.refresh(theory)
    return theory


@theories_router.patch('/{theory_id}/deactivate', response_model=Message)
def deactivate_theory(theory_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    require_admin(current_user)
    theory = get_theory_or_404(session, theory_id)
    theory.is_active = False
    level = theory.level

    if level.is_active and level.theme.is_active:
        recalculate_level_progress(session, level)

    session.commit()
    return Message(message="Theory deactivated successfully")


@theories_router.patch('/{theory_id}/activate', response_model=Message)
def activate_theory(theory_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    require_admin(current_user)
    theory = get_theory_or_404(session, theory_id)
    theory.is_active = True
    session.commit()
    return Message(message="Theory activated successfully")


@theories_router.delete('/{theory_id}/delete', response_model=Message)
def delete_theory(theory_id: int, current_user: CurrentUser, session: Session = Depends(get_db)):
    require_admin(current_user)
    theory = get_theory_or_404(session, theory_id)
    try:
        delete_theory_content(theory, session)
        session.commit()
    except Exception:
        session.rollback()
        raise


    return Message(message="Theory deleted successfully")
