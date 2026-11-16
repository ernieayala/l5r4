/**
 * @module utils/rule-summary
 * @description One line per rule in `system.rules`, so the sheets and chat cards say what an item does without
 * written text (roadmap/STAGE-15, decision 1), and the "Core Rulebook p.N" citation of `system.source`.
 *
 * Each line is a phrase: a localization key and its data. A data value may itself be a phrase, which the caller
 * localizes first (module/utils/localization.js, formatPhrase). Nothing here reads Foundry globals.
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
const TRAITS = Object.freeze(new Set(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]));

/** Ring keys, each named by `l5r4.ui.mechanics.rings.<key>`. */
const RINGS = Object.freeze(new Set(["air", "earth", "fire", "water", "void"]));

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
export function formatSigned(value) {
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
export function formatPool({ roll = 0, keep = 0, total = 0 }) {
  const dice = roll || keep ? `${formatSigned(roll)}k${keep}` : "";
  const flat = total ? formatSigned(total) : "";
  return dice + flat || "+0";
}

/**
 * The rolls a selector names (ACTIVE_EFFECTS.md **Selectors**), as a phrase.
 * @param {string} selector
 * @returns {Phrase}
 */
export function buildSelectorPhrase(selector) {
  const text = String(selector ?? "");
  const [kind, value] = text.includes(":") ? text.split(/:(.*)/s) : [text, ""];
  if (!value) {
    const plain = ["any", "skill", "trait", "ring", "attack", "damage", "spell", "maho"];
    return plain.includes(kind)
      ? buildPhrase(`l5r4.ui.ruleSummary.selector.${kind}`)
      : buildPhrase("l5r4.ui.ruleSummary.text", { text });
  }
  if (kind === "skill" || kind === "trait" || kind === "ring") {
    return buildPhrase("l5r4.ui.ruleSummary.selector.named", {
      name: buildNamePhrase(kind, value)
    });
  }
  if (kind === "skill-type" || kind === "skill-tag") {
    return buildPhrase(`l5r4.ui.ruleSummary.selector.${kind}`, { name: formatTitleCase(value) });
  }
  return buildPhrase("l5r4.ui.ruleSummary.text", { text });
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
export function buildRuleSummary(rule, { itemName = uuid => uuid } = {}) {
  if (!rule || typeof rule !== "object" || !RULE_KEYS.includes(rule.key)) {
    return [buildPhrase("l5r4.ui.ruleSummary.unknown", { key: String(rule?.key ?? "") })];
  }
  const lines = linesOf(rule, itemName);
  const predicate = Array.isArray(rule.predicate) ? rule.predicate : [];
  if (lines.length && predicate.length) {
    lines[0] = buildPhrase("l5r4.ui.ruleSummary.when", {
      rule: lines[0],
      when: formatPredicate(predicate)
    });
  }
  return lines;
}

/**
 * The summary lines of every rule in a list.
 * @param {object[]} rules - `system.rules`
 * @param {object} [options] - As buildRuleSummary's
 * @returns {Phrase[]}
 */
export function buildRulesSummary(rules, options) {
  return (Array.isArray(rules) ? rules : []).flatMap(rule => buildRuleSummary(rule, options));
}

/**
 * The citation of `system.source`: the book's name and the page number. Null when the item cites no book.
 * @param {{book?: string, page?: number}} source
 * @returns {Phrase|null}
 */
export function buildSourceCitation(source) {
  const book = SOURCE_BOOKS[source?.book];
  if (!book || !(source.page > 0)) {
    return null;
  }
  return buildPhrase("l5r4.ui.ruleSummary.citation", {
    book: buildPhrase(book),
    page: source.page
  });
}

/**
 * A phrase.
 * @param {string} key
 * @param {Record<string, string|number|Phrase>} [data={}]
 * @returns {Phrase}
 */
const buildPhrase = (key, data = {}) => ({ key, data });

/**
 * The name of a Trait, a Ring, or a Skill as a phrase; a Skill name is the item's, as the selector writes it.
 * @param {string} kind - trait, ring, or skill
 * @param {string} value
 * @returns {Phrase}
 */
function buildNamePhrase(kind, value) {
  if (kind === "trait" && TRAITS.has(value)) {
    return buildPhrase(`l5r4.ui.mechanics.traits.${value}`);
  }
  if (kind === "ring" && RINGS.has(value)) {
    return buildPhrase(`l5r4.ui.mechanics.rings.${value}`);
  }
  return buildPhrase("l5r4.ui.ruleSummary.text", { text: formatTitleCase(value) });
}

/**
 * Title Case for a lower-case Skill or tag name.
 * @param {string} text
 * @returns {string}
 */
function formatTitleCase(text) {
  return String(text).replace(/(^|[\s:-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * A status effect's name, as a phrase.
 * @param {string} id
 * @returns {Phrase}
 */
function buildConditionPhrase(id) {
  const status = STATUS_EFFECTS.find(s => s.id === id);
  return status
    ? buildPhrase(status.name)
    : buildPhrase("l5r4.ui.ruleSummary.text", { text: String(id) });
}

/**
 * A list of tags, as text.
 * @param {string[]} tags
 * @returns {string}
 */
const formatTagList = tags => (Array.isArray(tags) ? tags.join(", ") : "");

/**
 * The text of a predicate's terms: option strings as written, other terms as JSON.
 * @param {Array} predicate
 * @returns {string}
 */
function formatPredicate(predicate) {
  return predicate.map(term => (typeof term === "string" ? term : JSON.stringify(term))).join(", ");
}

/**
 * What a Cost rule prices, as a phrase.
 * @param {string} selector
 * @returns {Phrase}
 */
function buildPricedPhrase(selector) {
  const text = String(selector ?? "");
  if (text === "self") {
    return buildPhrase("l5r4.ui.ruleSummary.priced.self");
  }
  if (text === "emphasis") {
    return buildPhrase("l5r4.ui.ruleSummary.priced.emphasis");
  }
  if (text.startsWith("item:")) {
    return buildPhrase("l5r4.ui.ruleSummary.priced.items", { type: text.slice(5) });
  }
  return buildSelectorPhrase(text);
}

/**
 * The lines of one rule, before any predicate is added.
 * @param {object} rule
 * @param {function(string): string} itemName - The name of the item a uuid names
 * @returns {Phrase[]}
 */
function linesOf(rule, itemName) {
  const key = rule.key;
  const buildMainLines = data => [buildPhrase(SUMMARY_KEYS[key], data)];
  const buildRollsPhrase = () => buildSelectorPhrase(rule.selector);
  // A rule limited to one attack range says which
  const buildRangedLines = lines =>
    rule.range ? [...lines, buildPhrase(`l5r4.ui.ruleSummary.range.${rule.range}`)] : lines;
  switch (key) {
    case "RollModifier":
    case "OpponentModifier": {
      const lines = buildRangedLines(
        buildMainLines({ bonus: formatPool(rule), rolls: buildRollsPhrase() })
      );
      if (rule.optional) {
        lines.push(buildPhrase("l5r4.ui.ruleSummary.optional"));
      }
      return lines;
    }
    case "TNModifier":
      return buildMainLines({ value: formatSigned(rule.value ?? 0), rolls: buildRollsPhrase() });
    case "ArmorTN": {
      const mode = rule.mode ?? "add";
      if (mode !== "add") {
        return [
          buildPhrase(`l5r4.ui.ruleSummary.armorTn.${mode}`, { value: String(rule.value ?? 0) })
        ];
      }
      return buildRangedLines(buildMainLines({ value: formatSigned(rule.value ?? 0) }));
    }
    case "Reduction":
      return rule.except?.length
        ? [
            buildPhrase("l5r4.ui.ruleSummary.reductionExcept", {
              value: formatSigned(rule.value ?? 0),
              except: formatTagList(rule.except)
            })
          ]
        : buildMainLines({ value: formatSigned(rule.value ?? 0) });
    case "Wounds":
      return buildMainLines({
        perRank: formatSigned(rule.perRank ?? 0),
        penalty: formatSigned(rule.penalty ?? 0)
      });
    case "Initiative":
      return buildMainLines({ bonus: formatPool(rule) });
    case "FreeRaise":
      return buildMainLines({ value: String(rule.value ?? 1), rolls: buildRollsPhrase() });
    case "DiceRule": {
      const lines = [];
      if (rule.explode) {
        lines.push(
          buildPhrase(SUMMARY_KEYS.DiceRule, { explode: rule.explode, rolls: buildRollsPhrase() })
        );
      }
      if (rule.rerollOnes) {
        lines.push(buildPhrase("l5r4.ui.ruleSummary.rerollOnes", { rolls: buildRollsPhrase() }));
      }
      return lines;
    }
    case "Substitute":
      return buildMainLines({
        replace: buildSelectorPhrase(rule.replace),
        with: buildSelectorPhrase(rule.with),
        rolls: buildRollsPhrase()
      });
    case "TraitAdjust":
      return buildMainLines({
        trait:
          rule.trait === "void"
            ? buildPhrase("l5r4.ui.mechanics.rings.void")
            : buildNamePhrase("trait", rule.trait),
        value: formatSigned(rule.value ?? 0)
      });
    case "Note":
      return buildMainLines({ text: String(rule.text ?? ""), rolls: buildRollsPhrase() });
    case "RollOption":
      return buildMainLines({ option: String(rule.option ?? "") });
    case "Movement":
      return buildMainLines({ value: formatSigned(rule.water ?? 0) });
    case "ApplyCondition":
      return buildMainLines({
        condition: buildConditionPhrase(rule.condition),
        rolls: buildRollsPhrase()
      });
    case "ConditionImmunity":
      return buildMainLines({ condition: buildConditionPhrase(rule.condition) });
    case "PeriodicSave": {
      const [kind, value] = String(rule.roll ?? "").split(":");
      return buildMainLines({ roll: buildNamePhrase(kind, value), tn: rule.tn ?? 20 });
    }
    case "Resource":
      return buildMainLines({
        max: String(rule.max ?? 1),
        slug: String(rule.slug ?? ""),
        per: buildPhrase(`l5r4.ui.ruleSummary.per.${rule.per ?? "round"}`)
      });
    case "DamageSource": {
      const lines = rule.tags?.length
        ? buildMainLines({ tags: formatTagList(rule.tags), rolls: buildRollsPhrase() })
        : [];
      if (rule.ignoreReduction) {
        lines.push(
          buildPhrase("l5r4.ui.ruleSummary.ignoreReduction", {
            value: String(rule.ignoreReduction)
          })
        );
      }
      return lines;
    }
    case "Invulnerability":
    case "Spirit":
      return buildMainLines({ harmedBy: formatTagList(rule.harmedBy) });
    case "RaiseRule": {
      const lines = [];
      if (rule.maneuver && rule.cost) {
        lines.push(
          buildPhrase(SUMMARY_KEYS.RaiseRule, {
            maneuver: buildPhrase(`l5r4.ui.ruleSummary.maneuver.${rule.maneuver}`),
            cost: formatSigned(rule.cost),
            rolls: buildRollsPhrase()
          })
        );
      }
      if (rule.cap) {
        lines.push(
          buildPhrase("l5r4.ui.ruleSummary.raiseCap", {
            value: formatSigned(rule.cap),
            rolls: buildRollsPhrase()
          })
        );
      }
      if (rule.minimum) {
        lines.push(
          buildPhrase("l5r4.ui.ruleSummary.raiseMinimum", {
            value: String(rule.minimum),
            rolls: buildRollsPhrase()
          })
        );
      }
      return lines;
    }
    case "UnskilledAs":
      return buildMainLines({ rank: String(rule.rank ?? 1), rolls: buildRollsPhrase() });
    case "ActionCost":
      return buildRangedLines(
        buildMainLines({
          action: buildPhrase(`l5r4.ui.ruleSummary.action.${rule.action ?? "simple"}`),
          rolls: buildRollsPhrase()
        })
      );
    case "Cost":
      return buildMainLines({
        what: buildPricedPhrase(rule.selector),
        value: String(rule.value ?? "@cost")
      });
    case "Ledger":
      return buildMainLines({
        track: buildPhrase(`l5r4.ui.ledger.tracks.${rule.track ?? "honor"}`),
        direction: buildPhrase(`l5r4.ui.ruleSummary.direction.${rule.direction ?? "gain"}`),
        value: String(rule.value ?? "@points")
      });
    case "Prerequisite":
      return buildMainLines({ requires: rule.label || formatPredicate(rule.requires ?? []) });
    case "ChoiceSet":
      return rule.selection
        ? [buildPhrase("l5r4.ui.ruleSummary.chosen", { selection: String(rule.selection) })]
        : buildMainLines({ prompt: rule.prompt || String(rule.flag ?? "") });
    case "GrantItem":
      return buildMainLines({ item: itemName(String(rule.uuid ?? "")), rank: rule.rank ?? 0 });
    default:
      return [buildPhrase("l5r4.ui.ruleSummary.unknown", { key: String(key ?? "") })];
  }
}
