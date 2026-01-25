---
title: Components
---

# Component Reference

Lence provides web components for data visualization.

## Available Components

### Inputs

- [Dropdown](/_docs/components/dropdown) - Dropdown filter for reactive query filtering
- [Checkbox](/_docs/components/checkbox) - Boolean toggle for filtering

### Visualizations

- [Charts](/_docs/components/chart) - Line, bar, pie, and scatter charts
- [Area Chart](/_docs/components/area-chart) - Area charts with stacking support
- [Gantt Chart](/_docs/components/gantt) - Timeline/Gantt charts for milestones and tasks
- [Table](/_docs/components/table) - Interactive tables with sorting, search, and pagination

## Usage

Components receive data from SQL queries or inline data:

``` {% process=false %}
```sql sales
SELECT month, revenue FROM monthly_sales
```

{% line_chart data="sales" x="month" y="revenue" /%}
```

For static data (no database):

``` {% process=false %}
{% data name="demo" %}
{
  "columns": [{"name": "x", "type": "VARCHAR"}, {"name": "y", "type": "DOUBLE"}],
  "data": [["A", 10], ["B", 20]]
}
{% /data %}

{% bar_chart data="demo" x="x" y="y" /%}
```
