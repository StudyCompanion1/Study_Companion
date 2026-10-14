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
| `npm run test` | Runs both the frontend + backend unit tests |
| `npm run test:backend` | Runs only the backend unit tests |
| `npm run test:frontend` | Runs only the frontend unit tests |

## AI Processing

Uses Gemini for PDF keyword/concept extraction and image OCR.

**Dependencies:** `pymupdf`, `google-genai`, `python-dotenv`

**API Key:** Add your Gemini API key to a `.env` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

**FastAPI Endpoints:**

- `POST /api/analyze` — Upload PDF for keywords and concepts

Accepts a file under the `file` field and return `{"result": "..."}`.

**QA Testing:** Run `npm run dev:backend`, then visit [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to upload files and test the endpoints.
