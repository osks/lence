/**
 * Markdoc parsing for Lence.
 *
 * Uses Markdoc for {% tag %} syntax.
 * Supports:
 * - ```sql query_name ... ``` - Define SQL queries (fenced code blocks)
 * - {% chart data="..." type="..." x="..." y="..." /%} - Render charts
 * - {% table data="..." /%} - Render tables
 */

import Markdoc, { type Config, type Node, type RenderableTreeNode } from '@markdoc/markdoc';

/**
 * Frontmatter data from a page.
 */
export interface Frontmatter {
  title?: string;
  [key: string]: unknown;
}

/**
 * Parsed page result with renderable tree and extracted queries/data.
 */
export interface ParsedPage {
  content: RenderableTreeNode;
  queries: QueryDefinition[];
  data: DataDefinition[];
  frontmatter: Frontmatter;
}

/**
 * Pattern to match YAML frontmatter at start of content.
 */
const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n/;

/**
 * Parse simple YAML frontmatter (key: value pairs only).
 * For full YAML support, would need a proper YAML parser.
 */
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = content.slice(match[0].length);
  const frontmatter: Frontmatter = {};

  // Simple line-by-line parsing for key: value pairs
  for (const line of yamlContent.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: unknown = line.slice(colonIndex + 1).trim();

      // Parse booleans and numbers
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      // Remove quotes from strings
      else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (typeof value === 'string' && value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * A query definition from a ```sql query_name fence.
 */
export interface QueryDefinition {
  name: string;
  sql: string;
}

/**
 * An inline data definition from a {% data %} tag.
 */
export interface DataDefinition {
  name: string;
  json: string;
}

/**
 * Component definition found in parsed content.
 */
export interface ComponentDefinition {
  type: string;
  attributes: Record<string, unknown>;
}

/**
 * Recursively extract text content from an AST node.
 */
function extractTextContent(node: Node): string {
  if (node.type === 'text') {
    return (node.attributes?.content as string) || '';
  }

  if (node.children) {
    return node.children
      .filter((child): child is Node => typeof child === 'object' && child !== null)
      .map(extractTextContent)
      .join('\n');
  }

  return '';
}

/**
 * Custom tag definitions for Lence components.
 */
const tags: Config['tags'] = {
  line_chart: {
    render: 'lence-chart',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      x: { type: String, required: true },
      y: { type: String, required: true },
      title: { type: String },
    },
    transform(node: Node, config: Config) {
      const attrs = node.transformAttributes(config);
      return new Markdoc.Tag('lence-chart', { ...attrs, type: 'line' }, []);
    },
  },

  bar_chart: {
    render: 'lence-chart',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      x: { type: String, required: true },
      y: { type: String, required: true },
      title: { type: String },
    },
    transform(node: Node, config: Config) {
      const attrs = node.transformAttributes(config);
      return new Markdoc.Tag('lence-chart', { ...attrs, type: 'bar' }, []);
    },
  },

  pie_chart: {
    render: 'lence-chart',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      x: { type: String, required: true },
      y: { type: String, required: true },
      title: { type: String },
    },
    transform(node: Node, config: Config) {
      const attrs = node.transformAttributes(config);
      return new Markdoc.Tag('lence-chart', { ...attrs, type: 'pie' }, []);
    },
  },

  scatter_chart: {
    render: 'lence-chart',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      x: { type: String, required: true },
      y: { type: String, required: true },
      title: { type: String },
    },
    transform(node: Node, config: Config) {
      const attrs = node.transformAttributes(config);
      return new Markdoc.Tag('lence-chart', { ...attrs, type: 'scatter' }, []);
    },
  },

  area_chart: {
    render: 'lence-area-chart',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      x: { type: String, required: true },
      y: { type: String, required: true },
      title: { type: String },
      stacked: { type: Boolean, default: false },
    },
  },

  table: {
    render: 'lence-data-table',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      search: { type: Boolean, default: false },
      pagination: { type: Number },
      sort: { type: Boolean, default: true },
    },
  },

  gantt_chart: {
    render: 'lence-gantt',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      label: { type: String, required: true },
      start: { type: String, required: true },
      end: { type: String, required: true },
      title: { type: String },
      url: { type: String },
      showToday: { type: Boolean, default: false },
      viewStart: { type: String },
      viewEnd: { type: String },
      maxHeight: { type: Number },
    },
  },

  dropdown: {
    render: 'lence-dropdown',
    selfClosing: true,
    attributes: {
      name: { type: String, required: true },
      data: { type: String },
      value: { type: String },
      label: { type: String },
      title: { type: String },
      defaultValue: { type: String },
      placeholder: { type: String },
      disableSelectAll: { type: Boolean, default: false },
    },
  },

  checkbox: {
    render: 'lence-checkbox',
    selfClosing: true,
    attributes: {
      name: { type: String, required: true },
      title: { type: String },
      label: { type: String, required: true },
      defaultValue: { type: Boolean, default: false },
    },
  },

  data: {
    render: 'data-block',
    attributes: {
      name: { type: String, required: true },
    },
    transform(node: Node, config: Config) {
      const attributes = node.transformAttributes(config);
      // Extract JSON from content
      const json = extractTextContent(node).trim();
      return new Markdoc.Tag('data-block', { ...attributes, json }, []);
    },
  },
};

/**
 * Markdoc configuration.
 */
const config: Config = {
  tags,
};

/**
 * Pattern to match SQL query fences (```sql query_name ... ```)
 * These are stripped from content before Markdoc parsing.
 */
const SQL_QUERY_FENCE_PATTERN = /```sql\s+\w+\s*\n[\s\S]*?```\n?/g;

/**
 * Remove SQL query fences from content before Markdoc parsing.
 * Query fences are extracted separately and shouldn't be rendered.
 */
function stripQueryFences(content: string): string {
  return content.replace(SQL_QUERY_FENCE_PATTERN, '');
}

/**
 * Extract query definitions from markdown content.
 * Uses regex to find ```sql query_name fenced code blocks.
 *
 * We use regex instead of walking the Markdoc AST because JavaScript
 * Markdoc only captures the first word of the info string as 'language',
 * losing the query name. The Python markdoc-py preserves the full string.
 *
 * Syntax:
 *   ```sql query_name
 *   SELECT * FROM table
 *   ```
 */
export function extractQueries(content: string): QueryDefinition[] {
  const queries: QueryDefinition[] = [];

  // Match: ```sql query_name followed by content until ```
  // The info string is "sql query_name" where query_name must be present
  const pattern = /```sql\s+(\w+)\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const name = match[1];
    const sql = match[2].trim();
    queries.push({ name, sql });
  }

  return queries;
}

/**
 * Extract inline data definitions from Markdoc AST.
 * Walks the tree to find all {% data %} tags.
 */
export function extractData(content: string): DataDefinition[] {
  const ast = Markdoc.parse(content);
  const dataDefinitions: DataDefinition[] = [];

  function walk(node: Node) {
    // Skip code blocks - don't parse tags inside them
    if (node.type === 'fence' || node.type === 'code') {
      return;
    }

    if (node.type === 'tag' && node.tag === 'data') {
      const attrs = node.attributes || {};
      const json = extractTextContent(node).trim();

      dataDefinitions.push({
        name: attrs.name as string,
        json,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        if (typeof child === 'object' && child !== null) {
          walk(child as Node);
        }
      }
    }
  }

  walk(ast);
  return dataDefinitions;
}

/**
 * Extract component definitions from the rendered tree.
 * Finds all lence-chart and lence-table components.
 */
export function extractComponents(tree: RenderableTreeNode): ComponentDefinition[] {
  const components: ComponentDefinition[] = [];

  function walk(node: RenderableTreeNode) {
    if (node === null || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child);
      }
      return;
    }

    const tagNode = node as { name?: string; attributes?: Record<string, unknown>; children?: RenderableTreeNode[] };

    if (tagNode.name?.startsWith('lence-')) {
      components.push({
        type: tagNode.name,
        attributes: tagNode.attributes || {},
      });
    }

    if (tagNode.children) {
      for (const child of tagNode.children) {
        walk(child);
      }
    }
  }

  walk(tree);
  return components;
}

/**
 * Get unique query names referenced by components (via 'data' attribute).
 */
export function getReferencedQueries(components: ComponentDefinition[]): string[] {
  const queryNames = new Set<string>();

  for (const component of components) {
    const dataAttr = component.attributes.data;
    if (typeof dataAttr === 'string') {
      queryNames.add(dataAttr);
    }
  }

  return Array.from(queryNames);
}

/**
 * Parse Markdoc content to a renderable tree.
 * Strips frontmatter and SQL query fences before parsing Markdoc.
 */
export function parseMarkdoc(content: string): ParsedPage {
  const { frontmatter, body } = parseFrontmatter(content);
  // Extract queries before stripping them
  const queries = extractQueries(body);
  // Strip SQL query fences from body (they shouldn't render)
  const bodyWithoutQueries = stripQueryFences(body);
  const ast = Markdoc.parse(bodyWithoutQueries);
  const data = extractData(bodyWithoutQueries);
  const transformed = Markdoc.transform(ast, config);

  return {
    content: transformed,
    queries,
    data,
    frontmatter,
  };
}

/**
 * Render Markdoc tree to HTML string.
 */
export function renderToHtml(tree: RenderableTreeNode): string {
  return Markdoc.renderers.html(tree);
}

/**
 * Build a map of query name to query definition.
 */
export function buildQueryMap(queries: QueryDefinition[]): Map<string, QueryDefinition> {
  const map = new Map<string, QueryDefinition>();
  for (const query of queries) {
    map.set(query.name, query);
  }
  return map;
}
