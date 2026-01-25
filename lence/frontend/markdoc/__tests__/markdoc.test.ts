import { describe, it, expect } from 'vitest';
import {
  parseMarkdoc,
  extractQueries,
  extractComponents,
  getReferencedQueries,
  buildQueryMap,
  renderToHtml,
} from '../index.js';

describe('extractQueries', () => {
  it('should extract query definitions from sql fences', () => {
    const content = `
# Dashboard

\`\`\`sql monthly_sales
SELECT strftime(order_date, '%Y-%m') as month, SUM(amount) as revenue
FROM orders GROUP BY 1
\`\`\`

Some text here.
`;

    const queries = extractQueries(content);

    expect(queries).toHaveLength(1);
    expect(queries[0].name).toBe('monthly_sales');
    expect(queries[0].sql).toContain('SELECT');
    expect(queries[0].sql).toContain('GROUP BY 1');
  });

  it('should extract multiple queries', () => {
    const content = `
\`\`\`sql sales
SELECT * FROM orders
\`\`\`

\`\`\`sql products
SELECT * FROM products
\`\`\`
`;

    const queries = extractQueries(content);

    expect(queries).toHaveLength(2);
    expect(queries[0].name).toBe('sales');
    expect(queries[1].name).toBe('products');
  });

  it('should return empty array when no queries', () => {
    const content = '# Just markdown\n\nNo queries here.';
    const queries = extractQueries(content);
    expect(queries).toEqual([]);
  });

  it('should not extract regular sql fences without query name', () => {
    const content = `
\`\`\`sql
SELECT * FROM orders
\`\`\`
`;
    const queries = extractQueries(content);
    expect(queries).toEqual([]);
  });
});

describe('parseMarkdoc', () => {
  it('should parse markdown to HTML', () => {
    const content = '# Hello World\n\nThis is a paragraph.';
    const result = parseMarkdoc(content);
    const html = renderToHtml(result.content);

    expect(html).toContain('<h1');
    expect(html).toContain('Hello World');
    expect(html).toContain('<p>');
  });

  it('should extract queries from sql fences', () => {
    const content = `
# Dashboard

\`\`\`sql sales
SELECT * FROM orders
\`\`\`

{% chart data="sales" type="line" x="month" y="revenue" /%}
`;

    const result = parseMarkdoc(content);

    // Query should be extracted
    expect(result.queries).toHaveLength(1);
    expect(result.queries[0].name).toBe('sales');
  });

  it('should hide sql query fences from output', () => {
    const content = `
# Dashboard

\`\`\`sql sales
SELECT * FROM orders
\`\`\`

{% chart data="sales" type="line" x="month" y="revenue" /%}
`;

    const result = parseMarkdoc(content);
    const html = renderToHtml(result.content);

    // Query fence should not appear in rendered output
    expect(html).not.toContain('SELECT * FROM orders');
    // But chart should render
    expect(html).toContain('lence-chart');
  });

  it('should render regular sql fences (without query name)', () => {
    const content = `
# Example

\`\`\`sql
SELECT * FROM example
\`\`\`
`;

    const result = parseMarkdoc(content);
    const html = renderToHtml(result.content);

    // Regular sql fence should render as code
    expect(html).toContain('SELECT * FROM example');
    expect(html).toContain('<pre');
  });

  it('should render chart tags', () => {
    const content = `
# Sales Report

{% chart data="monthly_sales" type="line" x="month" y="revenue" /%}
`;

    const result = parseMarkdoc(content);
    const html = renderToHtml(result.content);

    expect(html).toContain('lence-chart');
    expect(html).toContain('data="monthly_sales"');
    expect(html).toContain('type="line"');
    expect(html).toContain('x="month"');
    expect(html).toContain('y="revenue"');
  });

  it('should render dataTable tags', () => {
    const content = `
# Data

{% dataTable data="sales" /%}
`;

    const result = parseMarkdoc(content);
    const html = renderToHtml(result.content);

    expect(html).toContain('lence-data-table');
    expect(html).toContain('data="sales"');
  });
});

describe('extractComponents', () => {
  it('should extract chart components from rendered tree', () => {
    const content = '{% chart data="sales" type="line" x="month" y="revenue" /%}';
    const result = parseMarkdoc(content);
    const components = extractComponents(result.content);

    expect(components).toHaveLength(1);
    expect(components[0].type).toBe('lence-chart');
    expect(components[0].attributes.data).toBe('sales');
    expect(components[0].attributes.x).toBe('month');
    expect(components[0].attributes.y).toBe('revenue');
  });

  it('should extract dataTable components', () => {
    const content = '{% dataTable data="products" /%}';
    const result = parseMarkdoc(content);
    const components = extractComponents(result.content);

    expect(components).toHaveLength(1);
    expect(components[0].type).toBe('lence-data-table');
    expect(components[0].attributes.data).toBe('products');
  });

  it('should extract multiple components', () => {
    const content = `
{% chart data="sales" type="bar" x="month" y="count" /%}
{% dataTable data="details" /%}
`;
    const result = parseMarkdoc(content);
    const components = extractComponents(result.content);

    expect(components).toHaveLength(2);
    expect(components[0].type).toBe('lence-chart');
    expect(components[1].type).toBe('lence-data-table');
  });

  it('should return empty array when no components', () => {
    const content = '# Just text\n\nNo components here.';
    const result = parseMarkdoc(content);
    const components = extractComponents(result.content);
    expect(components).toEqual([]);
  });
});

describe('getReferencedQueries', () => {
  it('should extract unique query names from components', () => {
    const components = [
      { type: 'lence-chart', attributes: { data: 'sales', x: 'month' } },
      { type: 'lence-data-table', attributes: { data: 'details' } },
    ];

    const queries = getReferencedQueries(components);

    expect(queries).toContain('sales');
    expect(queries).toContain('details');
    expect(queries).toHaveLength(2);
  });

  it('should deduplicate query references', () => {
    const components = [
      { type: 'lence-chart', attributes: { data: 'sales' } },
      { type: 'lence-data-table', attributes: { data: 'sales' } },
    ];

    const queries = getReferencedQueries(components);

    expect(queries).toHaveLength(1);
    expect(queries[0]).toBe('sales');
  });

  it('should ignore components without data attribute', () => {
    const components = [
      { type: 'lence-chart', attributes: { x: 'month' } },
      { type: 'lence-data-table', attributes: { data: 'sales' } },
    ];

    const queries = getReferencedQueries(components);

    expect(queries).toHaveLength(1);
    expect(queries[0]).toBe('sales');
  });
});

describe('buildQueryMap', () => {
  it('should create map from query array', () => {
    const queries = [
      { name: 'sales', sql: 'SELECT * FROM orders' },
      { name: 'products', sql: 'SELECT * FROM products' },
    ];

    const map = buildQueryMap(queries);

    expect(map.get('sales')).toBe(queries[0]);
    expect(map.get('products')).toBe(queries[1]);
    expect(map.size).toBe(2);
  });

  it('should handle empty array', () => {
    const map = buildQueryMap([]);
    expect(map.size).toBe(0);
  });
});
