/**
 * @module setup/register-handlebars
 * @description Registers the system's Handlebars helpers on the global `Handlebars` during `init`, so every template
 * can use them: `includes` for conditionals beside core's `eq`, `and`, `or`, and `not`, `coalesce` for the first value
 * that is set, `iconPath` for icon paths, `math` for arithmetic and comparisons, and `concat` and `join` for strings.
 */
import { getIconPath } from "../utils/icons.js";

/**
 * The `math` helper's operators: arithmetic (division and modulo by zero give 0), comparisons, and rounding, which
 * reads only the left operand.
 * @type {Readonly<Record<string, function(number, number): number|boolean>>}
 */
const MATH_OPERATIONS = Object.freeze({
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => (b !== 0 ? a / b : 0),
  "%": (a, b) => (b !== 0 ? a % b : 0),
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  ">=": (a, b) => a >= b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a === b,
  "===": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "!==": (a, b) => a !== b,
  floor: a => Math.floor(a),
  ceil: a => Math.ceil(a),
  round: a => Math.round(a)
});

/**
 * Registers all custom Handlebars helpers for the L5R4 Enhanced system.
 * This function should be called once during system initialization to make
 * all custom helpers available to Handlebars templates throughout the system.
 *
 * The registered helpers extend Handlebars' built-in functionality with:
 * - Array membership for template conditionals (includes)
 * - Null-safe value selection (coalesce)
 * - Mathematical operations and comparisons (math)
 * - String concatenation (concat)
 * - Icon path resolution (iconPath)
 *
 * Usage: Call this function once in the system's init or setup hook.
 * After registration, helpers are available in templates, as in `{{#if (eq value "expected")}}` and
 * `{{math attribute "+" bonus}}`.
 *
 * @returns {void}
 */
export function registerHandlebarsHelpers() {
  // eq, and, or, not, gte, ... are core's [src: client/applications/handlebars.mjs:139-147]; core's and/or take any
  // number of arguments, so they are not registered again here
  Handlebars.registerHelper("includes", hasArrayValue);
  Handlebars.registerHelper("coalesce", getFirstSet);
  // Icon path resolution through the getIconPath utility (module/utils/icons.js)
  Handlebars.registerHelper("iconPath", n => getIconPath(n));
  Handlebars.registerHelper("math", getMathResult);
  Handlebars.registerHelper("concat", formatConcatenated);
  Handlebars.registerHelper("join", formatJoined);
}

/**
 * Array includes helper.
 * Tests if an array includes a specific value.
 * @param {Array} array - Array to search in
 * @param {*} value - Value to search for
 * @returns {boolean} True if array includes value, false otherwise
 */
function hasArrayValue(array, value) {
  if (!Array.isArray(array)) {
    return false;
  }
  return array.includes(value);
}

/**
 * Coalesce helper - returns first non-null, non-undefined value.
 * Useful for providing fallback values in templates.
 * Example template usage: `{{coalesce customValue defaultValue "hardcoded"}}`.
 * @param {...*} args - Values to check, followed by Handlebars options object (auto-removed)
 * @returns {*} First non-null/undefined value, or null if all are null/undefined
 */
function getFirstSet(...args) {
  const A = args.slice(0, -1); // Remove Handlebars options object
  for (const v of A) {
    if (v != null) {
      return v;
    }
  }
  return null;
}

/**
 * Mathematical operations and comparisons helper.
 * Performs arithmetic, comparison, and rounding operations in templates (MATH_OPERATIONS).
 * Automatically converts boolean values to numbers (true=1, false=0) and
 * treats null/undefined as 0 for safe numeric operations.
 *
 * Template usage examples:
 * - {{math stamina "+" bonus}} → Addition
 * - {{#if (math value ">" 5)}} → Comparison
 * - {{math wounds "floor"}} → Rounding (second param ignored)
 *
 * @param {*} L - Left operand (converted to number, booleans become 0/1)
 * @param {string} op - Operator (+, -, *, /, %, >, <, >=, <=, ==, ===, !=, !==, floor, ceil, round)
 * @param {*} R - Right operand (converted to number, booleans become 0/1)
 * @returns {number|boolean} Numeric result for arithmetic/rounding, boolean for comparisons
 */
function getMathResult(L, op, R) {
  // Convert values to numbers: booleans become 0 (false) or 1 (true), null/undefined become 0
  const toOperand = v => (v === true || v === false ? (v ? 1 : 0) : Number(v ?? 0));
  const a = toOperand(L),
    b = toOperand(R);

  if (Object.hasOwn(MATH_OPERATIONS, op)) {
    return MATH_OPERATIONS[op](a, b);
  }
  if (op != null) {
    console.warn(`L5R4 | Unknown math operator "${op}" in template - returning 0`);
  }
  return 0;
}

/**
 * String concatenation helper.
 * Joins multiple string arguments into a single string.
 * Automatically filters out Handlebars options object and any other objects.
 * Only string, number, boolean, null, and undefined values are concatenated.
 *
 * Template usage: `{{concat "prefix-" itemId "-suffix"}}`.
 *
 * @param {...*} args - Values to concatenate, followed by Handlebars options object (auto-removed)
 * @returns {string} Concatenated string of all non-object arguments
 */
function formatConcatenated(...args) {
  // Remove Handlebars options object and filter out any objects, keeping only primitives
  return args
    .slice(0, -1)
    .filter(a => typeof a !== "object")
    .join("");
}

/**
 * Join array helper.
 * Joins array elements with a separator, filtering out falsy values.
 *
 * Template usage: `{{join array ", "}}`.
 *
 * @param {Array} array - Array to join
 * @param {string} separator - Separator string (default: ", ")
 * @returns {string} Joined string with falsy values filtered out
 */
function formatJoined(array, separator = ", ") {
  if (!Array.isArray(array)) {
    return "";
  }
  return array.filter(Boolean).join(separator);
}
