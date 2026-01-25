# Lence

Lightweight BI as code and data visualization framework. Write
markdown pages with SQL queries, render charts and tables.

## Quick Start

```bash
# Set up environment
make env

# Run development server
make dev
```

Then open http://localhost:8000

## Usage

```bash
# Install lence
pip install lence

# Create a new project
lence init my-project
cd my-project

# Run development server
lence edit
```

## Example Page

Create `pages/dashboard.md`:

````markdown
# Sales Dashboard

```sql monthly
SELECT strftime(date, '%Y-%m') as month, SUM(amount) as total
FROM orders GROUP BY 1
```

{% line_chart data="monthly" x="month" y="total" /%}

{% table data="monthly" /%}
````

## Tech Stack

- **Backend**: Python, FastAPI, DuckDB
- **Frontend**: TypeScript, Lit, Vite
- **Syntax**: Markdoc
