import { lineOf, registerConventionSuite } from "../../tools/conventions/shared.mjs";

/**
 * Foundry's installed source, cited with lines because it is pinned to 14.370 (docs/code-system/documentation.md,
 * Citations in docs): any path under `resources/app/`, a core folder without that prefix, or core's stylesheet by
 * name. Core's `templates/` needs the prefix, since the repo has a `templates/` of its own.
 */
const FOUNDRY_PATH = /^resources\/app\/|^(?:client|common|public|server)\/|(?:^|\/)foundry2\.css$/;

/** A code span naming a file: a path ending in an extension, with an optional line suffix. */
const FILE_SPAN = /^([\w./-]*\w\.[a-z]+)(:\d[\d, :-]*)?$/;

/** A code span holding only a line suffix, which continues the file named before it. */
const LINE_SPAN = /^:\d[\d, :-]*$/;

/** A citation: a code span, one space, then a repo path in a code span inside parentheses. */
const CITATION = /`([^`\n]+)` \(`([^`\n]+)`\)/g;

/** A JavaScript symbol: a name, or names joined by `.`, `#`, or `.#`, with an optional `()`. */
const JS_SYMBOL = /^[\w$]+(?:(?:\.#?|#)[\w$]+)*(?:\(\))?$/;

/**
 * A page's text with its quoted examples blanked: fenced blocks and double-backtick spans, which show a citation
 * rather than make one. Blanking keeps every offset on its line.
 * @param {string} text - The page
 * @returns {string} The page with its examples blanked
 */
function withoutExamples(text) {
  const blankOut = match => match.replace(/[^\n]/g, " ");
  return text
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blankOut)
    .replace(/``(?:[^`\n]|`(?!`))+``/g, blankOut);
}

/**
 * Every docs page of a tree with its quoted examples blanked.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, text: string}[]} The pages
 */
function pagesOf(tree) {
  return tree
    .files("docs", /\.md$/)
    .map(path => ({ path, text: withoutExamples(tree.text(path)) }));
}

/**
 * The code spans of a page that cite a line of a repo file: `path:12`, or a bare `:12` after a repo path. A span
 * after a Foundry path continues that path and is left alone.
 * @param {string} text - The page, examples blanked
 * @returns {{code: string, index: number}[]} The spans
 */
function lineCitationsOf(text) {
  const found = [];
  let lastFile = null;
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const code = match[1];
    const file = FILE_SPAN.exec(code);
    if (file) {
      lastFile = file[1];
      if (file[2] && !FOUNDRY_PATH.test(lastFile)) {
        found.push({ code, index: match.index });
      }
    } else if (LINE_SPAN.test(code) && !(lastFile && FOUNDRY_PATH.test(lastFile))) {
      found.push({ code, index: match.index });
    }
  }
  return found;
}

/**
 * Whether a JSON file holds a dotted key path.
 * @param {string} text - The JSON text
 * @param {string} symbol - The key path, such as `l5r4.apps.armorConfig.title`
 * @returns {boolean} True when every key along the path exists
 */
function hasKeyPath(text, symbol) {
  let node = JSON.parse(text);
  for (const key of symbol.split(".")) {
    if (node === null || typeof node !== "object" || !Object.hasOwn(node, key)) {
      return false;
    }
    node = node[key];
  }
  return true;
}

/**
 * Whether a file holds the symbol a citation names: in JavaScript each name of `Class#method` or `Class.member` as
 * an identifier or member name; in JSON a dotted key path; elsewhere, and for any other JavaScript text, the literal.
 * @param {string} path - The file's path
 * @param {string} text - The file's text
 * @param {string} symbol - The cited symbol
 * @returns {boolean} True when the file holds it
 */
function holdsSymbol(path, text, symbol) {
  if (/\.m?js$/.test(path) && JS_SYMBOL.test(symbol)) {
    const names = new Set(text.match(/#?[A-Za-z_$][\w$]*/g));
    return symbol
      .replace(/\(\)$/, "")
      .split(/\.#?|#/)
      .every(name => names.has(name) || names.has(`#${name}`));
  }
  if (path.endsWith(".json") && hasKeyPath(text, symbol)) {
    return true;
  }
  return text.includes(symbol);
}

/** docs/code-system/documentation.md, Citations in docs: a symbol and a path, never a line number. */
const RULES = {
  "docs/citation-line": tree =>
    pagesOf(tree).flatMap(({ path, text }) =>
      lineCitationsOf(text).map(
        ({ code, index }) =>
          `${path}:${lineOf(text, index)}: \`${code}\` cites a line; cite the symbol and the path`
      )
    ),

  "docs/citation-symbol": tree =>
    pagesOf(tree).flatMap(({ path, text }) =>
      [...text.matchAll(CITATION)]
        .filter(([, symbol, file]) => tree.has(file) && !holdsSymbol(file, tree.text(file), symbol))
        .map(
          ({ 1: symbol, 2: file, index }) =>
            `${path}:${lineOf(text, index)}: \`${symbol}\` is not in ${file}`
        )
    )
};

registerConventionSuite("Docs citations", RULES, "docs");
