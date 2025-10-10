/**
 * @fileoverview L5R4 Fear System - Fear Derived Data Calculation
 * 
 * Provides Fear TN calculation for NPC actors according to L5R4 RAW rules.
 * Pre-computes Fear data during prepareDerivedData for efficient sheet rendering
 * and Fear test execution by the Fear service module.
 * 
 * **Core Responsibilities:**
 * - **Fear TN Calculation**: TN = 5 + (5 × Fear Rank) per RAW
 * - **Active State**: Determine if Fear is enabled (rank > 0)
 * - **Error Handling**: Graceful fallback to safe defaults on calculation errors
 * 
 * **L5R4 Rules as Written (RAW):**
 * - Fear X: TN = 5 + (5 × Fear Rank)
 *   - Example: Fear 3 = TN 20 (5 + 15)
 * - Resistance Roll: Raw Willpower at TN, then add Honor Rank to total
 * - Failure: Character suffers -XkO penalty to all rolls (X = Fear Rank)
 * 
 * **Architecture:**
 * This module computes Fear derived data (TN, active state) which is then
 * consumed by the Fear service module for executing Fear tests and applying
 * penalties. Separation of concerns: calculation logic here, test logic in service.
 * 
 * **Usage:**
 * ```javascript
 * import { prepareFear } from "./fear-system.js";
 * 
 * // During NPC prepareDerivedData
 * prepareFear(sys);
 * 
 * // Access computed values
 * console.log(sys.fear.tn); // 20 (Fear 3)
 * console.log(sys.fear.active); // true
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link ../../services/fear.js|Fear Service} - Uses these computed values
 * @see L5R4 Core Rulebook, 4th Edition, p. 91-92 - Fear rules
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Prepare Fear derived data for NPCs.
 * Computes Fear TN and active state for efficient sheet rendering.
 * Called from Actor.prepareDerivedData() to ensure Fear values are always current.
 * @public
 * 
 * **L5R4 Rules as Written (RAW):**
 * - **Fear X**: TN = 5 + (5 × Fear Rank)
 *   - Fear 1: TN 10
 *   - Fear 2: TN 15
 *   - Fear 3: TN 20
 *   - Fear 4: TN 25
 *   - Fear 5: TN 30
 * 
 * **Calculation:**
 * 1. Extract Fear rank from sys.fear.rank (default 0)
 * 2. Calculate TN = 5 + (5 × rank) if rank > 0, otherwise 0
 * 3. Set active = true if rank > 0, otherwise false
 * 4. Store results in sys.fear for sheet and service access
 * 
 * **Error Handling:**
 * If calculation fails, falls back to safe defaults:
 * - rank: 0
 * - active: false
 * - tn: 0
 * 
 * This ensures sheets and services never encounter undefined Fear data.
 * 
 * @param {object} sys - The actor's system data object
 * @param {object} [sys.fear] - Fear data storage
 * @param {number} [sys.fear.rank] - Fear rank (0-10+)
 * @returns {void} - Modifies sys.fear in place
 * @throws {never} - Never throws; errors are caught and logged with safe defaults applied
 * 
 * @example
 * // Set up NPC with Fear 3
 * sys.fear = { rank: 3 };
 * prepareFear(sys);
 * console.log(sys.fear.tn); // 20
 * console.log(sys.fear.active); // true
 * 
 * @example
 * // NPC with no Fear
 * sys.fear = { rank: 0 };
 * prepareFear(sys);
 * console.log(sys.fear.tn); // 0
 * console.log(sys.fear.active); // false
 */
export function prepareFear(sys) {
  // Defensive: validate sys is a plain object (not null, not array)
  if (!sys || typeof sys !== "object" || Array.isArray(sys)) {
    throw new TypeError("prepareFear requires a valid system object");
  }
  
  try {
    sys.fear = sys.fear || {};
    // toInt safely coerces to integer, handles non-numeric values
    const rank = toInt(sys.fear.rank ?? 0);
    
    sys.fear.rank = rank;
    sys.fear.active = rank > 0;
    // RAW: TN = 5 + (5 × Fear Rank)
    sys.fear.tn = rank > 0 ? 5 + (5 * rank) : 0;
  } catch (err) {
    // Log error for debugging (tests can mock console.warn to suppress)
    console.warn(`${SYS_ID}`, "Failed to prepare Fear derived data", { err });
    // Ensure safe defaults on error
    sys.fear = sys.fear || {};
    sys.fear.rank = 0;
    sys.fear.active = false;
    sys.fear.tn = 0;
  }
}
