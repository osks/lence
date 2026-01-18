"""Basic tests for Lence."""

import pytest
from fastapi.testclient import TestClient

from lence.backend.app import create_app


@pytest.fixture
def project_dir(tmp_path):
    """Create a minimal project directory."""
    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    (pages_dir / "index.md").write_text("---\ntitle: Welcome\n---\n# Test Page\n")
    (pages_dir / "dashboard.md").write_text("---\ntitle: Sales Dashboard\n---\n# Dashboard\n")

    sources_dir = tmp_path / "sources"
    sources_dir.mkdir()
    (sources_dir / "sources.yaml").write_text("sources: {}\n")

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
    """Test the auto-generated menu API endpoint."""
    response = client.get("/_api/v1/pages/menu")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Check that project pages are present (may also include built-in pages)
    paths = [item.get("path") for item in data]
    assert "/" in paths
    assert "/dashboard" in paths


def test_page_endpoint(client):
    """Test fetching a markdown page."""
    response = client.get("/_api/v1/pages/page/index.md")
    assert response.status_code == 200
    assert "# Test Page" in response.text


def test_page_not_found(client):
    """Test 404 for non-existent page."""
    response = client.get("/_api/v1/pages/page/nonexistent.md")
    assert response.status_code == 404
