---
title: Data
---

# Data Display

Components for displaying data in tabular format.

## Available Components

- [Data Table](/_docs/data/datatable) - Interactive tables with sorting, search, and pagination

## Usage

Tables receive data from SQL queries:

``` {% process=false %}
```sql orders
SELECT id, customer, amount, date FROM orders
```

{% datatable data="{orders}" search=true rows="10" /%}
```
