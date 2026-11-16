/**
 * @module utils/rule-summary
 * @description One line per rule in `system.rules`, so the sheets and chat cards say what an item does without
 * written text (roadmap/STAGE-15, decision 1), and the "Core Rulebook p.N" citation of `system.source`.
 *
 * Each line is a phrase: a localization key and its data. A data value may itself be a phrase, which the caller
 * localizes first (module/utils/localization.js, phraseText). Nothing here reads Foundry globals.
 */

import { RULE_KEYS } from "../config/rule-keys.js";
import { SOURCE_BOOKS } from "../config/sources.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";

/**
 * @typedef {object} Phrase
 * @property {string} key   Localization key
 * @property {Record<string, string|number|Phrase>} data
 */

/** Trait keys, each named by `l5r4.ui.mechanics.traits.<key>`. */
const TRAITS = new Set(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]);

/** Ring keys, each named by `l5r4.ui.mechanics.rings.<key>`. */
const RINGS = new Set(["air", "earth", "fire", "water", "void"]);

/**
 * The summary key of each rule key.
 * @type {Readonly<Record<string, string>>}
 */
export const SUMMARY_KEYS = Object.freeze(
  Object.fromEntries(RULE_KEYS.map(key => [key, `l5r4.ui.ruleSummary.${key}`]))
);

/**
 * A rule value with its sign: "+2", "-1", or a formula as written.
 * @param {number|string} value
 * @returns {string}
 */
export function signed(value) {
  if (typeof value === "number") {
    return value < 0 ? String(value) : `+${value}`;
  }
  return String(value ?? 0);
}

/**
 * A roll, keep, and total bonus as one pool: "+1k1", "+0k1+5", "+5".
 * @param {{roll?: number|string, keep?: number|string, total?: number|string}} bonus
 * @returns {string}
 */
export function poolText({ roll = 0, keep = 0, total = 0 }) {
  const dice = roll || keep ? `${signed(roll)}k${keep}` : "";
  const flat = total ? signed(total) : "";
  return dice + flat || "+0";
}

/**
 * The rolls a selector names (ACTIVE_EFFECTS.md **Selectors**), as a phrase.
 * @param {string} selector
 * @returns {Phrase}
 */
export function selectorPhrase(selector) {
  const text = String(selector ?? "");
  const [kind, value] = text.includes(":") ? text.split(/:(.*)/s) : [text, ""];
  if (!value) {
    const plain = ["any", "skill", "trait", "ring", "attack", "damage", "spell", "maho"];
    return plain.includes(kind)
      ? phrase(`l5r4.ui.ruleSummary.selector.${kind}`)
      : phrase("l5r4.ui.ruleSummary.text", { text });
  }
  if (kind === "skill" || kind === "trait" || kind === "ring") {
    return phrase("l5r4.ui.ruleSummary.selector.named", { name: namePhrase(kind, value) });
  }
  if (kind === "skill-type" || kind === "skill-tag") {
    return phrase(`l5r4.ui.ruleSummary.selector.${kind}`, { name: titleCase(value) });
  }
  return phrase("l5r4.ui.ruleSummary.text", { text });
}

/**
 * The summary lines of one rule from `system.rules`. A rule is user-authored data, so one with an unknown key or
 * missing fields still gives a line rather than throwing. A rule with a predicate says so on its first line. A
 * RollModifier of one rolled die on attacks gives one RollModifier line with the bonus "+1k0" and the attack
 * selector's phrase.
 * @param {object} rule
 * @param {object} [options]
 * @param {function(string): string} [options.itemName] - The name of the item a GrantItem's uuid names
 * @returns {Phrase[]}
 */
export function ruleSummary(rule, { itemName = uuid => uuid } = {}) {
  if (!rule || typeof rule !== "object" || !RULE_KEYS.includes(rule.key)) {
    return [phrase("l5r4.ui.ruleSummary.unknown", { key: String(rule?.key ?? "") })];
  }
  const lines = linesOf(rule, itemName);
  const predicate = Array.isArray(rule.predicate) ? rule.predicate : [];
  if (lines.length && predicate.length) {
    lines[0] = phrase("l5r4.ui.ruleSummary.when", {
      rule: lines[0],
      when: predicateText(predicate)
    });
  }
  return lines;
}

/**
 * The summary lines of every rule in a list.
 * @param {object[]} rules - `system.rules`
 * @param {object} [options] - As ruleSummary's
 * @returns {Phrase[]}
 */
export function rulesSummary(rules, options) {
  return (Array.isArray(rules) ? rules : []).flatMap(rule => ruleSummary(rule, options));
}

/**
 * The citation of `system.source`: the book's name and the page number. Null when the item cites no book.
 * @param {{book?: string, page?: number}} source
 * @returns {Phrase|null}
 */
export function sourceCitation(source) {
  const book = SOURCE_BOOKS[source?.book];
  if (!book || !(source.page > 0)) {
    return null;
  }
  return phrase("l5r4.ui.ruleSummary.citation", { book: phrase(book), page: source.page });
}

/**
 * A phrase.
 * @param {string} key
 * @param {Record<string, string|number|Phrase>} [data={}]
 * @returns {Phrase}
 */
const phrase = (key, data = {}) => ({ key, data });

/**
 * The name of a Trait, a Ring, or a Skill as a phrase; a Skill name is the item's, as the selector writes it.
 * @param {string} kind - trait, ring, or skill
 * @param {string} value
 * @returns {Phrase}
 */
function namePhrase(kind, value) {
  if (kind === "trait" && TRAITS.has(value)) {
    return phrase(`l5r4.ui.mechanics.traits.${value}`);
  }
  if (kind === "ring" && RINGS.has(value)) {
    return phrase(`l5r4.ui.mechanics.rings.${value}`);
  }
  return phrase("l5r4.ui.ruleSummary.text", { text: titleCase(value) });
}

/**
 * Title Case for a lower-case Skill or tag name.
 * @param {string} text
 * @returns {string}
 */
function titleCase(text) {
  return String(text).replace(/(^|[\s:-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * A status effect's name, as a phrase.
 * @param {string} id
 * @returns {Phrase}
 */
function conditionPhrase(id) {
  const status = STATUS_EFFECTS.find(s => s.id === id);
  return status ? phrase(status.name) : phrase("l5r4.ui.ruleSummary.text", { text: String(id) });
}

/**
 * A list of tags, as text.
 * @param {string[]} tags
 * @returns {string}
 */
const tagList = tags => (Array.isArray(tags) ? tags.join(", ") : "");

/**
 * The text of a predicate's terms: option strings as written, other terms as JSON.
 * @param {Array} predicate
 * @returns {string}
 */
function predicateText(predicate) {
  return predicate.map(term => (typeof term === "string" ? term : JSON.stringify(term))).join(", ");
}

/**
 * What a Cost rule prices, as a phrase.
 * @param {string} selector
 * @returns {Phrase}
 */
function pricedPhrase(selector) {
  const text = String(selector ?? "");
  if (text === "self") {
    return phrase("l5r4.ui.ruleSummary.priced.self");
  }
  if (text === "emphasis") {
    return phrase("l5r4.ui.ruleSummary.priced.emphasis");
  }
  if (text.startsWith("item:")) {
    return phrase("l5r4.ui.ruleSummary.priced.items", { type: text.slice(5) });
  }
  return selectorPhrase(text);
}

/**
 * The lines of one rule, before any predicate is added.
 * @param {object} rule
 * @param {function(string): string} itemName - The name of the item a uuid names
 * @returns {Phrase[]}
 */
function linesOf(rule, itemName) {
  const key = rule.key;
  const main = data => [phrase(SUMMARY_KEYS[key], data)];
  const rolls = () => selectorPhrase(rule.selector);
  // A rule limited to one attack range says which
  const ranged = lines =>
    rule.range ? [...lines, phrase(`l5r4.ui.ruleSummary.range.${rule.range}`)] : lines;
  switch (key) {
    case "RollModifier":
    case "OpponentModifier": {
      const lines = ranged(main({ bonus: poolText(rule), rolls: rolls() }));
      if (rule.optional) {
        lines.push(phrase("l5r4.ui.ruleSummary.optional"));
      }
      return lines;
    }
    case "TNModifier":
      return main({ value: signed(rule.value ?? 0), rolls: rolls() });
    case "ArmorTN": {
      const mode = rule.mode ?? "add";
      if (mode !== "add") {
        return [phrase(`l5r4.ui.ruleSummary.armorTn.${mode}`, { value: String(rule.value ?? 0) })];
      }
      return ranged(main({ value: signed(rule.value ?? 0) }));
    }
    case "Reduction":
      return rule.except?.length
        ? [
            phrase("l5r4.ui.ruleSummary.reductionExcept", {
              value: signed(rule.value ?? 0),
              except: tagList(rule.except)
            })
          ]
        : main({ value: signed(rule.value ?? 0) });
    case "Wounds":
      return main({ perRank: signed(rule.perRank ?? 0), penalty: signed(rule.penalty ?? 0) });
    case "Initiative":
      return main({ bonus: poolText(rule) });
    case "FreeRaise":
      return main({ value: String(rule.value ?? 1), rolls: rolls() });
    case "DiceRule": {
      const lines = [];
      if (rule.explode) {
        lines.push(phrase(SUMMARY_KEYS.DiceRule, { explode: rule.explode, rolls: rolls() }));
      }
      if (rule.rerollOnes) {
        lines.push(phrase("l5r4.ui.ruleSummary.rerollOnes", { rolls: rolls() }));
      }
      return lines;
    }
    case "Substitute":
      return main({
        replace: selectorPhrase(rule.replace),
        with: selectorPhrase(rule.with),
        rolls: rolls()
      });
    case "TraitAdjust":
      return main({
        trait:
          rule.trait === "void"
            ? phrase("l5r4.ui.mechanics.rings.void")
            : namePhrase("trait", rule.trait),
        value: signed(rule.value ?? 0)
      });
    case "Note":
      return main({ text: String(rule.text ?? ""), rolls: rolls() });
    case "RollOption":
      return main({ option: String(rule.option ?? "") });
    case "Movement":
      return main({ value: signed(rule.water ?? 0) });
    case "ApplyCondition":
      return main({ condition: conditionPhrase(rule.condition), rolls: rolls() });
    case "ConditionImmunity":
      return main({ condition: conditionPhrase(rule.condition) });
    case "PeriodicSave": {
      const [kind, value] = String(rule.roll ?? "").split(":");
      return main({ roll: namePhrase(kind, value), tn: rule.tn ?? 20 });
    }
    case "Resource":
      return main({
        max: String(rule.max ?? 1),
        slug: String(rule.slug ?? ""),
        per: phrase(`l5r4.ui.ruleSummary.per.${rule.per ?? "round"}`)
      });
    case "DamageSource": {
      const lines = rule.tags?.length ? main({ tags: tagList(rule.tags), rolls: rolls() }) : [];
      if (rule.ignoreReduction) {
        lines.push(
          phrase("l5r4.ui.ruleSummary.ignoreReduction", { value: String(rule.ignoreReduction) })
        );
      }
      return lines;
    }
    case "Invulnerability":
    case "Spirit":
      return main({ harmedBy: tagList(rule.harmedBy) });
    case "RaiseRule": {
      const lines = [];
      if (rule.maneuver && rule.cost) {
        lines.push(
          phrase(SUMMARY_KEYS.RaiseRule, {
            maneuver: phrase(`l5r4.ui.ruleSummary.maneuver.${rule.maneuver}`),
            cost: signed(rule.cost),
            rolls: rolls()
          })
        );
      }
      if (rule.cap) {
        lines.push(
          phrase("l5r4.ui.ruleSummary.raiseCap", { value: signed(rule.cap), rolls: rolls() })
        );
      }
      if (rule.minimum) {
        lines.push(
          phrase("l5r4.ui.ruleSummary.raiseMinimum", {
            value: String(rule.minimum),
            rolls: rolls()
          })
        );
      }
      return lines;
    }
    case "UnskilledAs":
      return main({ rank: String(rule.rank ?? 1), rolls: rolls() });
    case "ActionCost":
      return ranged(
        main({
          action: phrase(`l5r4.ui.ruleSummary.action.${rule.action ?? "simple"}`),
          rolls: rolls()
        })
      );
    case "Cost":
      return main({ what: pricedPhrase(rule.selector), value: String(rule.value ?? "@cost") });
    case "Ledger":
      return main({
        track: phrase(`l5r4.ui.ledger.tracks.${rule.track ?? "honor"}`),
        direction: phrase(`l5r4.ui.ruleSummary.direction.${rule.direction ?? "gain"}`),
        value: String(rule.value ?? "@points")
      });
    case "Prerequisite":
      return main({ requires: rule.label || predicateText(rule.requires ?? []) });
    case "ChoiceSet":
      return rule.selection
        ? [phrase("l5r4.ui.ruleSummary.chosen", { selection: String(rule.selection) })]
        : main({ prompt: rule.prompt || String(rule.flag ?? "") });
    case "GrantItem":
      return main({ item: itemName(String(rule.uuid ?? "")), rank: rule.rank ?? 0 });
    default:
      return [phrase("l5r4.ui.ruleSummary.unknown", { key: String(key ?? "") })];
  }
}
