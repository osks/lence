---
title: Sales
---

# Sales

```sql regions
SELECT DISTINCT region FROM example_orders ORDER BY region
```

{% button_group
    name="region"
    data="{regions}"
    value="region"
    title="Region"
/%}

```sql regional_stats
SELECT
  region,
  COUNT(*) as orders,
  ROUND(SUM(quantity * unit_price), 2) as revenue
FROM example_orders
WHERE region LIKE '${inputs.region.value}'
GROUP BY region
ORDER BY revenue DESC
```

```sql recent
SELECT
  o.order_id,
  c.name as customer,
  p.name as product,
  o.quantity,
  ROUND(o.quantity * o.unit_price, 2) as total,
  o.order_date,
  o.status
FROM example_orders o
JOIN example_customers c ON o.customer_id = c.customer_id
JOIN example_products p ON o.product_id = p.product_id
WHERE o.region LIKE '${inputs.region.value}'
ORDER BY o.order_date DESC
LIMIT 10
```

## Revenue by Region

{% bar_chart data="{regional_stats}" x="region" y="revenue" /%}

## Recent Orders

{% datatable data="{recent}" search=true /%}
