---
title: Project Structure
---

# Project Structure

A Lence project has this layout:

```
my-project/
├── pages/           # Markdown pages (required)
│   ├── index.md     # Home page (/)
│   ├── sales.md     # /sales
│   └── sales/
│       ├── index.md # /sales (alternative to sales.md)
│       └── report.md # /sales/report
├── sources/         # Local data files
│   ├── orders.csv
│   └── customers.parquet
├── sources.yaml     # Data source configuration
└── settings.yaml    # Site settings (optional)
```

## Pages

Markdown files in `pages/` become routes:

| File | URL |
|------|-----|
| `pages/index.md` | `/` |
| `pages/about.md` | `/about` |
| `pages/sales/index.md` | `/sales` |
| `pages/sales/report.md` | `/sales/report` |

Pages use Markdoc syntax with special tags for charts, tables, and inputs.

### Frontmatter

Each page can have YAML frontmatter:

```markdown
---
title: Sales Report
---

# Sales Report

Page content here...
```

- `title` - Page title (shown in menu and browser tab)

## Sources

Data sources are configured in `sources.yaml`:

```yaml
sources:
  - table: orders
    type: csv
    path: sources/orders.csv
    description: Order data

  - table: api_data
    type: parquet
    path: https://example.com/data.parquet
```

See [Sources](/_docs/sources) for details.

## Settings

Optional `settings.yaml` for site configuration:

```yaml
title: My Analytics
docs: dev
showSource: true
```

See [Settings](/_docs/settings) for all options.

## Menu Structure

The sidebar menu is auto-generated from your `pages/` directory structure. Directories become collapsible sections, with titles from their `index.md` frontmatter.
