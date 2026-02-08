---
title: Trends
---

# Sales Trends

```sql monthly_sales
SELECT
  strftime(order_date, '%Y-%m') as month,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM example_orders
GROUP BY 1
ORDER BY 1
```

```sql by_region
SELECT
  region,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM example_orders
GROUP BY 1
ORDER BY 2 DESC
```

## Monthly Revenue

{% line_chart data="{monthly_sales}" x="month" y="revenue" /%}

## Orders by Month

{% bar_chart data="{monthly_sales}" x="month" y="order_count" /%}

## Revenue by Region

{% pie_chart data="{by_region}" x="region" y="revenue" /%}

{% datatable data="{by_region}" /%}
