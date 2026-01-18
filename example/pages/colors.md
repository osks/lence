---
title: Color Palette Demo
---

# Color Palette Demo

Showcasing the Evidence-style color palette with 10 distinct colors.

{% query name="dept_revenue" source="departments" %}
SELECT department, revenue
FROM departments
ORDER BY revenue DESC
{% /query %}

{% query name="dept_employees" source="departments" %}
SELECT department, employees
FROM departments
ORDER BY employees DESC
{% /query %}

{% query name="region_share" source="regions" %}
SELECT region, market_share
FROM regions
ORDER BY market_share DESC
{% /query %}

{% query name="region_q4" source="regions" %}
SELECT region, q4_sales
FROM regions
ORDER BY q4_sales DESC
{% /query %}

## Department Revenue (10 Colors - Pie)

{% chart data="dept_revenue" type="pie" x="department" y="revenue" /%}

## Department Revenue (10 Colors - Bar)

{% chart data="dept_revenue" type="bar" x="department" y="revenue" /%}

## Employees by Department

{% chart data="dept_employees" type="bar" x="department" y="employees" /%}

## Global Market Share by Region (Pie)

{% chart data="region_share" type="pie" x="region" y="market_share" /%}

## Q4 Sales by Region (Bar)

{% chart data="region_q4" type="bar" x="region" y="q4_sales" /%}

## Data Tables

### Departments

{% table data="dept_revenue" /%}

### Regional Sales

{% table data="region_share" /%}
