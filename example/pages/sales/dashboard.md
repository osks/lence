---
title: Sales Dashboard
---

# Sales Dashboard

```sql monthly_sales
SELECT
  strftime(order_date, '%Y-%m') as month,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM orders
GROUP BY 1
ORDER BY 1
```

```sql by_region
SELECT
  region,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM orders
GROUP BY 1
ORDER BY 2 DESC
```

```sql recent_orders
SELECT
  order_id,
  order_date,
  customer_id,
  ROUND(quantity * unit_price, 2) as total,
  status
FROM orders
ORDER BY order_date DESC
LIMIT 10
```

## Monthly Revenue Trend

Revenue over time shows our growth trajectory.

{% line_chart
    data="monthly_sales"
    x="month"
    y="revenue"
    title="Monthly Revenue"
/%}

## Orders by Month

{% bar_chart
    data="monthly_sales"
    x="month"
    y="order_count"
    title="Orders per Month"
/%}

## Revenue by Region

{% pie_chart
    data="by_region"
    x="region"
    y="revenue"
    title="Revenue by Region"
/%}

{% table data="by_region" /%}

## Recent Orders

{% table data="recent_orders" /%}

## Data Table Demo

{% table
    data="recent_orders"
    search=true
    pagination=5
    sort=true
/%}
