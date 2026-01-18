# Color Palette

Lence uses a 10-color palette inspired by Evidence.dev for charts.

## Colors

{% data name="colors" %}
{
  "columns": [
    {"name": "name", "type": "VARCHAR"},
    {"name": "value", "type": "INTEGER"}
  ],
  "data": [
    ["Blue", 1],
    ["Orange", 1],
    ["Green", 1],
    ["Red", 1],
    ["Purple", 1],
    ["Teal", 1],
    ["Yellow", 1],
    ["Pink", 1],
    ["Lime", 1],
    ["Cyan", 1]
  ]
}
{% /data %}

{% chart data="colors" type="pie" x="name" y="value" title="Color Palette" /%}

{% chart data="colors" type="bar" x="name" y="value" /%}

## CSS Variables

| Color | Variable | Hex |
|-------|----------|-----|
| Blue | `--lence-color-1` | #236aa4 |
| Orange | `--lence-color-2` | #d55d00 |
| Green | `--lence-color-3` | #088f5b |
| Red | `--lence-color-4` | #cb444a |
| Purple | `--lence-color-5` | #7b4fb3 |
| Teal | `--lence-color-6` | #0d7489 |
| Yellow | `--lence-color-7` | #c79316 |
| Pink | `--lence-color-8` | #c94ea0 |
| Lime | `--lence-color-9` | #5ba332 |
| Cyan | `--lence-color-10` | #318fc5 |
