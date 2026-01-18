# Area Chart Component

Renders data as area charts with support for multiple series and stacking.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data` | Yes | Name of query or data to visualize |
| `x` | Yes | Column name for x-axis |
| `y` | Yes | Column name(s) for y-axis. Use comma-separated names for multiple series |
| `title` | No | Chart title |
| `stacked` | No | Enable stacking for multiple series (default: false) |

## Single Series

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

{% areaChart data="monthly" x="month" y="revenue" title="Monthly Revenue" /%}

``` {% process=false %}
{% areaChart data="monthly" x="month" y="revenue" title="Monthly Revenue" /%}
```

## Multiple Series (Overlapping)

{% data name="metrics" %}
{
  "columns": [
    {"name": "month", "type": "VARCHAR"},
    {"name": "revenue", "type": "DOUBLE"},
    {"name": "costs", "type": "DOUBLE"},
    {"name": "profit", "type": "DOUBLE"}
  ],
  "data": [
    ["Jan", 45000, 32000, 13000],
    ["Feb", 52000, 35000, 17000],
    ["Mar", 48000, 33000, 15000],
    ["Apr", 61000, 40000, 21000],
    ["May", 58000, 38000, 20000],
    ["Jun", 72000, 45000, 27000]
  ]
}
{% /data %}

{% areaChart data="metrics" x="month" y="revenue,costs,profit" title="Financial Metrics" /%}

``` {% process=false %}
{% areaChart data="metrics" x="month" y="revenue,costs,profit" title="Financial Metrics" /%}
```

## Stacked Areas

Use `stacked=true` to stack multiple series on top of each other:

{% data name="breakdown" %}
{
  "columns": [
    {"name": "month", "type": "VARCHAR"},
    {"name": "product_a", "type": "DOUBLE"},
    {"name": "product_b", "type": "DOUBLE"},
    {"name": "product_c", "type": "DOUBLE"}
  ],
  "data": [
    ["Jan", 15000, 18000, 12000],
    ["Feb", 17000, 20000, 15000],
    ["Mar", 16000, 19000, 13000],
    ["Apr", 21000, 24000, 16000],
    ["May", 20000, 22000, 16000],
    ["Jun", 25000, 28000, 19000]
  ]
}
{% /data %}

{% areaChart data="breakdown" x="month" y="product_a,product_b,product_c" stacked=true title="Revenue by Product (Stacked)" /%}

``` {% process=false %}
{% areaChart data="breakdown" x="month" y="product_a,product_b,product_c" stacked=true /%}
```

## Features

- **Multiple series**: Specify comma-separated column names in `y` attribute
- **Stacking**: Set `stacked=true` to stack areas
- **Legend**: Automatically shown when multiple series are present
- **Tooltips**: Shows values for all series at the hovered x position
- **Smooth curves**: Areas use smooth interpolation
