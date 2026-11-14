/**
 * @module services/dice/check/collect
 * @description Everything that modifies a check, gathered once per roll so nothing is counted twice: the actor's
 * RollModifier, TNModifier, FreeRaise, DiceRule, Substitute, Note, and ApplyCondition rules (tested against the
 * actor's and the target's roll options), Active Effect values in `system.bonuses`, armor, the target's
 * range-limited Armor TN changes, and Free Raises on items. Stances and conditions reach a check as rules on their
 * effects (module/config/status-effects.js). Each modifier keeps its label so the dialog lists it with a toggle and
 * the card shows it.
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { bagEntries } from "../../../utils/rule-engine.js";
import { getArmorTNPenalty } from "../../../utils/armor-penalties.js";
import { calculateFreeRaises } from "../resources/raise-manager.js";

/**
 * @typedef {object} CheckModifier
 * @property {string} label
 * @property {number} roll
 * @property {number} keep
 * @property {number} total
 * @property {boolean} enabled          On unless the roller turns it off; an optional rule starts off
 * @property {"melee"|"ranged"} [range] Applies only to attacks of that range
 * @property {string|null} [consumes]   UUID of the effect that ends when the modifier is used
 */

/**
 * @typedef {object} CheckContext
 * @property {CheckModifier[]} modifiers
 * @property {Array<{label: string, value: number, range?: string}>} tnModifiers
 * @property {number} freeRaises
 * @property {number|null} explode      Lowest explode threshold a DiceRule sets, or null for none
 * @property {boolean} rerollOnes       A DiceRule re-rolls 1s
 * @property {Array<{label: string, replace: string, with: string}>} substitutes
 * @property {string[]} notes
 * @property {Array<{label: string, condition: string, level: number|null}>} applyConditions  Offered on success
 * @property {string[]} damageSources    Damage-source tags from DamageSource rules (pp.319-320)
 * @property {number} ignoreReduction    Reduction the damage ignores
 */

/**
 * The selectors a check reads rules for: "any" (every roll), its kind, and what it rolls.
 * @param {object} spec
 * @param {string} spec.kind      skill, trait, ring, spell, maho, attack, damage, or roll
 * @param {string} [spec.skill]   Skill name in lower case
 * @param {string} [spec.trait]   Trait key
 * @param {string} [spec.ring]    Ring key
 * @returns {string[]}
 */
export function checkSelectors({ kind, skill, trait, ring }) {
  const selectors = ["any", kind];
  if (kind === "maho") {
    selectors.push("spell");
  }
  if (skill) {
    selectors.push(`skill:${skill}`);
  }
  if (trait) {
    selectors.push(`trait:${trait}`);
  }
  if (ring) {
    selectors.push(`ring:${ring}`);
  }
  return selectors;
}

/**
 * The roll options a check's predicates test: the actor's, `check:<kind>`, and with a target, `target` plus the
 * target's options prefixed `target:`.
 * @param {Actor} actor
 * @param {string} kind
 * @param {Actor|null} target
 * @returns {Set<string>}
 */
export function checkOptions(actor, kind, target) {
  const options = new Set(actor.rollOptions);
  options.add(`check:${kind}`);
  if (target) {
    options.add("target");
    for (const option of target.rollOptions) {
      options.add(`target:${option}`);
    }
  }
  return options;
}

/**
 * Gather the modifiers, TN changes, Free Raises, dice rules, substitutions, and notes for a check.
 *
 * @param {Actor} actor
 * @param {object} spec
 * @param {string} spec.kind
 * @param {string} [spec.skill]
 * @param {string} [spec.trait]
 * @param {string} [spec.ring]
 * @param {Actor|null} [spec.target]
 * @param {Item|null} [spec.weapon]  The weapon of an attack or damage roll: its own rules apply
 * @returns {CheckContext}
 */
export function collectCheck(actor, { kind, skill, trait, ring, target = null, weapon = null }) {
  const selectors = checkSelectors({ kind, skill, trait, ring });
  const options = checkOptions(actor, kind, target);
  const entries = bagKind =>
    bagEntries(actor.ruleBag, bagKind, selectors, options, weapon?.id ?? null);

  const modifiers = entries("rollModifiers").map(entry => ({
    label: entry.label,
    roll: entry.roll,
    keep: entry.keep,
    total: entry.total,
    enabled: !entry.optional,
    ...(entry.range ? { range: entry.range } : {}),
    consumes: entry.consumes ?? null
  }));

  // Active Effect changes on system.bonuses (ACTIVE_EFFECTS.md, Skill and Ring bonuses)
  for (const [category, name] of [
    ["skill", skill],
    ["trait", trait],
    ["ring", ring]
  ]) {
    const bonus = name ? actor.system.bonuses[category][name] : null;
    if (bonus && (toInt(bonus.roll) || toInt(bonus.keep) || toInt(bonus.total))) {
      modifiers.push({
        label: `${T("l5r4.ui.check.effects")} (${name})`,
        roll: toInt(bonus.roll),
        keep: toInt(bonus.keep),
        total: toInt(bonus.total),
        enabled: true
      });
    }
  }

  const tnModifiers = entries("tnModifiers").map(entry => ({
    label: entry.label,
    value: entry.value
  }));
  // The target's Armor TN changes that count only against one attack range (Prone against melee, p.89)
  if (kind === "attack" && target) {
    for (const [range, value] of Object.entries(target.system.armorTn?.vs ?? {})) {
      if (value) {
        tnModifiers.push({
          label: `${target.name} (${T(`l5r4.ui.check.range.${range}`)})`,
          value,
          range
        });
      }
    }
  }
  if (kind !== "damage") {
    const armor = getArmorTNPenalty(actor, skill ?? null, trait ?? null);
    if (armor) {
      tnModifiers.push({ label: T("l5r4.ui.check.armor"), value: armor });
    }
  }

  const freeRaises =
    kind === "damage"
      ? 0
      : calculateFreeRaises(actor) +
        entries("freeRaises").reduce((sum, entry) => sum + entry.value, 0);

  const diceRules = entries("diceRules");
  const thresholds = diceRules.map(rule => rule.explode).filter(value => value !== null);

  return {
    modifiers,
    tnModifiers,
    freeRaises,
    explode: thresholds.length ? Math.min(...thresholds) : null,
    rerollOnes: diceRules.some(rule => rule.rerollOnes),
    substitutes: entries("substitutes").map(entry => ({
      label: entry.label,
      replace: entry.replace,
      with: entry.with
    })),
    notes: entries("notes").map(entry => entry.text),
    applyConditions: entries("applyConditions").map(entry => ({
      label: entry.label,
      condition: entry.condition,
      level: entry.level
    })),
    damageSources: [...new Set(entries("damageSources").flatMap(entry => entry.tags))],
    ignoreReduction: entries("damageSources").reduce((sum, entry) => sum + entry.ignoreReduction, 0)
  };
}
