/**
 * Golden/snapshot tests for Markdoc rendering.
 *
 * Each test case has a .md input file and .html expected output file.
 * This makes it easy to see how markdown is rendered to HTML.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseMarkdoc, renderToHtml } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(__dirname, 'golden');

// Find all .md files in golden directory
const testCases = readdirSync(goldenDir)
  .filter(f => f.endsWith('.md'))
  .map(f => f.replace('.md', ''));

describe('Markdoc rendering', () => {
  for (const name of testCases) {
    it(`renders ${name}.md correctly`, () => {
      const mdPath = join(goldenDir, `${name}.md`);
      const htmlPath = join(goldenDir, `${name}.html`);

      const input = readFileSync(mdPath, 'utf-8');
      const expected = readFileSync(htmlPath, 'utf-8').trim();

      const parsed = parseMarkdoc(input);
      const actual = renderToHtml(parsed.content).trim();

      expect(actual).toBe(expected);
    });
  }
});
