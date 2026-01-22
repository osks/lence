"""Configuration loading for Lence."""

import os
import re
from pathlib import Path
from typing import Any
import yaml
from pydantic import BaseModel


class DataSource(BaseModel):
    """A data source configuration."""
    id: str
    type: str  # csv, parquet, etc.
    path: str
    description: str = ""
    headers: dict[str, str] = {}  # HTTP headers for remote sources


class DocsVisibility:
    """Enum-like constants for docs visibility."""
    DEV = "dev"      # Show help button only in dev mode (default)
    ALWAYS = "always"  # Always show help button
    NEVER = "never"   # Never show help button, /_docs routes return 404


class Config(BaseModel):
    """Application configuration."""
    sources: dict[str, DataSource] = {}
    docs: str = DocsVisibility.DEV  # docs visibility: dev, always, never
    title: str = "Lence"  # site title shown in header


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
    return re.sub(r'\$\{([^}]+)\}', replace, value)


def load_sources(project_dir: Path) -> dict[str, DataSource]:
    """Load data sources from sources.yaml in project root."""
    data = load_yaml(project_dir / "sources.yaml")
    sources_list = data.get("sources", [])

    result: dict[str, DataSource] = {}
    for source_config in sources_list:
        # Interpolate env vars in headers
        if "headers" in source_config:
            source_config["headers"] = {
                k: interpolate_env_vars(v)
                for k, v in source_config["headers"].items()
            }

        source = DataSource(**source_config)
        result[source.id] = source

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
        docs=settings.get("docs", DocsVisibility.DEV),
        title=settings.get("title", "Lence"),
    )
