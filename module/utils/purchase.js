/**
 * @module utils/purchase
 * @description What an item asks of its buyer before it is added to an actor (roadmap/STAGE-11): its Prerequisite
 * rules and its ChoiceSet rules. Rules are stored user JSON, so each reader checks the shape it needs and skips a
 * rule that does not have it.
 */

import { CHOICE_LISTS } from "../config/rule-keys.js";
import { hasOpenChoice } from "./choices.js";
import { testPredicate } from "./predicate.js";

/**
 * The Prerequisite rules an actor does not meet: each rule whose own predicate holds (when it applies) and whose
 * `requires` does not. A "Kenjutsu 3" Prerequisite is unmet for a buyer with Kenjutsu 2.
 * @param {object[]} rules - An item's raw `system.rules`
 * @param {Set<string>} options - The buyer's roll options
 * @returns {Array<{label: string, requires: Array}>}
 */
export function getUnmetPrerequisites(rules, options) {
  return (rules ?? [])
    .filter(rule => rule?.key === "Prerequisite" && Array.isArray(rule.requires))
    .filter(rule => testPredicate(Array.isArray(rule.predicate) ? rule.predicate : [], options))
    .filter(rule => !testPredicate(rule.requires, options))
    .map(rule => ({ label: String(rule.label ?? ""), requires: rule.requires }));
}

/**
 * Whether a character may learn a kiho: its Ring plus its School Rank meets the kiho's Mastery Level. This is the
 * Brotherhood monk's test; the optional rules for other characters (Ring alone, or School Rank alone) are never
 * looser, so a kiho this refuses no character may learn, and the GM decides the rest by adding it anyway.
 * game-rules/87_kiho.md, p.261, 266
 * @param {number} mastery - The kiho's Mastery Level
 * @param {number} ring - The character's rank in the kiho's Ring
 * @param {number} schoolRank - The character's School Rank
 * @returns {boolean}
 */
export function isKihoMasteryMet(mastery, ring, schoolRank) {
  return ring + schoolRank >= mastery;
}

/**
 * @typedef {object} OpenChoice
 * @property {number} index   The rule's index in the item's rules
 * @property {string} flag
 * @property {string} prompt
 * @property {Array<{value: string, label: string}>} options  The rule's own options
 * @property {string|null} list  A built-in list instead: traits, rings, or skills
 * @property {string[]} filter   Skill types the skills list keeps; empty keeps all
 */

/**
 * The ChoiceSet rules of an item that have no selection yet.
 * @param {object[]} rules - An item's raw `system.rules`
 * @returns {OpenChoice[]}
 */
export function openChoices(rules) {
  const open = [];
  (rules ?? []).forEach((rule, index) => {
    if (rule?.key !== "ChoiceSet" || rule.selection || typeof rule.flag !== "string") {
      return;
    }
    const options = (Array.isArray(rule.options) ? rule.options : [])
      .filter(option => option && typeof option.value === "string" && option.value)
      .map(option => ({ value: option.value, label: String(option.label || option.value) }));
    open.push({
      index,
      flag: rule.flag,
      prompt: String(rule.prompt ?? ""),
      options,
      list: CHOICE_LISTS.includes(rule.list) ? rule.list : null,
      filter: Array.isArray(rule.filter) ? rule.filter.map(String) : []
    });
  });
  return open;
}

/**
 * The uuids an item's GrantItem rules give whatever its buyer chooses: each one whose uuid names no choice.
 * @param {object[]} rules - An item's raw `system.rules`
 * @returns {string[]}
 */
export function getFixedGrantUuids(rules) {
  return (rules ?? [])
    .filter(rule => rule?.key === "GrantItem" && typeof rule.uuid === "string" && rule.uuid)
    .filter(rule => !hasOpenChoice(rule.uuid))
    .map(rule => rule.uuid);
}

/**
 * A choice's options without what the item grants anyway: an option naming a granted uuid, or a Skill of a granted
 * Skill's name (the world's Battle and a pack's are one Skill). A School's chosen Skill is never one it teaches.
 * game-rules/48_character_creation_expanded.md, p.102
 * @param {Array<{value: string, label: string, name?: string}>} options - `name` is a skills-list option's Skill
 * @param {{uuids: string[], names: string[]}} granted - From getFixedGrantUuids, with the granted items' names
 * @returns {Array<{value: string, label: string, name?: string}>}
 */
export function getUngrantedOptions(options, granted) {
  const uuids = new Set(granted.uuids);
  const names = new Set(granted.names.map(name => name.toLowerCase()));
  return options.filter(
    option => !uuids.has(option.value) && !names.has(option.name?.toLowerCase())
  );
}

/**
 * An item's rules with selections stored in their ChoiceSet rules.
 * @param {object[]} rules
 * @param {Record<number, string>} selections - Selection by rule index
 * @returns {object[]} A copy
 */
export function buildRulesWithSelections(rules, selections) {
  return rules.map((rule, index) =>
    index in selections ? { ...rule, selection: selections[index] } : rule
  );
}
