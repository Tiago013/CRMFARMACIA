import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    """
    TestClient fixture for FastAPI backend testing.
    This creates a test instance of the application.
    """
    with TestClient(app) as client:
        yield client
