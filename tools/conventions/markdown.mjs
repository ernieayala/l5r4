/**
 * @module tools/conventions/markdown
 * @description Reads the tables of the docs' Markdown pages, which the convention checks and the local ESLint rules
 * in `tools/eslint/` take their word lists from (docs/code-system/README.md, Changing a rule). Pure functions, so
 * ESLint can load them outside Vitest.
 */

/**
 * Escape a string for use inside a regular expression.
 * @param {string} text - The literal text
 * @returns {string} The escaped text
 */
export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Every table under a heading, up to the next heading, each as one object per row keyed by the header cells.
 * @param {string} markdown - The page
 * @param {string} heading - The heading's text, without the `#` marks
 * @returns {Record<string, string>[][]} The tables in page order; empty when the heading is missing
 */
export function tablesUnder(markdown, heading) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const start = lines.findIndex(line =>
    new RegExp(`^#+\\s+${escapeRegExp(heading)}\\s*$`).test(line)
  );
  if (start < 0) {
    return [];
  }
  const tables = [];
  for (let at = start + 1; at < lines.length && !/^#+\s/.test(lines[at]); at++) {
    if (!lines[at].startsWith("|")) {
      continue;
    }
    const header = cellsOf(lines[at]);
    const rows = [];
    for (at += 2; at < lines.length && lines[at].startsWith("|"); at++) {
      const cells = cellsOf(lines[at]);
      rows.push(Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
    }
    tables.push(rows);
  }
  return tables;
}

/**
 * The first table under a heading, as one object per row keyed by the header cells.
 * @param {string} markdown - The page
 * @param {string} heading - The heading's text, without the `#` marks
 * @returns {Record<string, string>[]} The rows; empty when the heading or table is missing
 */
export function tableAfter(markdown, heading) {
  return tablesUnder(markdown, heading)[0] ?? [];
}

/**
 * The code spans in a Markdown cell.
 * @param {string} cell - The cell
 * @returns {string[]} The text inside each pair of backticks
 */
export function codeSpansOf(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map(([, code]) => code);
}

/**
 * Split a Markdown table row into its cells, keeping an escaped `\|` inside a cell.
 * @param {string} line - The row
 * @returns {string[]} The trimmed cells
 */
function cellsOf(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map(cell => cell.trim().replaceAll("\\|", "|"));
}
