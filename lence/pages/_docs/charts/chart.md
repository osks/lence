---
title: Charts
---

# Chart Components

Renders data as interactive charts using ECharts. Each chart type has its own tag.

## Common Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data` | Yes | Name of query or data to visualize |
| `x` | Yes | Column name for x-axis |
| `y` | Yes | Column name for y-axis |
| `title` | No | Chart title |

## Line Chart

{% data name="monthly" %}
{
  "columns": [
    {"name": "month", "type": "VARCHAR"},
    {"name": "revenue", "type": "DOUBLE"}
  ],
  "data": [
    ["Jan", 45000],
    ["Feb", 52000],
    ["Mar", 48000],
    ["Apr", 61000],
    ["May", 58000],
    ["Jun", 72000]
  ]
}
{% /data %}

{% line_chart
    data="monthly"
    x="month"
    y="revenue"
    title="Monthly Revenue"
/%}

``` {% process=false %}
{% line_chart
    data="monthly"
    x="month"
    y="revenue"
    title="Monthly Revenue"
/%}
```

## Bar Chart

{% bar_chart
    data="monthly"
    x="month"
    y="revenue"
    title="Revenue by Month"
/%}

``` {% process=false %}
{% bar_chart
    data="monthly"
    x="month"
    y="revenue"
/%}
```

## Area Chart

For simple area charts, use `area_chart`. See the [Area Chart](/pages/_docs/components/area-chart.md) docs for stacked area charts with multiple series.

{% area_chart
    data="monthly"
    x="month"
    y="revenue"
    title="Revenue Trend"
/%}

``` {% process=false %}
{% area_chart
    data="monthly"
    x="month"
    y="revenue"
/%}
```

## Pie Chart

{% data name="categories" %}
{
  "columns": [
    {"name": "category", "type": "VARCHAR"},
    {"name": "sales", "type": "DOUBLE"}
  ],
  "data": [
    ["Electronics", 42000],
    ["Clothing", 28000],
    ["Food", 18000],
    ["Books", 12000],
    ["Other", 8000]
  ]
}
{% /data %}

{% pie_chart
    data="categories"
    x="category"
    y="sales"
    title="Sales by Category"
/%}

``` {% process=false %}
{% pie_chart
    data="categories"
    x="category"
    y="sales"
/%}
```

## Scatter Chart

{% data name="correlation" %}
{
  "columns": [
    {"name": "price", "type": "DOUBLE"},
    {"name": "quantity", "type": "INTEGER"}
  ],
  "data": [
    [10, 120],
    [15, 95],
    [20, 80],
    [25, 72],
    [30, 58],
    [35, 45],
    [40, 38],
    [50, 25]
  ]
}
{% /data %}

{% scatter_chart
    data="correlation"
    x="price"
    y="quantity"
    title="Price vs Quantity"
/%}

``` {% process=false %}
{% scatter_chart
    data="correlation"
    x="price"
    y="quantity"
/%}
```
