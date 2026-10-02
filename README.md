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

## Scripts (run from root)

| Script | Description |
| --- | --- |
| `npm run dev` | Run backend + frontend together |
| `npm run dev:open` | Same as `dev`, also opens the frontend in your browser |
| `npm run dev:backend` | Run only the FastAPI backend |
| `npm run dev:frontend` | Run only the frontend |
| `npm run install:all` | Install all dependencies (root, frontend, backend) |
