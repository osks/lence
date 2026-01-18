# Lence

Lightweight data visualization framework. Write markdown pages with SQL queries, render charts and tables.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, DuckDB
- **Frontend**: TypeScript, Lit web components, Vite
- **Syntax**: Markdown (Markdoc)

## Commands

```bash
make dev      # Run dev server (Vite watch + FastAPI)
make build    # Build for production
make test     # Run Python tests (pytest)
npm test      # Run JS tests (vitest)
```

Dev server runs at http://localhost:8000

## Project Structure

```
lence/              # Python package
  cli.py            # CLI (lence dev/serve/init)
  backend/          # FastAPI backend
    app.py          # FastAPI app factory
    api.py          # Query API routes
    pages.py        # Page/SPA routes
    config.py       # Config loading
    database.py     # DuckDB wrapper
  frontend/         # TypeScript source
    app.ts          # Entry point
    components/     # Lit web components
  static/js/        # Vite output (bundled app.js)
  pages/            # Default pages
  templates/        # HTML templates

tests/
  frontend/         # Vitest (JS tests)
  backend/          # pytest (Python tests)
  e2e/              # Playwright (future)

example/            # Example project for development
  pages/            # Markdown pages
  data/             # CSV files
  config/           # sources.yaml
```

## Request Flow

1. Browser loads `/` → FastAPI serves `index.html`
2. Browser loads `/static/lence/js/app.js` → Bundled frontend
3. Frontend fetches `/pages/index.md` → Raw markdown
4. Frontend parses Markdoc, renders components
5. Components call `/api/query` → DuckDB executes SQL

## Markdoc Syntax

```markdown
{% query name="monthly" source="orders" %}
SELECT strftime(date, '%Y-%m') as month, SUM(amount) as total
FROM orders GROUP BY 1
{% /query %}

{% chart data="monthly" type="line" x="month" y="total" /%}

{% table data="monthly" /%}

{% gridTable data="monthly" search=true pagination=10 /%}
```

### Code Examples in Docs

To show Markdoc tags in code blocks without them being parsed, use `{% process=false %}`:

````markdown
```markdown {% process=false %}
{% table data="example" /%}
```
````

## Query API

```
POST /api/query
{ "source": "orders", "sql": "SELECT ..." }

Response:
{
  "columns": [{ "name": "month", "type": "VARCHAR" }, ...],
  "data": [["2024-01", 15000], ...],
  "row_count": 2
}
```

## Adding a New Component

When adding a new Lit component that receives query data:

1. **Create component** in `lence/frontend/components/<name>/<name>.ts`
2. **Import** in `lence/frontend/app.ts`
3. **Add Markdoc tag** in `lence/frontend/markdoc/index.ts` (in `tags` object)
4. **Update extractComponents** in `markdoc/index.ts` to recognize the new tag name
5. **Update page.ts** - add to `querySelectorAll` in `updateComponentData()` and CSS selector
6. **Add reference docs** in `lence/pages/_reference/components/<name>.md` and update the index

Components receive data via the `data` property (type `QueryResult`):
```typescript
@property({ attribute: false })
data?: QueryResult;  // { columns: Column[], data: unknown[][], row_count: number }
```

## Testing

- **Backend**: `make test` or `uv run pytest` (tests/backend/)
- **Frontend**: `npm test` (tests/frontend/)
