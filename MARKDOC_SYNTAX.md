# Markdoc Syntax for Components

Using Markdoc (from Stripe) for the `{% tag %}` syntax like Evidence.dev.

## Syntax

```markdown
# Sales Dashboard

{% query name="monthly_sales" source="orders" %}
SELECT strftime(order_date, '%Y-%m') as month, SUM(amount) as revenue
FROM orders GROUP BY 1
{% /query %}

## Revenue Over Time

{% chart
    data="monthly_sales"
    type="line"
    x="month"
    y="revenue"
/%}

## Detailed Data

{% table data="monthly_sales" /%}

## Conditional Content

{% if sales_total > 10000 %}
Great month! 🎉
{% /if %}
```

## Why Markdoc

- **Same syntax as Evidence.dev** - familiar to users
- **Tags can run code** - not just render components
- **Built-in control flow** - `{% if %}`, `{% for %}`, etc.
- **Validation** - schema for allowed tags and attributes
- **JavaScript library** - works in browser

## Installation

```bash
npm install @markdoc/markdoc
```

## Implementation

### Basic Setup

```typescript
// markdown.ts
import Markdoc from '@markdoc/markdoc';
import type { Config, Node, Tag } from '@markdoc/markdoc';

// Define custom tags
const tags: Config['tags'] = {
  query: {
    render: 'query-block',  // or null if it shouldn't render
    attributes: {
      name: { type: String, required: true },
      source: { type: String, required: true },
    },
    // Transform can access children (the SQL)
    transform(node, config) {
      const attributes = node.transformAttributes(config);
      const sql = node.children
        .filter((child): child is Node => child.type === 'text')
        .map((child) => child.attributes.content)
        .join('');

      return new Tag('query-block', { ...attributes, sql }, []);
    },
  },

  chart: {
    render: 'lence-chart',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      type: { type: String, default: 'line' },
      x: { type: String, required: true },
      y: { type: String, required: true },
      title: { type: String },
    },
  },

  table: {
    render: 'lence-table',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
    },
  },
};

// Parse and transform
export function parseMarkdoc(content: string) {
  const ast = Markdoc.parse(content);
  const transformed = Markdoc.transform(ast, { tags });
  return transformed;
}

// Render to HTML string
export function renderToHtml(content: string): string {
  const transformed = parseMarkdoc(content);
  return Markdoc.renderers.html(transformed);
}
```

### Extracting Queries

Markdoc's AST lets us walk the tree and extract data:

```typescript
import Markdoc, { type Node } from '@markdoc/markdoc';

export interface QueryDefinition {
  name: string;
  source: string;
  sql: string;
}

export function extractQueries(content: string): QueryDefinition[] {
  const ast = Markdoc.parse(content);
  const queries: QueryDefinition[] = [];

  // Walk the AST
  function walk(node: Node) {
    if (node.type === 'tag' && node.tag === 'query') {
      const attrs = node.attributes;
      const sql = node.children
        .filter((child): child is Node => child.type === 'text')
        .map((child) => child.attributes?.content || '')
        .join('')
        .trim();

      queries.push({
        name: attrs.name as string,
        source: attrs.source as string,
        sql,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        if (typeof child === 'object') {
          walk(child);
        }
      }
    }
  }

  walk(ast);
  return queries;
}
```

### Rendering with Lit

Instead of rendering to HTML string, render to Lit templates:

```typescript
import Markdoc, { type RenderableTreeNode } from '@markdoc/markdoc';
import { html, nothing, type TemplateResult } from 'lit';

// Map tag names to Lit renderers
const components: Record<string, (attrs: Record<string, unknown>, children: TemplateResult[]) => TemplateResult> = {
  'lence-chart': (attrs, children) => html`
    <lence-chart
      query=${attrs.data}
      type=${attrs.type || 'line'}
      x=${attrs.x}
      y=${attrs.y}
      title=${attrs.title || nothing}
    ></lence-chart>
  `,

  'lence-table': (attrs) => html`
    <lence-table query=${attrs.data}></lence-table>
  `,

  'query-block': () => html``, // Don't render query blocks
};

export function renderToLit(node: RenderableTreeNode): TemplateResult {
  if (typeof node === 'string') {
    return html`${node}`;
  }

  if (Array.isArray(node)) {
    return html`${node.map(renderToLit)}`;
  }

  if (node === null || typeof node !== 'object') {
    return html``;
  }

  const { name, attributes, children } = node as {
    name: string;
    attributes: Record<string, unknown>;
    children: RenderableTreeNode[];
  };

  // Custom component
  if (components[name]) {
    const renderedChildren = children.map(renderToLit);
    return components[name](attributes, renderedChildren);
  }

  // Standard HTML elements
  const childTemplates = children.map(renderToLit);

  // Use unsafeStatic for dynamic tag names (or handle common ones)
  switch (name) {
    case 'h1': return html`<h1>${childTemplates}</h1>`;
    case 'h2': return html`<h2>${childTemplates}</h2>`;
    case 'h3': return html`<h3>${childTemplates}</h3>`;
    case 'p': return html`<p>${childTemplates}</p>`;
    case 'ul': return html`<ul>${childTemplates}</ul>`;
    case 'ol': return html`<ol>${childTemplates}</ol>`;
    case 'li': return html`<li>${childTemplates}</li>`;
    case 'code': return html`<code>${childTemplates}</code>`;
    case 'pre': return html`<pre>${childTemplates}</pre>`;
    case 'strong': return html`<strong>${childTemplates}</strong>`;
    case 'em': return html`<em>${childTemplates}</em>`;
    case 'a': return html`<a href=${attributes.href}>${childTemplates}</a>`;
    default: return html`${childTemplates}`;
  }
}
```

### Page Component Update

```typescript
// page.ts
import { LitElement, html } from 'lit';
import { state, property } from 'lit/decorators.js';
import { parseMarkdoc, extractQueries, renderToLit } from '../markdoc.js';
import { executeQuery } from '../api.js';

export class LencePage extends LitElement {
  @property() path = '/';
  @state() private content: RenderableTreeNode | null = null;
  @state() private queryData = new Map<string, QueryResult>();

  async loadPage() {
    const markdown = await fetchPage(this.path);

    // Extract and execute queries
    const queries = extractQueries(markdown);
    for (const q of queries) {
      const result = await executeQuery(q.source, q.sql);
      this.queryData.set(q.name, result);
    }

    // Parse markdown
    this.content = parseMarkdoc(markdown);
  }

  render() {
    if (!this.content) {
      return html`<div class="loading">Loading...</div>`;
    }

    return html`
      <article class="content">
        ${renderToLit(this.content)}
      </article>
    `;
  }
}
```

## Advanced: Custom Functions

Markdoc supports functions in expressions:

```markdown
{% chart data="sales" y=sum(revenue) /%}

Total: {% $total | currency %}
```

```typescript
const config: Config = {
  tags,
  functions: {
    sum: {
      transform(parameters) {
        // Return column reference for aggregation
        return `SUM(${parameters[0]})`;
      },
    },
    currency: {
      transform(parameters) {
        const value = parameters[0];
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      },
    },
  },
  variables: {
    // Pass query results as variables
    total: 15000,
  },
};
```

## Advanced: Control Flow

Markdoc has built-in control flow:

```markdown
{% if $hasData %}
  {% chart data="sales" type="line" x="month" y="revenue" /%}
{% else %}
  No data available.
{% /if %}

{% for item in $items %}
  - {{ item.name }}: {{ item.value }}
{% /for %}
```

## Migration from Current marked.js

1. Install Markdoc: `npm install @markdoc/markdoc`
2. Replace `markdown.ts` with Markdoc implementation
3. Update `page.ts` to use new parser
4. Update page markdown files to use `{% %}` syntax
5. Remove marked.js dependency

## Comparison

| Feature | marked.js (current) | Markdoc |
|---------|---------------------|---------|
| Syntax | `---query---` + `<lence-*>` | `{% tag %}` |
| Custom tags | HTML passthrough | First-class support |
| Validation | None | Schema-based |
| Control flow | None | `{% if %}`, `{% for %}` |
| Functions | None | `{% func() %}` |
| Variables | None | `{{ $var }}` |
| AST access | Limited | Full |
| Bundle size | ~40KB | ~50KB |

## References

- [Markdoc Documentation](https://markdoc.dev/)
- [Markdoc GitHub](https://github.com/markdoc/markdoc)
- [Evidence.dev](https://evidence.dev/) - Similar syntax
