"""DuckDB database management for Lence."""

import logging
from pathlib import Path
from typing import Any

import duckdb

from .config import DataSource

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
        self._registered_tables: set[str] = set()
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
            options.append(f"SCHEMA '{source.db_schema}'")

        options_str = ", ".join(options)
        self.conn.execute(f"ATTACH '{source.connection}' AS {name} ({options_str})")
        self._registered_tables.add(name)

    def _register_file_source(
        self, name: str, source: DataSource, base_dir: Path | None = None
    ) -> None:
        """Create a view for a file source (csv, parquet, json)."""
        if not source.path:
            raise ValueError(f"File source '{name}' requires 'path'")

        # Check if this is a remote URL
        is_remote = source.path.startswith("http://") or source.path.startswith("https://")

        # Resolve path relative to base_dir if local
        if is_remote:
            path_str = source.path
        else:
            path = Path(source.path)
            if base_dir and not path.is_absolute():
                path = base_dir / path
            path_str = str(path)

        # Set up HTTP headers if provided (for remote sources)
        if is_remote and source.headers:
            # Build MAP literal for headers
            header_items = ", ".join(f"'{k}': '{v}'" for k, v in source.headers.items())
            self.conn.execute(f"""
                CREATE OR REPLACE SECRET {name}_http (
                    TYPE HTTP,
                    EXTRA_HTTP_HEADERS MAP {{{header_items}}}
                )
            """)

        # Create view based on source type
        if source.type == "csv":
            self.conn.execute(f"""
                CREATE OR REPLACE VIEW {name} AS
                SELECT * FROM read_csv_auto('{path_str}')
            """)
        elif source.type == "parquet":
            self.conn.execute(f"""
                CREATE OR REPLACE VIEW {name} AS
                SELECT * FROM read_parquet('{path_str}')
            """)
        elif source.type == "json":
            self.conn.execute(f"""
                CREATE OR REPLACE VIEW {name} AS
                SELECT * FROM read_json_auto('{path_str}')
            """)
        else:
            raise ValueError(f"Unsupported file source type: {source.type}")

        self._registered_tables.add(name)

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

    def _execute_and_fetch(self, sql: str) -> QueryResult:
        """Execute SQL and convert result to QueryResult."""
        result = self.conn.execute(sql)

        # Get column info (convert type to string)
        columns = [{"name": desc[0], "type": str(desc[1])} for desc in result.description]

        # Fetch all rows
        rows = result.fetchall()

        # Convert to list of lists (row-major)
        data = [list(row) for row in rows]

        return QueryResult(
            columns=columns,
            data=data,
            row_count=len(data),
        )

    def _refresh_file_sources(self) -> None:
        """Recreate views for all file sources."""
        for name, source in self.sources.items():
            if source.type in ("csv", "parquet", "json"):
                try:
                    self._register_file_source(name, source, self._base_dir)
                    logger.info(f"Refreshed source '{name}'")
                except Exception as e:
                    logger.warning(f"Failed to refresh source '{name}': {e}")

    def execute_query(self, sql: str) -> QueryResult:
        """Execute a SQL query and return results in table format.

        If a source file schema changes after views are created, DuckDB raises
        "Contents of view were altered". This is handled by recreating views
        and retrying the query once.
        """
        try:
            return self._execute_and_fetch(sql)
        except duckdb.BinderException as e:
            if "Contents of view were altered" in str(e):
                logger.info("View schema mismatch detected, refreshing sources")
                self._refresh_file_sources()
                return self._execute_and_fetch(sql)
            raise

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
