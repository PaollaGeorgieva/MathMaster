from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import auth_router
from routers.classes import classes_router
from routers.example_problems import example_router
from routers.levels import levels_router
from routers.problems import problems_router
from routers.tests import tests_router
from routers.themes import themes_router
from routers.theories import theories_router
from routers.users import users_router


app = FastAPI(title="MathMaster API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(classes_router)
app.include_router(problems_router)
app.include_router(levels_router)
app.include_router(themes_router)
app.include_router(theories_router)
app.include_router(example_router)
app.include_router(tests_router)


@app.get("/")
def root():
    return {"message": "MathMaster API is running"}
