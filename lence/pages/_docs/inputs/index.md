---
title: Inputs
---

# Inputs

Input components allow users to filter and interact with data.

## Available Inputs

- [Dropdown](/_docs/inputs/dropdown) - Dropdown select for filtering
- [Button Group](/_docs/inputs/button-group) - Button group for single-select filtering
- [Checkbox](/_docs/inputs/checkbox) - Boolean toggle for filtering

## Usage

Inputs are referenced in SQL queries using `${inputs.name.value}`:

``` {% process=false %}
{% dropdown name="category" options="Electronics,Clothing,Food" /%}

```sql filtered
SELECT * FROM products WHERE category = '${inputs.category.value}'
```

{% dataTable data="{filtered}" /%}
```
