# Lence v2 - Requirements & Vision

## Background

The original Lence used SSR with Node.js, Hono, and Vite. Key learnings:
- DuckDB on the backend is valuable
- The JS build system (Vite) added complexity - different dev vs prod behavior
- Want simpler 1-1 TypeScript compilation for frontend
- SSR added complexity that may not be necessary for this use case

## Core Requirements

### Backend: Python + FastAPI + DuckDB

1. **Python backend** using FastAPI
2. **DuckDB** for SQL analytics
3. **Single process** serves everything: static files, APIs, HTML
4. **Same behavior in dev and prod** - no separate bundler process

### Data Architecture

1. **Data sources** defined in configuration with IDs
2. **API endpoint** for SQL queries against DuckDB
3. **Table-like response format** - natural for SQL results
4. **Clear data structure** - easy to understand what data shapes components receive

Example flow:
```
Config: sources.yaml defines "orders" -> /data/orders.csv
API: POST /api/query { source: "orders", sql: "SELECT * FROM orders LIMIT 10" }
Response: { columns: [...], rows: [...] } or similar table structure
```

### Frontend: Bundled with Vite

1. **Vite** bundles TypeScript and dependencies into a single `app.js`
2. **npm dependencies** - Lit, ECharts, Markdoc installed via npm
3. **Web Components with Lit** - preferred for encapsulation
4. **Same output in dev and prod** - Vite build produces identical bundle

### Components to Experiment With

**Tables:**
- DataTables.js wrapped in Lit component
- TanStack Table
- Simple custom table component
- AG Grid (if needed later)

**Charts:**
- ECharts (current)
- Chart.js
- Plotly
- Observable Plot
- ApexCharts

Goal: Create components for several libraries to compare and decide later.

### CSS Framework

Need a CSS framework that:
- Provides decent default styling with minimal effort
- Works well with Shadow DOM / web components
- Preferably uses CSS custom properties

Options to consider:
- **Pico CSS** - Minimal, classless, uses CSS variables
- **Open Props** - Design tokens as CSS variables (current choice)
- **Tailwind** - Utility classes (may conflict with Shadow DOM)
- **Bulma** - Simple, no JS, CSS only
- **MVP.css** - Classless, minimal

Recommendation: **Pico CSS** or **Open Props** work well with web components.

### Page Layout

1. **Layout separate from markdown** - shell with header, sidebar, main content
2. **Sidebar menu** - could be defined in config or separate markdown
3. **Content area** where page markdown renders
4. **Responsive** - works on mobile

### Markdown Rendering

**Current Implementation:** Browser-side rendering with Markdoc
- Fetch markdown files via API
- Parse with Markdoc in the browser
- Custom tags (`{% query %}`, `{% chart %}`, `{% table %}`) render to web components
- Components fetch data and render

### Development Experience

1. **Single command** to start everything: `make dev`
2. **File watching** via Vite for TypeScript changes
3. **Auto-reload** via uvicorn for Python changes
4. **Clear error messages** when queries fail

### API Design

```
GET  /                      # Serves index.html (SPA shell)
GET  /static/*              # Static files (JS, CSS, images)
GET  /pages/*               # Raw markdown files
POST /api/query             # Execute SQL query
GET  /api/sources           # List available data sources
GET  /api/sources/{id}      # Get source metadata
```

Query request:
```json
{
  "source": "orders",
  "sql": "SELECT strftime(order_date, '%Y-%m') as month, SUM(amount) as revenue FROM orders GROUP BY 1"
}
```

Query response (table-like):
```json
{
  "columns": [
    { "name": "month", "type": "VARCHAR" },
    { "name": "revenue", "type": "DOUBLE" }
  ],
  "data": [
    ["2024-01", 15000.0],
    ["2024-02", 18500.0]
  ],
  "row_count": 2
}
```

### Non-Goals (for this PoC)

- Production-grade security (SQL injection prevention beyond basics)
- Authentication/authorization
- Multi-tenant deployment
- SSR (server-side rendering)

## Success Criteria

1. Can define data sources in config
2. Can write SQL queries that return table data
3. Can render charts and tables with that data
4. Can write narrative in markdown with embedded components
5. Single Python process serves everything
6. Easy to understand the full data flow
