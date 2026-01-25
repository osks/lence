---
title: Gitlab data
---
# Gitlab data

## Milestones

```sql states
SELECT DISTINCT state FROM gitlab_milestones ORDER BY state
```

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

{% checkbox
    name="only_planned"
    title="Filter"
    label="Only with dates"
    defaultValue=true
/%}

```sql filtered_milestones
SELECT
  iid,
  title,
  state,
  COALESCE(start_date, created_at) AS start_date,
  due_date,
  web_url
FROM gitlab_milestones
WHERE
  ((group_id = 2 AND project_id IS NULL) OR (project_id = 3))
  AND state LIKE '${inputs.state_filter.value}'
  AND (
    '${inputs.only_planned.value}' = 'false'
    OR (start_date IS NOT NULL OR due_date IS NOT NULL)
  )
ORDER BY COALESCE(start_date, created_at) DESC
```

{% gantt_chart
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

{% table
    data="filtered_milestones"
    search=true
/%}
