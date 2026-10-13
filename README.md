# MathMaster

**MathMaster** is an educational platform designed to help seventh-grade students learn mathematics and prepare for the Bulgarian National External Assessment (НВО).

The project includes a REST API, a student and teacher application, and an administration panel.

> **Project status:** Under active development. Both the backend and frontend applications are implemented and continue to evolve.

## Features

### Learning Content

- Mathematical themes divided into progressively unlocked levels
- Theory, worked examples and practice problems with hints and solutions
- Mathematical answer input with a virtual keyboard
- Answer submission, limited attempts and personal attempt history
- Resume practice from the first unfinished problem

### Tests and Progress

- Tests organized by mathematical theme with automatic scoring
- Personal dashboard, progress statistics and test history
- Student points, levels, ranks and achievement badges

### Students and Teachers

- Student and teacher accounts with JWT authentication
- Profile editing and school class management
- Joining a class through a class code
- Teacher problem library and task creation linked to theory
- Assigning problems to classes and viewing student results
- Administration panel for users, learning content and tests

## Technology Stack

- **Backend:** Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pydantic and Uvicorn
- **Frontend:** React, Vite, KaTeX and MathLive
- **Administration:** React Admin and TypeScript

## Getting Started

Install Python 3, PostgreSQL, Node.js with npm, and Git. In PowerShell:

```powershell
git clone https://github.com/PaollaGeorgieva/MathMaster.git
cd MathMaster
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Create a PostgreSQL database named `math_master` and update the database connection and secret key in `.env`.

Apply the migrations and start the API:

```powershell
alembic upgrade head
uvicorn main:app --reload
```

In a separate terminal, from the project directory, start the student and teacher application:

```powershell
cd frontend
npm install
npm run dev
```

For the administration panel, follow [admin-frontend/README.md](admin-frontend/README.md). Frontend configuration and checks are documented in [frontend/README.md](frontend/README.md).

- Application: http://localhost:5173
- API: http://127.0.0.1:8000
- API documentation: [Swagger UI](http://127.0.0.1:8000/docs) · [ReDoc](http://127.0.0.1:8000/redoc)

## Project Structure

```text
MathMaster/
├── frontend/         # Student and teacher application
├── admin-frontend/   # Administration panel
├── alembic/          # Database migrations
├── helpers/          # Progress, problems and gamification logic
├── models/           # SQLAlchemy database models
├── routers/          # API endpoints
├── schemas/          # Pydantic request and response models
├── tests/            # Backend tests
├── main.py           # FastAPI application entry point
├── database.py       # Database configuration
└── security.py       # Authentication and authorization
```
