"""Query registry for secure query execution.

This module parses Markdoc pages to extract query definitions and provides
a registry that maps (page, query_name) to QueryDefinition objects.

Query syntax in markdown:
    ```sql query_name
    SELECT * FROM table WHERE id = ${inputs.filter.value}
    ```

Security model:
- Only queries defined in markdown pages can be executed
- Frontend sends (page, query_name, params) instead of raw SQL
- Backend validates params match expected and interpolates safely
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import markdocpy as Markdoc


@dataclass
class QueryDefinition:
    """Definition of a query extracted from a markdown page."""

    name: str
    sql: str
    params: list[str] = field(default_factory=list)


def extract_text(node: Markdoc.Node) -> str:
    """Extract text content from a node and its children."""
    if node.content is not None:
        return node.content
    result = []
    for child in node.children:
        if isinstance(child, Markdoc.Node):
            result.append(extract_text(child))
    return "".join(result)


def extract_params(sql: str) -> list[str]:
    """Extract parameter names from ${inputs.X.value} patterns."""
    pattern = r"\${inputs\.(\w+)\.value}"
    return list(set(re.findall(pattern, sql)))


def _extract_queries_from_node(node: Markdoc.Node) -> list[QueryDefinition]:
    """Walk AST and extract query definitions from sql fences.

    Syntax:
        ```sql query_name
        SELECT * FROM table
        ```
    """
    queries = []

    # Check for sql fence with query name
    if node.type == "fence":
        language = node.attributes.get("language", "")
        if language.startswith("sql "):
            name = language[4:].strip()  # Everything after "sql "
            if name:
                sql = (node.content or "").strip()
                params = extract_params(sql)
                queries.append(QueryDefinition(name=name, sql=sql, params=params))
        return queries  # Don't recurse into fences

    # Skip other code blocks
    if node.type in ("code", "code_block"):
        return queries

    for child in node.children:
        if isinstance(child, Markdoc.Node):
            queries.extend(_extract_queries_from_node(child))

    return queries


def parse_queries(content: str) -> list[QueryDefinition]:
    """Parse markdown content and extract query definitions."""
    ast = Markdoc.parse(content)
    return _extract_queries_from_node(ast)


def escape_sql_value(value: Any) -> str:
    """Escape a value for safe SQL interpolation.

    The SQL template is trusted (from markdown files), so we only need to
    escape the parameter values to prevent breaking out of string contexts.
    """
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    # String: escape single quotes (SQL standard)
    return str(value).replace("'", "''")


class QueryRegistry:
    """Registry mapping (page_path, query_name) to QueryDefinition.

    Usage:
        registry = QueryRegistry()
        registry.build_from_pages(pages_dir)
        query = registry.get("/sales.md", "monthly_sales")
    """

    def __init__(self) -> None:
        # Map of page_path -> {query_name -> QueryDefinition}
        self._registry: dict[str, dict[str, QueryDefinition]] = {}

    def build_from_pages(self, pages_dir: Path) -> None:
        """Build registry by parsing all markdown pages."""
        self._registry.clear()
        for md_file in pages_dir.glob("**/*.md"):
            page_path = "/" + md_file.relative_to(pages_dir).as_posix()
            self._load_page(page_path, md_file)

    def _load_page(self, page_path: str, file_path: Path) -> None:
        """Load queries from a single page."""
        try:
            content = file_path.read_text()
            queries = parse_queries(content)
            if queries:
                self._registry[page_path] = {q.name: q for q in queries}
            elif page_path in self._registry:
                # Page no longer has queries, remove from registry
                del self._registry[page_path]
        except Exception:
            # Skip files that can't be parsed
            pass

    def rebuild_page(self, page_path: str, file_path: Path) -> None:
        """Rebuild registry for a single page (used by file watcher)."""
        self._load_page(page_path, file_path)

    def get(self, page: str, query_name: str) -> QueryDefinition | None:
        """Get a query definition by page path and name."""
        page_queries = self._registry.get(page)
        if page_queries:
            return page_queries.get(query_name)
        return None

    def get_page_queries(self, page: str) -> dict[str, QueryDefinition]:
        """Get all queries for a page."""
        return self._registry.get(page, {})

    def interpolate_sql(self, query: QueryDefinition, params: dict[str, Any]) -> str:
        """Interpolate parameters into SQL template.

        Args:
            query: The query definition with SQL template
            params: Parameter values to interpolate

        Returns:
            SQL with parameters interpolated

        The SQL template uses ${inputs.X.value} syntax which is replaced
        with escaped parameter values.
        """
        sql = query.sql
        for name, value in params.items():
            placeholder = f"${{inputs.{name}.value}}"
            escaped = escape_sql_value(value)
            sql = sql.replace(placeholder, escaped)
        return sql


# Global registry instance
_registry: QueryRegistry | None = None


def get_registry() -> QueryRegistry:
    """Get the global query registry."""
    if _registry is None:
        raise RuntimeError("Query registry not initialized. Call init_registry first.")
    return _registry


def init_registry(pages_dir: Path) -> QueryRegistry:
    """Initialize the global query registry."""
    global _registry
    _registry = QueryRegistry()
    _registry.build_from_pages(pages_dir)
    return _registry
