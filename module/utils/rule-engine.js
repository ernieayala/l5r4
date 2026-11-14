/**
 * @module rule-engine
 * @description What each rule key produces, as pure functions over validated rule data, the actor's roll data,
 * and its roll options (roadmap/AUTOMATION.md §1, §3). module/documents/actor/rules.js collects the rules and
 * writes these outputs onto the prepared actor.
 *
 * A rule whose value does not resolve is skipped and reported in `errors`; one bad rule never stops the rest.
 */

import { BAG_KINDS } from "../config/rule-keys.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";
import { testPredicate } from "./predicate.js";
import { resolveValue } from "./rule-values.js";
import { stackModifiers } from "./modifier-stacking.js";

/**
 * @typedef {object} RuleEntry
 * @property {object} rule          Validated rule data: `key`, `label`, `priority`, `predicate`, and the key's fields
 * @property {string} source        Name of the Item or Active Effect that carries the rule
 * @property {string} [effectUuid]  The Active Effect that carries the rule, for rules on effects
 * @property {string} [weaponId]    The weapon that carries the rule: its roll rules apply to rolls with it
 * @property {number} [level]       That effect's level (a Fear Rank), which formulas read as `@level`
 */

/**
 * A resolver for one entry's values: its formulas see the actor's roll data plus `@level`.
 * @param {object} rollData
 * @returns {function(*, RuleEntry): number}
 */
function valueResolver(rollData) {
  return (value, entry) =>
    resolveValue(
      value,
      entry?.level === undefined ? rollData : { ...rollData, level: entry.level }
    );
}

/**
 * @typedef {object} RuleError
 * @property {string} source
 * @property {string} key
 * @property {string} message
 */

/**
 * Run `fn` for each rule with one of `keys` whose predicate holds, collecting value errors.
 * @param {RuleEntry[]} entries
 * @param {string[]} keys
 * @param {Set<string>|null} options  null runs every rule, leaving predicates to be tested later.
 * @param {RuleError[]} errors
 * @param {function(object, RuleEntry): void} fn
 */
function forEachRule(entries, keys, options, errors, fn) {
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
 * Parse the rules a user typed as JSON. The engine validates each rule's fields; this checks the shape: a list of
 * objects, each with a string `key`.
 * @param {string} text
 * @returns {{rules?: object[], error?: "invalidJson"|"notList", detail?: string}}
 *
 * @example
 * parseRulesJson('[{"key": "Note", "selector": "attack", "text": "Hi"}]'); // { rules: [...] }
 * parseRulesJson("{"); // { error: "invalidJson", detail: "..." }
 */
export function parseRulesJson(text) {
  let rules;
  try {
    rules = JSON.parse(text.trim() || "[]");
  } catch (err) {
    return { error: "invalidJson", detail: err.message };
  }
  const isRule = rule =>
    rule !== null &&
    typeof rule === "object" &&
    !Array.isArray(rule) &&
    typeof rule.key === "string";
  if (!Array.isArray(rules) || !rules.every(isRule)) {
    return { error: "notList" };
  }
  return { rules };
}

/**
 * A copy of the rules a status effect carries (module/config/status-effects.js), for every path that creates the
 * effect without ActiveEffect.fromStatusEffect.
 * @param {string} statusId
 * @returns {object[]} Empty for a status without rules.
 */
export function statusRules(statusId) {
  return structuredClone(
    STATUS_EFFECTS.find(status => status.id === statusId)?.system?.rules ?? []
  );
}

/**
 * Roll options added by RollOption rules: an option without a toggle is always on; a toggle is on when its
 * `value` is true. Rules are read in order, so a RollOption's predicate sees the options added before it.
 * @param {RuleEntry[]} entries
 * @param {Set<string>} options  Read and extended in place.
 * @returns {Set<string>} The same set.
 */
export function addRuleRollOptions(entries, options) {
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
export function traitAdjustments(entries, rollData, options) {
  const adjustments = {};
  const errors = [];
  const value = valueResolver(rollData);
  forEachRule(entries, ["TraitAdjust"], options, errors, (rule, entry) => {
    adjustments[rule.trait] = (adjustments[rule.trait] ?? 0) + value(rule.value, entry);
  });
  return { adjustments, errors };
}

/**
 * Sum of the numeric TraitAdjust values for one Trait on one document's rules, without predicates or formulas:
 * the Family and School bonus that XP and the Trait arrows read (Core Rulebook p.103).
 * @param {object[]} [rules]  Raw `system.rules` of one Item, stored data that may hold anything.
 * @param {string} trait
 * @returns {number}
 */
export function traitAdjustTotal(rules, trait) {
  let total = 0;
  for (const rule of rules ?? []) {
    const value = Number(rule?.value);
    if (rule?.key === "TraitAdjust" && rule.trait === trait && Number.isFinite(value)) {
      total += value;
    }
  }
  return total;
}

/**
 * @typedef {object} DerivedRuleOutputs
 * @property {import("./effects.js").ArmorRule[]} armor  ArmorTN rules, resolved
 * @property {number} reduction       Reduction rules
 * @property {Array<{value: number, except: string[]}>} reductionParts  Each Reduction rule with its exceptions
 * @property {{invulnerable: object|null, spirit: object|null}} defenses  Invulnerability and Spirit rules
 * @property {number} woundsPerRank   Wounds rules: Wounds added to each Wound Rank
 * @property {number} woundPenalty    Wounds rules: added to every Wound Rank's TN penalty
 * @property {number} movementWater   Movement rules: Water Ring ranks for movement
 * @property {{roll: number, keep: number, total: number}} initiative
 * @property {Set<string>} immunities Statuses the actor cannot gain (ConditionImmunity)
 * @property {object[]} saves         PeriodicSave rules with the effect each one ends
 * @property {Record<string, {max: number, per: string}>} resources  Resource rules by slug, maxima added
 * @property {Record<string, Record<string, object[]>>} bag  Bag entries by kind, then selector
 * @property {RuleError[]} errors
 */

/**
 * Outputs of the rules that run once Traits and Rings are known.
 * @param {RuleEntry[]} entries
 * @param {object} rollData
 * @param {Set<string>} options
 * @returns {DerivedRuleOutputs}
 */
export function derivedRuleOutputs(entries, rollData, options) {
  const errors = [];
  const value = valueResolver(rollData);

  const armor = [];
  forEachRule(entries, ["ArmorTN"], options, errors, (rule, entry) => {
    armor.push({
      mode: rule.mode,
      value: value(rule.value, entry),
      type: rule.type,
      range: rule.range
    });
  });

  let reduction = 0;
  const reductionParts = [];
  forEachRule(entries, ["Reduction"], options, errors, (rule, entry) => {
    const part = value(rule.value, entry);
    reduction += part;
    reductionParts.push({ value: part, except: [...rule.except] });
  });

  // Creature defenses (pp.319-320); several of one kind act as the first
  const defenses = { invulnerable: null, spirit: null };
  forEachRule(entries, ["Invulnerability"], options, errors, rule => {
    defenses.invulnerable ??= { harmedBy: [...rule.harmedBy], only: [...rule.only] };
  });
  forEachRule(entries, ["Spirit"], options, errors, rule => {
    defenses.spirit ??= { harmedBy: [...rule.harmedBy] };
  });

  let movementWater = 0;
  forEachRule(entries, ["Movement"], options, errors, (rule, entry) => {
    movementWater += value(rule.water, entry);
  });

  let woundsPerRank = 0;
  let woundPenalty = 0;
  forEachRule(entries, ["Wounds"], options, errors, (rule, entry) => {
    // Resolve both before adding either, so a bad formula changes neither total.
    const [perRank, penalty] = [value(rule.perRank, entry), value(rule.penalty, entry)];
    woundsPerRank += perRank;
    woundPenalty += penalty;
  });

  const initiative = { roll: 0, keep: 0, total: 0 };
  forEachRule(entries, ["Initiative"], options, errors, (rule, entry) => {
    const [roll, keep, total] = [
      value(rule.roll, entry),
      value(rule.keep, entry),
      value(rule.total, entry)
    ];
    initiative.roll += roll;
    initiative.keep += keep;
    initiative.total += total;
  });

  const immunities = new Set();
  forEachRule(entries, ["ConditionImmunity"], options, errors, rule => {
    immunities.add(rule.condition);
  });

  // A save belongs to the effect it ends; an item's rule has no effect to end and is skipped
  const saves = [];
  forEachRule(entries, ["PeriodicSave"], options, errors, (rule, entry) => {
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

  const resources = {};
  forEachRule(entries, ["Resource"], options, errors, (rule, entry) => {
    const max = value(rule.max, entry);
    resources[rule.slug] ??= { max: 0, per: rule.per };
    resources[rule.slug].max += max;
  });

  const bag = Object.fromEntries(Object.values(BAG_KINDS).map(kind => [kind, {}]));
  forEachRule(entries, Object.keys(BAG_KINDS), null, errors, (rule, entry) => {
    // Resolve first, so a rule whose value fails leaves no trace in the bag
    const output = bagEntry(rule, entry, v => value(v, entry));
    (bag[BAG_KINDS[rule.key]][rule.selector] ??= []).push(output);
  });

  return {
    armor,
    reduction,
    reductionParts,
    defenses,
    woundsPerRank,
    woundPenalty,
    movementWater,
    initiative,
    immunities,
    saves,
    resources,
    bag,
    errors
  };
}

/**
 * The bag entry for one rule: its resolved numbers, predicate (tested again when a roll reads it, with the
 * target's options), and label.
 * @param {object} rule
 * @param {RuleEntry} entry
 * @param {function(*): number} value
 * @returns {object}
 */
function bagEntry(rule, entry, value) {
  const base = {
    label: rule.label || entry.source,
    source: entry.source,
    predicate: rule.predicate,
    weaponId: entry.weaponId ?? null
  };
  switch (rule.key) {
    case "RollModifier":
      return {
        ...base,
        roll: value(rule.roll),
        keep: value(rule.keep),
        total: value(rule.total),
        type: rule.type,
        range: rule.range,
        optional: rule.optional,
        // The effect a ticked `consumes` modifier ends; an item's rule has none to end
        consumes: rule.consumes && entry.effectUuid ? entry.effectUuid : null
      };
    case "TNModifier":
      return { ...base, value: value(rule.value), type: rule.type };
    case "FreeRaise":
      return { ...base, value: value(rule.value) };
    case "DiceRule":
      return { ...base, explode: rule.explode, rerollOnes: rule.rerollOnes };
    case "Substitute":
      return { ...base, replace: rule.replace, with: rule.with };
    case "Note":
      return { ...base, text: rule.text };
    case "ApplyCondition":
      return { ...base, condition: rule.condition, level: rule.level };
    case "DamageSource":
      return { ...base, tags: [...rule.tags], ignoreReduction: value(rule.ignoreReduction) };
  }
  throw new Error(`No bag entry for ${rule.key}`);
}

/**
 * Bag entries of one kind for any of the selectors, whose predicates hold for the options. An entry from a weapon
 * counts only for a roll made with that weapon.
 * @param {Record<string, Record<string, object[]>>} bag
 * @param {string} kind  A BAG_KINDS value.
 * @param {string[]} selectors
 * @param {Set<string>} options
 * @param {string|null} [weaponId=null]  The weapon the roll is made with
 * @returns {object[]}
 */
export function bagEntries(bag, kind, selectors, options, weaponId = null) {
  const byKind = bag?.[kind] ?? {};
  return selectors
    .flatMap(selector => byKind[selector] ?? [])
    .filter(entry => !entry.weaponId || entry.weaponId === weaponId)
    .filter(entry => testPredicate(entry.predicate, options));
}

/**
 * The roll, keep, and total bonus the RollModifier rules give rolls with any of the selectors, stacked: what a
 * sheet shows in a formula such as a Skill's "7k3", before the roll dialog adds its situational choices. Optional
 * modifiers and those limited to one attack range wait for the dialog.
 * @param {Record<string, Record<string, object[]>>} bag
 * @param {string[]} selectors
 * @param {Set<string>} options
 * @param {string|null} [weaponId=null]  The weapon the formula is for
 * @returns {{roll: number, keep: number, total: number}}
 */
export function selectorBonus(bag, selectors, options, weaponId = null) {
  return stackModifiers(
    bagEntries(bag, "rollModifiers", selectors, options, weaponId).filter(
      e => !e.optional && !e.range
    )
  );
}
