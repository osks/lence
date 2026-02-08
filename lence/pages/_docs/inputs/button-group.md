---
title: Button Group
---

# Button Group Component

A group of buttons for single-select filtering. Similar to a dropdown but displays all options as horizontal buttons.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Input name for binding in SQL |
| `data` | No | Query name to populate options |
| `value` | No | Column name for option values |
| `label` | No | Column name for option labels (defaults to value column) |
| `title` | No | Label displayed above button group |
| `defaultValue` | No | Initial selected value |

## Basic Example with Inline Data

{% data name="demo_statuses" %}
{
  "columns": [{"name": "status", "type": "VARCHAR"}],
  "data": [["All"], ["Active"], ["Pending"], ["Closed"]]
}
{% /data %}

{% button_group
    name="demo_status_filter"
    data="{demo_statuses}"
    value="status"
    title="Status"
/%}

``` {% process=false %}
{% button_group
    name="status_filter"
    data="{statuses}"
    value="status"
    title="Status"
/%}
```

## How It Works

Reference the selected value in SQL using `${inputs.name.value}`:

```sql {% process=false %}
SELECT * FROM orders
WHERE status = '${inputs.status_filter.value}'
```

## With Default Value

Use `defaultValue` to set the initial selection:

``` {% process=false %}
{% button_group
    name="status_filter"
    data="{statuses}"
    value="status"
    defaultValue="Active"
/%}
```

## Separate Value and Label Columns

When your query has different columns for the stored value and display label:

```markdown {% process=false %}
{% button_group
    name="region"
    data="{regions}"
    value="id"
    label="name"
    title="Region"
/%}
```

```sql {% process=false %}
-- Populate options
SELECT id, name FROM regions ORDER BY name

-- Filter by selection
SELECT * FROM orders
WHERE region_id = '${inputs.region.value}'
```

## Full Example

```markdown {% process=false %}
{% button_group
    name="status"
    data="{order_statuses}"
    value="status"
    title="Filter by Status"
    defaultValue="Active"
/%}

{% datatable data="{filtered_orders}" /%}
```

```sql {% process=false %}
-- Populate button options
SELECT DISTINCT status FROM orders ORDER BY status

-- Filtered results
SELECT * FROM orders
WHERE status = '${inputs.status.value}'
```
