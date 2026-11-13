/**
 * @module rule-engine
 * @description What each rule key produces, as pure functions over validated rule data, the actor's roll data,
 * and its roll options (roadmap/AUTOMATION.md §1, §3). module/documents/actor/rules.js collects the rules and
 * writes these outputs onto the prepared actor.
 *
 * A rule whose value does not resolve is skipped and reported in `errors`; one bad rule never stops the rest.
 */

import { BAG_KINDS, BONUS_SELECTOR_CATEGORIES } from "../config/rule-keys.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";
import { testPredicate } from "./predicate.js";
import { resolveValue } from "./rule-values.js";
import { stackModifiers } from "./modifier-stacking.js";

/**
 * @typedef {object} RuleEntry
 * @property {object} rule    Validated rule data: `key`, `label`, `priority`, `predicate`, and the key's fields
 * @property {string} source  Name of the Item or Active Effect that carries the rule
 */

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
  forEachRule(entries, ["TraitAdjust"], options, errors, rule => {
    adjustments[rule.trait] = (adjustments[rule.trait] ?? 0) + resolveValue(rule.value, rollData);
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
 * @property {number} armorTn         ArmorTN rules, stacked by type
 * @property {number} reduction       Reduction rules
 * @property {number} woundsPerRank   Wounds rules: Wounds added to each Wound Rank
 * @property {number} woundPenalty    Wounds rules: added to every Wound Rank's TN penalty
 * @property {{roll: number, keep: number, total: number}} initiative
 * @property {Record<string, Record<string, {roll: number, keep: number, total: number}>>} bonuses
 *   RollModifier rules on `skill:`, `trait:`, and `ring:` selectors, by category and name
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
  const value = v => resolveValue(v, rollData);

  const armor = [];
  forEachRule(entries, ["ArmorTN"], options, errors, rule => {
    armor.push({ total: value(rule.value), type: rule.type });
  });

  let reduction = 0;
  forEachRule(entries, ["Reduction"], options, errors, rule => {
    reduction += value(rule.value);
  });

  let woundsPerRank = 0;
  let woundPenalty = 0;
  forEachRule(entries, ["Wounds"], options, errors, rule => {
    // Resolve both before adding either, so a bad formula changes neither total.
    const [perRank, penalty] = [value(rule.perRank), value(rule.penalty)];
    woundsPerRank += perRank;
    woundPenalty += penalty;
  });

  const initiative = { roll: 0, keep: 0, total: 0 };
  forEachRule(entries, ["Initiative"], options, errors, rule => {
    const [roll, keep, total] = [value(rule.roll), value(rule.keep), value(rule.total)];
    initiative.roll += roll;
    initiative.keep += keep;
    initiative.total += total;
  });

  const bag = Object.fromEntries(Object.values(BAG_KINDS).map(kind => [kind, {}]));
  const bonusModifiers = {};
  forEachRule(entries, Object.keys(BAG_KINDS), null, errors, (rule, entry) => {
    const output = bagEntry(rule, entry, value);
    const kind = BAG_KINDS[rule.key];
    (bag[kind][rule.selector] ??= []).push(output);

    // Rolls before the roll pipeline (Stage 8) read system.bonuses, so a RollModifier whose predicate holds now
    // also lands there.
    const [category, name] = splitSelector(rule.selector);
    if (rule.key === "RollModifier" && name && testPredicate(rule.predicate, options)) {
      if (BONUS_SELECTOR_CATEGORIES.includes(category)) {
        ((bonusModifiers[category] ??= {})[name] ??= []).push(output);
      }
    }
  });

  const bonuses = {};
  for (const [category, byName] of Object.entries(bonusModifiers)) {
    bonuses[category] = {};
    for (const [name, modifiers] of Object.entries(byName)) {
      bonuses[category][name] = stackModifiers(modifiers);
    }
  }

  return {
    armorTn: stackModifiers(armor).total,
    reduction,
    woundsPerRank,
    woundPenalty,
    initiative,
    bonuses,
    bag,
    errors
  };
}

/**
 * Split "skill:kenjutsu" into ["skill", "kenjutsu"]; a selector without a colon has no name.
 * @param {string} selector
 * @returns {[string, string]}
 */
function splitSelector(selector) {
  const at = selector.indexOf(":");
  return at < 0 ? [selector, ""] : [selector.slice(0, at), selector.slice(at + 1)];
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
    predicate: rule.predicate
  };
  switch (rule.key) {
    case "RollModifier":
      return {
        ...base,
        roll: value(rule.roll),
        keep: value(rule.keep),
        total: value(rule.total),
        type: rule.type
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
  }
  throw new Error(`No bag entry for ${rule.key}`);
}

/**
 * Bag entries of one kind for any of the selectors, whose predicates hold for the options.
 * @param {Record<string, Record<string, object[]>>} bag
 * @param {string} kind  A BAG_KINDS value.
 * @param {string[]} selectors
 * @param {Set<string>} options
 * @returns {object[]}
 */
export function bagEntries(bag, kind, selectors, options) {
  const byKind = bag?.[kind] ?? {};
  return selectors
    .flatMap(selector => byKind[selector] ?? [])
    .filter(entry => testPredicate(entry.predicate, options));
}
