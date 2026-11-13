/**
 * @module services/dice/check/collect
 * @description Everything that modifies a check, gathered once per roll so nothing is counted twice: the actor's
 * RollModifier, TNModifier, FreeRaise, DiceRule, Substitute, and Note rules (tested against the actor's and the
 * target's roll options), Active Effect values in `system.bonuses`, the Full Attack Stance, conditions, armor, and
 * Free Raises on items. Each modifier keeps its label so the dialog lists it with a toggle and the card shows it.
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { bagEntries } from "../../../utils/rule-engine.js";
import {
  getConditionRollPenalties,
  getConditionTNPenalty
} from "../../../utils/condition-penalties.js";
import { getArmorTNPenalty } from "../../../utils/armor-penalties.js";
import {
  getStanceAttackBonuses,
  getStanceDamageBonuses
} from "../../stance/rolls/attack-bonuses.js";
import { calculateFreeRaises } from "../resources/raise-manager.js";

/**
 * @typedef {object} CheckModifier
 * @property {string} label
 * @property {number} roll
 * @property {number} keep
 * @property {number} total
 * @property {boolean} enabled          On unless the roller turns it off
 * @property {"melee"|"ranged"} [range] Applies only to attacks of that range
 */

/**
 * @typedef {object} CheckContext
 * @property {CheckModifier[]} modifiers
 * @property {Array<{label: string, value: number}>} tnModifiers
 * @property {number} freeRaises
 * @property {number|null} explode      Lowest explode threshold a DiceRule sets, or null for none
 * @property {boolean} rerollOnes       A DiceRule re-rolls 1s
 * @property {Array<{label: string, replace: string, with: string}>} substitutes
 * @property {string[]} notes
 */

/**
 * The selectors a check reads rules for, from its kind and what it rolls.
 * @param {object} spec
 * @param {string} spec.kind      skill, trait, ring, spell, maho, attack, damage, or roll
 * @param {string} [spec.skill]   Skill name in lower case
 * @param {string} [spec.trait]   Trait key
 * @param {string} [spec.ring]    Ring key
 * @returns {string[]}
 */
export function checkSelectors({ kind, skill, trait, ring }) {
  const selectors = [kind];
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
 * @returns {CheckContext}
 */
export function collectCheck(actor, { kind, skill, trait, ring, target = null }) {
  const selectors = checkSelectors({ kind, skill, trait, ring });
  const options = checkOptions(actor, kind, target);
  const entries = bagKind => bagEntries(actor.ruleBag, bagKind, selectors, options);

  const modifiers = entries("rollModifiers").map(entry => ({
    label: entry.label,
    roll: entry.roll,
    keep: entry.keep,
    total: entry.total,
    enabled: true
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

  if (kind === "attack") {
    const stance = getStanceAttackBonuses(actor);
    if (stance.roll || stance.keep) {
      modifiers.push({
        label: T("l5r4.ui.mechanics.stances.fullAttack"),
        roll: stance.roll,
        keep: stance.keep,
        total: 0,
        enabled: true
      });
    }
    for (const range of ["melee", "ranged"]) {
      const penalty = getConditionRollPenalties(actor, "attack", range);
      if (penalty.roll || penalty.keep) {
        modifiers.push({
          label: T("l5r4.ui.check.conditions"),
          roll: penalty.roll,
          keep: penalty.keep,
          total: 0,
          enabled: true,
          range
        });
      }
    }
  } else if (kind === "damage") {
    const stance = getStanceDamageBonuses(actor);
    if (stance.roll || stance.keep) {
      modifiers.push({
        label: T("l5r4.ui.check.stance"),
        roll: stance.roll,
        keep: stance.keep,
        total: 0,
        enabled: true
      });
    }
  } else {
    const penalty = getConditionRollPenalties(actor, null, "melee");
    if (penalty.roll || penalty.keep) {
      modifiers.push({
        label: T("l5r4.ui.check.conditions"),
        roll: penalty.roll,
        keep: penalty.keep,
        total: 0,
        enabled: true
      });
    }
  }

  const tnModifiers = entries("tnModifiers").map(entry => ({
    label: entry.label,
    value: entry.value
  }));
  if (kind !== "damage") {
    const condition = getConditionTNPenalty(actor);
    if (condition) {
      tnModifiers.push({ label: T("l5r4.ui.check.conditions"), value: condition });
    }
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
    notes: entries("notes").map(entry => entry.text)
  };
}
