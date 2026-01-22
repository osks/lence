---
showSource: true
---

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
| `url` | No | Column name for URLs (makes bars clickable) |
| `showToday` | No | Show a vertical marker for today's date (default: false) |
| `viewStart` | No | View start date. Accepts ISO date, relative (`-30d`, `-3m`), or input reference (`${inputs.foo.value}`) |
| `viewEnd` | No | View end date. Accepts ISO date, relative (`+30d`, `+3m`), or input reference (`${inputs.foo.value}`) |

## Data Model

The gantt chart expects a query result with at least three columns:

| Column | Type | Description |
|--------|------|-------------|
| Label | VARCHAR | Task or item name displayed on y-axis |
| Start | DATE/TIMESTAMP | Start date of the bar |
| End | DATE/TIMESTAMP | End date of the bar |

Dates can be in any format DuckDB returns (e.g., `2024-01-15`, `2024-01-15T09:00:00`). Null values are supported for open-ended bars.

Example SQL:
```sql
SELECT title AS label, start_date, end_date
FROM milestones
ORDER BY start_date
```

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

{% gantt
    data="tasks"
    label="task"
    start="start_date"
    end="end_date"
    title="Project Timeline"
/%}

``` {% process=false %}
{% gantt
    data="tasks"
    label="task"
    start="start_date"
    end="end_date"
    title="Project Timeline"
/%}
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

{% gantt
    data="open_ended"
    label="milestone"
    start="start"
    end="end"
    title="Milestones with Open Dates"
/%}

``` {% process=false %}
{% gantt
    data="open_ended"
    label="milestone"
    start="start"
    end="end"
/%}
```

## Tooltip

Hovering over a bar shows:
- Task/item name
- Start date (or "open" if null)
- End date (or "open" if null)
- Duration in days

## Clickable Bars

Use the `url` attribute to make bars clickable. When clicked, the URL opens in a new tab.

{% data name="clickable" %}
{
  "columns": [
    {"name": "task", "type": "VARCHAR"},
    {"name": "start", "type": "DATE"},
    {"name": "end", "type": "DATE"},
    {"name": "link", "type": "VARCHAR"}
  ],
  "data": [
    ["Documentation", "2024-01-01", "2024-01-15", "https://example.com/docs"],
    ["Development", "2024-01-10", "2024-02-01", "https://example.com/dev"],
    ["Testing", "2024-01-25", "2024-02-15", "https://example.com/test"]
  ]
}
{% /data %}

{% gantt
    data="clickable"
    label="task"
    start="start"
    end="end"
    url="link"
    title="Clickable Tasks"
/%}

``` {% process=false %}
{% gantt
    data="clickable"
    label="task"
    start="start"
    end="end"
    url="link"
/%}
```

## Today Marker

Use `showToday=true` to display a vertical red line marking today's date.

``` {% process=false %}
{% gantt
    data="tasks"
    label="task"
    start="start"
    end="end"
    showToday=true
/%}
```

## View Range

Control the initial visible time range with `viewStart` and `viewEnd`. Values can be:
- ISO dates: `2024-01-01`
- Relative dates: `-30d` (30 days ago), `-3m` (3 months ago), `+1y` (1 year from now)

``` {% process=false %}
{% gantt
    data="tasks"
    label="task"
    start="start"
    end="end"
    viewStart="-6m"
    viewEnd="+1m"
/%}
```

### Dynamic View Range

Use `${inputs.foo.value}` syntax to bind the view range to a dropdown input:

``` {% process=false %}
{% data name="ranges" %}
{
  "columns": [
    {"name": "value", "type": "VARCHAR"},
    {"name": "label", "type": "VARCHAR"}
  ],
  "data": [["-1y", "1 Year"], ["-6m", "6 Months"]]
}
{% /data %}

{% dropdown
    name="range"
    data="ranges"
    value="value"
    label="label"
    disableSelectAll=true
/%}

{% gantt
    data="tasks"
    label="task"
    start="start"
    end="end"
    viewStart="${inputs.range.value}"
    viewEnd="+1m"
/%}
```
