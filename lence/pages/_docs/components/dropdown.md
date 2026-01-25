---
title: Dropdown
---

# Dropdown Component

A dropdown input that filters queries reactively. When a value is selected, queries using `${inputs.name.value}` are automatically re-executed.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Input name for binding in SQL |
| `data` | No | Query name to populate options |
| `value` | No | Column name for option values |
| `label` | No | Column name for option labels (defaults to value column) |
| `title` | No | Label displayed above dropdown |
| `defaultValue` | No | Initial selected value |
| `placeholder` | No | Text for "All" option (default: "All") |
| `disableSelectAll` | No | Remove the "All" option (default: false) |

## Basic Example

{% data name="categories" %}
{
  "columns": [{"name": "category", "type": "VARCHAR"}],
  "data": [["Electronics"], ["Clothing"], ["Books"]]
}
{% /data %}

{% dropdown
    name="cat_filter"
    data="categories"
    value="category"
    title="Category"
/%}

``` {% process=false %}
{% dropdown
    name="cat_filter"
    data="categories"
    value="category"
    title="Category"
/%}
```

## How It Works

By default, the dropdown includes an "All" option with value `%` (SQL wildcard). Use `LIKE` in your SQL:

``` {% process=false %}
```sql filtered
SELECT * FROM products
WHERE category LIKE '${inputs.cat_filter.value}'
```
```

When user selects:
- "All" → `WHERE category LIKE '%'` → matches everything
- "Books" → `WHERE category LIKE 'Books'` → matches only Books

## Disabling "All" Option

Use `disableSelectAll=true` to require a specific selection:

``` {% process=false %}
{% dropdown
    name="cat_filter"
    data="categories"
    value="category"
    disableSelectAll=true
/%}
```

## Full Example

``` {% process=false %}
```sql categories
SELECT DISTINCT category FROM products ORDER BY category
```

{% dropdown
    name="cat_filter"
    data="categories"
    value="category"
    title="Filter Category"
/%}

```sql filtered_products
SELECT * FROM products
WHERE category LIKE '${inputs.cat_filter.value}'
```

{% table data="filtered_products" /%}
```
