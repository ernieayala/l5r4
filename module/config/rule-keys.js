/**
 * @module config/rule-keys
 * @description The rule keys the engine knows (roadmap/AUTOMATION.md §3). A rule in `system.rules` on an Item or
 * Active Effect is `{ key, ...fields }`; module/data/rules/ holds one DataModel per key.
 */

/**
 * Every rule key, in the order the rules guide lists them.
 * @type {ReadonlyArray<string>}
 */
export const RULE_KEYS = Object.freeze([
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
export const PURCHASE_KEYS = Object.freeze(["Prerequisite", "ChoiceSet", "GrantItem"]);

/**
 * Keys whose output collects in the actor's modifier bag, keyed by selector, for rolls to read. The bag kind is
 * the value.
 * @type {Readonly<Record<string, string>>}
 */
export const BAG_KINDS = Object.freeze({
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
 * Maneuvers whose Raise cost a RaiseRule can change (module/utils/damage.js, getManeuverCost).
 * game-rules/38_maneuvers.md, p.86-87
 * @type {ReadonlyArray<string>}
 */
export const MANEUVERS = Object.freeze([
  "calledShot",
  "disarm",
  "extraAttack",
  "feint",
  "knockdown"
]);

/**
 * Action types an ActionCost rule names.
 * game-rules/37_actions.md, p.85
 * @type {ReadonlyArray<string>}
 */
export const ACTION_TYPES = Object.freeze(["free", "simple", "complex"]);

/**
 * Tracks a Ledger rule hooks: each holds a rank and points, ten points to a rank.
 * game-rules/43_honor.md, p.90-92
 * game-rules/44_glory.md, p.93
 * game-rules/45_status.md, p.93-95
 * game-rules/89_shadowlands_taint.md, p.274
 * @type {ReadonlyArray<string>}
 */
export const LEDGER_TRACKS = Object.freeze(["honor", "glory", "status", "taint"]);

/**
 * Whether a Ledger rule changes the gains or the losses of its track.
 * @type {ReadonlyArray<string>}
 */
export const LEDGER_DIRECTIONS = Object.freeze(["gain", "loss"]);

/**
 * Built-in option lists a ChoiceSet can offer instead of its own list.
 * @type {ReadonlyArray<string>}
 */
export const CHOICE_LISTS = Object.freeze(["traits", "rings", "skills"]);

/**
 * The values the "traits" and "rings" lists offer. The "skills" list is built from the Skill items there are.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const CHOICE_LIST_VALUES = Object.freeze({
  traits: Object.freeze(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]),
  rings: Object.freeze(["air", "earth", "fire", "water", "void"])
});

/**
 * Other names a rule may give a Skill type, by the type Skills store (module/config/localization.js SKILL_TYPES):
 * the rules guide writes `skill-type:merchant` for the Merchant Skills, stored as "merch" (#173).
 * @type {Readonly<Record<string, string>>}
 */
export const SKILL_TYPE_ALIASES = Object.freeze({ merchant: "merch" });

/**
 * Attack ranges a RollModifier or ArmorTN rule can be limited to.
 * @type {ReadonlyArray<string>}
 */
export const ATTACK_RANGES = Object.freeze(["melee", "ranged"]);

/**
 * How an ArmorTN rule changes the Armor TN (module/utils/effects.js, getArmorTn).
 * @type {ReadonlyArray<string>}
 */
export const ARMOR_TN_MODES = Object.freeze(["add", "base", "total"]);

/**
 * Combat events a PeriodicSave is rolled on: the Reactions stage is the end of the Round.
 * game-rules/31_combat_round.md, p.82
 * @type {ReadonlyArray<string>}
 */
export const SAVE_EVENTS = Object.freeze(["roundEnd", "turnStart", "turnEnd"]);

/**
 * What a failed PeriodicSave does: nothing (try again next time), or end the effect at the end of the next Round
 * (Stunned).
 * game-rules/41_conditional_effects.md, p.89
 * @type {ReadonlyArray<string>}
 */
export const SAVE_FAILURES = Object.freeze(["retry", "endNextRound"]);

/**
 * TraitAdjust targets: the eight Trait keys plus the Void Ring.
 * @type {ReadonlyArray<string>}
 */
export const ADJUSTABLE_TRAITS = Object.freeze([
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
