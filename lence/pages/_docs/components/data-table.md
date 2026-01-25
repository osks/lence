# Data Table Component

Renders data as an interactive table with sorting, search, and pagination.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data` | Yes | Name of query or data to display |
| `search` | No | Enable search box (default: false) |
| `pagination` | No | Rows per page (enables pagination) |
| `sort` | No | Enable column sorting (default: true) |

## Basic Table

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

{% dataTable data="products" /%}

``` {% process=false %}
{% dataTable data="products" /%}
```

## With Search and Pagination

{% dataTable data="products" search=true pagination=3 /%}

``` {% process=false %}
{% dataTable data="products" search=true pagination=3 /%}
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
