-- Most recent orders
SELECT
  order_id,
  order_date,
  customer_id,
  ROUND(quantity * unit_price, 2) as total,
  status
FROM orders
ORDER BY order_date DESC
LIMIT 10
