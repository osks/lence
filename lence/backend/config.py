"""Configuration loading for Lence."""

from pathlib import Path
from typing import Any
import yaml
from pydantic import BaseModel


class DataSource(BaseModel):
    """A data source configuration."""
    type: str  # csv, parquet, etc.
    path: str
    description: str = ""


class Config(BaseModel):
    """Application configuration."""
    sources: dict[str, DataSource] = {}


def load_yaml(file_path: Path) -> dict[str, Any]:
    """Load a YAML file, returning empty dict if not found."""
    if not file_path.exists():
        return {}
    with open(file_path) as f:
        return yaml.safe_load(f) or {}


def load_sources(project_dir: Path) -> dict[str, DataSource]:
    """Load data sources from sources/sources.yaml."""
    data = load_yaml(project_dir / "sources" / "sources.yaml")
    sources_data = data.get("sources", {})
    return {
        name: DataSource(**source_config)
        for name, source_config in sources_data.items()
    }


def load_config(project_dir: Path | str) -> Config:
    """Load full configuration from project directory."""
    project_dir = Path(project_dir)
    return Config(
        sources=load_sources(project_dir),
    )
