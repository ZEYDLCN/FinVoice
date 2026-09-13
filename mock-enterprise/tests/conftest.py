import pytest
from fastapi.testclient import TestClient

from app.data.store import store
from app.main import app


@pytest.fixture(autouse=True)
def reset_store():
    """Reinitialize the in-memory store before every test for isolation."""
    store.__init__()
    yield


@pytest.fixture
def client():
    return TestClient(app)
