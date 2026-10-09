import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (registers the tables on SQLModel.metadata)
from app.db import get_session
from app.main import app


@pytest.fixture
def session():
    # A fresh in-memory database per test; StaticPool keeps the single connection that holds it
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    # Not used as a context manager, so the app's startup doesn't create the real database file
    yield TestClient(app)
    app.dependency_overrides.clear()
