---
title: Gitlab data
---

# Gitlab data

## Milestones

{% query name="states" source="gitlab_milestones" %}
SELECT DISTINCT state FROM gitlab_milestones ORDER BY state
{% /query %}

{% dropdown name="state_filter" data="states" value="state" title="Filter by State" /%}

{% query name="filtered_milestones" source="gitlab_milestones" %}
SELECT
  iid,
  title,
  state,
  start_date,
  due_date,
  web_url
FROM gitlab_milestones
WHERE
  ((group_id = 2 AND project_id IS NULL) OR (project_id = 3))
  AND state LIKE '${inputs.state_filter.value}'
{% /query %}

{% gantt data="filtered_milestones" label="title" start="start_date" end="due_date" title="Milestone Timeline" /%}

{% dataTable data="filtered_milestones" search=true /%}
