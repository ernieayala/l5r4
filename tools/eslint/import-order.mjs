/**
 * @module tools/eslint/import-order
 * @description The local rule `l5r4/import-order` (docs/code-system/modules.md, Imports): imports come in layer
 * order, lowest layer first and the file's own folder last, in one block with no blank lines or comments between
 * them, and each names a file with its extension, never a folder or an index barrel.
 */

import { posix, relative } from "node:path";

/** The layer groups in order (modules.md, Groups); the file's own folder (`./`) comes after them. */
const LAYERS = Object.freeze([
  "config",
  "utils",
  "data",
  "documents",
  "services",
  "mixins",
  "apps",
  "sheets",
  "setup",
  "hooks"
]);

/**
 * The group an import belongs to: 0 for a package, 1-10 for a `module/` layer, 11 for the file's own folder.
 * @param {string} source - The import specifier
 * @param {string} file - The importing file, relative to the repo with forward slashes
 * @returns {number} The group
 */
function groupOf(source, file) {
  if (source.startsWith("./")) {
    return LAYERS.length + 1;
  }
  if (!source.startsWith(".")) {
    return 0;
  }
  const resolved = posix.normalize(posix.join(posix.dirname(file), source));
  const layer = /^module\/([^/]+)\//.exec(resolved)?.[1];
  return layer && LAYERS.includes(layer) ? LAYERS.indexOf(layer) + 1 : 0;
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: "Import groups and form per docs/code-system/modules.md" },
    schema: [],
    messages: {
      order:
        "import from '{{source}}' ({{group}}) comes after the {{previous}} imports; imports go config, utils, data, documents, services, mixins, apps, sheets, setup, hooks, then ./",
      block: "imports form one block: no blank line or comment between them",
      extension:
        "import '{{source}}' names a file with its extension, never a folder or an index barrel"
    }
  },

  create(context) {
    const file = relative(context.cwd, context.filename).replaceAll("\\", "/");
    const nameOf = group =>
      group === 0 ? "package" : group > LAYERS.length ? "local" : LAYERS[group - 1];
    return {
      Program(program) {
        const imports = program.body.filter(node => node.type === "ImportDeclaration");
        let highest = 0;
        imports.forEach((node, i) => {
          const source = node.source.value;
          const group = groupOf(source, file);
          if (group < highest) {
            context.report({
              node,
              messageId: "order",
              data: { source, group: nameOf(group), previous: nameOf(highest) }
            });
          }
          highest = Math.max(highest, group);
          if (
            source.startsWith(".") &&
            (!/\.(m?js|json)$/.test(source) || /\/index\.m?js$/.test(source))
          ) {
            context.report({ node, messageId: "extension", data: { source } });
          }
          const previous = imports[i - 1];
          if (previous) {
            const gap = node.loc.start.line - previous.loc.end.line > 1;
            const comment = context.sourceCode
              .getCommentsBefore(node)
              .some(entry => entry.range[0] > previous.range[1]);
            if (gap || comment) {
              context.report({ node, messageId: "block" });
            }
          }
        });
      }
    };
  }
};
