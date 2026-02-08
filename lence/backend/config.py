"""Configuration loading for Lence."""

import os
import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class DataSource(BaseModel):
    """A data source configuration.

    File sources (type: csv, parquet, json):
        - table: DuckDB table name to create
        - path: local file path or HTTP(S) URL
        - headers: optional HTTP headers for remote files

    Database sources (type: postgres, mysql, sqlite):
        - alias: prefix for SQL queries (e.g., FROM alias.tablename)
        - connection: database connection string
        - schema: optional, which database schema to expose (e.g., 'public')
    """

    model_config = {"populate_by_name": True}

    type: str  # csv, parquet, json, postgres, mysql, sqlite

    # File sources
    table: str | None = None
    path: str | None = None
    headers: dict[str, str] = {}  # HTTP headers for remote sources

    # Database sources
    alias: str | None = None
    connection: str | None = None
    db_schema: str | None = Field(default=None, alias="schema")  # e.g., 'public' for postgres


class DocsVisibility:
    """Enum-like constants for docs visibility."""

    EDIT = "edit"  # Show help button only in edit mode (default)
    ALWAYS = "always"  # Always show help button
    NEVER = "never"  # Never show help button, /_docs routes return 404


class Config(BaseModel):
    """Application configuration."""

    sources: dict[str, DataSource] = {}
    docs: str = DocsVisibility.EDIT  # docs visibility: edit, always, never
    title: str = "Lence"  # site title shown in header
    show_source: bool = False  # show source button on pages


def load_yaml(file_path: Path) -> dict[str, Any]:
    """Load a YAML file, returning empty dict if not found."""
    if not file_path.exists():
        return {}
    with open(file_path) as f:
        return yaml.safe_load(f) or {}


def interpolate_env_vars(value: str) -> str:
    """Replace ${VAR} patterns with environment variable values."""

    def replace(match: re.Match[str]) -> str:
        var_name = match.group(1)
        return os.environ.get(var_name, "")

    return re.sub(r"\$\{([^}]+)\}", replace, value)


def load_sources(project_dir: Path) -> dict[str, DataSource]:
    """Load data sources from sources.yaml in project root."""
    data = load_yaml(project_dir / "sources.yaml")
    sources_list = data.get("sources", [])

    result: dict[str, DataSource] = {}
    for source_config in sources_list:
        # Interpolate env vars in headers and connection strings
        if "headers" in source_config:
            source_config["headers"] = {
                k: interpolate_env_vars(v) for k, v in source_config["headers"].items()
            }
        if "connection" in source_config:
            source_config["connection"] = interpolate_env_vars(source_config["connection"])

        source = DataSource(**source_config)

        # Key by table (file sources) or alias (database sources)
        if source.table:
            result[source.table] = source
        elif source.alias:
            result[source.alias] = source
        else:
            raise ValueError(f"Source must have either 'table' or 'alias': {source_config}")

    return result


def load_settings(project_dir: Path) -> dict[str, Any]:
    """Load settings from settings.yaml in project root."""
    return load_yaml(project_dir / "settings.yaml")


def load_config(project_dir: Path | str) -> Config:
    """Load full configuration from project directory."""
    project_dir = Path(project_dir)
    settings = load_settings(project_dir)

    return Config(
        sources=load_sources(project_dir),
        docs=settings.get("docs", DocsVisibility.EDIT),
        title=settings.get("title", "Lence"),
        show_source=settings.get("showSource", False),
    )
