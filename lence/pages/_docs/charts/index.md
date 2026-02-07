---
title: Charts
---

# Charts

Lence provides chart components for data visualization.

## Available Charts

- [Line/Bar/Pie Charts](/_docs/charts/chart) - Standard chart types
- [Area Chart](/_docs/charts/area-chart) - Area charts with stacking support
- [Gantt Chart](/_docs/charts/gantt) - Timeline/Gantt charts for milestones and tasks

## Usage

Charts receive data from SQL queries:

``` {% process=false %}
```sql sales
SELECT month, revenue FROM monthly_sales
```

{% chart data="sales" type="line" x="month" y="revenue" /%}
```
