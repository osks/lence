/**
 * Markdoc parsing for Lence.
 *
 * Uses Markdoc for Evidence.dev-style {% tag %} syntax.
 * Supports:
 * - {% query name="..." source="..." %}SQL{% /query %} - Define SQL queries
 * - {% chart data="..." type="..." x="..." y="..." /%} - Render charts
 * - {% table data="..." /%} - Render tables
 */

import Markdoc, { type Config, type Node, type RenderableTreeNode } from '@markdoc/markdoc';

/**
 * Parsed page result with renderable tree and extracted queries.
 */
export interface ParsedPage {
  content: RenderableTreeNode;
  queries: QueryDefinition[];
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
      .join('');
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

  table: {
    render: 'lence-table',
    selfClosing: true,
    attributes: {
      data: { type: String, required: true },
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

    if (tagNode.name === 'lence-chart' || tagNode.name === 'lence-table') {
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
  const transformed = Markdoc.transform(ast, config);

  return {
    content: transformed,
    queries,
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
