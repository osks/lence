"""Command-line interface for Lence."""

import os
import shutil
from pathlib import Path

import click
import uvicorn

from lence.backend.app import create_app, PACKAGE_DIR


# Environment variable for project path (used by app factory for reload)
LENCE_PROJECT_ENV = "LENCE_PROJECT_DIR"


def _create_app_from_env():
    """Factory function for uvicorn reload - reads project path from env."""
    project_dir = os.environ.get(LENCE_PROJECT_ENV, ".")
    return create_app(project_dir)


@click.group()
@click.version_option()
def cli():
    """Lence - A lightweight data visualization framework."""
    pass


@cli.command()
@click.argument("project", default=".", type=click.Path())
@click.option("--host", default="127.0.0.1", help="Host to bind to")
@click.option("--port", default=8000, help="Port to bind to")
def dev(project: str, host: str, port: int):
    """Run development server with auto-reload.

    PROJECT is the path to your lence project (default: current directory).
    """
    project_path = Path(project).resolve()

    if not (project_path / "pages").exists():
        click.echo(f"Error: No pages/ directory found in {project_path}", err=True)
        click.echo("Run 'lence init' to create a new project, or specify a valid project path.", err=True)
        raise SystemExit(1)

    click.echo(f"Starting Lence dev server for: {project_path}")
    click.echo(f"Running at: http://{host}:{port}")

    # Set project path in environment for the factory function
    os.environ[LENCE_PROJECT_ENV] = str(project_path)

    # Use factory string for reload support
    uvicorn.run(
        "lence.cli:_create_app_from_env",
        factory=True,
        host=host,
        port=port,
        reload=True,
        reload_dirs=[str(project_path / "pages")],
    )


@cli.command()
@click.argument("project", default=".", type=click.Path())
@click.option("--host", default="0.0.0.0", help="Host to bind to")
@click.option("--port", default=8000, help="Port to bind to")
@click.option("--workers", default=1, help="Number of worker processes")
def serve(project: str, host: str, port: int, workers: int):
    """Run production server.

    PROJECT is the path to your lence project (default: current directory).
    """
    project_path = Path(project).resolve()

    if not (project_path / "pages").exists():
        click.echo(f"Error: No pages/ directory found in {project_path}", err=True)
        raise SystemExit(1)

    click.echo(f"Starting Lence server for: {project_path}")
    click.echo(f"Running at: http://{host}:{port}")

    app = create_app(project_path)
    uvicorn.run(app, host=host, port=port, workers=workers)


@cli.command()
@click.argument("project", default=".", type=click.Path())
def init(project: str):
    """Initialize a new Lence project.

    Creates the basic directory structure with example files.
    """
    project_path = Path(project).resolve()

    # Create directories
    dirs = ["pages", "data", "config", "static"]
    for dir_name in dirs:
        (project_path / dir_name).mkdir(parents=True, exist_ok=True)

    # Create example index page
    index_page = project_path / "pages" / "index.md"
    if not index_page.exists():
        index_page.write_text("""\
# Welcome to Lence

This is your first page. Edit `pages/index.md` to customize it.

## Getting Started

1. Add data files to the `data/` directory
2. Configure data sources in `config/sources.yaml`
3. Create pages in the `pages/` directory using Markdoc syntax

## Example Query

```sql
SELECT 'Hello, Lence!' as message
```
""")

    # Create sources.yaml
    sources_file = project_path / "config" / "sources.yaml"
    if not sources_file.exists():
        sources_file.write_text("""\
# Data sources configuration
# Add your data sources here

sources: {}
  # example:
  #   type: csv
  #   path: data/example.csv
  #   description: Example data source
""")

    # Create menu.yaml
    menu_file = project_path / "config" / "menu.yaml"
    if not menu_file.exists():
        menu_file.write_text("""\
# Sidebar menu configuration

menu:
  - title: Home
    path: /
""")

    # Copy index.html template if it exists in package
    package_template = PACKAGE_DIR / "templates" / "index.html"
    project_index = project_path / "static" / "index.html"
    if package_template.exists() and not project_index.exists():
        shutil.copy(package_template, project_index)

    click.echo(f"Initialized Lence project at: {project_path}")
    click.echo("")
    click.echo("Next steps:")
    click.echo("  1. Add data files to data/")
    click.echo("  2. Configure sources in config/sources.yaml")
    click.echo("  3. Edit pages in pages/")
    click.echo("  4. Run 'lence dev' to start the development server")


def main():
    """Entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()
