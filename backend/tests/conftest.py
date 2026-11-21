import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (registers the tables on SQLModel.metadata)
from app.db import get_session
from app.main import app


@pytest.hookimpl(tryfirst=True)
def pytest_configure(config):
    # Windows sandbox runs can share USERNAME with the interactive account, but
    # pytest's private pytest-of-<username> directory is accessible to only one.
    # Give each run a fresh directory instead of reusing that shared name.
    if sys.platform == "win32" and config.option.basetemp is None:
        directory = TemporaryDirectory(prefix="study-companion-pytest-")
        config.option.basetemp = str(Path(directory.name) / "files")
        config.add_cleanup(directory.cleanup)


@pytest.fixture
def session():
    # A fresh in-memory database per test; StaticPool keeps the single connection that holds it
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            yield session
    finally:
        engine.dispose()


@pytest.fixture
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    # Not used as a context manager, so the app's startup doesn't create the real database file
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        test_client.close()
        app.dependency_overrides.clear()
