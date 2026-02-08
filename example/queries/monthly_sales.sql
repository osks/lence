-- Monthly sales summary
SELECT
  strftime(order_date, '%Y-%m') as month,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM example_orders
GROUP BY 1
ORDER BY 1
