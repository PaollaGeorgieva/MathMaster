
from fastapi import Depends, HTTPException
from sqlalchemy.orm import  Session

from database import get_db
from models import ThemeTest, Level, Problem, Theme, Theory


def delete_level_content(level:Level,session: Session):

    if level.user_associations:
        raise HTTPException(409, "This level has student progress. Deactivate it instead.")

    for theory in level.theories:
        delete_theory_content(theory, session)

    session.delete(level)


def delete_test_content(test: ThemeTest, session: Session):
    if test.attempts:
        raise HTTPException(409, 'This test has student progress. Deactivate it instead.')

    session.delete(test)


def delete_problem_content(problem: Problem, session: Session):
    if problem.user_progress_records or problem.user_attempts:
        raise HTTPException(409, 'This problem has student progress. Deactivate it instead.')

    for class_assigment in problem.class_assignments:
        session.delete(class_assigment)

    session.delete(problem)



def delete_theory_content(theory: Theory, session: Session):
    for problem in theory.problems:
        delete_problem_content(problem, session)

    for example_problem in theory.example_problems:
        session.delete(example_problem)

    session.delete(theory)


def delete_theme_content(theme: Theme, session: Session):
    for level in theme.levels:
        delete_level_content(level, session)

    for test in theme.theme_tests:
        delete_test_content(test, session)

    session.delete(theme)