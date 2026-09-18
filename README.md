# MathMaster


**MathMaster** is an educational platform designed to help seventh-grade students learn mathematics and prepare for the Bulgarian National External Assessment (НВО).

The project currently provides a REST API for organizing learning content, solving mathematical problems, taking tests and tracking student progress.

> **Project status:** The backend is under active development. A user-friendly frontend application is planned.

## Features

### Learning Content

* Mathematical themes divided into levels
* Theory and worked examples
* Practice problems with optional hints
* Answer submission and attempt history
* Automatic result and progress tracking

### Tests and Progress

* Tests organized by mathematical theme
* Automatic score calculation
* Personal test and problem history
* Student points and levels
* Achievement badges

### Students and Teachers

* Student and teacher accounts
* Secure authentication with JWT
* Creation and management of school classes
* Joining a class through a class code
* Assigning problems to classes
* Student progress and class statistics

## Technology Stack

* **Python**
* **FastAPI**
* **PostgreSQL**
* **SQLAlchemy**
* **Alembic**
* **Pydantic**
* **JWT authentication**
* **Uvicorn**

## Getting Started

Make sure you have Python 3, PostgreSQL and Git installed.

```bash
git clone https://github.com/PaollaGeorgieva/MathMaster.git
cd MathMaster

python -m venv .venv
pip install -r requirements.txt
```

Create a PostgreSQL database named `math_master`, copy `.env.example` to `.env` and update the database credentials and secret key.

Then apply the migrations and start the server:

```bash
alembic upgrade head
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

API documentation:

* Swagger UI: `http://127.0.0.1:8000/docs`
* ReDoc: `http://127.0.0.1:8000/redoc`

## Project Structure

```text
MathMaster/
├── alembic/       # Database migrations
├── helpers/       # Progress, problems and gamification logic
├── models/        # SQLAlchemy database models
├── routers/       # API endpoints
├── schemas/       # Pydantic request and response models
├── main.py        # FastAPI application entry point
├── database.py    # Database configuration
├── security.py    # Authentication and authorization
└── requirements.txt
```


