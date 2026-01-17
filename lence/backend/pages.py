"""Page serving routes for Lence."""

import re
from pathlib import Path

import yaml
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse


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
    """
    pages = {}
    if not pages_dir.exists():
        return pages

    for md_file in pages_dir.rglob("*.md"):
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


def build_menu(pages_dir: Path) -> list[dict]:
    """Build hierarchical menu structure from pages directories.

    Merges built-in pages with project pages (project overrides).
    Reads title from frontmatter. Groups pages by directory.

    Section titles come from index.md in the directory (e.g., sales/index.md
    defines the "Sales" section title). Falls back to directory name if no index.
    """
    builtin_pages = discover_pages(PACKAGE_PAGES_DIR)
    project_pages = discover_pages(pages_dir)

    # Merge: project pages override built-in
    all_pages = {**builtin_pages, **project_pages}

    # First pass: identify which paths are sections (have nested pages)
    sections = set()
    for url_path in all_pages.keys():
        parts = [p for p in url_path.split("/") if p]
        if len(parts) > 1:
            sections.add(parts[0])

    # Build tree structure
    root: dict[str, any] = {"children": {}}

    for url_path in sorted(all_pages.keys()):
        title = get_page_title(all_pages[url_path], url_path)
        parts = [p for p in url_path.split("/") if p]

        if not parts:  # Root path "/"
            root["children"]["/"] = {"title": title, "path": url_path}
        elif len(parts) == 1:
            key = parts[0]
            if key in sections:
                # This is a section index (e.g., /sales from sales/index.md)
                if key not in root["children"]:
                    root["children"][key] = {"title": title, "path": url_path, "children": []}
                else:
                    root["children"][key]["title"] = title
                    root["children"][key]["path"] = url_path
            else:
                # Regular top-level page like "/demo"
                root["children"][key] = {"title": title, "path": url_path}
        else:  # Nested page like "/sales/dashboard"
            parent_key = parts[0]
            section_path = "/" + parent_key

            if parent_key not in root["children"]:
                # Create section entry with fallback title
                section_title = parent_key.replace("-", " ").replace("_", " ").title()
                root["children"][parent_key] = {
                    "title": section_title,
                    "path": None,
                    "children": [],
                }

            parent = root["children"][parent_key]
            parent["children"].append({"title": title, "path": url_path})

    # Convert to list format
    menu = []
    for key in sorted(root["children"].keys()):
        item = root["children"][key]
        if "children" in item and item["children"]:
            entry = {
                "title": item["title"],
                "children": sorted(item["children"], key=lambda x: x["path"]),
            }
            if item.get("path"):
                entry["path"] = item["path"]
            menu.append(entry)
        else:
            menu.append({"title": item["title"], "path": item["path"]})

    return menu


@router.get("/menu")
async def get_menu(request: Request):
    """Get auto-generated menu from pages directories."""
    pages_dir = request.app.state.pages_dir
    return build_menu(pages_dir)


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
    """Serve raw markdown files. Project pages override bundled defaults."""
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

    return FileResponse(file_path, media_type="text/markdown")
