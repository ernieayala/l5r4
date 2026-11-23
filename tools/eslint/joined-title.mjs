/**
 * @module tools/eslint/joined-title
 * @description The local rule `l5r4/joined-title` (docs/design-system/content/localization.md, One key per meaning): a
 * window, dialog, or card title is one i18n key with placeholders, never a localized string joined to other text with
 * `+` or in a template literal (tools/eslint/localized-join.mjs). A title is a `title` property's value or what a
 * `title` getter returns.
 */

import { joinsLocalized, visitJoins } from "./localized-join.mjs";

/** The expressions a title passes through on its way to the property or the return. */
const PASS_THROUGH = Object.freeze(["ConditionalExpression", "LogicalExpression"]);

/**
 * Whether an expression is a title: a `title` property's value, or what a `title` getter returns.
 * @param {object} node - An AST node
 * @returns {boolean}
 */
function isTitle(node) {
  let current = node;
  while (PASS_THROUGH.includes(current.parent?.type)) {
    current = current.parent;
  }
  const parent = current.parent;
  if (parent?.type === "Property") {
    return parent.value === current && !parent.computed && parent.key.name === "title";
  }
  if (parent?.type !== "ReturnStatement") {
    return false;
  }
  for (let scope = parent.parent; scope; scope = scope.parent) {
    if (scope.type === "FunctionExpression") {
      const method = scope.parent;
      return (
        method?.type === "MethodDefinition" && method.kind === "get" && method.key.name === "title"
      );
    }
    if (scope.type === "FunctionDeclaration" || scope.type === "ArrowFunctionExpression") {
      return false;
    }
  }
  return false;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "A title is one i18n key per docs/design-system/content/localization.md"
    },
    schema: [],
    messages: {
      joined:
        "A title joined from a localized string and other text: write one key with placeholders, such as F(key, { name }) (docs/design-system/content/localization.md, One key per meaning)"
    }
  },

  /**
   * The rule's visitors for one file.
   * @param {object} context - ESLint's rule context
   * @returns {object} The visitors, by node type
   */
  create(context) {
    return visitJoins(node => {
      if (isTitle(node) && joinsLocalized(node, context.sourceCode)) {
        context.report({ node, messageId: "joined" });
      }
    });
  }
};
