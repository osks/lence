"""SQL query rewriting for Lence.

Transforms queries to:
1. Replace table names with read_* function calls (no stale views)
2. Convert ${inputs.x.value} to parameterized queries (injection-safe)
"""

import logging
import re
from pathlib import Path

import sqlglot
from sqlglot import exp

from .config import DataSource

logger = logging.getLogger(__name__)


# Pattern for input references: '${inputs.name.value}' (including surrounding quotes)
INPUT_PATTERN = re.compile(r"'?\$\{inputs\.(\w+)\.value\}'?")


def _get_read_function(source: DataSource, base_dir: Path | None) -> str:
    """Get the appropriate read_* function call for a source."""
    if not source.path:
        raise ValueError("Source requires 'path'")

    # Resolve path
    is_remote = source.path.startswith("http://") or source.path.startswith("https://")
    if is_remote:
        path_str = source.path
    else:
        path = Path(source.path)
        if base_dir and not path.is_absolute():
            path = base_dir / path
        path_str = str(path)

    # Escape single quotes in path
    path_str = path_str.replace("'", "''")

    if source.type == "csv":
        return f"read_csv_auto('{path_str}')"
    elif source.type == "parquet":
        return f"read_parquet('{path_str}')"
    elif source.type == "json":
        return f"read_json_auto('{path_str}')"
    else:
        raise ValueError(f"Unsupported source type: {source.type}")


def rewrite_query(
    sql: str,
    sources: dict[str, DataSource],
    params: dict[str, str | None],
    base_dir: Path | None = None,
) -> tuple[str, list[str | None]]:
    """Rewrite a SQL query for safe execution.

    Args:
        sql: The SQL query with ${inputs.x.value} placeholders
        sources: Map of table name -> DataSource config
        params: Map of input name -> value
        base_dir: Base directory for resolving relative paths

    Returns:
        Tuple of (rewritten_sql, parameter_values)
    """
    # Step 1: Extract and replace input references with $1, $2, etc.
    param_values: list[str | None] = []
    param_index = 0

    def replace_input(match: re.Match[str]) -> str:
        nonlocal param_index
        param_index += 1
        input_name = match.group(1)
        param_values.append(params.get(input_name))
        return f"${param_index}"

    sql_with_params = INPUT_PATTERN.sub(replace_input, sql)

    # Step 2: Parse and rewrite table references
    try:
        tree = sqlglot.parse_one(sql_with_params, dialect="duckdb")
    except sqlglot.errors.ParseError:
        # If parsing fails, return as-is (let DuckDB handle the error)
        return sql_with_params, param_values

    # Find and replace table references
    for table in tree.find_all(exp.Table):
        table_name = table.name

        # Skip if it's a qualified name (e.g., schema.table for attached databases)
        if table.catalog or table.db:
            continue

        if table_name in sources:
            source = sources[table_name]

            # Skip database sources (postgres, mysql, sqlite) - they use ATTACH
            if source.type in ("postgres", "mysql", "sqlite"):
                continue

            # Replace with read function
            try:
                read_func = _get_read_function(source, base_dir)
                # Parse the function call and replace the table
                func_expr = sqlglot.parse_one(read_func, dialect="duckdb")
                table.replace(func_expr)
            except ValueError as e:
                # If we can't generate the read function, leave table as-is
                logger.warning(f"Could not rewrite table '{table_name}': {e}")

    return tree.sql(dialect="duckdb"), param_values
