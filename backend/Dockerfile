FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app

# Dependencies first so the layer caches across code-only changes
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev

COPY app ./app
COPY ai_processing ./ai_processing
RUN uv sync --locked --no-dev

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
