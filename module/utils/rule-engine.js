/**
 * @module utils/rule-engine
 * @description What each rule key produces, as pure functions over validated rule data, the actor's roll data,
 * and its roll options (roadmap/AUTOMATION.md §1, §3). module/documents/actor/rules.js collects the rules and
 * writes these outputs onto the prepared actor.
 *
 * A rule whose value does not resolve is skipped and reported in `errors`; one bad rule never stops the rest.
 */

import { BAG_KINDS } from "../config/rule-keys.js";
import { hasOptionPrefix, testPredicate } from "./predicate.js";
import { buildRuleRollData, getRuleValue } from "./rule-values.js";
import { toSelector } from "./selectors.js";

/**
 * @typedef {object} RuleEntry
 * @property {object} rule          Validated rule data: `key`, `label`, `priority`, `predicate`, and the key's fields
 * @property {string} source        Name of the Item or Active Effect that carries the rule
 * @property {string} [effectUuid]  The Active Effect that carries the rule, for rules on effects
 * @property {string} [itemId]      The item that carries the rule, for rules on items (a Cost rule's `self`)
 * @property {string} [weaponId]    The weapon that carries the rule: its roll rules apply to rolls with it
 * @property {number} [level]       That effect's level (a Fear Rank), which formulas read as `@level`
 */

/**
 * @typedef {object} RuleError
 * @property {string} source
 * @property {string} key
 * @property {string} message
 */

/**
 * The option prefix of the Wound Rank, which preparation finds after the Wounds rules and before the other rules
 * (#175).
 */
const WOUND_OPTION_PREFIX = "wound:";

/**
 * The fields each rule key's bag entry adds to the shared ones (buildBagEntry): the rule, its entry, and its value
 * resolvers in (`value` for any number, `whole` for a count of dice, Raises, or ranks), the key's resolved numbers and
 * settings out.
 * @type {Readonly<Record<string, function(object, RuleEntry, BagResolvers): object>>}
 */
const BAG_ENTRY_BUILDERS = Object.freeze({
  RollModifier: buildModifierBagFields,
  OpponentModifier: buildModifierBagFields,
  RaiseRule: (rule, _entry, { whole }) => ({
    maneuver: rule.maneuver,
    cost: whole(rule.cost),
    cap: whole(rule.cap),
    minimum: whole(rule.minimum)
  }),
  UnskilledAs: (rule, _entry, { whole }) => ({ rank: whole(rule.rank) }),
  ActionCost: rule => ({ action: rule.action, range: rule.range }),
  // The price formula reads the base price, known only when something is priced (module/utils/xp-ledger.js); the
  // effect's level goes with it, for `@level` (#172)
  Cost: (rule, entry) => ({
    value: rule.value,
    itemId: entry.itemId ?? null,
    ...(entry.level === undefined ? {} : { level: entry.level })
  }),
  TNModifier: (rule, _entry, { value }) => ({ value: value(rule.value), type: rule.type }),
  FreeRaise: (rule, _entry, { whole }) => ({ value: whole(rule.value) }),
  DiceRule: rule => ({ explode: rule.explode, rerollOnes: rule.rerollOnes }),
  Substitute: rule => ({ replace: rule.replace, with: rule.with }),
  Note: rule => ({ text: rule.text }),
  ApplyCondition: rule => ({ condition: rule.condition, level: rule.level }),
  DamageSource: (rule, _entry, { value }) => ({
    tags: [...rule.tags],
    ignoreReduction: value(rule.ignoreReduction)
  })
});

/**
 * Roll options added by RollOption rules: an option without a toggle is always on; a toggle is on when its
 * `value` is true. Rules are read in order, so a RollOption's predicate sees the options added before it.
 * @param {RuleEntry[]} entries
 * @param {Set<string>} options - Read and extended in place.
 * @returns {Set<string>} The same set.
 */
export function applyRollOptionRules(entries, options) {
  for (const { rule } of entries) {
    if (rule.key !== "RollOption" || !testPredicate(rule.predicate, options)) {
      continue;
    }
    if (!rule.toggleable || rule.value) {
      options.add(rule.option);
    }
  }
  return options;
}

/**
 * Trait and Void Ring changes from TraitAdjust rules, applied in the "initial" phase so Rings and everything
 * derived from Traits see them, as a Trait Active Effect does (CLAUDE.md, Effect phases).
 * @param {RuleEntry[]} entries
 * @param {object} rollData
 * @param {Set<string>} options
 * @returns {{adjustments: Record<string, number>, errors: RuleError[]}}
 */
export function getTraitAdjustments(entries, rollData, options) {
  const adjustments = {};
  const errors = [];
  const whole = toWholeResolver(getValueResolver(rollData));
  applyMatchingRules({ entries, keys: ["TraitAdjust"], options, errors }, (rule, entry) => {
    adjustments[rule.trait] = (adjustments[rule.trait] ?? 0) + whole(rule.value, entry);
  });
  return { adjustments, errors };
}

/**
 * Sum of the numeric TraitAdjust values for one Trait on one document's rules, without predicates or formulas:
 * the Family and School bonus that XP and the Trait arrows read.
 * game-rules/48_character_creation_expanded.md, p.103
 * @param {object[]} [rules] - Raw `system.rules` of one Item, stored data that may hold anything.
 * @param {string} trait
 * @returns {number}
 */
export function getTraitAdjustTotal(rules, trait) {
  let total = 0;
  for (const rule of rules ?? []) {
    const value = Number(rule?.value);
    if (rule?.key === "TraitAdjust" && rule.trait === trait && Number.isFinite(value)) {
      // A Trait moves by whole ranks, as getTraitAdjustments counts it (#172)
      total += Math.floor(value);
    }
  }
  return total;
}

/**
 * Whether a rule tests the Wound Rank, so it runs once the Wound Rank is known.
 * @param {RuleEntry} entry
 * @returns {boolean}
 */
export function isAfterWoundLevel(entry) {
  return hasOptionPrefix(entry.rule.predicate, [WOUND_OPTION_PREFIX]);
}

/**
 * The Wounds rules' outputs: Wounds added to each Wound Rank and to every Wound Rank's TN penalty. They run before
 * the Wound Rank is found, as it depends on them; a Wounds rule cannot test the Wound Rank (WoundsRule, #175).
 * @param {RuleEntry[]} entries
 * @param {object} rollData
 * @param {Set<string>} options
 * @returns {{woundsPerRank: number, woundPenalty: number, errors: RuleError[]}}
 */
export function getWoundRuleOutputs(entries, rollData, options) {
  const errors = [];
  const value = getValueResolver(rollData);
  let woundsPerRank = 0;
  let woundPenalty = 0;
  applyMatchingRules({ entries, keys: ["Wounds"], options, errors }, (rule, entry) => {
    // Resolve both before adding either, so a bad formula changes neither total.
    const [perRank, penalty] = [value(rule.perRank, entry), value(rule.penalty, entry)];
    woundsPerRank += perRank;
    woundPenalty += penalty;
  });
  return { woundsPerRank, woundPenalty, errors };
}

/**
 * @typedef {object} DerivedRuleOutputs
 * @property {import("./effects.js").ArmorRule[]} armor  ArmorTN rules, resolved
 * @property {number} reduction       Reduction rules
 * @property {Array<{value: number, except: string[]}>} reductionParts  Each Reduction rule with its exceptions
 * @property {{invulnerable: object|null, spirit: object|null}} defenses  Invulnerability and Spirit rules
 * @property {number} movementWater   Movement rules: Water Ring ranks for movement
 * @property {{roll: number, keep: number, total: number}} initiative
 * @property {Set<string>} immunities Statuses the actor cannot gain (ConditionImmunity)
 * @property {object[]} saves         PeriodicSave rules with the effect each one ends
 * @property {Record<string, {max: number, per: string}>} resources  Resource rules by slug, maxima added
 * @property {Array<{track: string, direction: string, value: number|string, source: string}>} ledger  Ledger
 *   rules, their formulas left for the change they size (module/utils/ledger.js)
 * @property {Record<string, Record<string, object[]>>} bag  Bag entries by kind, then selector
 * @property {RuleError[]} errors
 */

/**
 * Outputs of the rules that run once Traits, Rings, and the Wound Rank are known; the Wounds rules run before, in
 * getWoundRuleOutputs. Each group of rule keys runs in turn, so value errors are reported in that order.
 * @param {RuleEntry[]} entries
 * @param {object} rollData
 * @param {Set<string>} options
 * @returns {DerivedRuleOutputs}
 */
export function getDerivedRuleOutputs(entries, rollData, options) {
  const errors = [];
  const value = getValueResolver(rollData);
  const pass = { entries, options, errors, value, whole: toWholeResolver(value) };
  return {
    ...getArmorRuleOutputs(pass),
    defenses: getDefenseRuleOutputs(pass),
    ...getActorRuleOutputs(pass),
    ...getEffectRuleOutputs(pass),
    ...getTrackRuleOutputs(pass),
    bag: buildRuleBag(pass),
    errors
  };
}

/**
 * @typedef {object} RulePass
 * @property {RuleEntry[]} entries
 * @property {Set<string>} options
 * @property {RuleError[]} errors - Extended in place
 * @property {function(*, RuleEntry): number} value - Resolves one entry's value
 * @property {function(*, RuleEntry): number} whole - Resolves one entry's count of dice, Raises, or ranks
 */

/**
 * One entry's value resolvers, for a bag entry's builder.
 * @typedef {object} BagResolvers
 * @property {function(*): number} value - Any number
 * @property {function(*): number} whole - A count of dice, Raises, or ranks, rounded down
 */

/**
 * The ArmorTN and Reduction rules' outputs.
 * @param {RulePass} pass
 * @returns {{armor: object[], reduction: number, reductionParts: object[]}}
 */
function getArmorRuleOutputs(pass) {
  const { value } = pass;
  const armor = [];
  applyMatchingRules({ ...pass, keys: ["ArmorTN"] }, (rule, entry) => {
    armor.push({
      mode: rule.mode,
      value: value(rule.value, entry),
      type: rule.type,
      range: rule.range
    });
  });
  let reduction = 0;
  const reductionParts = [];
  applyMatchingRules({ ...pass, keys: ["Reduction"] }, (rule, entry) => {
    const part = value(rule.value, entry);
    reduction += part;
    reductionParts.push({ value: part, except: [...rule.except] });
  });
  return { armor, reduction, reductionParts };
}

/**
 * Creature defenses; several of one kind act as the first.
 * game-rules/99_creatures.md, p.319-320
 * @param {RulePass} pass
 * @returns {{invulnerable: object|null, spirit: object|null}}
 */
function getDefenseRuleOutputs(pass) {
  const defenses = { invulnerable: null, spirit: null };
  applyMatchingRules({ ...pass, keys: ["Invulnerability"] }, rule => {
    defenses.invulnerable ??= { harmedBy: [...rule.harmedBy], only: [...rule.only] };
  });
  applyMatchingRules({ ...pass, keys: ["Spirit"] }, rule => {
    defenses.spirit ??= { harmedBy: [...rule.harmedBy] };
  });
  return defenses;
}

/**
 * The Movement and Initiative rules' outputs.
 * @param {RulePass} pass
 * @returns {{movementWater: number, initiative: object}}
 */
function getActorRuleOutputs(pass) {
  const { value, whole } = pass;
  let movementWater = 0;
  applyMatchingRules({ ...pass, keys: ["Movement"] }, (rule, entry) => {
    movementWater += whole(rule.water, entry);
  });
  const initiative = { roll: 0, keep: 0, total: 0 };
  applyMatchingRules({ ...pass, keys: ["Initiative"] }, (rule, entry) => {
    const [roll, keep, total] = [
      whole(rule.roll, entry),
      whole(rule.keep, entry),
      value(rule.total, entry)
    ];
    initiative.roll += roll;
    initiative.keep += keep;
    initiative.total += total;
  });
  return { movementWater, initiative };
}

/**
 * The ConditionImmunity and PeriodicSave rules' outputs. A save belongs to the effect it ends; an item's rule has no
 * effect to end and is skipped.
 * @param {RulePass} pass
 * @returns {{immunities: Set<string>, saves: object[]}}
 */
function getEffectRuleOutputs(pass) {
  const immunities = new Set();
  applyMatchingRules({ ...pass, keys: ["ConditionImmunity"] }, rule => {
    immunities.add(rule.condition);
  });
  const saves = [];
  applyMatchingRules({ ...pass, keys: ["PeriodicSave"] }, (rule, entry) => {
    if (entry.effectUuid) {
      const { event, roll, tn, step, min, onFailure } = rule;
      saves.push({
        effectUuid: entry.effectUuid,
        source: entry.source,
        event,
        roll,
        tn,
        step,
        min,
        onFailure
      });
    }
  });
  return { immunities, saves };
}

/**
 * The Resource and Ledger rules' outputs.
 * @param {RulePass} pass
 * @returns {{resources: Record<string, {max: number, per: string}>, ledger: object[]}}
 */
function getTrackRuleOutputs(pass) {
  const { value } = pass;
  const resources = {};
  applyMatchingRules({ ...pass, keys: ["Resource"] }, (rule, entry) => {
    const max = value(rule.max, entry);
    resources[rule.slug] ??= { max: 0, per: rule.per };
    resources[rule.slug].max += max;
  });
  const ledger = [];
  applyMatchingRules({ ...pass, keys: ["Ledger"] }, (rule, entry) => {
    ledger.push({
      track: rule.track,
      direction: rule.direction,
      value: rule.value,
      source: entry.source,
      // The effect's level, for `@level` when the change is sized (module/utils/ledger.js, #172)
      ...(entry.level === undefined ? {} : { level: entry.level })
    });
  });
  return { resources, ledger };
}

/**
 * The rule bag: every bag-kind rule's entry by kind, then selector, whatever its predicate, which a roll tests later.
 * @param {RulePass} pass
 * @returns {Record<string, Record<string, object[]>>}
 */
function buildRuleBag(pass) {
  const { value, whole } = pass;
  const bag = Object.fromEntries(Object.values(BAG_KINDS).map(kind => [kind, {}]));
  applyMatchingRules({ ...pass, keys: Object.keys(BAG_KINDS), options: null }, (rule, entry) => {
    // Resolve first, so a rule whose value fails leaves no trace in the bag
    const output = buildBagEntry(rule, entry, {
      value: v => value(v, entry),
      whole: v => whole(v, entry)
    });
    // Keyed in the form rolls build their selectors, so "skill:Kenjutsu " reaches Kenjutsu rolls (#173)
    (bag[BAG_KINDS[rule.key]][toSelector(rule.selector)] ??= []).push(output);
  });
  return bag;
}

/**
 * A resolver for one entry's values: its formulas see the actor's roll data plus `@level`.
 * @param {object} rollData
 * @returns {function(*, RuleEntry): number}
 */
function getValueResolver(rollData) {
  return (value, entry) => getRuleValue(value, buildRuleRollData(rollData, entry?.level));
}

/**
 * A resolver for counts of dice, Raises, and ranks, which are whole: the value rounded down, so `@traits.ref / 2`
 * with Reflexes 3 is 1 (#172).
 * @param {function(*, RuleEntry): number} value - From getValueResolver
 * @returns {function(*, RuleEntry): number}
 */
function toWholeResolver(value) {
  return (v, entry) => Math.floor(value(v, entry));
}

/**
 * Run `fn` for each rule with one of `keys` whose predicate holds, collecting value errors.
 * @param {object} match
 * @param {RuleEntry[]} match.entries
 * @param {string[]} match.keys
 * @param {Set<string>|null} match.options - null runs every rule, leaving predicates to be tested later.
 * @param {RuleError[]} match.errors - Extended in place
 * @param {function(object, RuleEntry): void} fn
 */
function applyMatchingRules({ entries, keys, options, errors }, fn) {
  for (const entry of entries) {
    const { rule } = entry;
    if (!keys.includes(rule.key) || (options && !testPredicate(rule.predicate, options))) {
      continue;
    }
    try {
      fn(rule, entry);
    } catch (err) {
      errors.push({ source: entry.source, key: rule.key, message: err.message });
    }
  }
}

/**
 * The bag entry for one rule: its resolved numbers, predicate (tested again when a roll reads it, with the
 * target's options), and label.
 * @param {object} rule
 * @param {RuleEntry} entry
 * @param {BagResolvers} resolve
 * @returns {object}
 */
function buildBagEntry(rule, entry, resolve) {
  const base = {
    label: rule.label || entry.source,
    source: entry.source,
    predicate: rule.predicate,
    weaponId: entry.weaponId ?? null
  };
  if (!Object.hasOwn(BAG_ENTRY_BUILDERS, rule.key)) {
    throw new Error(`No bag entry for ${rule.key}`);
  }
  return { ...base, ...BAG_ENTRY_BUILDERS[rule.key](rule, entry, resolve) };
}

/**
 * A RollModifier's or OpponentModifier's bag fields: its resolved dice (whole) and total, type, range, whether the
 * roller may tick it, and the effect a ticked `consumes` modifier ends.
 * @param {object} rule
 * @param {RuleEntry} entry
 * @param {BagResolvers} resolve
 * @returns {object}
 */
function buildModifierBagFields(rule, entry, { value, whole }) {
  return {
    roll: whole(rule.roll),
    keep: whole(rule.keep),
    total: value(rule.total),
    type: rule.type,
    range: rule.range,
    optional: Boolean(rule.optional),
    // The effect a ticked `consumes` modifier ends; an item's rule has none to end
    consumes: rule.consumes && entry.effectUuid ? entry.effectUuid : null
  };
}
