"""Page serving routes for Lence."""

import re
from pathlib import Path

import yaml
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .config import DocsVisibility


class PageContent(BaseModel):
    """Request body for saving page content."""

    content: str


def validate_page_path(path: str) -> str | None:
    """Validate and normalize a page path.

    Returns normalized path if valid, None if invalid.
    Prevents path traversal attacks and invalid characters.
    """
    # Reject empty paths
    if not path or not path.strip():
        return None

    # Reject paths with ..
    if ".." in path:
        return None

    # Reject absolute paths
    if path.startswith("/"):
        path = path[1:]

    # Reject paths starting with _docs (bundled pages)
    if path.startswith("_docs"):
        return None

    # Reject hidden files/directories
    parts = path.split("/")
    if any(part.startswith(".") for part in parts):
        return None

    # Reject paths with special characters (allow alphanumeric, -, _, /)
    if not re.match(r"^[\w\-/]+$", path):
        return None

    return path

# Package directory (where lence is installed)
PACKAGE_DIR = Path(__file__).parent.parent
PACKAGE_PAGES_DIR = PACKAGE_DIR / "pages"
PACKAGE_TEMPLATES_DIR = PACKAGE_DIR / "templates"

# Frontmatter pattern: --- at start, yaml content, ---
FRONTMATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


router = APIRouter()


def parse_frontmatter(content: str) -> dict:
    """Extract frontmatter from markdown content."""
    match = FRONTMATTER_PATTERN.match(content)
    if match:
        try:
            return yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            return {}
    return {}


def get_page_title(file_path: Path, url_path: str) -> str:
    """Get page title from frontmatter, falling back to path-derived title."""
    try:
        content = file_path.read_text()
        frontmatter = parse_frontmatter(content)
        if "title" in frontmatter:
            return frontmatter["title"]
    except (OSError, UnicodeDecodeError):
        pass

    # Fallback: derive from path
    if url_path == "/":
        return "Home"
    return url_path.split("/")[-1].replace("-", " ").replace("_", " ").title()


def discover_pages(pages_dir: Path) -> dict[str, Path]:
    """Discover all markdown pages in a directory.

    Returns dict mapping URL path to file path.
    Skips hidden files (starting with .) and backup files (ending with ~).
    """
    pages = {}
    if not pages_dir.exists():
        return pages

    for md_file in pages_dir.rglob("*.md"):
        # Skip hidden files and backup files
        if md_file.name.startswith(".") or md_file.name.endswith("~"):
            continue
        rel_path = md_file.relative_to(pages_dir)
        # Convert file path to URL path
        if rel_path.name == "index.md":
            if rel_path.parent == Path("."):
                url_path = "/"
            else:
                url_path = "/" + str(rel_path.parent)
        else:
            url_path = "/" + str(rel_path.with_suffix(""))

        pages[url_path] = md_file

    return pages


def build_menu(pages_dir: Path, exclude_docs: bool = True) -> list[dict]:
    """Build hierarchical menu structure from pages directories.

    Merges built-in pages with project pages (project overrides).
    Reads title from frontmatter. Groups pages by directory.
    Supports arbitrary nesting depth.

    Section titles come from index.md in the directory (e.g., sales/index.md
    defines the "Sales" section title). Falls back to directory name if no index.

    Args:
        pages_dir: Project pages directory
        exclude_docs: If True, excludes /_docs pages from menu (default: True)
    """
    builtin_pages = discover_pages(PACKAGE_PAGES_DIR)
    project_pages = discover_pages(pages_dir)

    # Merge: project pages override built-in
    all_pages = {**builtin_pages, **project_pages}

    # Exclude _docs pages from menu (they're accessed via help button)
    if exclude_docs:
        all_pages = {k: v for k, v in all_pages.items() if not k.startswith("/_docs")}

    # Build a tree where each node can have children
    # Node structure: {"title": str, "path": str|None, "children": {key: node}}
    root: dict = {"children": {}}

    def ensure_path(parts: list[str]) -> dict:
        """Ensure all parent nodes exist and return the deepest one."""
        node = root
        for part in parts:
            if part not in node["children"]:
                # Create placeholder node
                fallback_title = part.replace("-", " ").replace("_", " ").title()
                node["children"][part] = {
                    "title": fallback_title,
                    "path": None,
                    "children": {},
                }
            node = node["children"][part]
        return node

    # Process all pages
    for url_path in sorted(all_pages.keys()):
        title = get_page_title(all_pages[url_path], url_path)
        parts = [p for p in url_path.split("/") if p]

        if not parts:  # Root path "/"
            root["children"]["/"] = {"title": title, "path": url_path, "children": {}}
        else:
            # Ensure parent path exists and get the node for this page
            node = ensure_path(parts)
            node["title"] = title
            node["path"] = url_path

    # Sort keys: regular items first (alphabetically), then _ prefixed items last
    def sort_key(key: str) -> tuple[int, str]:
        if key.startswith("_"):
            return (1, key)  # _ items come after regular items
        return (0, key)

    def node_to_menu(node: dict) -> list[dict]:
        """Convert tree node to menu list format."""
        menu = []
        for key in sorted(node["children"].keys(), key=sort_key):
            child = node["children"][key]
            has_children = bool(child["children"])

            if has_children:
                entry = {
                    "title": child["title"],
                    "children": node_to_menu(child),
                }
                if child.get("path"):
                    entry["path"] = child["path"]
                menu.append(entry)
            else:
                menu.append({"title": child["title"], "path": child["path"]})

        return menu

    return node_to_menu(root)


@router.get("/menu")
async def get_menu(request: Request):
    """Get auto-generated menu from pages directories."""
    pages_dir = request.app.state.pages_dir
    return build_menu(pages_dir)


# Preferred order for docs pages (items not listed appear at the end alphabetically)
DOCS_ORDER = [
    "getting-started",
    "project-structure",
    "settings",
    "sources",
    "colors",
    "components",
]


def build_docs_menu() -> list[dict]:
    """Build hierarchical menu for docs pages."""
    docs_pages = discover_pages(PACKAGE_PAGES_DIR / "_docs")

    # Build a tree structure (same approach as build_menu)
    root: dict = {"children": {}}

    def ensure_path(parts: list[str]) -> dict:
        """Ensure all parent nodes exist and return the deepest one."""
        node = root
        for part in parts:
            if part not in node["children"]:
                fallback_title = part.replace("-", " ").replace("_", " ").title()
                node["children"][part] = {
                    "title": fallback_title,
                    "path": None,
                    "children": {},
                }
            node = node["children"][part]
        return node

    # Process all pages
    for url_path in sorted(docs_pages.keys()):
        # Skip the index page (it's the main docs page)
        if url_path == "/":
            continue

        full_path = "/_docs" + url_path
        title = get_page_title(docs_pages[url_path], url_path)
        parts = [p for p in url_path.split("/") if p]

        node = ensure_path(parts)
        node["title"] = title
        node["path"] = full_path

    def docs_sort_key(key: str) -> tuple[int, str]:
        """Sort by DOCS_ORDER first, then alphabetically."""
        try:
            return (DOCS_ORDER.index(key), key)
        except ValueError:
            return (len(DOCS_ORDER), key)

    def node_to_menu(node: dict) -> list[dict]:
        """Convert tree node to menu list format."""
        menu = []
        for key in sorted(node["children"].keys(), key=docs_sort_key):
            child = node["children"][key]
            has_children = bool(child["children"])

            if has_children:
                entry = {
                    "title": child["title"],
                    "children": node_to_menu(child),
                }
                if child.get("path"):
                    entry["path"] = child["path"]
                menu.append(entry)
            else:
                menu.append({"title": child["title"], "path": child["path"]})

        return menu

    return node_to_menu(root)


@router.get("/docs-menu")
async def get_docs_menu():
    """Get menu for documentation pages."""
    return build_docs_menu()


def resolve_page_path(base_dir: Path, path: str) -> Path | None:
    """Resolve a URL path to a markdown file.

    Checks for:
    1. path.md (e.g., demo.md)
    2. path/index.md (e.g., sales/index.md for /sales)
    """
    # Try direct path with .md suffix
    file_path = base_dir / path
    if not file_path.suffix:
        file_path = file_path.with_suffix(".md")
    if file_path.exists():
        return file_path

    # Try as directory with index.md
    dir_path = base_dir / path
    if dir_path.is_dir():
        index_path = dir_path / "index.md"
        if index_path.exists():
            return index_path

    return None


@router.get("/page/{path:path}")
async def get_page(request: Request, path: str):
    """Serve page content with frontmatter. Project pages override bundled defaults."""
    pages_dir = request.app.state.pages_dir

    # Try project pages first
    file_path = resolve_page_path(pages_dir, path)

    # Fall back to bundled defaults
    if not file_path:
        file_path = resolve_page_path(PACKAGE_PAGES_DIR, path)

    if not file_path:
        return JSONResponse(
            status_code=404,
            content={"error": f"Page not found: {path}"},
        )

    content = file_path.read_text()
    frontmatter = parse_frontmatter(content)

    return {"content": content, "frontmatter": frontmatter}


@router.get("/settings")
async def get_settings(request: Request):
    """Get frontend settings (docs visibility, etc.)."""
    config = request.app.state.config
    edit_mode = getattr(request.app.state, "edit_mode", False)

    # Determine if help button should be shown
    # In edit mode, show docs unless explicitly disabled with docs: never
    docs_config = config.docs
    if docs_config == DocsVisibility.ALWAYS:
        show_help = True
    elif docs_config == DocsVisibility.NEVER:
        show_help = False
    else:  # edit (default) - show in edit mode
        show_help = edit_mode

    return {
        "showHelp": show_help,
        "showSource": config.show_source,
        "editMode": edit_mode,
        "title": config.title,
    }


@router.put("/page/{path:path}")
async def save_page(request: Request, path: str, body: PageContent):
    """Save changes to an existing page. Requires edit mode."""
    edit_mode = getattr(request.app.state, "edit_mode", False)
    if not edit_mode:
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    # Validate path
    safe_path = validate_page_path(path)
    if not safe_path:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid page path"},
        )

    pages_dir = request.app.state.pages_dir
    file_path = pages_dir / safe_path
    if not file_path.suffix:
        file_path = file_path.with_suffix(".md")

    # Only allow saving existing project pages
    if not file_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Page not found"},
        )

    # Ensure file is within project pages directory
    try:
        file_path.resolve().relative_to(pages_dir.resolve())
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid page path"},
        )

    file_path.write_text(body.content)
    return {"success": True, "path": str(file_path.relative_to(pages_dir))}


@router.post("/page/{path:path}")
async def create_page(request: Request, path: str, body: PageContent):
    """Create a new page. Requires edit mode."""
    edit_mode = getattr(request.app.state, "edit_mode", False)
    if not edit_mode:
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    # Validate path
    safe_path = validate_page_path(path)
    if not safe_path:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid page path"},
        )

    pages_dir = request.app.state.pages_dir
    file_path = pages_dir / safe_path
    if not file_path.suffix:
        file_path = file_path.with_suffix(".md")

    # Don't overwrite existing pages
    if file_path.exists():
        return JSONResponse(
            status_code=409,
            content={"error": "Page already exists"},
        )

    # Ensure file would be within project pages directory
    try:
        file_path.resolve().relative_to(pages_dir.resolve())
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid page path"},
        )

    # Create parent directories if needed
    file_path.parent.mkdir(parents=True, exist_ok=True)

    file_path.write_text(body.content)
    return {"success": True, "path": str(file_path.relative_to(pages_dir))}


@router.delete("/page/{path:path}")
async def delete_page(request: Request, path: str):
    """Delete a page. Requires edit mode."""
    edit_mode = getattr(request.app.state, "edit_mode", False)
    if not edit_mode:
        return JSONResponse(
            status_code=403,
            content={"error": "Edit mode not enabled"},
        )

    # Validate path
    safe_path = validate_page_path(path)
    if not safe_path:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid page path"},
        )

    pages_dir = request.app.state.pages_dir
    file_path = pages_dir / safe_path
    if not file_path.suffix:
        file_path = file_path.with_suffix(".md")

    # Only allow deleting existing project pages
    if not file_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Page not found"},
        )

    # Ensure file is within project pages directory
    try:
        file_path.resolve().relative_to(pages_dir.resolve())
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid page path"},
        )

    file_path.unlink()
    return {"success": True}
