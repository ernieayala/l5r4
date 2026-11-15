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
  "Spirit",
  "OpponentModifier",
  "RaiseRule",
  "UnskilledAs",
  "ActionCost",
  "Cost",
  "Ledger",
  "Prerequisite",
  "ChoiceSet",
  "GrantItem"
]);

/**
 * Keys that act when their item is added to an actor, not while the actor is prepared: the engine validates them and
 * leaves them to module/documents/item/purchase.js.
 * @type {ReadonlyArray<string>}
 */
export const PURCHASE_KEYS = freeze(["Prerequisite", "ChoiceSet", "GrantItem"]);

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
  DamageSource: "damageSources",
  OpponentModifier: "opponentModifiers",
  RaiseRule: "raiseRules",
  UnskilledAs: "unskilledAs",
  ActionCost: "actionCosts",
  Cost: "costs"
});

/**
 * Maneuvers whose Raise cost a RaiseRule can change (module/utils/damage.js, maneuverCost; pp.86-87).
 * @type {ReadonlyArray<string>}
 */
export const MANEUVERS = freeze(["calledShot", "disarm", "extraAttack", "feint", "knockdown"]);

/**
 * Action types an ActionCost rule names (p.85).
 * @type {ReadonlyArray<string>}
 */
export const ACTION_TYPES = freeze(["free", "simple", "complex"]);

/**
 * Tracks a Ledger rule hooks (pp.90-95, 274): each holds a rank and points, ten points to a rank.
 * @type {ReadonlyArray<string>}
 */
export const LEDGER_TRACKS = freeze(["honor", "glory", "status", "taint"]);

/**
 * Whether a Ledger rule changes the gains or the losses of its track.
 * @type {ReadonlyArray<string>}
 */
export const LEDGER_DIRECTIONS = freeze(["gain", "loss"]);

/**
 * Built-in option lists a ChoiceSet can offer instead of its own list.
 * @type {ReadonlyArray<string>}
 */
export const CHOICE_LISTS = freeze(["traits", "rings", "skills"]);

/**
 * The values the "traits" and "rings" lists offer. The "skills" list is built from the Skill items there are.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const CHOICE_LIST_VALUES = freeze({
  traits: freeze(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]),
  rings: freeze(["air", "earth", "fire", "water", "void"])
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
