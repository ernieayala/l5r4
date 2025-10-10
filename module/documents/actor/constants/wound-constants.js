/**
 * L5R4 Wound System Constants
 * 
 * Defines wound level progression (WOUND_LEVEL_ORDER), default penalties,
 * and default thresholds for the L5R4 wound calculation system.
 * 
 * @see {@link ../calculations/wound-system.js|Wound System} - Uses these constants
 */

/**
 * Standard wound level order for L5R4 system.
 * Defines the progression from healthy to incapacitated.
 * 
 * @type {string[]}
 * @constant
 */
export const WOUND_LEVEL_ORDER = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];

/**
 * Default wound penalty values for manual wound system.
 * Values represent the absolute penalty applied to rolls (e.g., 3 = -3 modifier).
 * 
 * **Penalty Progression:**
 * - Healthy: No penalty
 * - Nicked: -3 to all rolls
 * - Grazed: -5 to all rolls
 * - Hurt: -10 to all rolls
 * - Injured: -15 to all rolls
 * - Crippled: -20 to all rolls
 * - Down: -40 to all rolls (severely incapacitated)
 * - Out: -40 to all rolls (unconscious/dying)
 * 
 * @type {Object<string, number>}
 * @constant
 */
export const DEFAULT_WOUND_PENALTIES = { 
  healthy: 0, 
  nicked: 3, 
  grazed: 5, 
  hurt: 10, 
  injured: 15, 
  crippled: 20, 
  down: 40, 
  out: 40 
};

/**
 * Default wound threshold values for manual wound system.
 * These values are used as initial defaults when creating NPCs in manual mode.
 * 
 * **Threshold Progression:**
 * - Default values assume Earth Ring 3 (Earth × 5 base = 15)
 * - Values increase progressively to model wound accumulation
 * - GMs can customize per-NPC via Wound Configuration
 * 
 * @type {Object<string, number>}
 * @constant
 */
export const DEFAULT_WOUND_THRESHOLDS = { 
  healthy: 15, 
  nicked: 20, 
  grazed: 25, 
  hurt: 30, 
  injured: 35, 
  crippled: 40, 
  down: 43, 
  out: 45 
};
