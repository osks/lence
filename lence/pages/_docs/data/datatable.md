---
title: Data Table
---

# Data Table

Renders data as an interactive table with sorting, search, and pagination.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data` | Yes | Name of query or data to display |
| `search` | No | Enable search box (default: false) |
| `rows` | No | Number of rows to show (default: 10). Use `all` to show all rows. |
| `sortable` | No | Enable column sorting (default: true) |

## Basic Usage

Click column headers to sort.

{% data name="products" %}
{
  "columns": [
    {"name": "name", "type": "VARCHAR"},
    {"name": "category", "type": "VARCHAR"},
    {"name": "price", "type": "DOUBLE"},
    {"name": "stock", "type": "INTEGER"}
  ],
  "data": [
    ["Laptop", "Electronics", 999.99, 45],
    ["Headphones", "Electronics", 149.99, 120],
    ["T-Shirt", "Clothing", 29.99, 200],
    ["Coffee Maker", "Appliances", 79.99, 35],
    ["Book", "Books", 19.99, 500],
    ["Mouse", "Electronics", 49.99, 80]
  ]
}
{% /data %}

{% datatable data="{products}" /%}

``` {% process=false %}
{% datatable data="{products}" /%}
```

## With Search and Pagination

{% datatable data="{products}" search=true rows="3" /%}

``` {% process=false %}
{% datatable data="{products}" search=true rows="3" /%}
```

## Column Configuration

Use `{% column %}` tags to control which columns are displayed and how they render.

### Column Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Column name from the data |
| `title` | No | Override the column header text |
| `contentType` | No | Set to `link` to render as clickable link |
| `linkLabel` | No | Text for link. Use `{column}` to reference another column's value |
| `align` | No | Text alignment: `left`, `center`, or `right` |

### Selecting Columns

Show only specific columns with custom titles:

``` {% process=false %}
{% datatable data="{products}" %}
  {% column id="name" title="Product" /%}
  {% column id="price" title="Price ($)" align="right" /%}
{% /datatable %}
```

### Link Columns

Render a column as a clickable link:

{% data name="links_demo" %}
{
  "columns": [
    {"name": "title", "type": "VARCHAR"},
    {"name": "url", "type": "VARCHAR"}
  ],
  "data": [
    ["Anthropic", "https://anthropic.com"],
    ["GitHub", "https://github.com"]
  ]
}
{% /data %}

{% datatable data="{links_demo}" %}
  {% column id="title" /%}
  {% column id="url" contentType="link" linkLabel="Visit" /%}
{% /datatable %}

``` {% process=false %}
{% datatable data="{links_demo}" %}
  {% column id="title" /%}
  {% column id="url" contentType="link" linkLabel="Visit" /%}
{% /datatable %}
```

Use `{column}` syntax to use another column's value as the link text:

``` {% process=false %}
{% datatable data="{data}" %}
  {% column id="url" contentType="link" linkLabel="{title}" /%}
{% /datatable %}
```

## Data Format

Tables expect data in the standard query result format:

```json
{
  "columns": [
    {"name": "column_name", "type": "VARCHAR"},
    {"name": "amount", "type": "DOUBLE"}
  ],
  "data": [
    ["Row 1", 100.50],
    ["Row 2", 200.75]
  ]
}
```

Supported types: `VARCHAR`, `INTEGER`, `DOUBLE`, `DATE`, `BOOLEAN`
