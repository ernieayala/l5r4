/**
 * @module utils/selectors
 * @description The one form Skill names, Skill types, and rule selectors are compared in (#173): lower case, trimmed,
 * runs of spaces as one, and a Skill type by the name Skills store. A rule written `skill:Kenjutsu ` or
 * `skill-type:merchant` reaches the rolls `skill:kenjutsu` and `skill-type:merch` name.
 */

import { SKILL_TYPE_ALIASES } from "../config/rule-keys.js";

/**
 * A Skill name as rolls, selectors, and roll options compare it: "Tea Ceremony " becomes "tea ceremony".
 * @param {string} name
 * @returns {string}
 */
export function toSkillKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * A Skill type by the name Skills store: "Merchant" becomes "merch".
 * @param {string} type
 * @returns {string}
 */
export function toSkillType(type) {
  const key = toSkillKey(type);
  return SKILL_TYPE_ALIASES[key] ?? key;
}

/**
 * A rule selector in the form rolls build theirs: the part before the first colon and the rest each in lower case and
 * trimmed, so `Skill: Lore: Bushido` is `skill:lore: bushido`, and a Skill type by its stored name.
 * @param {string} selector
 * @returns {string}
 */
export function toSelector(selector) {
  const text = String(selector ?? "");
  const colon = text.indexOf(":");
  if (colon < 0) {
    return toSkillKey(text);
  }
  const prefix = toSkillKey(text.slice(0, colon));
  const rest = text.slice(colon + 1);
  return `${prefix}:${prefix === "skill-type" ? toSkillType(rest) : toSkillKey(rest)}`;
}

/**
 * The pairs of rules that differ only in one having the selector "skill" and the other "attack". Before an attack
 * with a Weapon Skill read "skill" rules, such a pair covered every Skill roll once; now an attack would take both
 * (#173). The world migration resolves each pair (module/setup/migrations/items/skill-attack-rules.js).
 * @param {object[]} rules - A document's raw `system.rules`
 * @returns {Array<{skill: number, attack: number}>} The pairs' indexes in `rules`
 */
export function getSkillAttackTwins(rules) {
  const twins = [];
  const used = new Set();
  const restOf = rule => toSortedJson({ ...rule, selector: null });
  (rules ?? []).forEach((rule, skill) => {
    if (rule?.selector !== "skill") {
      return;
    }
    const attack = rules.findIndex(
      (other, i) => !used.has(i) && other?.selector === "attack" && restOf(other) === restOf(rule)
    );
    if (attack >= 0) {
      used.add(attack);
      twins.push({ skill, attack });
    }
  });
  return twins;
}

/**
 * The Skill item of a name among items, compared as toSkillKey compares names.
 * @param {Iterable<{type: string, name: string}>} items - An actor's items
 * @param {string} name
 * @returns {object|null}
 */
export function getSkillItem(items, name) {
  const key = toSkillKey(name);
  for (const item of items) {
    if (item.type === "skill" && toSkillKey(item.name) === key) {
      return item;
    }
  }
  return null;
}

/**
 * A value as JSON with object keys in order, so two rules written with their fields in different orders compare equal.
 * @param {*} value
 * @returns {string}
 */
function toSortedJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(toSortedJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${toSortedJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
