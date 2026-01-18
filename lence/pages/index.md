# Welcome to Lence

Your Lence server is running successfully.

## Getting Started

Create a `pages/index.md` file in your project to replace this page.

```
my-project/
├── sources/
│   ├── sources.yaml   ← Define data sources
│   └── sales.csv      ← Your data files
└── pages/
    └── index.md       ← Your pages
```

## Features

- **SQL Queries** - Query CSV files with DuckDB
- **Charts** - Line, bar, pie, and more with ECharts
- **Tables** - Sortable data tables
- **Markdown** - Write content with Markdoc syntax

## Syntax

Define queries and visualizations using Markdoc tags:

- `query` - Define a SQL query with `name` and `source` attributes
- `chart` - Render a chart with `data`, `type`, `x`, and `y` attributes
- `table` - Render a data table with `data` attribute
- `data` - Define inline static data (no database needed)

## Reference

- [Component Reference](/_reference/components) - Chart and table component documentation with examples
