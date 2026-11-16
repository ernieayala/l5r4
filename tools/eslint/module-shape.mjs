/**
 * @module tools/eslint/module-shape
 * @description The local rule `l5r4/module-shape` (docs/code-system/modules.md): a file holds its imports, then its
 * constants, then its exports, then its private helpers; constant objects and arrays are wrapped in `Object.freeze`;
 * `module/config/` holds values only; a default export is a class and never sits beside named exports; a default
 * import takes the class's own name; a function exports as `export function`.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/** The parts of a file in order (modules.md, File layout). */
const PARTS = Object.freeze(["imports", "constants", "exports", "private helpers"]);

/**
 * Whether a node is a function expression.
 * @param {object|null} node - The node
 * @returns {boolean} True for an arrow or function expression
 */
function isFunction(node) {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

/**
 * The part a top-level statement belongs to, or -1 for a statement the order does not place.
 * @param {object} node - The statement
 * @returns {number} The index into PARTS
 */
function partOf(node) {
  switch (node.type) {
    case "ImportDeclaration":
      return 0;
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportAllDeclaration":
      return 2;
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return 3;
    case "VariableDeclaration":
      return node.declarations.every(declarator => isFunction(declarator.init)) ? 3 : 1;
    default:
      return -1;
  }
}

/** The default-exported class name of each file read, by path. */
const defaultClassNames = new Map();

/**
 * The name of the class a file default-exports.
 * @param {string} path - The file's absolute path
 * @returns {string|null} The class name, or null when the file default-exports no named class
 */
function defaultClassOf(path) {
  if (!defaultClassNames.has(path)) {
    const text = existsSync(path) ? readFileSync(path, "utf8") : "";
    defaultClassNames.set(path, /export\s+default\s+class\s+(\w+)/.exec(text)?.[1] ?? null);
  }
  return defaultClassNames.get(path);
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: "Module shape per docs/code-system/modules.md" },
    schema: [],
    messages: {
      order: "{{part}} come before {{after}}: imports, constants, exports, then private helpers",
      freeze: "'{{name}}' is a constant object or array: wrap it in Object.freeze(...)",
      freezeAlias: "call Object.freeze by its name, not through an alias",
      configValues: "module/config/ holds values only, never a function",
      mixedExports: "a file never mixes a default export with named exports",
      defaultClass: "a default export is the one class Foundry registers, or its base",
      defaultImport: "default import '{{local}}' takes the class's own name, '{{name}}'",
      exportFunction:
        "export '{{name}}' with `export function`, not as an arrow or function constant"
    }
  },

  /**
   * The rule's visitors for one file.
   * @param {object} context - ESLint's rule context
   * @returns {object} The visitors, by node type
   */
  create(context) {
    const file = relative(context.cwd, context.filename).replaceAll("\\", "/");
    const inConfig = file.startsWith("module/config/");

    /**
     * Check one top-level variable declaration's constants.
     * @param {object} declaration - The VariableDeclaration
     * @param {boolean} exported - Whether it is exported
     */
    function checkConstants(declaration, exported) {
      for (const declarator of declaration.declarations) {
        const { id, init } = declarator;
        if (!init) {
          continue;
        }
        if (isFunction(init)) {
          if (inConfig) {
            context.report({ node: declarator, messageId: "configValues" });
          }
          if (exported && id.type === "Identifier") {
            context.report({
              node: declarator,
              messageId: "exportFunction",
              data: { name: id.name }
            });
          }
          continue;
        }
        if (
          init.type === "CallExpression" &&
          init.callee.type === "Identifier" &&
          init.callee.name === "freeze"
        ) {
          context.report({ node: init.callee, messageId: "freezeAlias" });
        }
        if (
          declaration.kind === "const" &&
          id.type === "Identifier" &&
          /^[A-Z][A-Z0-9_]*$/.test(id.name) &&
          (init.type === "ObjectExpression" || init.type === "ArrayExpression")
        ) {
          context.report({ node: declarator, messageId: "freeze", data: { name: id.name } });
        }
      }
    }

    return {
      Program(program) {
        let highest = 0;
        const hasDefault = program.body.some(node => node.type === "ExportDefaultDeclaration");
        for (const node of program.body) {
          const part = partOf(node);
          if (part >= 0 && part < highest) {
            context.report({
              node,
              messageId: "order",
              data: { part: PARTS[part], after: PARTS[highest] }
            });
          }
          highest = Math.max(highest, part);

          if (node.type === "VariableDeclaration") {
            checkConstants(node, false);
          } else if (node.type === "ExportNamedDeclaration") {
            if (node.declaration?.type === "VariableDeclaration") {
              checkConstants(node.declaration, true);
            }
            if (inConfig && node.declaration?.type === "FunctionDeclaration") {
              context.report({ node, messageId: "configValues" });
            }
            if (hasDefault) {
              context.report({ node, messageId: "mixedExports" });
            }
          } else if (node.type === "FunctionDeclaration" && inConfig) {
            context.report({ node, messageId: "configValues" });
          } else if (node.type === "ExportDefaultDeclaration") {
            const declaration = node.declaration;
            const isClass =
              declaration.type === "ClassDeclaration" ||
              (declaration.type === "Identifier" &&
                program.body.some(
                  other => other.type === "ClassDeclaration" && other.id?.name === declaration.name
                ));
            if (!isClass) {
              context.report({ node, messageId: "defaultClass" });
            }
          }
        }
      },

      ImportDefaultSpecifier(node) {
        const source = node.parent.source.value;
        if (!source.startsWith(".")) {
          return;
        }
        const name = defaultClassOf(join(dirname(context.filename), source));
        if (name && name !== node.local.name) {
          context.report({
            node,
            messageId: "defaultImport",
            data: { local: node.local.name, name }
          });
        }
      }
    };
  }
};
