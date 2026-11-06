"""Covers app wiring that test_auth.py doesn't exercise: health check, lifespan/db setup, config."""

import importlib

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import create_db_and_tables, engine, get_session
from app.main import app


def test_health_check(client):
    res = client.get("/api/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_lifespan_creates_tables():
    with TestClient(app):
        with engine.connect() as conn:
            tables = conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'").scalars().all()

    assert "users" in tables


def test_create_db_and_tables_is_idempotent():
    create_db_and_tables()
    create_db_and_tables()


def test_get_session_yields_a_working_session():
    gen = get_session()
    session = next(gen)

    assert session.exec(select(1)).one() == 1

    gen.close()


def test_secret_key_required_when_cookie_secure(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "")
    monkeypatch.setenv("COOKIE_SECURE", "true")
    import app.config as config

    try:
        with pytest.raises(RuntimeError, match="SECRET_KEY must be set"):
            importlib.reload(config)
    finally:
        monkeypatch.delenv("COOKIE_SECURE", raising=False)
        importlib.reload(config)
