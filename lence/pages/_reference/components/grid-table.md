# Grid Table Component

Full-featured table powered by Grid.js with search, pagination, and sorting.

## Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data` | Yes | - | Name of query or data to display |
| `search` | No | false | Enable search box |
| `pagination` | No | - | Rows per page (enables pagination) |
| `sort` | No | true | Enable column sorting |

## Basic Grid Table

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

{% gridTable data="products" /%}

``` {% process=false %}
{% gridTable data="products" /%}
```

## With Search

{% gridTable data="products" search=true /%}

``` {% process=false %}
{% gridTable data="products" search=true /%}
```

## With Pagination

{% gridTable data="products" pagination=5 /%}

``` {% process=false %}
{% gridTable data="products" pagination=5 /%}
```

## Full Featured

Search and pagination combined.

{% gridTable data="products" search=true pagination=5 /%}

``` {% process=false %}
{% gridTable data="products" search=true pagination=5 /%}
```
