# Data Table Component

Full-featured table with search, pagination, and sorting. Works correctly in shadow DOM environments.

``` {% process=false %}
{% dataTable data="query_name" search=true pagination=10 /%}
```

## Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data` | Yes | - | Name of query or data to display |
| `search` | No | `false` | Set `search=true` to show a search box above the table |
| `pagination` | No | disabled | Set `pagination=N` to show N rows per page with pagination controls |
| `sort` | No | `true` | Set `sort=false` to disable column sorting |

## Basic Data Table

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
    ["Mouse", "Electronics", 49.99, 80],
    ["Keyboard", "Electronics", 89.99, 65],
    ["Jeans", "Clothing", 59.99, 150],
    ["Blender", "Appliances", 49.99, 40],
    ["Notebook", "Books", 9.99, 300]
  ]
}
{% /data %}

{% dataTable data="products" /%}

``` {% process=false %}
{% dataTable data="products" /%}
```

## With Search

{% dataTable data="products" search=true /%}

``` {% process=false %}
{% dataTable data="products" search=true /%}
```

## With Pagination

{% dataTable data="products" pagination=5 /%}

``` {% process=false %}
{% dataTable data="products" pagination=5 /%}
```

## Full Featured

Search and pagination combined.

{% dataTable data="products" search=true pagination=5 /%}

``` {% process=false %}
{% dataTable data="products" search=true pagination=5 /%}
```
