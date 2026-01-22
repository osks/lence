"""FastAPI application factory for Lence."""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .config import load_config
from .database import init_database
from .sources import router as sources_router
from .pages import router as pages_router, PACKAGE_DIR


def create_app(project_dir: Path | str = ".", dev_mode: bool = False) -> FastAPI:
    """Create a FastAPI application for a Lence project.

    Args:
        project_dir: Path to the project directory containing pages/, data/, config/
        dev_mode: Whether running in development mode (enables help button by default)

    Returns:
        Configured FastAPI application
    """
    project_dir = Path(project_dir).resolve()

    # Project directories
    pages_dir = project_dir / "pages"
    data_dir = project_dir / "data"

    # Package static directory
    package_static_dir = PACKAGE_DIR / "static"

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan manager - startup and shutdown."""
        # Startup: Initialize database and load sources
        config = load_config(project_dir)

        db = init_database()
        db.register_sources(config.sources, base_dir=project_dir)

        # Store config and paths in app state for access in routes
        app.state.config = config
        app.state.project_dir = project_dir
        app.state.pages_dir = pages_dir
        app.state.dev_mode = dev_mode

        try:
            yield
        except asyncio.CancelledError:
            pass  # Normal shutdown on Ctrl+C
        finally:
            # Shutdown: Close database
            db.close()

    app = FastAPI(
        title="Lence",
        description="Data visualization framework",
        lifespan=lifespan,
    )

    # Mount package static directory (compiled JS/CSS)
    if package_static_dir.exists():
        app.mount("/_static", StaticFiles(directory=package_static_dir), name="lence-static")

    # API routes under /_api/v1/
    app.include_router(sources_router, prefix="/_api/v1/sources")
    app.include_router(pages_router, prefix="/_api/v1/pages")

    # SPA catch-all (must be last)
    @app.get("/{path:path}")
    async def spa_fallback(path: str):
        """Serve index.html for all non-API routes (SPA fallback)."""
        package_index = PACKAGE_DIR / "templates" / "index.html"
        if package_index.exists():
            return FileResponse(package_index)

        return JSONResponse(
            status_code=404,
            content={"error": "template index.html not found"},
        )

    return app
