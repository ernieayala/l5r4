/**
 * @fileoverview L5R4 Handlebars Helper Registration
 * 
 * Registers custom Handlebars helpers for L5R4 templates.
 * Provides utility functions for mathematical operations, comparisons,
 * and L5R4-specific formatting used throughout the template system.
 * 
 * **Available Helpers:**
 * - **Comparison**: eq, ne, and, or (logical operations)
 * - **Math**: math (arithmetic and comparison operations)
 * - **Utility**: coalesce (null coalescing), concat (string joining)
 * - **L5R4 Specific**: iconPath (asset path resolution)
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 */

import { iconPath } from "../config/icons.js";

/**
 * Register all custom Handlebars helpers for the L5R4 system.
 * This function should be called once during system initialization.
 * 
 * **Helper Categories:**
 * - **Logical Comparisons**: eq, ne, and, or for conditional rendering
 * - **Mathematical Operations**: math helper for calculations and comparisons
 * - **Utility Functions**: coalesce for null handling, concat for string building
 * - **Asset Resolution**: iconPath for icon file path generation
 * 
 * @returns {void}
 * 
 * @example
 * // Called from system initialization
 * Hooks.once("init", () => {
 *   registerHandlebarsHelpers();
 * });
 * 
 * @example
 * // Template usage - Comparison
 * {{#if (eq actor.type "pc")}}Player Character{{/if}}
 * 
 * @example
 * // Template usage - Math
 * {{math trait.rank "+" skill.rank}}
 * 
 * @example
 * // Template usage - Coalesce
 * {{coalesce item.system.customValue item.system.defaultValue 0}}
 */
export function registerHandlebarsHelpers() {
  /**
   * Equality comparison helper.
   * @param {any} a - First value to compare
   * @param {any} b - Second value to compare
   * @returns {boolean} True if values are strictly equal (===)
   */
  Handlebars.registerHelper("eq", (a, b) => a === b);

  /**
   * Inequality comparison helper.
   * @param {any} a - First value to compare
   * @param {any} b - Second value to compare
   * @returns {boolean} True if values are not strictly equal (!==)
   */
  Handlebars.registerHelper("ne", (a, b) => a !== b);

  /**
   * Logical AND helper.
   * @param {any} a - First value
   * @param {any} b - Second value
   * @returns {any} Result of logical AND operation
   */
  Handlebars.registerHelper("and", (a, b) => a && b);

  /**
   * Logical OR helper.
   * @param {any} a - First value
   * @param {any} b - Second value
   * @returns {any} Result of logical OR operation
   */
  Handlebars.registerHelper("or", (a, b) => a || b);

  /**
   * Null coalescing helper - returns first non-null value.
   * @param {...any} args - Values to check (last arg is Handlebars options object)
   * @returns {any} First non-null/undefined value, or null if all are null
   * 
   * @example
   * {{coalesce value1 value2 fallback}} // Returns first non-null value
   */
  Handlebars.registerHelper("coalesce", (...args) => {
    const A = args.slice(0, -1); // Remove Handlebars options object
    for (const v of A) if (v != null) return v;
    return null;
  });

  /**
   * Icon path resolution helper.
   * Generates full icon paths for L5R4 system assets.
   * 
   * @param {string} n - Icon name or path
   * @returns {string} Full icon path
   * 
   * @example
   * {{iconPath "air"}} // Returns "systems/l5r4-enhanced/assets/icons/rings/air.png"
   */
  Handlebars.registerHelper("iconPath", (n) => iconPath(n));

  /**
   * Mathematical operations helper.
   * Supports arithmetic operations and comparisons on numeric values.
   * Converts boolean values to 1 (true) or 0 (false) for calculations.
   * 
   * **Supported Operations:**
   * - Arithmetic: +, -, *, /, %
   * - Comparison: >, <, >=, <=, ==, ===, !=, !==
   * - Rounding: floor, ceil, round
   * 
   * @param {any} L - Left operand (number, boolean, or numeric string)
   * @param {string} op - Operation to perform
   * @param {any} R - Right operand (number, boolean, or numeric string)
   * @returns {number|boolean} Result of the operation
   * 
   * @example
   * {{math 5 "+" 3}} // Returns 8
   * {{math total "/" count}} // Division
   * {{math value ">" 10}} // Returns true/false
   * {{math 3.7 "floor"}} // Returns 3
   */
  Handlebars.registerHelper("math", function (L, op, R) {
    // Convert values to numbers (booleans become 1/0)
    const n = (v) => (v === true || v === false) ? (v ? 1 : 0) : Number(v ?? 0);
    const a = n(L), b = n(R);

    switch (op) {
      // Arithmetic operations
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      case "%": return b !== 0 ? a % b : 0;

      // Comparison operations
      case ">": return a > b;
      case "<": return a < b;
      case ">=": return a >= b;
      case "<=": return a <= b;
      case "==": return a == b;
      case "===": return a === b;
      case "!=": return a != b;
      case "!==": return a !== b;

      // Rounding operations (R is ignored for these)
      case "floor": return Math.floor(a);
      case "ceil": return Math.ceil(a);
      case "round": return Math.round(a);

      // Unknown operation - log warning for debugging
      default:
        if (op != null) {
          console.warn(`L5R4 | Unknown math operator "${op}" in template - returning 0`);
        }
        return 0;
    }
  });

  /**
   * String concatenation helper.
   * Joins multiple values into a single string, filtering out objects.
   * 
   * @param {...any} args - Values to concatenate (last arg is Handlebars options object)
   * @returns {string} Concatenated string
   * 
   * @example
   * {{concat "systems/" sysId "/templates/actor.hbs"}}
   * {{concat firstName " " lastName}}
   */
  Handlebars.registerHelper("concat", function (...args) {
    return args.slice(0, -1).filter(a => typeof a !== "object").join("");
  });
}
