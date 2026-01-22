/**
 * Markdoc parsing for Lence.
 *
 * Uses Markdoc for {% tag %} syntax.
 * Supports:
 * - {% query name="..." source="..." %}SQL{% /query %} - Define SQL queries
 * - {% chart data="..." type="..." x="..." y="..." /%} - Render charts
 * - {% dataTable data="..." /%} - Render tables
 */

import Markdoc, { type Config, type Node, type RenderableTreeNode } from '@markdoc/markdoc';

/**
 * Parsed page result with renderable tree and extracted queries/data.
 */
export interface ParsedPage {
  content: RenderableTreeNode;
  queries: QueryDefinition[];
  data: DataDefinition[];
}

/**
 * A query definition from a {% query %} tag.
 */
export interface QueryDefinition {
  name: string;
  source: string;
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
  query: {
    render: 'query-block',
    attributes: {
      name: { type: String, required: true },
      source: { type: String, required: true },
    },
    transform(node: Node, config: Config) {
      const attributes = node.transformAttributes(config);
      // Extract SQL from all nested children
      const sql = extractTextContent(node).trim();

      return new Markdoc.Tag('query-block', { ...attributes, sql }, []);
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

  areaChart: {
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

  dataTable: {
    render: 'lence-data-table',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
      search: { type: Boolean, default: false },
      pagination: { type: Number },
      sort: { type: Boolean, default: true },
    },
  },

  gantt: {
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
 * Extract query definitions from Markdoc AST.
 * Walks the tree to find all {% query %} tags.
 */
export function extractQueries(content: string): QueryDefinition[] {
  const ast = Markdoc.parse(content);
  const queries: QueryDefinition[] = [];

  function walk(node: Node) {
    // Skip code blocks - don't parse tags inside them
    if (node.type === 'fence' || node.type === 'code') {
      return;
    }

    if (node.type === 'tag' && node.tag === 'query') {
      const attrs = node.attributes || {};
      const sql = extractTextContent(node).trim();

      queries.push({
        name: attrs.name as string,
        source: attrs.source as string,
        sql,
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
 */
export function parseMarkdoc(content: string): ParsedPage {
  const ast = Markdoc.parse(content);
  const queries = extractQueries(content);
  const data = extractData(content);
  const transformed = Markdoc.transform(ast, config);

  return {
    content: transformed,
    queries,
    data,
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
