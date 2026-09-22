from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from helpers.level_helpers import require_level_unlocked
from models import User, Level, Theory, ExampleProblem, Theme
from schemas import ExampleProblemRead, ExampleProblemCreate, ExampleProblemUpdate, Message, ExampleProblemReadAdmin
from security import get_current_user

example_router = APIRouter(prefix="/example_problems", tags=["example_problems"])
CurrentUser = Annotated[User, Depends(get_current_user)]





@example_router.post("/", response_model=ExampleProblemReadAdmin)
def create_example(*, current_user: CurrentUser, data: ExampleProblemCreate, session: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only superusers can add problems")

    theory = session.get(Theory, data.theory_id)

    if not theory or not theory.is_active or not theory.level.is_active or not theory.level.theme.is_active:
        raise HTTPException(404, "Theory not found")

    example_obj = ExampleProblem(**data.model_dump())

    session.add(example_obj)
    session.commit()
    session.refresh(example_obj)
    return example_obj


@example_router.get("/{example_id}", response_model=ExampleProblemRead)
def get_example(
    current_user: CurrentUser,
    example_id: int,
    session: Session = Depends(get_db),
):
    example = session.query(ExampleProblem).join(ExampleProblem.theory).join(Theory.level).join(Level.theme).filter(
        ExampleProblem.id == example_id,
        ExampleProblem.is_active.is_(True),
        Theory.is_active.is_(True),
        Level.is_active.is_(True),
        Theme.is_active.is_(True),
    ).first()

    if not example:
        raise HTTPException(404, "Example not found")

    require_level_unlocked(
        level=example.theory.level,
        user=current_user,
        session=session,
    )

    return example


@example_router.patch("/{example_id}", response_model=ExampleProblemReadAdmin)
def update_example(current_user: CurrentUser ,example_id, data: ExampleProblemUpdate, session: Session = Depends(get_db) ):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only superusers can update problems")

    example = session.get(ExampleProblem, example_id)

    if not example:
        raise HTTPException(404, "Example not found")

    updates = data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    for field_name, new_value in updates.items():
        setattr(example, field_name, new_value)

    session.commit()
    session.refresh(example)

    return example




@example_router.patch("/{example_id}/deactivate", response_model=Message)
def deactivate_example(current_user: CurrentUser ,example_id:int, session: Session = Depends(get_db) ):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only superusers can deactivate examples")

    example = session.get(ExampleProblem, example_id)

    if not example:
        raise HTTPException(404, "Example not found")


    example.is_active = False

    session.commit()

    return  Message(message="Example deactivated successfully")



@example_router.patch("/{example_id}/activate", response_model=Message)
def activate_example(current_user: CurrentUser ,example_id:int, session: Session = Depends(get_db) ):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only superusers can activate examples")

    example = session.get(ExampleProblem, example_id)

    if not example:
        raise HTTPException(404, "Example not found")


    example.is_active = True

    session.commit()

    return  Message(message="Example activated successfully")



@example_router.get(
    "/admin/all",
    response_model=list[ExampleProblemReadAdmin],
)
def get_examples_admin(
    current_user: CurrentUser,
    level_id: int | None = None,
    theory_id: int | None = None,
    session: Session = Depends(get_db),
):
    if not current_user.is_superuser:
        raise HTTPException(
            403,
            "Only superusers can view all example problems",
        )

    query = session.query(ExampleProblem).join(ExampleProblem.theory)

    if level_id is not None:
        query = query.filter(Theory.level_id == level_id)

    if theory_id is not None:
        query = query.filter(ExampleProblem.theory_id == theory_id)

    examples = query.order_by(
            Theory.level_id.asc(),
            Theory.order_index.asc(),
            ExampleProblem.theory_id.asc(),
            ExampleProblem.order_index.asc(),
            ExampleProblem.id.asc()).all()


    return examples







