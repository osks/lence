# Welcome to Lence

Your Lence server is running successfully.

## Getting Started

Create a `pages/index.md` file in your project to replace this page.

```
my-project/
├── sources.yaml       ← Define data sources
├── sources/
│   └── sales.csv      ← Your data files
└── pages/
    └── index.md       ← Your pages
```

## Features

- **Markdown** - Write content with Markdoc syntax
- **SQL Queries** - Query Parquet, Postgres, CSV, JSON, HTTP APIs with DuckDB
- **Charts** - Line, bar, pie, and more with ECharts
- **Tables** - Interactive data tables with search and pagination

## Syntax

Define queries and visualizations using Markdoc tags:

- `query` - Define a SQL query with `name` and `source` attributes
- `chart` - Render a chart with `data`, `type`, `x`, and `y` attributes
- `dataTable` - Render a data table with `data` attribute
- `data` - Define inline static data (no database needed)

## Documentation

Click the **?** button in the sidebar to access component documentation and examples.
