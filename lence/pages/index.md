# Welcome to Lence

Your Lence server is running successfully.

## Getting Started

Create a `pages/index.md` file in your project to replace this page.

```
my-project/
├── pages/
│   └── index.md      ← Create this file
├── data/
└── config/
```

## Quick Example

```markdown
# My Dashboard

{% query name="sample" source="my_data" %}
SELECT * FROM my_table LIMIT 10
{% /query %}

{% table data="sample" /%}
```

See the [documentation](https://github.com/your-repo/lence) for more details.
