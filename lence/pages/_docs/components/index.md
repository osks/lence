# Component Reference

Lence provides web components for data visualization.

## Available Components

### Inputs

- [Dropdown](/_docs/components/dropdown) - Dropdown filter for reactive query filtering

### Visualizations

- [Chart](/_docs/components/chart) - Line, bar, pie, and scatter charts
- [Area Chart](/_docs/components/area-chart) - Area charts with stacking support
- [Gantt](/_docs/components/gantt) - Timeline/Gantt charts for milestones and tasks
- [Data Table](/_docs/components/data-table) - Interactive tables with sorting, search, and pagination

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
