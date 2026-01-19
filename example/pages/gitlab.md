---
title: Gitlab data
showSource: true
---

# Gitlab data

## Milestones

{% query name="states" source="gitlab_milestones" %}
SELECT DISTINCT state FROM gitlab_milestones ORDER BY state
{% /query %}

{% data name="time_ranges" %}
{
  "columns": [{"name": "value", "type": "VARCHAR"}, {"name": "label", "type": "VARCHAR"}],
  "data": [["-1y", "1 Year"], ["-3m", "3 Months"]]
}
{% /data %}

{% dropdown
    name="state_filter"
    data="states"
    value="state"
    title="State"
    defaultValue="active"
/%}

{% dropdown
    name="time_range"
    data="time_ranges"
    value="value"
    label="label"
    title="Time Range"
    defaultValue="-3m"
    disableSelectAll=true
/%}

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

{% gantt
    data="filtered_milestones"
    label="title"
    start="start_date"
    end="due_date"
    url="web_url"
    title="Milestone Timeline"
    showToday=true
    viewStart="${inputs.time_range.value}"
    viewEnd="+3m"
/%}

{% dataTable
    data="filtered_milestones"
    search=true
/%}
