# Sales Dashboard

{% query name="monthly_sales" source="orders" %}
SELECT
  strftime(order_date, '%Y-%m') as month,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM orders
GROUP BY 1
ORDER BY 1
{% /query %}

{% query name="by_region" source="orders" %}
SELECT
  region,
  ROUND(SUM(quantity * unit_price), 2) as revenue,
  COUNT(*) as order_count
FROM orders
GROUP BY 1
ORDER BY 2 DESC
{% /query %}

{% query name="recent_orders" source="orders" %}
SELECT
  order_id,
  order_date,
  customer_id,
  ROUND(quantity * unit_price, 2) as total,
  status
FROM orders
ORDER BY order_date DESC
LIMIT 10
{% /query %}

## Monthly Revenue Trend

Revenue over time shows our growth trajectory.

{% chart data="monthly_sales" type="line" x="month" y="revenue" title="Monthly Revenue" /%}

## Orders by Month

{% chart data="monthly_sales" type="bar" x="month" y="order_count" title="Orders per Month" /%}

## Revenue by Region

{% chart data="by_region" type="pie" x="region" y="revenue" title="Revenue by Region" /%}

{% table data="by_region" /%}

## Recent Orders

{% table data="recent_orders" /%}
