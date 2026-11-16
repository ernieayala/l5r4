/**
 * @module tools/eslint/member-order
 * @description The local rule `l5r4/member-order` (docs/code-system/foundry-patterns.md): the member order of an
 * ApplicationV2 window or sheet and of a data model, a rule model's one member, and the shape of an action handler
 * (`static #on<Action>(event, element)` with `@this`).
 */

import { relative } from "node:path";

/** Rank of an ApplicationV2 member (foundry-patterns.md, ApplicationV2 windows and sheets, Member order). */
const APP_ORDER = Object.freeze([
  "DEFAULT_OPTIONS",
  "PARTS",
  "TABS",
  "other static fields",
  "instance fields",
  "the constructor",
  "getters",
  "_prepareContext",
  "_preparePartContext",
  "other Foundry overrides",
  "public static methods",
  "public instance methods",
  "action handlers",
  "private helpers"
]);

/** Rank of a data model member (foundry-patterns.md, Data models, Member order). */
const DATA_ORDER = Object.freeze([
  "static fields",
  "defineSchema",
  "migrateData",
  "prepareBaseData",
  "prepareDerivedData",
  "getters",
  "other methods",
  "private helpers"
]);

/**
 * The name of a member's key.
 * @param {object} member - The class member
 * @returns {string|null} The name, or null when computed
 */
function nameOf(member) {
  const key = member.key;
  if (!key) {
    return null;
  }
  if (key.type === "Identifier" || key.type === "PrivateIdentifier") {
    return key.name;
  }
  return key.type === "Literal" ? String(key.value) : null;
}

/**
 * Whether a member is a method, or a field holding a function.
 * @param {object} member - The class member
 * @returns {boolean} True for a method
 */
function isMethod(member) {
  return (
    member.type === "MethodDefinition" ||
    member.value?.type === "ArrowFunctionExpression" ||
    member.value?.type === "FunctionExpression"
  );
}

/**
 * An ApplicationV2 member's rank in APP_ORDER.
 * @param {object} member - The class member
 * @returns {number} The rank
 */
function appRankOf(member) {
  const name = nameOf(member) ?? "";
  const isPrivate = member.key?.type === "PrivateIdentifier";
  if (member.type === "StaticBlock") {
    return 3;
  }
  if (member.type === "PropertyDefinition" && !isMethod(member)) {
    if (member.static) {
      return ["DEFAULT_OPTIONS", "PARTS", "TABS"].includes(name) ? APP_ORDER.indexOf(name) : 3;
    }
    return 4;
  }
  if (member.kind === "constructor") {
    return 5;
  }
  if (member.kind === "get" || member.kind === "set") {
    return 6;
  }
  if (name === "_prepareContext") {
    return 7;
  }
  if (name === "_preparePartContext") {
    return 8;
  }
  if (isPrivate) {
    return member.static && /^on[A-Z]/.test(name) ? 12 : 13;
  }
  if (name.startsWith("_")) {
    return 9;
  }
  return member.static ? 10 : 11;
}

/**
 * A data model member's rank in DATA_ORDER.
 * @param {object} member - The class member
 * @returns {number} The rank
 */
function dataRankOf(member) {
  const name = nameOf(member) ?? "";
  if (member.type === "PropertyDefinition" && !isMethod(member)) {
    return 0;
  }
  const named = DATA_ORDER.indexOf(name);
  if (named > 0 && named < 5) {
    return named;
  }
  if (member.kind === "get" || member.kind === "set") {
    return 5;
  }
  return member.key?.type === "PrivateIdentifier" ? 7 : 6;
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: "Class member order per docs/code-system/foundry-patterns.md" },
    schema: [],
    messages: {
      order:
        "{{member}} ({{rank}}) comes after {{previous}}; see docs/code-system/foundry-patterns.md Member order",
      ruleModel: "a rule model has one member, static defineSchema()",
      handler: "action handler #{{name}} is static #on<Action>(event, element) with a @this tag"
    }
  },

  /**
   * The rule's visitors for one file.
   * @param {object} context - ESLint's rule context
   * @returns {object} The visitors, by node type
   */
  create(context) {
    const file = relative(context.cwd, context.filename).replaceAll("\\", "/");

    /**
     * Report members that come before a member of a lower rank.
     * @param {object[]} members - The class body's members
     * @param {(member: object) => number} rankOf - The member's rank
     * @param {readonly string[]} order - The rank names
     */
    function checkOrder(members, rankOf, order) {
      let highest = 0;
      for (const member of members) {
        const rank = rankOf(member);
        if (rank < highest) {
          context.report({
            node: member,
            messageId: "order",
            data: {
              member: nameOf(member) ?? member.type,
              rank: order[rank],
              previous: order[highest]
            }
          });
        }
        highest = Math.max(highest, rank);
      }
    }

    /**
     * Report an action handler whose parameters or JSDoc depart from the handler shape.
     * @param {object} member - A `static #on...` method
     */
    function checkHandler(member) {
      const params = member.value.params.map(param =>
        param.type === "Identifier" ? param.name : ""
      );
      const shaped =
        params.length <= 2 &&
        (params[0] === undefined || /^_?event$/.test(params[0])) &&
        (params[1] === undefined || /^_?element$/.test(params[1]));
      const jsdoc = context.sourceCode.getCommentsBefore(member).at(-1);
      if (!shaped || !jsdoc || !/@this\b/.test(jsdoc.value)) {
        context.report({ node: member.key, messageId: "handler", data: { name: nameOf(member) } });
      }
    }

    return {
      "ClassDeclaration, ClassExpression"(node) {
        const members = node.body.body;
        const names = members.map(nameOf);
        const superText = node.superClass ? context.sourceCode.getText(node.superClass) : "";
        if (file.startsWith("module/data/rules/") && /Rule$/.test(node.id?.name ?? "")) {
          for (const member of members) {
            if (!(
              member.static &&
              nameOf(member) === "defineSchema" &&
              member.type === "MethodDefinition"
            )) {
              context.report({ node: member, messageId: "ruleModel" });
            }
          }
          return;
        }
        const isApp =
          names.includes("DEFAULT_OPTIONS") ||
          names.includes("PARTS") ||
          /Application|Sheet/.test(superText);
        if (isApp) {
          checkOrder(members, appRankOf, APP_ORDER);
          members
            .filter(member => member.static && member.type === "MethodDefinition")
            .filter(
              member => member.key.type === "PrivateIdentifier" && /^on[A-Z]/.test(member.key.name)
            )
            .forEach(checkHandler);
          return;
        }
        if (names.includes("defineSchema") || /DataModel|Data\b/.test(superText)) {
          checkOrder(members, dataRankOf, DATA_ORDER);
        }
      }
    };
  }
};
