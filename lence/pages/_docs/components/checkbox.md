---
title: Checkbox
---

# Checkbox Component

A boolean toggle input for filtering queries. When toggled, queries using `${inputs.name.value}` are automatically re-executed.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Input name for binding in SQL |
| `label` | Yes | Text displayed next to the checkbox |
| `title` | No | Label displayed above the checkbox |
| `defaultValue` | No | Initial state: `true` or `false` (default: false) |

## Basic Example

{% checkbox
    name="active_only"
    label="Show active only"
    defaultValue=true
/%}

``` {% process=false %}
{% checkbox
    name="active_only"
    label="Show active only"
    defaultValue=true
/%}
```

## How It Works

The checkbox value is `'true'` or `'false'` (as strings). Use it in SQL conditions:

``` {% process=false %}
```sql filtered
SELECT * FROM items
WHERE '${inputs.active_only.value}' = 'false'
   OR status = 'active'
```
```

When the checkbox is:
- **Checked** (`'true'`): Only active items are shown
- **Unchecked** (`'false'`): All items are shown (the `OR` condition short-circuits)

## Full Example

``` {% process=false %}
{% checkbox
    name="only_planned"
    title="Filter"
    label="Only with dates"
    defaultValue=true
/%}

```sql milestones
SELECT title, start_date, due_date
FROM milestones
WHERE '${inputs.only_planned.value}' = 'false'
   OR (start_date IS NOT NULL OR due_date IS NOT NULL)
```

{% table data="milestones" /%}
```

## Combining with Dropdown

Checkboxes work well alongside dropdowns for multi-dimensional filtering:

``` {% process=false %}
{% dropdown
    name="status"
    data="statuses"
    value="status"
    title="Status"
/%}

{% checkbox
    name="recent_only"
    label="Last 30 days"
/%}

```sql filtered
SELECT * FROM orders
WHERE status LIKE '${inputs.status.value}'
  AND ('${inputs.recent_only.value}' = 'false'
       OR order_date >= CURRENT_DATE - INTERVAL 30 DAY)
```
```
