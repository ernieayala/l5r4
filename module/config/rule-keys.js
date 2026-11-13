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
  "RollOption"
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
  Note: "notes"
});

/**
 * Selector prefixes for RollModifier rules that also write the actor's `system.bonuses` map, which the Skill,
 * Trait, Ring, and spell rolls read: `skill:<skill name in lower case>`, `trait:<trait key>`, `ring:<ring>`.
 * @type {ReadonlyArray<string>}
 */
export const BONUS_SELECTOR_CATEGORIES = freeze(["skill", "trait", "ring"]);

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
