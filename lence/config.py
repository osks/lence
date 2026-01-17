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


class MenuItem(BaseModel):
    """A menu item, possibly with children."""
    title: str
    path: str | None = None
    children: list["MenuItem"] = []


class Config(BaseModel):
    """Application configuration."""
    sources: dict[str, DataSource] = {}
    menu: list[MenuItem] = []


def load_yaml(file_path: Path) -> dict[str, Any]:
    """Load a YAML file, returning empty dict if not found."""
    if not file_path.exists():
        return {}
    with open(file_path) as f:
        return yaml.safe_load(f) or {}


def load_sources(config_dir: Path) -> dict[str, DataSource]:
    """Load data sources from sources.yaml."""
    data = load_yaml(config_dir / "sources.yaml")
    sources_data = data.get("sources", {})
    return {
        name: DataSource(**source_config)
        for name, source_config in sources_data.items()
    }


def load_menu(config_dir: Path) -> list[MenuItem]:
    """Load menu structure from menu.yaml."""
    data = load_yaml(config_dir / "menu.yaml")
    menu_data = data.get("menu", [])
    return [MenuItem(**item) for item in menu_data]


def load_config(config_dir: Path | str) -> Config:
    """Load full configuration from config directory."""
    config_dir = Path(config_dir)
    return Config(
        sources=load_sources(config_dir),
        menu=load_menu(config_dir),
    )
