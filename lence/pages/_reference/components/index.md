# Component Reference

Lence provides web components for data visualization.

## Available Components

- [Chart](/_reference/components/chart) - Line, bar, pie, area, and scatter charts
- [Table](/_reference/components/table) - Sortable data tables
- [Grid Table](/_reference/components/grid-table) - Full-featured table with search and pagination

## Usage

Components receive data from `{% query %}` or `{% data %}` tags:

``` {% process=false %}
{% query name="sales" source="orders" %}
SELECT month, revenue FROM monthly_sales
{% /query %}

{% chart data="sales" type="line" x="month" y="revenue" /%}
```

For static data (no database):

``` {% process=false %}
{% data name="demo" %}
{
  "columns": [{"name": "x", "type": "VARCHAR"}, {"name": "y", "type": "DOUBLE"}],
  "data": [["A", 10], ["B", 20]]
}
{% /data %}

{% chart data="demo" type="bar" x="x" y="y" /%}
```
