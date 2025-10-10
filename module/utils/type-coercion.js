/**
 * @fileoverview L5R4 Type Coercion & Math Utilities
 * 
 * Provides safe type conversion functions and basic mathematical utilities
 * used throughout the L5R4 system. All functions employ defensive programming
 * with fallback values to prevent runtime errors from invalid input.
 * 
 * **Core Responsibilities:**
 * - **Type Conversion**: Safe string-to-number coercion with fallbacks
 * - **Math Utilities**: Clamping, summing, and other numeric operations
 * - **Document Updates**: Optimized Foundry document update wrapper
 * 
 * **Design Principles:**
 * - **Pure Functions**: No side effects, predictable outputs
 * - **Defensive Programming**: Graceful handling of invalid input
 * - **Fallback Values**: Always provide safe defaults
 * - **Performance**: Efficient algorithms with minimal overhead
 * 
 * **Usage Examples:**
 * ```javascript
 * // Safe integer parsing
 * const rank = toInt(userInput, 0); // fallback to 0
 * const damage = toInt(rollResult, 1); // fallback to 1
 * 
 * // Clamping values
 * const health = clamp(currentHealth, 0, maxHealth);
 * 
 * // Summing values
 * const total = sum(base, bonus1, bonus2, penalty);
 * 
 * // Optimized document updates
 * await safeUpdate(actor, { "system.health.value": newHealth });
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 */

/**
 * Safe integer coercion with fallback.
 * Accepts string or number; trims strings; returns fallback on NaN.
 * Commonly used for parsing user input, dataset attributes, and system data.
 * @param {unknown} v - Value to convert to integer
 * @param {number} [fallback=0] - Fallback value if conversion fails
 * @returns {number} Parsed integer or fallback
 * @example
 * toInt("42", 0);        // 42
 * toInt("  42  ", 0);    // 42 (trimmed)
 * toInt("invalid", 5);   // 5 (fallback)
 * toInt(null, 10);       // 10 (fallback)
 */
export function toInt(v, fallback = 0) {
  // Guard against Symbol values which throw when coerced to string
  if (typeof v === "symbol") {
    return fallback;
  }
  const s = typeof v === "string" ? v.trim() : v;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Clamp a number within the specified range [min, max].
 * Ensures the returned value is never less than min or greater than max.
 * Defensively handles NaN inputs by returning min as fallback.
 * @param {number} n - Number to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped number (or min if any input is NaN)
 * @example
 * clamp(5, 0, 10);   // 5
 * clamp(-5, 0, 10);  // 0 (clamped to min)
 * clamp(15, 0, 10);  // 10 (clamped to max)
 * clamp(NaN, 0, 10); // 0 (fallback to min)
 */
export const clamp = (n, min, max) => {
  // Defensive: return min if any input is NaN (prevents NaN propagation)
  if (Number.isNaN(n) || Number.isNaN(min) || Number.isNaN(max)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
};

/**
 * Sum multiple numbers efficiently. Non-numeric values are ignored.
 * Filters out NaN, Infinity, and Symbol values for safe arithmetic operations.
 * @param {...unknown} nums - Numbers to sum
 * @returns {number} Sum of all finite numbers
 * @example
 * sum(1, 2, 3);           // 6
 * sum(1, "2", 3);         // 6 (string coerced)
 * sum(1, NaN, 3);         // 4 (NaN ignored)
 * sum(1, null, 3, "bad"); // 4 (null→0, "bad"→NaN ignored)
 * sum(5, Symbol("x"), 3); // 8 (Symbol ignored)
 */
export function sum(...nums) {
  let t = 0;
  for (const x of nums) {
    // Guard against Symbol (throws when coerced to Number)
    if (typeof x === "symbol") continue;
    
    const n = Number(x);
    if (Number.isFinite(n)) t += n;
  }
  return t;
}

/**
 * Update a Foundry document safely with optimized options for derived-data flows.
 * Provides sensible defaults for common update patterns while allowing customization.
 * @param {Document} doc - The document to update
 * @param {object} data - Update data object
 * @param {{render?: boolean, diff?: boolean}} [opts] - Update options
 * @param {boolean} [opts.render=false] - Whether to trigger a render
 * @param {boolean} [opts.diff=true] - Whether to use differential updates
 * @returns {Promise<Document>} The updated document
 * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
 * @example
 * // Update without re-rendering (efficient for batch updates)
 * await safeUpdate(actor, { "system.health.value": 25 });
 * 
 * // Update with re-render
 * await safeUpdate(actor, { name: "New Name" }, { render: true });
 */
export function safeUpdate(doc, data, { render = false, diff = true } = {}) {
  return doc.update(data, { render, diff });
}
