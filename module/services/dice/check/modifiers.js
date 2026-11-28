/**
 * @module services/dice/check/modifiers
 * @description The modifiers of one check in the roll pipeline (terms.js): those offered to the roller before the
 * dialog, and those applied once the roller has chosen, as the roller left each one plus the ones the choices add.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/40_grappling.md, p.88
 * game-rules/89_shadowlands_taint.md, p.279
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../../utils/mechanics.js";
import { isForRange } from "../../../utils/check.js";

/**
 * The modifiers offered to the roller: the gathered ones, the caller's, and a Lost character's Taint Rank, which a
 * Lost character adds to every physical Trait roll, always.
 * game-rules/89_shadowlands_taint.md, p.279
 * @param {object} check - From buildCheck (terms.js), with its context, request, and Lost bonus
 * @returns {object[]}
 */
export function buildCheckModifiers(check) {
  const { ctx, request, lost } = check;
  const modifiers = [
    ...ctx.modifiers,
    ...(request.modifiers ?? []).map(m => ({ roll: 0, keep: 0, total: 0, enabled: true, ...m }))
  ];
  if (lost) {
    modifiers.push(buildModifier(T("l5r4.ui.taint.lost"), { total: lost }));
  }
  return modifiers;
}

/**
 * Each modifier as the roller left it, a modifier for the other attack range dropped, then the ones the choices
 * add: the manual modifier, Social resistance, Embracing the Taint, each Substitute, the Void Point on a Skill, and
 * a damage roll's Free Raises at +1k0 each.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/40_grappling.md, p.88
 * game-rules/89_shadowlands_taint.md, p.279
 * @param {object} check - From buildCheck (terms.js)
 * @param {object} choices - The dialog's values
 * @param {object} picks
 * @param {"melee"|"ranged"|null} picks.range - The roll's range (terms.js getCheckRange)
 * @param {boolean} picks.embrace - The roller embraces the Taint
 * @param {boolean} picks.voidSkill - A Void Point raises the Skill to Rank 1
 * @param {number} picks.damageFreeRaises - Free Raises on a damage roll that takes them
 * @returns {object[]}
 */
export function buildAppliedModifiers(
  check,
  choices,
  { range, embrace, voidSkill, damageFreeRaises }
) {
  const { request, actor } = check;
  const enabled = choices.modifier ?? {};
  const applied = check.modifiers
    .map((m, i) => ({
      ...m,
      enabled: request.askForOptions === false ? m.enabled : Boolean(enabled[i])
    }))
    .filter(m => isForRange(m, range));
  applied.push(...buildManualModifiers(choices));
  if (check.isSkill && choices.socialResistance) {
    const total = toInt(actor.system.honor?.rank);
    applied.push(buildModifier(T("l5r4.ui.mechanics.rolls.socialResistance"), { total }));
  }
  if (embrace) {
    applied.push(buildModifier(T("l5r4.ui.taint.embrace"), { roll: 1, keep: 1 }));
  }
  applied.push(...buildSubstituteModifiers(check, choices));
  if (voidSkill) {
    applied.push(buildModifier(T("l5r4.ui.check.voidSkill"), { roll: 1 }));
  }
  if (damageFreeRaises) {
    applied.push(buildModifier(T("l5r4.ui.check.freeRaisesDamage"), { roll: damageFreeRaises }));
  }
  return applied;
}

/**
 * The roller's manual roll, keep, and total modifier, when any part is set.
 * @param {object} choices - The dialog's values
 * @returns {object[]}
 */
function buildManualModifiers(choices) {
  const manual = buildModifier(T("l5r4.ui.check.manual"), {
    roll: toInt(choices.rollMod),
    keep: toInt(choices.keepMod),
    total: toInt(choices.totalMod)
  });
  return manual.roll || manual.keep || manual.total ? [manual] : [];
}

/**
 * The Substitutes the roller ticked: each swaps the Trait in the pool, so its rank counts in both rolled and kept
 * dice.
 * @param {object} check - From buildCheck (terms.js)
 * @param {object} choices - The dialog's values
 * @returns {object[]}
 */
function buildSubstituteModifiers(check, choices) {
  const { ctx, request, actor } = check;
  const substitutes = choices.substitute ?? {};
  return ctx.substitutes.flatMap((substitute, i) => {
    const [, from] = substitute.replace.split(":");
    const [, to] = substitute.with.split(":");
    if (!substitutes[i] || request.trait !== from || !to) {
      return [];
    }
    const delta = getEffectiveTrait(actor, to) - getEffectiveTrait(actor, from);
    return [buildModifier(substitute.label, { roll: delta, keep: delta })];
  });
}

/**
 * An enabled modifier with only the parts given; the rest are 0.
 * @param {string} label
 * @param {{roll?: number, keep?: number, total?: number}} parts
 * @returns {{label: string, roll: number, keep: number, total: number, enabled: boolean}}
 */
function buildModifier(label, { roll = 0, keep = 0, total = 0 }) {
  return { label, roll, keep, total, enabled: true };
}
