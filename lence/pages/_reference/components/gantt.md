# Gantt Chart Component

Renders timeline data as a horizontal bar chart (Gantt chart) using ECharts.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data` | Yes | Name of query or data to visualize |
| `label` | Yes | Column name for task/item labels |
| `start` | Yes | Column name for start dates |
| `end` | Yes | Column name for end dates |
| `title` | No | Chart title |

## Basic Example

{% data name="tasks" %}
{
  "columns": [
    {"name": "task", "type": "VARCHAR"},
    {"name": "start_date", "type": "DATE"},
    {"name": "end_date", "type": "DATE"}
  ],
  "data": [
    ["Planning", "2024-01-01", "2024-01-15"],
    ["Design", "2024-01-10", "2024-02-01"],
    ["Development", "2024-01-20", "2024-03-15"],
    ["Testing", "2024-03-01", "2024-03-30"],
    ["Launch", "2024-03-25", "2024-04-01"]
  ]
}
{% /data %}

{% gantt data="tasks" label="task" start="start_date" end="end_date" title="Project Timeline" /%}

``` {% process=false %}
{% gantt data="tasks" label="task" start="start_date" end="end_date" title="Project Timeline" /%}
```

## Open-Ended Bars

When `start` or `end` date is null, bars render as open-ended:
- **Null start:** Bar extends from left edge of chart to end date
- **Null end:** Bar extends from start date to right edge of chart
- **Both null:** Row is skipped

Open-ended bars are rendered with reduced opacity (50%) for visual distinction.

{% data name="open_ended" %}
{
  "columns": [
    {"name": "milestone", "type": "VARCHAR"},
    {"name": "start", "type": "DATE"},
    {"name": "end", "type": "DATE"}
  ],
  "data": [
    ["Ongoing Support", "2024-01-01", null],
    ["Phase 1", "2024-02-01", "2024-03-15"],
    ["Phase 2", null, "2024-05-01"],
    ["Phase 3", "2024-04-15", "2024-06-30"]
  ]
}
{% /data %}

{% gantt data="open_ended" label="milestone" start="start" end="end" title="Milestones with Open Dates" /%}

``` {% process=false %}
{% gantt data="open_ended" label="milestone" start="start" end="end" /%}
```

## Tooltip

Hovering over a bar shows:
- Task/item name
- Start date (or "open" if null)
- End date (or "open" if null)
- Duration in days
