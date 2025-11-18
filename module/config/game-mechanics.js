/**
 * @module config/game-mechanics
 * @description Core L5R4 game mechanics constants and modifiers.
 *
 * Defines XP costs, combat modifiers, and other mechanical values from the
 * Legend of the Five Rings 4th Edition rulebook. These constants ensure
 * consistent application of game rules across the system.
 *
 * All values are frozen to prevent runtime modification and maintain
 * mechanical integrity.
 */

const freeze = Object.freeze;

/**
 * XP multiplier for increasing Ring/Trait ranks.
 * Cost = new rank × TRAIT_XP_MULTIPLIER
 * @type {number}
 * @constant
 * @example
 * // Cost to raise Agility from 3 to 4
 * const cost = 4 * TRAIT_XP_MULTIPLIER; // 16 XP
 */
export const TRAIT_XP_MULTIPLIER = 4;

/**
 * XP multiplier for increasing Void Ring rank.
 * Cost = new rank × VOID_XP_MULTIPLIER
 * @type {number}
 * @constant
 * @example
 * // Cost to raise Void from 2 to 3
 * const cost = 3 * VOID_XP_MULTIPLIER; // 18 XP
 */
export const VOID_XP_MULTIPLIER = 6;

/**
 * XP multiplier for increasing Skill ranks.
 * Cost = new rank × SKILL_XP_MULTIPLIER
 * @type {number}
 * @constant
 * @example
 * // Cost to raise Kenjutsu from 4 to 5
 * const cost = 5 * SKILL_XP_MULTIPLIER; // 5 XP
 */
export const SKILL_XP_MULTIPLIER = 1;

/**
 * Flat XP cost to purchase a Skill Emphasis.
 * @type {number}
 * @constant
 */
export const EMPHASIS_XP_COST = 2;

/**
 * TN penalty per point of armor reduction.
 * Armor reduces TN by this amount per point of reduction value.
 * @type {number}
 * @constant
 * @example
 * // Light Armor (reduction 3) reduces TN by 15
 * const tnReduction = 3 * ARMOR_TN_PENALTY; // 15
 */
export const ARMOR_TN_PENALTY = 5;

/**
 * TN increase per Raise called on a roll.
 * Each Raise increases the TN by this amount.
 * @type {number}
 * @constant
 * @example
 * // Calling 2 Raises on TN 15 attack
 * const finalTN = 15 + (2 * TN_PER_RAISE); // TN 25
 */
export const TN_PER_RAISE = 5;

/**
 * Maximum number of Raises allowed on a single roll.
 * System enforces this limit to prevent excessive Raise calls.
 * @type {number}
 * @constant
 */
export const MAX_RAISES = 20;

/**
 * Arrow type modifiers for damage rolls.
 * Each arrow type modifies the rolled (r) and kept (k) dice.
 *
 * @type {Readonly<{armor: {r: number, k: number}, flesh: {r: number, k: number}, humming: {r: number, k: number}, rope: {r: number, k: number}, willow: {r: number, k: number}}>}
 * @constant
 *
 * @property {Object} armor - Armor-piercing arrows (+1r, +1k)
 * @property {Object} flesh - Flesh-cutter arrows (+2r, +3k)
 * @property {Object} humming - Humming-bulb arrows (+0r, +1k)
 * @property {Object} rope - Rope-cutter arrows (+1r, +1k)
 * @property {Object} willow - Willow-leaf arrows (+2r, +2k)
 *
 * @example
 * // Apply flesh-cutter arrow bonus to damage
 * const baseDamage = { rolled: 3, kept: 2 };
 * const withArrow = {
 *   rolled: baseDamage.rolled + ARROW_MODS.flesh.r,
 *   kept: baseDamage.kept + ARROW_MODS.flesh.k
 * }; // 5r5k
 */
export const ARROW_MODS = freeze({
  armor: { r: 1, k: 1 },
  flesh: { r: 2, k: 3 },
  humming: { r: 0, k: 1 },
  rope: { r: 1, k: 1 },
  willow: { r: 2, k: 2 }
});

/**
 * NPC wound level configuration by rank.
 * Maps NPC rank (1-8) to number of wound levels.
 * Higher rank NPCs have more wound levels before dying.
 *
 * @type {Readonly<{1: number, 2: number, 3: number, 4: number, 5: number, 6: number, 7: number, 8: number}>}
 * @constant
 *
 * @example
 * // Rank 3 NPC has 3 wound levels
 * const woundLevels = NPC_NUMBER_WOUND_LVLS[3]; // 3
 */
export const NPC_NUMBER_WOUND_LVLS = freeze({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 });

/**
 * Canonical wound level progression order for L5R4 characters.
 * Defines the 8 wound levels from Healthy to Out in ascending severity.
 * Used to iterate wound levels in correct sequence during damage calculations.
 *
 * @type {ReadonlyArray<string>}
 * @constant
 *
 * @example
 * // Iterate through wound levels
 * for (const level of WOUND_LEVEL_ORDER) {
 *   console.log(level); // "healthy", "nicked", "grazed", ...
 * }
 */
export const WOUND_LEVEL_ORDER = freeze([
  "healthy",
  "nicked",
  "grazed",
  "hurt",
  "injured",
  "crippled",
  "down",
  "out"
]);

/**
 * Default TN penalties for each wound level per L5R4 Combat and Wounds rules.
 * Each wound level increases the Target Number of all rolls by the specified amount.
 *
 * @type {Readonly<{healthy: number, nicked: number, grazed: number, hurt: number, injured: number, crippled: number, down: number, out: number}>}
 * @constant
 *
 * @example
 * // Get penalty for Hurt level
 * const penalty = DEFAULT_WOUND_PENALTIES.hurt; // 10
 */
export const DEFAULT_WOUND_PENALTIES = freeze({
  healthy: 0,
  nicked: 3,
  grazed: 5,
  hurt: 10,
  injured: 15,
  crippled: 20,
  down: 40,
  out: 40
});

/**
 * Default wound threshold values for manual wound level configuration.
 * Fallback values for NPCs in manual mode or actor initialization.
 * Based on Earth Ring 3 with standard multipliers.
 *
 * @type {Readonly<{healthy: number, nicked: number, grazed: number, hurt: number, injured: number, crippled: number, down: number, out: number}>}
 * @constant
 *
 * @example
 * // Get default threshold for Injured level
 * const threshold = DEFAULT_WOUND_THRESHOLDS.injured; // 35
 */
export const DEFAULT_WOUND_THRESHOLDS = freeze({
  healthy: 15,
  nicked: 20,
  grazed: 25,
  hurt: 30,
  injured: 35,
  crippled: 40,
  down: 43,
  out: 45
});
