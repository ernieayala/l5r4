/**
 * @module tools/eslint/localized-join
 * @description What `l5r4/joined-copy` and `l5r4/joined-title` share: finding a localized string joined to other
 * text with `+` or in a template literal (docs/design-system/content/localization.md, One key per meaning). A
 * localized string is a `T()`, `F()`, or `game.i18n.localize()` call, a `?:`, `||`, or `??` with one in a branch, or a
 * variable set to either.
 */

/** The localization functions of module/utils/localization.js. */
const LOCALIZE_FUNCTIONS = Object.freeze(["T", "F"]);

/** The `game.i18n` methods that localize a key. */
const I18N_METHODS = Object.freeze(["localize", "format"]);

/**
 * Whether an expression joins a localized string to other text.
 * @param {object} node - A TemplateLiteral or a `+` BinaryExpression
 * @param {object} sourceCode - ESLint's source code object
 * @returns {boolean}
 */
export function joinsLocalized(node, sourceCode) {
  if (node.type === "TemplateLiteral") {
    const hasText = node.quasis.some(quasi => quasi.value.cooked !== "");
    return (
      (hasText || node.expressions.length > 1) &&
      node.expressions.some(expression => isLocalized(expression, sourceCode))
    );
  }
  return operandsOf(node).some(operand => isLocalized(operand, sourceCode));
}

/**
 * The visitors that hand a rule each join to check: every template literal, and the outermost `+` of each chain.
 * @param {function(object): void} check - Called with each TemplateLiteral or `+` BinaryExpression
 * @returns {object} The visitors, by node type
 */
export function visitJoins(check) {
  return {
    TemplateLiteral: check,
    "BinaryExpression[operator='+']"(node) {
      // The outermost `+` of a chain stands for the whole chain
      if (node.parent.type !== "BinaryExpression" || node.parent.operator !== "+") {
        check(node);
      }
    }
  };
}

/**
 * Whether a node calls a localization function.
 * @param {object} node - An AST node
 * @returns {boolean}
 */
function isLocalizeCall(node) {
  if (node?.type !== "CallExpression") {
    return false;
  }
  const callee = node.callee;
  if (callee.type === "Identifier") {
    return LOCALIZE_FUNCTIONS.includes(callee.name);
  }
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    I18N_METHODS.includes(callee.property.name) &&
    callee.object.type === "MemberExpression" &&
    callee.object.property.name === "i18n"
  );
}

/**
 * Whether an expression may give a localization call's string: the call, or a `?:`, `||`, or `??` with one in a branch.
 * @param {object} node - An AST node
 * @returns {boolean}
 */
function mayLocalize(node) {
  if (node?.type === "ConditionalExpression") {
    return mayLocalize(node.consequent) || mayLocalize(node.alternate);
  }
  if (node?.type === "LogicalExpression") {
    return mayLocalize(node.left) || mayLocalize(node.right);
  }
  return isLocalizeCall(node);
}

/**
 * Whether a node is a localized string: an expression that may give one, or a variable set to such an expression.
 * @param {object} node - An AST node
 * @param {object} sourceCode - ESLint's source code object
 * @returns {boolean}
 */
function isLocalized(node, sourceCode) {
  if (mayLocalize(node)) {
    return true;
  }
  if (node.type !== "Identifier") {
    return false;
  }
  for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name);
    if (variable) {
      const definition = variable.defs.at(0)?.node;
      return definition?.type === "VariableDeclarator" && mayLocalize(definition.init);
    }
  }
  return false;
}

/**
 * The operands of a chain of `+`, left to right.
 * @param {object} node - A BinaryExpression
 * @returns {object[]} The operands
 */
function operandsOf(node) {
  return [node.left, node.right].flatMap(part =>
    part.type === "BinaryExpression" && part.operator === "+" ? operandsOf(part) : [part]
  );
}
