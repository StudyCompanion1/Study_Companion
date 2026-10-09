# Study Companion

Full-stack app: FastAPI backend (`backend/`) + React/Vite frontend (`frontend/`), managed as an npm workspace from the root.

## Structure

```
backend/    FastAPI app (Python, managed with uv)
frontend/   React + Vite app (npm workspace)
```

## Requirements

- Node.js 20+
- Python 3.14+
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
npm run install:all
```

Installs root + frontend npm dependencies and syncs backend Python dependencies via uv.

Then create the backend's local settings file (git ignores it, so secrets never get committed):

```bash
cp backend/.env.example backend/.env
```

and set `SECRET_KEY` in it (the file explains how to generate one). Without it, logins still work but everyone is logged out whenever the backend restarts.

The backend stores data in a local SQLite file (`backend/study_companion.db`, git-ignored) until the AWS Postgres database is set up; delete the file to start fresh.

### Switching to Postgres (once TI-1 is done)

SQLite is a temporary stand-in. No app code depends on it, so the switch is configuration only:

1. Add the Postgres driver: `cd backend && uv add "psycopg[binary]"`
2. Set the connection string from TI-1 in `backend/.env` (never commit it):
   `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME`
3. Create the tables: today the backend creates missing tables on startup (`create_db_and_tables` in `backend/app/db.py`). Once DA-1 adds versioned migrations, those replace that step.
4. Run `npm run test:backend`, then log in through the app once to confirm.

## Authentication (DA-2)

| Endpoint | Description |
| --- | --- |
| `POST /api/auth/register` | Create an account (`name`, `email`, `password`) and log in |
| `POST /api/auth/login` | Log in (`email`, `password`) |
| `POST /api/auth/logout` | Log out |
| `GET /api/auth/me` | The logged-in user, or 401 |

The login page (`frontend/src/auth/AuthForm.tsx` and `.css`) is a **temporary design** so the login flow can be used and tested; the UX/UI group will replace it with the Figma design. A new design should keep calling the functions in `frontend/src/auth/api.ts`.

Login state lives in an HttpOnly cookie that the browser sends automatically, so frontend code never handles tokens. In backend routes that need the logged-in user, add a `user: CurrentUser` parameter (from `app.auth.dependencies`) and use `user.id`. Try the endpoints at http://127.0.0.1:8000/docs while the backend is running.

## Scripts (run from root)

| Script | Description |
| --- | --- |
| `npm run dev` | Run backend + frontend together |
| `npm run dev:open` | Same as `dev`, also opens the frontend in your browser |
| `npm run dev:backend` | Run only the FastAPI backend |
| `npm run dev:frontend` | Run only the frontend |
| `npm run install:all` | Install all dependencies (root, frontend, backend) |
| `npm run test` | Runs both the frontend + backend unit tests |
| `npm run test:backend` | Runs only the backend unit tests |
| `npm run test:frontend` | Runs only the frontend unit tests |
