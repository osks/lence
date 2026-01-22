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
lence dev
```

Open http://localhost:8000 in your browser.

## Commands

### `lence dev`

Run development server with auto-reload.

```bash
lence dev [PROJECT] [--host HOST] [--port PORT]
```

- `PROJECT` - Path to project directory (default: current directory)
- `--host` - Host to bind to (default: 127.0.0.1)
- `--port` - Port to bind to (default: 8000)

In dev mode:
- Pages auto-reload on changes
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

### `lence init`

Initialize a new project with example files.

```bash
lence init [PROJECT]
```

Creates:
- `pages/` directory with example page
- `sources.yaml` with example data source
