/**
 * @module config/game-mechanics
 * @description Core L5R4 game mechanics constants and modifiers: XP costs, combat modifiers, and other mechanical
 * values from the Legend of the Five Rings 4th Edition rulebook, so every part of the system applies the same
 * numbers. Object and array values are frozen.
 */

/**
 * XP multiplier for increasing Ring/Trait ranks.
 * Cost = new rank × TRAIT_XP_MULTIPLIER, so raising Agility from 3 to 4 costs 16 XP.
 * @type {number}
 * @constant
 */
export const TRAIT_XP_MULTIPLIER = 4;

/**
 * XP multiplier for increasing Void Ring rank.
 * Cost = new rank × VOID_XP_MULTIPLIER, so raising Void from 2 to 3 costs 18 XP.
 * @type {number}
 * @constant
 */
export const VOID_XP_MULTIPLIER = 6;

/**
 * XP multiplier for increasing Skill ranks.
 * Cost = new rank × SKILL_XP_MULTIPLIER, so raising Kenjutsu from 4 to 5 costs 5 XP.
 * @type {number}
 * @constant
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
 * Armor reduces TN by this amount per point of reduction value: Light Armor (reduction 3) reduces TN by 15.
 * @type {number}
 * @constant
 */
export const ARMOR_TN_PENALTY = 5;

/**
 * What riding armor adds to its Armor TN bonus while its wearer is mounted: its +4 is +12 on horseback.
 * game-rules/73_armor.md, p.198
 * @type {number}
 */
export const RIDING_ARMOR_MOUNTED_BONUS = 8;

/**
 * TN increase per Raise called on a roll.
 * Each Raise increases the TN by this amount: 2 Raises on a TN 15 attack make it TN 25.
 * @type {number}
 * @constant
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
 * Each arrow type modifies the rolled (r) and kept (k) dice: a 3k2 bow with flesh-cutter arrows rolls 5k5.
 * @type {Readonly<{armor: {r: number, k: number}, flesh: {r: number, k: number}, humming: {r: number, k: number}, rope: {r: number, k: number}, willow: {r: number, k: number}}>}
 * @constant
 * @property {object} armor - Armor-piercing arrows (+1r, +1k)
 * @property {object} flesh - Flesh-cutter arrows (+2r, +3k)
 * @property {object} humming - Humming-bulb arrows (+0r, +1k)
 * @property {object} rope - Rope-cutter arrows (+1r, +1k)
 * @property {object} willow - Willow-leaf arrows (+2r, +2k)
 */
export const ARROW_MODS = Object.freeze({
  armor: { r: 1, k: 1 },
  flesh: { r: 2, k: 3 },
  humming: { r: 0, k: 1 },
  rope: { r: 1, k: 1 },
  willow: { r: 2, k: 2 }
});

/**
 * How many times an arrow counts the armor bonus in its target's Armor TN (Table 3.1): an Armor Piercing arrow
 * ignores it, a Flesh Cutter doubles it. Arrows not listed count it once.
 * game-rules/74_weapons.md, p.199
 * @type {Readonly<Record<string, number>>}
 */
export const ARROW_ARMOR_FACTOR = Object.freeze({ armor: 0, flesh: 2 });

/**
 * Change to the total of any ranged attack on a target within melee range.
 * game-rules/32_attack_and_defense.md, p.82
 */
export const RANGED_IN_MELEE_PENALTY = -10;

/**
 * The counts of Wound Ranks an NPC in formula mode may use, Out included (Ernie's ruling, #155): 2 is Healthy and
 * Out, 8 every rank.
 * @type {Readonly<{2: number, 3: number, 4: number, 5: number, 6: number, 7: number, 8: number}>}
 * @constant
 */
export const NPC_NUMBER_WOUND_LEVELS = Object.freeze({
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8
});

/**
 * The lowest and highest rank of each rank-and-points track, by its field: 0-10, Status from -10 for the Status of
 * geisha, ninja, and others below the samurai caste (Ernie's ruling).
 * game-rules/43_honor.md, p.90
 * game-rules/45_status.md, p.94-95
 * @type {Readonly<Record<string, [number, number]>>}
 */
export const RANK_TRACK_RANGE = Object.freeze({
  honor: Object.freeze([0, 10]),
  glory: Object.freeze([0, 10]),
  status: Object.freeze([-10, 10]),
  shadowTaint: Object.freeze([0, 10])
});

/**
 * The Insight Rank an NPC counts as where a rule needs one: NPCs have no Insight, so the Initiative pool and
 * healing use Rank 1 (Ernie's ruling).
 * game-rules/31_combat_round.md, p.81
 * game-rules/35_healing_wounds.md, p.84
 * @type {number}
 */
export const NPC_INSIGHT_RANK = 1;

/**
 * What a Void Point spent on Initiative adds to the roll.
 * game-rules/25_rings_and_traits.md, p.78
 * @type {number}
 */
export const VOID_INITIATIVE_BONUS = 10;

/**
 * Insight a Skill's Mastery Abilities add above the Rings and Skill ranks, by Skill name in lower case: each step
 * adds `insight` from Skill Rank `rank` on. Courtier and Etiquette add 3 at Rank 3 and 7 more at Rank 7.
 * game-rules/59_high_skills.md, p.135-136
 * @type {Readonly<Record<string, ReadonlyArray<{rank: number, insight: number}>>>}
 */
export const MASTERY_INSIGHT = Object.freeze({
  courtier: Object.freeze([
    Object.freeze({ rank: 3, insight: 3 }),
    Object.freeze({ rank: 7, insight: 7 })
  ]),
  etiquette: Object.freeze([
    Object.freeze({ rank: 3, insight: 3 }),
    Object.freeze({ rank: 7, insight: 7 })
  ])
});

/**
 * Canonical wound level progression order for L5R4 characters.
 * Defines the 8 wound levels from Healthy to Out in ascending severity.
 * Used to iterate wound levels in correct sequence during damage calculations.
 * @type {ReadonlyArray<string>}
 * @constant
 */
export const WOUND_LEVEL_ORDER = Object.freeze([
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
 * Each wound level increases the Target Number of all rolls by the specified amount. Out prints none: its character
 * is unconscious (roadmap/STAGE-18 decision 14).
 * game-rules/33_wounds.md, p.82
 * @type {Readonly<{healthy: number, nicked: number, grazed: number, hurt: number, injured: number, crippled: number, down: number, out: number}>}
 * @constant
 */
export const DEFAULT_WOUND_PENALTIES = Object.freeze({
  healthy: 0,
  nicked: 3,
  grazed: 5,
  hurt: 10,
  injured: 15,
  crippled: 20,
  down: 40,
  out: 0
});

/**
 * Default wound threshold values for manual wound level configuration.
 * Fallback values for NPCs in manual mode or actor initialization.
 * Based on Earth Ring 3 with standard multipliers.
 * @type {Readonly<{healthy: number, nicked: number, grazed: number, hurt: number, injured: number, crippled: number, down: number, out: number}>}
 * @constant
 */
export const DEFAULT_WOUND_THRESHOLDS = Object.freeze({
  healthy: 15,
  nicked: 20,
  grazed: 25,
  hurt: 30,
  injured: 35,
  crippled: 40,
  down: 43,
  out: 45
});

/**
 * Stances a condition rules out: Dazed allows only Defense and Full Defense, Prone only Attack and Defense;
 * Fatigued and Mounted forbid Full Attack. The sheet warns and still lets the player choose.
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/36_stances.md, p.84
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const STANCE_LIMITS = Object.freeze({
  dazed: Object.freeze(["attackStance", "fullAttackStance", "centerStance"]),
  prone: Object.freeze(["fullAttackStance", "fullDefenseStance", "centerStance"]),
  fatigued: Object.freeze(["fullAttackStance"]),
  mounted: Object.freeze(["fullAttackStance"])
});

/**
 * When a condition's stance limit does not hold, by condition and stance: a predicate over the actor's roll options
 * (module/utils/predicate.js). Horsemanship Rank 3 lets a mounted character take Full Attack.
 * game-rules/60_bugei_skills.md, p.140
 * @type {Readonly<Record<string, Readonly<Record<string, ReadonlyArray<string|object>>>>>}
 */
export const STANCE_LIMIT_EXCEPTIONS = Object.freeze({
  mounted: Object.freeze({
    fullAttackStance: Object.freeze([Object.freeze({ gte: ["skill:horsemanship", 3] })])
  })
});
