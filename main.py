from fastapi import FastAPI
from database import Base, engine
from routers.auth import auth_router
from routers.classes import classes_router
from routers.example_problems import example_router
from routers.levels import levels_router
from routers.problems import problems_router
from routers.tests import tests_router
from routers.themes import themes_router
from routers.users import users_router

app = FastAPI(
    title="MathMaster API"
)


app.openapi_schema = None


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(classes_router)
app.include_router(problems_router)
app.include_router(levels_router)
app.include_router(themes_router)

app.include_router(example_router)


app.include_router(tests_router)
@app.get("/")
def root():
    return {"message": "MathMaster API is running"}