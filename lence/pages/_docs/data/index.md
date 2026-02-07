---
title: Data
---

# Data Display

Components for displaying data in tabular format.

## Available Components

- [Table](/_docs/data/table) - Interactive tables with sorting, search, and pagination

## Usage

Tables receive data from SQL queries:

``` {% process=false %}
```sql orders
SELECT id, customer, amount, date FROM orders
```

{% dataTable data="orders" search=true pagination=10 /%}
```
