/**
 * @module config/rule-keys
 * @description The rule keys the engine knows (roadmap/AUTOMATION.md §3). A rule in `system.rules` on an Item or
 * Active Effect is `{ key, ...fields }`; module/data/rules/ holds one DataModel per key.
 */

const freeze = Object.freeze;

/**
 * Every rule key, in the order the rules guide lists them.
 * @type {ReadonlyArray<string>}
 */
export const RULE_KEYS = freeze([
  "RollModifier",
  "TNModifier",
  "ArmorTN",
  "Reduction",
  "Wounds",
  "Initiative",
  "FreeRaise",
  "DiceRule",
  "Substitute",
  "TraitAdjust",
  "Note",
  "RollOption",
  "Movement",
  "ApplyCondition",
  "ConditionImmunity",
  "PeriodicSave",
  "Resource",
  "DamageSource",
  "Invulnerability",
  "Spirit"
]);

/**
 * Keys whose output collects in the actor's modifier bag, keyed by selector, for rolls to read. The bag kind is
 * the value.
 * @type {Readonly<Record<string, string>>}
 */
export const BAG_KINDS = freeze({
  RollModifier: "rollModifiers",
  TNModifier: "tnModifiers",
  FreeRaise: "freeRaises",
  DiceRule: "diceRules",
  Substitute: "substitutes",
  Note: "notes",
  ApplyCondition: "applyConditions",
  DamageSource: "damageSources"
});

/**
 * Attack ranges a RollModifier or ArmorTN rule can be limited to.
 * @type {ReadonlyArray<string>}
 */
export const ATTACK_RANGES = freeze(["melee", "ranged"]);

/**
 * How an ArmorTN rule changes the Armor TN (module/utils/effects.js, resolveArmorTn).
 * @type {ReadonlyArray<string>}
 */
export const ARMOR_TN_MODES = freeze(["add", "base", "total"]);

/**
 * Combat events a PeriodicSave is rolled on: the Reactions stage is the end of the Round (Core Rulebook p.82).
 * @type {ReadonlyArray<string>}
 */
export const SAVE_EVENTS = freeze(["roundEnd", "turnStart", "turnEnd"]);

/**
 * What a failed PeriodicSave does: nothing (try again next time), or end the effect at the end of the next Round
 * (Stunned, p.89).
 * @type {ReadonlyArray<string>}
 */
export const SAVE_FAILURES = freeze(["retry", "endNextRound"]);

/**
 * TraitAdjust targets: the eight Trait keys plus the Void Ring.
 * @type {ReadonlyArray<string>}
 */
export const ADJUSTABLE_TRAITS = freeze([
  "sta",
  "wil",
  "str",
  "per",
  "ref",
  "awa",
  "agi",
  "int",
  "void"
]);
