---
title: Dashboard
---

# Company Dashboard

```sql summary
SELECT
  COUNT(DISTINCT order_id) as total_orders,
  COUNT(DISTINCT customer_id) as customers,
  ROUND(SUM(quantity * unit_price), 2) as revenue
FROM example_orders
```

```sql monthly_trend
SELECT
  strftime(order_date, '%Y-%m') as month,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as orders
FROM example_orders
GROUP BY 1
ORDER BY 1
```

```sql top_products
SELECT
  p.name,
  SUM(o.quantity) as units_sold,
  ROUND(SUM(o.quantity * o.unit_price), 2) as revenue
FROM example_orders o
JOIN example_products p ON o.product_id = p.product_id
GROUP BY p.name
ORDER BY revenue DESC
LIMIT 5
```

## Revenue Trend

{% line_chart data="{monthly_trend}" x="month" y="revenue" /%}

## Top Products

{% bar_chart data="{top_products}" x="name" y="revenue" /%}

{% datatable data="{top_products}" /%}
