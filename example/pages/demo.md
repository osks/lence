---
title: Demo
---

# Quick Demo

A simple example showing Lence basics.

{% query name="top_products" source="orders" %}
SELECT
  product_id,
  COUNT(*) as orders,
  ROUND(SUM(quantity * unit_price), 2) as revenue
FROM orders
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 5
{% /query %}

## Top 5 Products by Revenue

{% chart data="top_products" type="bar" x="product_id" y="revenue" /%}

{% table data="top_products" /%}
