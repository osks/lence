---
title: Products
---

# Products

```sql category_revenue
SELECT
  p.category,
  ROUND(COALESCE(SUM(o.quantity * o.unit_price), 0), 2) as revenue
FROM example_products p
LEFT JOIN example_orders o ON p.product_id = o.product_id
GROUP BY p.category
ORDER BY revenue DESC
```

{% pie_chart data="{category_revenue}" x="category" y="revenue" /%}

```sql categories
SELECT DISTINCT category FROM example_products ORDER BY category
```

{% button_group
    name="category"
    data="{categories}"
    value="category"
    title="Category"
/%}

```sql product_list
SELECT
  p.name,
  p.category,
  p.price,
  p.stock_quantity as stock,
  COALESCE(SUM(o.quantity), 0) as units_sold,
  ROUND(COALESCE(SUM(o.quantity * o.unit_price), 0), 2) as revenue
FROM example_products p
LEFT JOIN example_orders o ON p.product_id = o.product_id
WHERE p.category LIKE '${inputs.category.value}'
GROUP BY p.product_id, p.name, p.category, p.price, p.stock_quantity
ORDER BY revenue DESC
```

{% datatable data="{product_list}" search=true /%}
