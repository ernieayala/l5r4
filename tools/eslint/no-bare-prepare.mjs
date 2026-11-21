/**
 * @module tools/eslint/no-bare-prepare
 * @description The local rule `l5r4/no-bare-prepare` (docs/code-system/foundry-patterns.md, Preparation order): a
 * document is re-prepared with `reset()`, never a bare `prepareData()` or `prepareDerivedData()`. The one call allowed
 * is an override calling core's method of the same name through `super`.
 */

/** The preparation methods that only core, or an override through `super`, calls. */
const PREPARE_METHODS = Object.freeze(["prepareData", "prepareDerivedData"]);

/**
 * The name of the class method a node sits in, skipping arrow functions (which share the method's `super`).
 * @param {object} node - An AST node
 * @returns {string|undefined} The method's key name, or undefined outside a class method
 */
function enclosingMethodName(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === "ArrowFunctionExpression") {
      continue;
    }
    if (current.type === "FunctionExpression" || current.type === "FunctionDeclaration") {
      const parent = current.parent;
      return parent?.type === "MethodDefinition" && !parent.computed ? parent.key.name : undefined;
    }
  }
  return undefined;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Re-prepare a document with reset() per docs/code-system/foundry-patterns.md"
    },
    schema: [],
    messages: {
      bare: "{{method}}() re-applies rules and effects onto prepared values: re-prepare with document.reset() (docs/code-system/foundry-patterns.md, Preparation order)"
    }
  },

  /**
   * The rule's visitors for one file.
   * @param {object} context - ESLint's rule context
   * @returns {object} The visitors, by node type
   */
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) {
          return;
        }
        const method = callee.property.name;
        if (!PREPARE_METHODS.includes(method)) {
          return;
        }
        if (callee.object.type === "Super" && enclosingMethodName(node) === method) {
          return;
        }
        context.report({ node, messageId: "bare", data: { method } });
      }
    };
  }
};
