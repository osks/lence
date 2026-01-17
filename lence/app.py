"""FastAPI application factory for Lence."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from lence.config import load_config
from lence.database import init_database, get_database
from lence.routes import query_router


# Package directory (where lence is installed)
PACKAGE_DIR = Path(__file__).parent


def create_app(project_dir: Path | str = ".") -> FastAPI:
    """Create a FastAPI application for a Lence project.

    Args:
        project_dir: Path to the project directory containing pages/, data/, config/

    Returns:
        Configured FastAPI application
    """
    project_dir = Path(project_dir).resolve()

    # Project directories
    config_dir = project_dir / "config"
    pages_dir = project_dir / "pages"
    data_dir = project_dir / "data"

    # Package assets
    package_static_dir = PACKAGE_DIR / "static"
    package_templates_dir = PACKAGE_DIR / "templates"
    package_pages_dir = PACKAGE_DIR / "pages"

    # Project static assets (user's custom static files)
    project_static_dir = project_dir / "static"

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan manager - startup and shutdown."""
        # Startup: Initialize database and load sources
        config = load_config(config_dir)

        db = init_database()
        db.register_sources(config.sources, base_dir=project_dir)

        # Store config and paths in app state for access in routes
        app.state.config = config
        app.state.project_dir = project_dir
        app.state.pages_dir = pages_dir

        yield

        # Shutdown: Close database
        db.close()

    app = FastAPI(
        title="Lence",
        description="Data visualization framework",
        lifespan=lifespan,
    )

    # Mount static directories
    # Package static (compiled JS components)
    if package_static_dir.exists():
        app.mount("/static/lence", StaticFiles(directory=package_static_dir), name="lence-static")

    # Project static (user's custom static files)
    if project_static_dir.exists():
        app.mount("/static", StaticFiles(directory=project_static_dir), name="project-static")

    # API routes
    app.include_router(query_router, prefix="/api")

    @app.get("/api/config/menu")
    async def get_menu(request: Request):
        """Get the sidebar menu configuration."""
        config = request.app.state.config
        return [item.model_dump() for item in config.menu]

    @app.get("/pages/{path:path}")
    async def get_page(request: Request, path: str):
        """Serve raw markdown files. Project pages override bundled defaults."""
        pages_dir = request.app.state.pages_dir
        file_path = pages_dir / path
        if not file_path.suffix:
            file_path = file_path.with_suffix(".md")

        # Try project pages first, then fall back to bundled defaults
        if not file_path.exists():
            file_path = package_pages_dir / path
            if not file_path.suffix:
                file_path = file_path.with_suffix(".md")

        if not file_path.exists():
            return JSONResponse(
                status_code=404,
                content={"error": f"Page not found: {path}"},
            )

        return FileResponse(file_path, media_type="text/markdown")

    @app.get("/{path:path}")
    async def spa_fallback(path: str):
        """Serve index.html for all non-API routes (SPA fallback)."""
        # First try project's index.html
        project_index = project_static_dir / "index.html"
        if project_index.exists():
            return FileResponse(project_index)

        # Fall back to package's template
        package_index = package_templates_dir / "index.html"
        if package_index.exists():
            return FileResponse(package_index)

        return JSONResponse(
            status_code=404,
            content={"error": "index.html not found"},
        )

    return app
