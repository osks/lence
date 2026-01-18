---
showSource: true
---

# Project Timeline

## Milestones Gantt Chart

{% query name="milestones" source="gitlab_milestones" %}
SELECT
  title,
  start_date,
  due_date,
  state
FROM gitlab_milestones
WHERE start_date IS NOT NULL OR due_date IS NOT NULL
ORDER BY COALESCE(start_date, due_date)
{% /query %}

{% gantt data="milestones" label="title" start="start_date" end="due_date" title="Project Milestones" /%}

## Data Table

{% dataTable data="milestones" /%}
