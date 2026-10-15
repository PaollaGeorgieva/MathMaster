# MathMaster

**MathMaster** is an educational platform that helps seventh-grade students learn mathematics and prepare for the Bulgarian National External Assessment (НВО).

It includes a FastAPI backend, a React application for students and teachers, and a separate administration panel.

🌐 **[Live Demo](https://mathmaster-app.onrender.com)**  
📖 **[API Documentation](https://mathmaster-m7l6.onrender.com/docs)**

> The free hosting service may take about a minute to wake up after inactivity. Create a student or teacher account to explore the application.

## Features

### Learning and Practice

- Mathematical themes with progressively unlocked levels
- Theory, worked examples and practice problems
- Mathematical input with a virtual keyboard
- Limited attempts, hints and explanations
- Resume practice from the first unfinished problem

### Tests and Progress

- Theme tests with automatic scoring
- Personal dashboard and attempt history
- Progress statistics, points, levels and achievement badges

### Teachers and Administration

- Classes with invitation codes
- Teacher problem library
- Custom tasks linked to theory and assigned to classes
- Student results and class statistics
- Administration panel for users, learning content and tests
- JWT authentication and role-based access control

## Technology Stack

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, Pydantic
- **Database:** PostgreSQL
- **Frontend:** React, Vite, KaTeX, MathLive
- **Administration:** React Admin, TypeScript
- **Deployment:** Render and Neon

## Run Locally

Install Python 3, PostgreSQL, Node.js with npm, and Git.

### Backend

In PowerShell:

```powershell
git clone https://github.com/PaollaGeorgieva/MathMaster.git
cd MathMaster
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Create a PostgreSQL database and configure `DATABASE_URL` and `SECRET_KEY` in `.env`.

```powershell
alembic upgrade head
uvicorn main:app --reload
```

Migrations create the database structure. Learning content is managed separately through the administration panel.

### Student and Teacher Application

In a separate terminal, from the project directory:

```powershell
cd frontend
npm ci
npm run dev
```

The application opens at `http://localhost:5173`. The default API address is `http://localhost:8000`.

### Administration Panel

In another terminal, from the project directory:

```powershell
cd admin-frontend
npm ci
```

Create `admin-frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Start the panel:

```powershell
npm run dev -- --port 5174
```

Administration requires an account with `is_superuser` permissions.

## Project Structure

```text
MathMaster/
├── frontend/         # Student and teacher application
├── admin-frontend/   # Administration panel
├── alembic/          # Database migrations
├── helpers/          # Access, progress and scoring logic
├── models/           # Database models
├── routers/          # API endpoints
├── schemas/          # Request and response validation
├── tests/            # Backend tests
├── main.py           # FastAPI application
├── database.py       # Database connection
└── security.py       # Authentication and authorization
```

