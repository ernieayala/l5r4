/**
 * @module tools/eslint/doc-format
 * @description The local rule `l5r4/doc-format` (docs/code-system/documentation.md): a file opens with an `@module`
 * and `@description` header naming its own path; a page number appears only on a citation line of the form
 * `game-rules/<file>.md, p.<pages>`; a Foundry source reference is `[src: <path>:<line>]`; no `@see` links to the
 * online API docs.
 */

import { relative } from "node:path";

/** A page list: `82`, `86-87`, `82, 89` (Stage 16's citation format). */
const PAGE_LIST = String.raw`\d+(?:-\d+)?(?:, \d+(?:-\d+)?)*`;

/** A whole citation line. */
const CITATION_LINE = new RegExp(String.raw`^game-rules/\d+_[a-z0-9_]+\.md, p\.${PAGE_LIST}$`);

/** A page number anywhere: `p.82`, `pp.86-87`, `Core Rulebook p.92`. */
const PAGE_REFERENCE = /\bpp?\.\s?\d/;

/** A path into Foundry's installed source. */
const FOUNDRY_PATH =
  /\b(?:resources\/app\/)?(?:client|common|public|server)\/[\w/.-]+\.(?:mjs|js|css|html|json)\b/;

/**
 * The `@module` path a file's header names: its path under `module/` (or `tools/` with the prefix), no extension.
 * @param {string} file - The file, relative to the repo
 * @returns {string|null} The expected path, or null when any path will do
 */
function modulePathOf(file) {
  if (file.startsWith("module/")) {
    return file.replace(/^module\//, "").replace(/\.m?js$/, "");
  }
  if (file.startsWith("tools/")) {
    return file.replace(/\.m?js$/, "");
  }
  return null;
}

/**
 * A comment's lines with the comment markers removed.
 * @param {object} comment - An ESLint comment token
 * @returns {{text: string, line: number}[]} Each line's text and its line in the file
 */
function linesOf(comment) {
  return comment.value.split("\n").map((raw, i) => ({
    text: raw.replace(/^\s*\*?\s?/, "").trim(),
    line: comment.loc.start.line + i
  }));
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Header, citation, and source reference formats per docs/code-system/documentation.md"
    },
    schema: [
      {
        type: "object",
        properties: { header: { type: "boolean" } },
        additionalProperties: false
      }
    ],
    messages: {
      header:
        "the file opens with a /** @module {{path}} ... @description ... */ block before its imports",
      headerPath: "@module names '{{actual}}'; this file is '{{expected}}'",
      citation: "a page number appears only on a citation line: game-rules/<file>.md, p.<pages>",
      source: "cite Foundry's source as [src: <path>:<line>]",
      see: "no @see link to foundryvtt.com/api; the installed source is the reference"
    }
  },

  create(context) {
    const { header = false } = context.options[0] ?? {};
    const file = relative(context.cwd, context.filename).replaceAll("\\", "/");
    return {
      Program(program) {
        const comments = context.sourceCode.getAllComments();
        if (header) {
          const first = comments[0];
          const firstStatement = program.body[0];
          const opens =
            first &&
            first.type === "Block" &&
            first.value.startsWith("*") &&
            (!firstStatement || first.range[1] <= firstStatement.range[0]);
          const tags = opens ? linesOf(first).filter(({ text }) => text.startsWith("@")) : [];
          const moduleTag = /^@module\s+(\S+)/.exec(tags[0]?.text ?? "");
          if (!moduleTag || !tags.some(({ text }) => text.startsWith("@description"))) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: "header",
              data: { path: modulePathOf(file) ?? "<path>" }
            });
          } else if (modulePathOf(file) && moduleTag[1] !== modulePathOf(file)) {
            context.report({
              loc: { line: tags[0].line, column: 0 },
              messageId: "headerPath",
              data: { actual: moduleTag[1], expected: modulePathOf(file) }
            });
          }
        }
        for (const comment of comments) {
          for (const { text, line } of linesOf(comment)) {
            const loc = { line, column: 0 };
            if (PAGE_REFERENCE.test(text) && !CITATION_LINE.test(text)) {
              context.report({ loc, messageId: "citation" });
            }
            if (FOUNDRY_PATH.test(text.replace(/\[src: [^\]]+\]/g, ""))) {
              context.report({ loc, messageId: "source" });
            }
            if (/@see\b.*foundryvtt\.com\/api/.test(text)) {
              context.report({ loc, messageId: "see" });
            }
          }
        }
      }
    };
  }
};
