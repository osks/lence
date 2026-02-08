"""DuckDB database management for Lence."""

import logging
from pathlib import Path
from typing import Any

import duckdb

from .config import DataSource
from .query_rewriter import rewrite_query

logger = logging.getLogger(__name__)


class QueryResult:
    """Result of a SQL query in table format."""

    def __init__(
        self,
        columns: list[dict[str, str]],
        data: list[list[Any]],
        row_count: int,
    ):
        self.columns = columns
        self.data = data
        self.row_count = row_count

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "columns": self.columns,
            "data": self.data,
            "row_count": self.row_count,
        }


class Database:
    """DuckDB database wrapper with source management."""

    def __init__(self, db_path: str = ":memory:"):
        """Initialize database connection."""
        self.conn = duckdb.connect(db_path)
        self.sources: dict[str, DataSource] = {}
        self._base_dir: Path | None = None

    def register_source(self, name: str, source: DataSource, base_dir: Path | None = None) -> None:
        """Register a data source, making it available for queries."""
        self.sources[name] = source

        # Database sources (postgres, mysql, sqlite)
        if source.type in ("postgres", "mysql", "sqlite"):
            self._register_database_source(name, source)
            return

        # File sources (csv, parquet, json)
        self._register_file_source(name, source, base_dir)

    def _register_database_source(self, name: str, source: DataSource) -> None:
        """Attach a database source (postgres, mysql, sqlite)."""
        if not source.connection:
            raise ValueError(f"Database source '{name}' requires 'connection'")

        # Build ATTACH options
        type_name = source.type.upper()
        options = [f"TYPE {type_name}", "READ_ONLY"]
        if source.db_schema:
            escaped_schema = source.db_schema.replace("'", "''")
            options.append(f"SCHEMA '{escaped_schema}'")

        options_str = ", ".join(options)
        escaped_conn = source.connection.replace("'", "''")
        self.conn.execute(f"ATTACH '{escaped_conn}' AS {name} ({options_str})")

    def _register_file_source(
        self, name: str, source: DataSource, base_dir: Path | None = None
    ) -> None:
        """Register a file source (csv, parquet, json).

        No views are created - queries are rewritten to use read_*() directly.
        This only sets up HTTP secrets for authenticated remote sources.
        """
        if not source.path:
            raise ValueError(f"File source '{name}' requires 'path'")

        # Set up HTTP headers if provided (for remote sources)
        is_remote = source.path.startswith("http://") or source.path.startswith("https://")
        if is_remote and source.headers:
            # Escape quotes in header keys and values
            def escape(s: str) -> str:
                return s.replace("'", "''")

            header_items = ", ".join(
                f"'{escape(k)}': '{escape(v)}'" for k, v in source.headers.items()
            )
            self.conn.execute(f"""
                CREATE OR REPLACE SECRET {name}_http (
                    TYPE HTTP,
                    EXTRA_HTTP_HEADERS MAP {{{header_items}}}
                )
            """)

    def register_sources(
        self, sources: dict[str, DataSource], base_dir: Path | None = None
    ) -> None:
        """Register multiple data sources."""
        self._base_dir = base_dir
        for name, source in sources.items():
            try:
                self.register_source(name, source, base_dir)
            except Exception as e:
                logger.warning(f"Failed to register source '{name}': {e}")

    def execute_query(
        self,
        sql: str,
        params: dict[str, str | None] | None = None,
    ) -> QueryResult:
        """Execute a SQL query and return results in table format.

        The query is rewritten to:
        - Replace table names with read_*() calls (avoids stale views)
        - Convert ${inputs.x.value} to parameterized queries (injection-safe)

        Args:
            sql: SQL query, may contain ${inputs.x.value} placeholders
            params: Map of input name -> value for placeholders
        """
        # Rewrite query for safety and freshness
        rewritten_sql, param_values = rewrite_query(
            sql,
            self.sources,
            params or {},
            self._base_dir,
        )

        # Execute with parameters
        result = self.conn.execute(rewritten_sql, param_values)

        # Get column info
        columns = [{"name": desc[0], "type": str(desc[1])} for desc in result.description]

        # Fetch all rows
        rows = result.fetchall()
        data = [list(row) for row in rows]

        return QueryResult(
            columns=columns,
            data=data,
            row_count=len(data),
        )

    def list_sources(self) -> list[dict[str, Any]]:
        """List all registered sources with their metadata."""
        return [
            {
                "table": table_name,
                "type": source.type,
            }
            for table_name, source in self.sources.items()
        ]

    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()


# Global database instance (initialized in app.py)
_db: Database | None = None


def get_database() -> Database:
    """Get the global database instance."""
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


def init_database(db_path: str = ":memory:") -> Database:
    """Initialize the global database instance."""
    global _db
    _db = Database(db_path)
    return _db
