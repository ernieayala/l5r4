/**
 * Wound System Constants
 *
 * Defines the canonical wound level progression, default TN penalties, and
 * threshold values for the Legend of the Five Rings 4th Edition wound system.
 *
 * Per L5R4 Combat and Wounds rules, characters progress through 8 wound levels
 * as they accumulate damage. Each wound level increases the TN of all rolls by
 * a specific penalty, representing the character's declining physical condition.
 *
 * Wound Level Progression:
 * - Healthy: No penalty, default condition
 * - Nicked: +3 TN, mild distraction
 * - Grazed: +5 TN, minor injury
 * - Hurt: +10 TN, noticeable impairment
 * - Injured: +15 TN, difficulty focusing
 * - Crippled: +20 TN, barely standing
 * - Down: +40 TN, virtually incapacitated (requires Void Point for Free Actions)
 * - Out: Unconscious, dying
 *
 * These constants are consumed by wound-system.js for character damage tracking
 * and UI display in actor sheets.
 *
 * @module documents/actor/constants/wound-constants
 */

/**
 * Canonical wound level progression order for L5R4 characters.
 *
 * Defines the 8 wound levels from the core rules in ascending severity.
 * Used to iterate wound levels in correct sequence during damage calculations
 * and to validate wound level references throughout the system.
 *
 * @constant {string[]}
 */
export const WOUND_LEVEL_ORDER = [
  "healthy",
  "nicked",
  "grazed",
  "hurt",
  "injured",
  "crippled",
  "down",
  "out"
];

/**
 * Default TN penalties for each wound level per L5R4 Combat and Wounds rules.
 *
 * Each wound level increases the Target Number of all rolls by the specified amount,
 * representing physical impairment from accumulated damage. Values match the official
 * L5R4 progression: Healthy (0), Nicked (+3), Grazed (+5), Hurt (+10), Injured (+15),
 * Crippled (+20), Down (+40), Out (+40).
 *
 * Note: The "Down" and "Out" levels both have +40 TN penalties. Characters at "Down"
 * can only take Free Actions by spending a Void Point. Characters at "Out" are
 * unconscious and cannot act.
 *
 * @constant {WoundPenalties}
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
 * Default wound threshold values for manual wound level configuration.
 *
 * These values serve as fallback defaults when NPCs use manual wound level mode
 * or when initializing new actors. The thresholds represent cumulative damage points
 * required to reach each wound level.
 *
 * Default progression assumes Earth Ring 3 with standard multipliers:
 * - Healthy: 15 (Earth × 5)
 * - Nicked through Crippled: Progressive increments
 * - Down: 43 (near-death threshold)
 * - Out: 45 (unconscious/dying)
 *
 * Actual threshold calculations during gameplay use the formulas in wound-system.js
 * based on character Earth Ring and campaign lethality settings.
 *
 * @constant {WoundThresholds}
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

/**
 * @typedef {Object} WoundPenalties
 * @property {number} healthy - TN penalty for Healthy level (0)
 * @property {number} nicked - TN penalty for Nicked level (+3)
 * @property {number} grazed - TN penalty for Grazed level (+5)
 * @property {number} hurt - TN penalty for Hurt level (+10)
 * @property {number} injured - TN penalty for Injured level (+15)
 * @property {number} crippled - TN penalty for Crippled level (+20)
 * @property {number} down - TN penalty for Down level (+40)
 * @property {number} out - TN penalty for Out level (+40, cannot act)
 */

/**
 * @typedef {Object} WoundThresholds
 * @property {number} healthy - Damage threshold for Healthy level
 * @property {number} nicked - Damage threshold for Nicked level
 * @property {number} grazed - Damage threshold for Grazed level
 * @property {number} hurt - Damage threshold for Hurt level
 * @property {number} injured - Damage threshold for Injured level
 * @property {number} crippled - Damage threshold for Crippled level
 * @property {number} down - Damage threshold for Down level
 * @property {number} out - Damage threshold for Out level
 */
