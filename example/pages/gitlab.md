---
title: Gitlab data
---

# Gitlab data

## Milestones

{% query name="all_milestones" source="gitlab_milestones" %}
SELECT
  iid,
  title,
  state,
  start_date,
  due_date,
  web_url
FROM gitlab_milestones
WHERE
  (group_id = 2 AND project_id IS NULL)
  OR
  (project_id = 3)
{% /query %}

{% gantt data="all_milestones" label="title" start="start_date" end="due_date" title="Milestone Timeline" /%}

{% dataTable data="all_milestones" search=true /%}
