"""Basic tests for Lence."""

import pytest
from fastapi.testclient import TestClient

from lence import create_app


@pytest.fixture
def project_dir(tmp_path):
    """Create a minimal project directory."""
    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    (pages_dir / "index.md").write_text("# Test Page\n")

    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / "sources.yaml").write_text("sources: {}\n")
    (config_dir / "menu.yaml").write_text("menu:\n  - title: Home\n    path: /\n")

    return tmp_path


@pytest.fixture
def client(project_dir):
    """Create a test client with lifespan context."""
    app = create_app(project_dir)
    with TestClient(app) as client:
        yield client


def test_app_starts(client):
    """Test that the app starts and serves the SPA."""
    response = client.get("/")
    assert response.status_code == 200


def test_menu_endpoint(client):
    """Test the menu API endpoint."""
    response = client.get("/api/config/menu")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["title"] == "Home"


def test_page_endpoint(client):
    """Test fetching a markdown page."""
    response = client.get("/pages/index.md")
    assert response.status_code == 200
    assert "# Test Page" in response.text


def test_page_not_found(client):
    """Test 404 for non-existent page."""
    response = client.get("/pages/nonexistent.md")
    assert response.status_code == 404
