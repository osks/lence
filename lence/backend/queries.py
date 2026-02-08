"""Query file management routes for Lence."""

import re
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .config import QUERY_FILE_PATTERN, load_config
from .query_registry import get_registry

router = APIRouter(tags=["queries"])


class QueryContent(BaseModel):
    """Request body for saving query content."""

    content: str


# Pattern for valid path segments: starts with lowercase letter, then lowercase/digits/underscores
PATH_SEGMENT_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


def validate_query_path(path: str) -> str | None:
    """Validate and normalize a query path.

    Returns normalized path if valid, None if invalid.
    Prevents path traversal attacks and invalid characters.
    """
    if not path or not path.strip():
        return None

    # Reject paths with ..
    if ".." in path:
        return None

    # Reject absolute paths - strip leading slash if present
    if path.startswith("/"):
        path = path[1:]

    # Reject hidden files/directories
    parts = path.split("/")
    if any(part.startswith(".") or part.startswith("_") for part in parts):
        return None

    # Validate each segment matches pattern
    for part in parts:
        if not PATH_SEGMENT_PATTERN.match(part):
            return None

    return path


def resolve_query_file(
    queries_dir: Path | None, path: str, must_exist: bool = True
) -> tuple[Path | None, JSONResponse | None]:
    """Resolve and validate a query file path.

    Returns (file_path, None) on success, or (None, error_response) on failure.
    """
    if not queries_dir:
        return None, JSONResponse(
            status_code=404,
            content={"error": "Queries directory not configured"},
        )

    safe_path = validate_query_path(path)
    if not safe_path:
        return None, JSONResponse(
            status_code=400,
            content={"error": "Invalid query path"},
        )

    file_path = queries_dir / f"{safe_path}.sql"

    # Ensure file is within queries directory (prevent traversal)
    try:
        file_path.resolve().relative_to(queries_dir.resolve())
    except ValueError:
        return None, JSONResponse(
            status_code=400,
            content={"error": "Invalid query path"},
        )

    if must_exist and not file_path.exists():
        return None, JSONResponse(
            status_code=404,
            content={"error": f"Query not found: {path}"},
        )

    return file_path, None


def build_queries_menu(queries_dir: Path) -> list[dict]:
    """Build hierarchical menu structure from queries directory.

    Returns list of QueryMenuItem-like dicts with name, path, and optional children.
    """
    if not queries_dir or not queries_dir.exists():
        return []

    # Collect all valid SQL files
    items: dict[str, dict] = {}  # path -> {name, path, children}

    for sql_file in sorted(queries_dir.glob("**/*.sql")):
        filename = sql_file.name

        if not QUERY_FILE_PATTERN.match(filename):
            continue

        # Query name/path is relative path without .sql extension
        relative_path = sql_file.relative_to(queries_dir)
        query_path = str(relative_path)[:-4]  # Remove .sql extension

        # Split into parts for tree building
        parts = query_path.split("/")

        # Create/update tree nodes
        current = items
        for i, part in enumerate(parts[:-1]):
            prefix = "/".join(parts[: i + 1])
            if prefix not in current:
                current[prefix] = {
                    "name": part,
                    "path": prefix,
                    "children": {},
                    "is_dir": True,
                }
            current = current[prefix].get("children", {})

        # Add leaf node
        current[query_path] = {
            "name": parts[-1],
            "path": query_path,
            "is_dir": False,
        }

    def to_list(items_dict: dict) -> list[dict]:
        """Convert nested dict to list format."""
        result = []
        for key in sorted(items_dict.keys()):
            item = items_dict[key]
            if item.get("is_dir"):
                result.append(
                    {
                        "name": item["name"],
                        "path": item["path"],
                        "children": to_list(item.get("children", {})),
                    }
                )
            else:
                result.append({"name": item["name"], "path": item["path"]})
        return result

    return to_list(items)


@router.get("/")
async def list_queries(request: Request):
    """List all queries as hierarchical menu. Requires edit mode."""
    if not getattr(request.app.state, "edit_mode", False):
        return []

    queries_dir = request.app.state.queries_dir
    return build_queries_menu(queries_dir)


@router.get("/{path:path}")
async def get_query(request: Request, path: str):
    """Get a query file's content. Requires edit mode."""
    if not getattr(request.app.state, "edit_mode", False):
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    file_path, error = resolve_query_file(request.app.state.queries_dir, path)
    if error:
        return error

    content = file_path.read_text()
    name = file_path.stem
    return {"content": content, "name": name}


@router.post("/{path:path}")
async def create_query(request: Request, path: str, body: QueryContent):
    """Create a new query file. Requires edit mode."""
    if not getattr(request.app.state, "edit_mode", False):
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    file_path, error = resolve_query_file(
        request.app.state.queries_dir, path, must_exist=False
    )
    if error:
        return error

    if file_path.exists():
        return JSONResponse(
            status_code=409,
            content={"error": "Query already exists"},
        )

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(body.content)

    # Reload global queries in registry
    config = load_config(request.app.state.project_dir)
    get_registry().load_global_queries(config.queries)

    return {"success": True, "path": path}


@router.put("/{path:path}")
async def save_query(request: Request, path: str, body: QueryContent):
    """Save changes to an existing query. Requires edit mode."""
    if not getattr(request.app.state, "edit_mode", False):
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    file_path, error = resolve_query_file(request.app.state.queries_dir, path)
    if error:
        return error

    file_path.write_text(body.content)

    # Reload global queries in registry
    config = load_config(request.app.state.project_dir)
    get_registry().load_global_queries(config.queries)

    return {"success": True, "path": path}


@router.delete("/{path:path}")
async def delete_query(request: Request, path: str):
    """Delete a query file. Requires edit mode."""
    if not getattr(request.app.state, "edit_mode", False):
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    file_path, error = resolve_query_file(request.app.state.queries_dir, path)
    if error:
        return error

    file_path.unlink()

    # Reload global queries in registry
    config = load_config(request.app.state.project_dir)
    get_registry().load_global_queries(config.queries)

    return {"success": True}
