# Lence Development Guide

## Project Structure

```
lence/
├── lence/                     # Python package
│   ├── __init__.py
│   ├── app.py                 # FastAPI app factory
│   ├── cli.py                 # CLI (lence dev/serve/init)
│   ├── config.py              # Config loading
│   ├── database.py            # DuckDB wrapper
│   ├── routes/                # API routes
│   ├── static/                # Static assets (CSS + compiled JS)
│   │   ├── css/
│   │   └── js/                # Vite output (gitignored)
│   ├── templates/             # HTML templates
│   │   └── index.html
│   └── pages/                 # Default pages (fallback)
│       └── index.md
│
├── src/                       # TypeScript source
│   ├── app.ts                 # Main entry point
│   ├── components/            # Lit web components
│   └── ...
│
├── example/                   # Example project for development
│   ├── pages/
│   ├── data/
│   └── config/
│
├── package.json               # Node dependencies + scripts
├── vite.config.ts             # Vite bundler config
├── tsconfig.json              # TypeScript config
├── pyproject.toml             # Python package config
└── Makefile
```

## Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- uv (Python package manager)

### Setup

```bash
make env
```

This runs:
- `uv venv` - Create virtual environment (if needed)
- `uv pip install -e '.[dev]'` - Install Python package in editable mode with dev dependencies
- `npm install` - Install Node dependencies

### Running Development Server

```bash
make dev
```

This runs both:
- **Vite** - Watches TypeScript and rebuilds on changes
- **Lence** - FastAPI server with auto-reload

Both processes run via `concurrently` and shut down cleanly together.

### Building

```bash
make build
```

This runs:
- `npm run build` - Vite bundles TypeScript + dependencies into `lence/static/js/app.js`
- `uv build` - Creates Python wheel with bundled JS

## Architecture

### Frontend (TypeScript)

- **Vite** bundles all TypeScript into a single `app.js`
- Dependencies (Lit, ECharts, Markdoc) are bundled in - no import maps
- Web components built with Lit
- Markdoc parses markdown pages in the browser

### Backend (Python)

- **FastAPI** serves the application
- **DuckDB** executes SQL queries
- **CLI** provides `lence dev`, `lence serve`, `lence init` commands

### Request Flow

1. Browser loads `/` → FastAPI serves `index.html`
2. Browser loads `/static/lence/js/app.js` → Bundled frontend
3. Frontend fetches `/pages/index.md` → Raw markdown
4. Frontend parses Markdoc, renders components
5. Components call `/api/query` → DuckDB executes SQL

### File Resolution

**Pages**: Project pages override bundled defaults
- First checks `<project>/pages/<path>.md`
- Falls back to `lence/pages/<path>.md`

**Static**: Package assets served at `/static/lence/`, project assets at `/static/`

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Run development server |
| `make build` | Build for production |
| `make env` | Set up development environment |
| `make clean` | Remove build artifacts |
| `make test` | Run tests |
| `make lint` | Check code style |
| `make format` | Format code |

## CLI Usage

```bash
# Initialize new project
lence init my-project

# Run development server (current directory)
lence dev

# Run development server (specific project)
lence dev ./my-project

# Run production server
lence serve ./my-project --host 0.0.0.0 --port 8000
```

## Query API

### Request Format

```
POST /api/query
Content-Type: application/json

{
  "source": "orders",
  "sql": "SELECT strftime(date, '%Y-%m') as month, SUM(amount) as revenue FROM orders GROUP BY 1"
}
```

### Response Format

```json
{
  "columns": [
    { "name": "month", "type": "VARCHAR" },
    { "name": "revenue", "type": "DOUBLE" }
  ],
  "data": [
    ["2024-01", 15000.50],
    ["2024-02", 18200.75]
  ],
  "row_count": 2
}
```

This format:
- Is natural for SQL results (columns + rows)
- Easy to transform for charts (extract column by name)
- Easy to display in tables (iterate rows)
- Preserves type information for formatting

## Testing

### Test Structure

```
lence/
├── tests/
│   ├── conftest.py        # Fixtures: test DB, sample data
│   ├── test_config.py     # Config loading tests
│   ├── test_database.py   # DuckDB integration tests
│   └── test_api/
│       └── test_query.py  # Query endpoint tests

src/
├── __tests__/             # Frontend unit tests (if added)
```

### Running Tests

```bash
# Python tests
make test
# or
uv run pytest

# With coverage
uv run pytest --cov=lence --cov-report=html
```

### Test Examples

**Backend fixture pattern:**

```python
# conftest.py
import pytest
import duckdb

@pytest.fixture
def test_db():
    """In-memory DuckDB with sample data"""
    conn = duckdb.connect(":memory:")
    conn.execute("CREATE TABLE orders (id INT, amount DOUBLE, date DATE)")
    conn.execute("INSERT INTO orders VALUES (1, 100.0, '2024-01-01')")
    yield conn
    conn.close()
```

**Query API test:**

```python
def test_query_returns_table_format(client):
    response = client.post("/api/query", json={
        "source": "orders",
        "sql": "SELECT id, amount FROM orders"
    })
    assert response.status_code == 200
    data = response.json()
    assert "columns" in data
    assert "data" in data
    assert "row_count" in data
```

## Security Notes

For development and internal tools:
- Basic SQL injection prevention via parameterized queries
- Queries limited to registered sources only
- No authentication (local development only)

For production deployments, consider:
- Read-only DuckDB connections
- Query timeouts
- Result size limits
- Allowlisted SQL functions
