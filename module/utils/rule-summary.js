/**
 * @module utils/rule-summary
 * @description One line per rule in `system.rules`, so the sheets and chat cards say what an item does without
 * written text (roadmap/STAGE-15, decision 1).
 *
 * Each line is a phrase: a localization key and its data. A data value may itself be a phrase, which the caller
 * localizes first (module/utils/localization.js, formatPhrase). Nothing here reads Foundry globals.
 */

import { RULE_KEYS } from "../config/rule-keys.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";

/**
 * @typedef {object} Phrase
 * @property {string} key   Localization key
 * @property {Record<string, string|number|Phrase>} data
 */

/**
 * The phrases every rule's line builder shares (linesOf).
 * @typedef {object} LineTerms
 * @property {function(object): Phrase[]} main - The rule key's own line with its data
 * @property {function(): Phrase} rolls - The rolls the rule's selector names
 * @property {function(Phrase[]): Phrase[]} ranged - The lines with the rule's attack range added, when it has one
 * @property {function(string): string} itemName - The name of the item a uuid names
 */

/** Trait keys, each named by `l5r4.ui.mechanics.traits.<key>`. */
const TRAITS = Object.freeze(new Set(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]));

/** Ring keys, each named by `l5r4.ui.mechanics.rings.<key>`. */
const RINGS = Object.freeze(new Set(["air", "earth", "fire", "water", "void"]));

/**
 * The line builder of each rule key: the rule and its LineTerms in, its summary lines out (linesOf).
 * @type {Readonly<Record<string, function(object, LineTerms): Phrase[]>>}
 */
const LINE_BUILDERS = Object.freeze({
  RollModifier: buildModifierLines,
  OpponentModifier: buildModifierLines,
  TNModifier: (rule, { main, rolls }) =>
    main({ value: formatSigned(rule.value ?? 0), rolls: rolls() }),
  ArmorTN: buildArmorTnLines,
  Reduction: buildReductionLines,
  Wounds: (rule, { main }) =>
    main({ perRank: formatSigned(rule.perRank ?? 0), penalty: formatSigned(rule.penalty ?? 0) }),
  Initiative: (rule, { main }) => main({ bonus: formatPool(rule) }),
  FreeRaise: (rule, { main, rolls }) => main({ value: String(rule.value ?? 1), rolls: rolls() }),
  DiceRule: buildDiceRuleLines,
  Substitute: (rule, { main, rolls }) =>
    main({
      replace: buildSelectorPhrase(rule.replace),
      with: buildSelectorPhrase(rule.with),
      rolls: rolls()
    }),
  TraitAdjust: (rule, { main }) =>
    main({
      trait:
        rule.trait === "void"
          ? buildPhrase("l5r4.ui.mechanics.rings.void")
          : buildNamePhrase("trait", rule.trait),
      value: formatSigned(rule.value ?? 0)
    }),
  Note: (rule, { main, rolls }) => main({ text: String(rule.text ?? ""), rolls: rolls() }),
  RollOption: (rule, { main }) => main({ option: String(rule.option ?? "") }),
  Movement: (rule, { main }) => main({ value: formatSigned(rule.water ?? 0) }),
  ApplyCondition: (rule, { main, rolls }) =>
    main({ condition: buildConditionPhrase(rule.condition), rolls: rolls() }),
  ConditionImmunity: (rule, { main }) => main({ condition: buildConditionPhrase(rule.condition) }),
  PeriodicSave: (rule, { main }) => {
    const [kind, value] = String(rule.roll ?? "").split(":");
    return main({ roll: buildNamePhrase(kind, value), tn: rule.tn ?? 20 });
  },
  Resource: (rule, { main }) =>
    main({
      max: String(rule.max ?? 1),
      slug: String(rule.slug ?? ""),
      per: buildPhrase(`l5r4.ui.ruleSummary.per.${rule.per ?? "round"}`)
    }),
  DamageSource: buildDamageSourceLines,
  Invulnerability: (rule, { main }) => main({ harmedBy: formatTagList(rule.harmedBy) }),
  Spirit: (rule, { main }) => main({ harmedBy: formatTagList(rule.harmedBy) }),
  RaiseRule: buildRaiseRuleLines,
  UnskilledAs: (rule, { main, rolls }) => main({ rank: String(rule.rank ?? 1), rolls: rolls() }),
  ActionCost: (rule, { main, rolls, ranged }) =>
    ranged(
      main({
        action: buildPhrase(`l5r4.ui.ruleSummary.action.${rule.action ?? "simple"}`),
        rolls: rolls()
      })
    ),
  Cost: (rule, { main }) =>
    main({ what: buildPricedPhrase(rule.selector), value: String(rule.value ?? "@cost") }),
  Ledger: (rule, { main }) =>
    main({
      track: buildPhrase(`l5r4.ui.ledger.tracks.${rule.track ?? "honor"}`),
      direction: buildPhrase(`l5r4.ui.ruleSummary.direction.${rule.direction ?? "gain"}`),
      value: String(rule.value ?? "@points")
    }),
  Prerequisite: (rule, { main }) =>
    main({ requires: rule.label || formatPredicate(rule.requires ?? []) }),
  ChoiceSet: (rule, { main }) =>
    rule.selection
      ? [buildPhrase("l5r4.ui.ruleSummary.chosen", { selection: String(rule.selection) })]
      : main({ prompt: rule.prompt || String(rule.flag ?? "") }),
  GrantItem: (rule, { main, itemName }) =>
    main({ item: itemName(String(rule.uuid ?? "")), rank: rule.rank ?? 0 })
});

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
 * The lines of one rule, before any predicate is added: the line builder of its key, given the phrases every rule
 * shares.
 * @param {object} rule
 * @param {function(string): string} itemName - The name of the item a uuid names
 * @returns {Phrase[]}
 */
function linesOf(rule, itemName) {
  const key = rule.key;
  const builder = Object.hasOwn(LINE_BUILDERS, key) ? LINE_BUILDERS[key] : null;
  if (!builder) {
    return [buildPhrase("l5r4.ui.ruleSummary.unknown", { key: String(key ?? "") })];
  }
  return builder(rule, {
    main: data => [buildPhrase(SUMMARY_KEYS[key], data)],
    rolls: () => buildSelectorPhrase(rule.selector),
    // A rule limited to one attack range says which
    ranged: lines =>
      rule.range ? [...lines, buildPhrase(`l5r4.ui.ruleSummary.range.${rule.range}`)] : lines,
    itemName
  });
}

/**
 * A RollModifier's or OpponentModifier's lines: the bonus on its rolls, its range, and whether it is optional.
 * @param {object} rule
 * @param {LineTerms} terms
 * @returns {Phrase[]}
 */
function buildModifierLines(rule, { main, rolls, ranged }) {
  const lines = ranged(main({ bonus: formatPool(rule), rolls: rolls() }));
  if (rule.optional) {
    lines.push(buildPhrase("l5r4.ui.ruleSummary.optional"));
  }
  return lines;
}

/**
 * An ArmorTN rule's lines: a base or total it sets, or the change it adds with its range.
 * @param {object} rule
 * @param {LineTerms} terms
 * @returns {Phrase[]}
 */
function buildArmorTnLines(rule, { main, ranged }) {
  const mode = rule.mode ?? "add";
  if (mode !== "add") {
    return [buildPhrase(`l5r4.ui.ruleSummary.armorTn.${mode}`, { value: String(rule.value ?? 0) })];
  }
  return ranged(main({ value: formatSigned(rule.value ?? 0) }));
}

/**
 * A Reduction rule's lines: the Reduction, and the damage tags it does not stop.
 * @param {object} rule
 * @param {LineTerms} terms
 * @returns {Phrase[]}
 */
function buildReductionLines(rule, { main }) {
  if (!rule.except?.length) {
    return main({ value: formatSigned(rule.value ?? 0) });
  }
  return [
    buildPhrase("l5r4.ui.ruleSummary.reductionExcept", {
      value: formatSigned(rule.value ?? 0),
      except: formatTagList(rule.except)
    })
  ];
}

/**
 * A DiceRule's lines: the explode threshold and the re-rolled 1s it sets on its rolls.
 * @param {object} rule
 * @param {LineTerms} terms
 * @returns {Phrase[]}
 */
function buildDiceRuleLines(rule, { rolls }) {
  const lines = [];
  if (rule.explode) {
    lines.push(buildPhrase(SUMMARY_KEYS.DiceRule, { explode: rule.explode, rolls: rolls() }));
  }
  if (rule.rerollOnes) {
    lines.push(buildPhrase("l5r4.ui.ruleSummary.rerollOnes", { rolls: rolls() }));
  }
  return lines;
}

/**
 * A DamageSource rule's lines: the damage tags it gives its rolls and the Reduction they ignore.
 * @param {object} rule
 * @param {LineTerms} terms
 * @returns {Phrase[]}
 */
function buildDamageSourceLines(rule, { main, rolls }) {
  const lines = rule.tags?.length ? main({ tags: formatTagList(rule.tags), rolls: rolls() }) : [];
  if (rule.ignoreReduction) {
    lines.push(
      buildPhrase("l5r4.ui.ruleSummary.ignoreReduction", { value: String(rule.ignoreReduction) })
    );
  }
  return lines;
}

/**
 * A RaiseRule's lines: a maneuver's cost in Raises, the change to the Raise cap, and the Raises it requires.
 * @param {object} rule
 * @param {LineTerms} terms
 * @returns {Phrase[]}
 */
function buildRaiseRuleLines(rule, { rolls }) {
  const lines = [];
  if (rule.maneuver && rule.cost) {
    lines.push(
      buildPhrase(SUMMARY_KEYS.RaiseRule, {
        maneuver: buildPhrase(`l5r4.ui.ruleSummary.maneuver.${rule.maneuver}`),
        cost: formatSigned(rule.cost),
        rolls: rolls()
      })
    );
  }
  if (rule.cap) {
    lines.push(
      buildPhrase("l5r4.ui.ruleSummary.raiseCap", { value: formatSigned(rule.cap), rolls: rolls() })
    );
  }
  if (rule.minimum) {
    lines.push(
      buildPhrase("l5r4.ui.ruleSummary.raiseMinimum", {
        value: String(rule.minimum),
        rolls: rolls()
      })
    );
  }
  return lines;
}
