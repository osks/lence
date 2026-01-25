---
title: Getting Started
---

# Getting Started

## Installation

```bash
pip install lence
```

## Quick Start

Create a new project:

```bash
lence init my-project
cd my-project
lence edit
```

Open http://localhost:8000 in your browser.

## Commands

### `lence init`

Initialize a new project.

```bash
lence init [PROJECT]
```

Creates:
- `pages/` directory with example page
- `sources.yaml` with example data source

### `lence edit`

Run editor with live preview and auto-reload.

```bash
lence edit [PROJECT] [--host HOST] [--port PORT]
```

- `PROJECT` - Path to project directory (default: current directory)
- `--host` - Host to bind to (default: 127.0.0.1)
- `--port` - Port to bind to (default: 8000)

In edit mode:
- An "Edit" button appears in the page header
- Click to open a split view with the page markdown on the left and live preview on the right
- SQL queries execute directly, allowing immediate feedback as you write
- Changes are saved to the markdown file automatically
- Pages auto-reload on file changes
- Docs link is visible (unless `docs: never` in settings)

### `lence serve`

Run production server.

```bash
lence serve [PROJECT] [--host HOST] [--port PORT] [--workers N]
```

- `PROJECT` - Path to project directory (default: current directory)
- `--host` - Host to bind to (default: 0.0.0.0)
- `--port` - Port to bind to (default: 8000)
- `--workers` - Number of worker processes (default: 1)
