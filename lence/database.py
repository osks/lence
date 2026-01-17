"""DuckDB database management for Lence."""

from pathlib import Path
from typing import Any
import duckdb

from lence.config import DataSource


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

    def register_source(self, name: str, source: DataSource, base_dir: Path | None = None) -> None:
        """Register a data source, making it available for queries."""
        self.sources[name] = source

        # Resolve path relative to base_dir if provided
        path = Path(source.path)
        if base_dir and not path.is_absolute():
            path = base_dir / path

        # Create view/table based on source type
        if source.type == "csv":
            self.conn.execute(f"""
                CREATE OR REPLACE VIEW {name} AS
                SELECT * FROM read_csv_auto('{path}')
            """)
        elif source.type == "parquet":
            self.conn.execute(f"""
                CREATE OR REPLACE VIEW {name} AS
                SELECT * FROM read_parquet('{path}')
            """)
        else:
            raise ValueError(f"Unsupported source type: {source.type}")

        self._registered_tables.add(name)

    def register_sources(self, sources: dict[str, DataSource], base_dir: Path | None = None) -> None:
        """Register multiple data sources."""
        for name, source in sources.items():
            self.register_source(name, source, base_dir)

    def execute_query(self, sql: str) -> QueryResult:
        """Execute a SQL query and return results in table format."""
        result = self.conn.execute(sql)

        # Get column info (convert type to string)
        columns = [
            {"name": desc[0], "type": str(desc[1])}
            for desc in result.description
        ]

        # Fetch all rows
        rows = result.fetchall()

        # Convert to list of lists (row-major)
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
                "name": name,
                "type": source.type,
                "description": source.description,
            }
            for name, source in self.sources.items()
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
