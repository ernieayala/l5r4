/**
 * Handlebars Helper Registration
 * Registers custom Handlebars helpers for template rendering in the L5R4 Enhanced system.
 * These helpers provide utility functions for templates including logic operations,
 * mathematical calculations, string manipulation, and icon path resolution.
 *
 * Foundry VTT Requirements:
 * - Requires Foundry v13+ (uses global Handlebars object)
 * - Must be called during system initialization (setup hook)
 * - Helpers are globally available in all Handlebars templates (.hbs files)
 *
 * Registered Helpers:
 * - eq, and, or: Logical comparison operators for template conditionals
 * - coalesce: Returns first non-null value from arguments
 * - iconPath: Resolves icon paths using system icon configuration
 * - math: Performs arithmetic and comparison operations in templates
 * - concat: Concatenates string arguments
 *
 * @module setup/register-handlebars
 * @requires Foundry VTT v13+
 */

import { iconPath } from "../config/icons.js";

/**
 * Registers all custom Handlebars helpers for the L5R4 Enhanced system.
 * This function should be called once during system initialization to make
 * all custom helpers available to Handlebars templates throughout the system.
 *
 * The registered helpers extend Handlebars' built-in functionality with:
 * - Logical operators for template conditionals (eq, and, or)
 * - Null-safe value selection (coalesce)
 * - Mathematical operations and comparisons (math)
 * - String concatenation (concat)
 * - Icon path resolution (iconPath)
 *
 * Usage: Call this function once in the system's init or setup hook.
 * After registration, helpers are available in templates like:
 * {{#if (eq value "expected")}}...{{/if}}
 * {{math attribute "+" bonus}}
 *
 * @function registerHandlebarsHelpers
 * @returns {void}
 */
export function registerHandlebarsHelpers() {
  /**
   * Equality comparison helper.
   * Tests if two values are strictly equal (===).
   * @param {*} a - First value to compare
   * @param {*} b - Second value to compare
   * @returns {boolean} True if a === b, false otherwise
   */
  Handlebars.registerHelper("eq", (a, b) => a === b);

  /**
   * Logical AND helper.
   * Returns true only if both values are truthy.
   * @param {*} a - First value to test
   * @param {*} b - Second value to test
   * @returns {boolean} Result of a && b
   */
  Handlebars.registerHelper("and", (a, b) => a && b);

  /**
   * Logical OR helper.
   * Returns true if at least one value is truthy.
   * @param {*} a - First value to test
   * @param {*} b - Second value to test
   * @returns {boolean} Result of a || b
   */
  Handlebars.registerHelper("or", (a, b) => a || b);

  /**
   * Coalesce helper - returns first non-null, non-undefined value.
   * Useful for providing fallback values in templates.
   * Example template usage: {{coalesce customValue defaultValue "hardcoded"}}
   * @param {...*} args - Values to check, followed by Handlebars options object (auto-removed)
   * @returns {*} First non-null/undefined value, or null if all are null/undefined
   */
  Handlebars.registerHelper("coalesce", (...args) => {
    const A = args.slice(0, -1); // Remove Handlebars options object
    for (const v of A) {
      if (v != null) {
        return v;
      }
    }
    return null;
  });

  /**
   * Icon path resolution helper.
   * Normalizes icon references to full Foundry-compatible paths.
   * Delegates to the iconPath utility function from config/icons module.
   * @param {string} n - Icon filename, path, URL, or data URI
   * @returns {string} Normalized icon path for Foundry resource loading
   * @see {@link module:config/icons~iconPath}
   */
  Handlebars.registerHelper("iconPath", n => iconPath(n));

  /**
   * Mathematical operations and comparisons helper.
   * Performs arithmetic, comparison, and rounding operations in templates.
   * Automatically converts boolean values to numbers (true=1, false=0) and
   * treats null/undefined as 0 for safe numeric operations.
   *
   * Supported operations:
   * - Arithmetic: +, -, *, / (division by zero returns 0)
   * - Modulo: % (modulo by zero returns 0)
   * - Comparisons: >, <, >=, <=, ==, ===, !=, !==
   * - Rounding: floor, ceil, round (uses only first operand)
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
  Handlebars.registerHelper("math", function (L, op, R) {
    // Convert values to numbers: booleans become 0 (false) or 1 (true), null/undefined become 0
    const n = v => (v === true || v === false ? (v ? 1 : 0) : Number(v ?? 0));
    const a = n(L),
      b = n(R);

    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        return b !== 0 ? a / b : 0;
      case "%":
        return b !== 0 ? a % b : 0;

      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
      case "==":
        return a === b;
      case "===":
        return a === b;
      case "!=":
        return a !== b;
      case "!==":
        return a !== b;

      case "floor":
        return Math.floor(a);
      case "ceil":
        return Math.ceil(a);
      case "round":
        return Math.round(a);

      default:
        if (op != null) {
          console.warn(`L5R4 | Unknown math operator "${op}" in template - returning 0`);
        }
        return 0;
    }
  });

  /**
   * String concatenation helper.
   * Joins multiple string arguments into a single string.
   * Automatically filters out Handlebars options object and any other objects.
   * Only string, number, boolean, null, and undefined values are concatenated.
   *
   * Template usage: {{concat "prefix-" itemId "-suffix"}}
   *
   * @param {...*} args - Values to concatenate, followed by Handlebars options object (auto-removed)
   * @returns {string} Concatenated string of all non-object arguments
   */
  Handlebars.registerHelper("concat", function (...args) {
    // Remove Handlebars options object and filter out any objects, keeping only primitives
    return args
      .slice(0, -1)
      .filter(a => typeof a !== "object")
      .join("");
  });
}
