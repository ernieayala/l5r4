/**
 * @module tools/eslint/naming
 * @description The local rule `l5r4/naming` (docs/code-system/naming.md): function names start with a verb from the
 * page's Verb vocabulary table, which the rule reads, so a new verb is a new row there; classes are PascalCase;
 * acronyms inside a name are words; module and static constants are UPPER_SNAKE_CASE and module state is camelCase;
 * `_name` only in a class that extends another; each `DEFAULT_OPTIONS.actions` entry is `static #on<Action>`.
 */

import { readFileSync } from "node:fs";
import { codeSpansOf, tableAfter } from "../conventions/markdown.mjs";

/** The page holding the verb vocabulary. */
const NAMING_PAGE = new URL("../../docs/code-system/naming.md", import.meta.url);

/** Names core's localization helpers and template path builder keep (naming.md, Acronym inside a name). */
const HELPER_NAMES = Object.freeze(["T", "F", "R", "TEMPLATE"]);

/** Rule keys whose stored spelling a name may carry (naming.md, Fixed names). */
const FIXED_ACRONYMS = Object.freeze(["TNModifier", "ArmorTN"]);

/** Public Foundry methods a subclass overrides by core's name. */
const FOUNDRY_OVERRIDES = Object.freeze([
  "defineSchema",
  "migrateData",
  "cleanData",
  "shimData",
  "validateJoint",
  "prepareData",
  "prepareBaseData",
  "prepareDerivedData",
  "prepareEmbeddedDocuments",
  "applyActiveEffects",
  "getRollData",
  "toObject",
  "toJSON",
  "render",
  "close",
  "setPosition",
  "changeTab",
  "evaluate",
  "roll",
  "reroll",
  "explode",
  "keep",
  "drop",
  "modify",
  "getTooltipData",
  "getInitiativeRoll",
  "rollInitiative",
  "rollAll",
  "rollNPC",
  "startCombat",
  "endCombat",
  "nextTurn",
  "previousTurn",
  "nextRound",
  "previousRound",
  "resetAll",
  "setupTurns",
  "toggleStatusEffect",
  "apply",
  "reset"
]);

/** Calls whose result is mutable module state. */
const MUTABLE_CONSTRUCTORS = Object.freeze(["Map", "Set", "WeakMap", "WeakSet"]);

/** The vocabulary, read once. */
let vocabulary = null;

/**
 * The verb prefixes and suffixes naming.md allows.
 * @returns {{prefixes: string[], suffixes: string[]}} The vocabulary
 */
function getVocabulary() {
  if (!vocabulary) {
    const codes = tableAfter(readFileSync(NAMING_PAGE, "utf8"), "Verb vocabulary").flatMap(row =>
      codeSpansOf(row.Verb)
    );
    vocabulary = {
      prefixes: codes.filter(code => !code.startsWith("*")),
      suffixes: codes.filter(code => code.startsWith("*")).map(code => code.slice(1))
    };
  }
  return vocabulary;
}

/**
 * Whether a function name starts with a listed verb (followed by a capital or the end) or ends with a listed suffix.
 * @param {string} name - The name, without `#`
 * @returns {boolean} True when the vocabulary allows it
 */
function hasVerb(name) {
  const { prefixes, suffixes } = getVocabulary();
  return (
    prefixes.some(
      verb => name === verb || (name.startsWith(verb) && /[A-Z0-9]/.test(name[verb.length]))
    ) || suffixes.some(suffix => name.length > suffix.length && name.endsWith(suffix))
  );
}

/**
 * Whether a name runs two capitals together outside the allowed forms.
 * @param {string} name - The name
 * @returns {boolean} True for an acronym written in capitals
 */
function hasCapitalRun(name) {
  if (/^[A-Z0-9_]+$/.test(name) || HELPER_NAMES.includes(name)) {
    return false;
  }
  let rest = name.replace(/^L5R4/, "");
  for (const fixed of FIXED_ACRONYMS) {
    rest = rest.replaceAll(fixed, "Fixed");
  }
  return /[A-Z]{2}/.test(rest);
}

/**
 * The PascalCase handler name an action calls for: `delete-effect` and `deleteEffect` both give `onDeleteEffect`.
 * @param {string} action - The action key
 * @returns {string} The expected private method name
 */
function handlerNameOf(action) {
  const pascal = action
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `on${pascal}`;
}

/**
 * The name of a property key.
 * @param {object} key - The key node
 * @returns {string|null} The name, or null when computed
 */
function keyNameOf(key) {
  if (key.type === "Identifier" || key.type === "PrivateIdentifier") {
    return key.name;
  }
  return key.type === "Literal" ? String(key.value) : null;
}

/**
 * Whether a node is a function expression.
 * @param {object|null} node - The node
 * @returns {boolean} True for an arrow or function expression
 */
function isFunction(node) {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

/**
 * Whether an initializer is a constant value: a literal, an array or object literal, or a frozen one.
 * @param {object} node - The initializer
 * @returns {boolean} True for a constant value
 */
function isConstantValue(node) {
  if (
    node.type === "Literal" ||
    node.type === "ArrayExpression" ||
    node.type === "ObjectExpression"
  ) {
    return true;
  }
  if (node.type === "TemplateLiteral") {
    return node.expressions.length === 0;
  }
  if (node.type === "UnaryExpression") {
    return node.argument.type === "Literal";
  }
  const callee = node.type === "CallExpression" ? node.callee : null;
  return Boolean(
    callee &&
    ((callee.type === "MemberExpression" &&
      callee.object.name === "Object" &&
      callee.property.name === "freeze") ||
      (callee.type === "Identifier" && callee.name === "freeze"))
  );
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: "Identifier names per docs/code-system/naming.md" },
    schema: [],
    messages: {
      verb: "'{{name}}' starts with no verb from docs/code-system/naming.md Verb vocabulary",
      functionCase: "'{{name}}' is a function: camelCase, verb first",
      classCase: "'{{name}}' is a class: PascalCase",
      acronym: "'{{name}}' writes an acronym in capitals; write it as a word ('Tn', 'Npc')",
      constantCase: "'{{name}}' is a constant: UPPER_SNAKE_CASE",
      stateCase: "'{{name}}' is module state that changes: camelCase",
      underscore:
        "'{{name}}' takes `_` only as a Foundry override; the system's own member is '#name', a module function bare",
      handler: "action '{{action}}' calls '{{actual}}'; a handler is static #{{expected}}"
    }
  },

  /**
   * The rule's visitors for one file.
   * @param {object} context - ESLint's rule context
   * @returns {object} The visitors, by node type
   */
  create(context) {
    const classStack = [];

    /**
     * Check one function's name.
     * @param {object} node - The node to report on
     * @param {string} name - The function's name, `#` dropped
     * @param {{method: boolean, inSubclass: boolean, isPrivate: boolean}} where - Where the function sits
     */
    function checkFunction(node, name, { method, inSubclass, isPrivate }) {
      if (HELPER_NAMES.includes(name)) {
        return;
      }
      if (name.startsWith("_")) {
        if (!(method && inSubclass && !isPrivate)) {
          context.report({ node, messageId: "underscore", data: { name } });
        }
        return;
      }
      if (method && inSubclass && FOUNDRY_OVERRIDES.includes(name)) {
        return;
      }
      // A mixin returns a class, so it is named like one: `<Name>Mixin` (naming.md, Mixin file)
      if (!method && /^[A-Z][a-zA-Z0-9]*Mixin$/.test(name)) {
        return;
      }
      if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        context.report({ node, messageId: "functionCase", data: { name } });
        return;
      }
      if (hasCapitalRun(name)) {
        context.report({ node, messageId: "acronym", data: { name } });
      }
      if (!hasVerb(name)) {
        context.report({ node, messageId: "verb", data: { name } });
      }
    }

    /**
     * Check a `DEFAULT_OPTIONS.actions` object's handlers.
     * @param {object} actions - The ObjectExpression
     */
    function checkActions(actions) {
      for (const property of actions.properties) {
        if (property.type !== "Property") {
          continue;
        }
        const action = keyNameOf(property.key);
        let value = property.value;
        if (value.type === "ObjectExpression") {
          value =
            value.properties.find(entry => keyNameOf(entry.key) === "handler")?.value ?? value;
        }
        const expected = handlerNameOf(action ?? "");
        const actual =
          value.type === "MemberExpression"
            ? `${value.property.type === "PrivateIdentifier" ? "#" : ""}${value.property.name}`
            : context.sourceCode.getText(value);
        if (action && actual !== `#${expected}`) {
          context.report({
            node: property,
            messageId: "handler",
            data: { action, actual, expected }
          });
        }
      }
    }

    return {
      ClassDeclaration(node) {
        classStack.push(Boolean(node.superClass));
        if (node.id && !/^[A-Z][A-Za-z0-9]*$/.test(node.id.name)) {
          context.report({ node: node.id, messageId: "classCase", data: { name: node.id.name } });
        } else if (node.id && hasCapitalRun(node.id.name)) {
          context.report({ node: node.id, messageId: "acronym", data: { name: node.id.name } });
        }
      },
      "ClassDeclaration:exit"() {
        classStack.pop();
      },
      ClassExpression(node) {
        classStack.push(Boolean(node.superClass));
      },
      "ClassExpression:exit"() {
        classStack.pop();
      },

      FunctionDeclaration(node) {
        if (node.id) {
          checkFunction(node.id, node.id.name, {
            method: false,
            inSubclass: false,
            isPrivate: false
          });
        }
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !node.init) {
          return;
        }
        const name = node.id.name;
        if (isFunction(node.init)) {
          checkFunction(node.id, name, { method: false, inSubclass: false, isPrivate: false });
          return;
        }
        const declaration = node.parent;
        if (name.startsWith("_") && name !== "_") {
          context.report({ node: node.id, messageId: "underscore", data: { name } });
          return;
        }
        const topLevel =
          declaration.parent.type === "Program" ||
          (declaration.parent.type === "ExportNamedDeclaration" &&
            declaration.parent.parent.type === "Program");
        if (!topLevel) {
          if (hasCapitalRun(name)) {
            context.report({ node: node.id, messageId: "acronym", data: { name } });
          }
          return;
        }
        const mutable =
          declaration.kind === "let" ||
          (node.init.type === "NewExpression" &&
            MUTABLE_CONSTRUCTORS.includes(node.init.callee.name));
        if (mutable && /^[A-Z][A-Z0-9_]*$/.test(name)) {
          context.report({ node: node.id, messageId: "stateCase", data: { name } });
        } else if (!mutable && isConstantValue(node.init) && !/^[A-Z][A-Z0-9_]*$/.test(name)) {
          context.report({ node: node.id, messageId: "constantCase", data: { name } });
        } else if (hasCapitalRun(name)) {
          context.report({ node: node.id, messageId: "acronym", data: { name } });
        }
      },

      MethodDefinition(node) {
        if (node.kind !== "method") {
          return;
        }
        const name = keyNameOf(node.key);
        if (name) {
          checkFunction(node.key, name, {
            method: true,
            inSubclass: classStack.at(-1) ?? false,
            isPrivate: node.key.type === "PrivateIdentifier"
          });
        }
      },

      PropertyDefinition(node) {
        const name = keyNameOf(node.key);
        if (!name) {
          return;
        }
        if (isFunction(node.value)) {
          checkFunction(node.key, name, {
            method: true,
            inSubclass: classStack.at(-1) ?? false,
            isPrivate: node.key.type === "PrivateIdentifier"
          });
          return;
        }
        if (node.key.type === "Identifier" && name.startsWith("_")) {
          context.report({ node: node.key, messageId: "underscore", data: { name } });
          return;
        }
        if (node.static && node.key.type === "Identifier" && !/^[A-Z][A-Z0-9_]*$/.test(name)) {
          context.report({ node: node.key, messageId: "constantCase", data: { name } });
        }
        if (node.static && name === "DEFAULT_OPTIONS" && node.value?.type === "ObjectExpression") {
          const actions = node.value.properties.find(
            property => property.type === "Property" && keyNameOf(property.key) === "actions"
          );
          if (actions?.value.type === "ObjectExpression") {
            checkActions(actions.value);
          }
        }
      }
    };
  }
};
