/**
 * @module services/dice/check/message-data
 * @description The system data of the `roll` message a check posts (RollMessageData, module/data/chat/): the TN
 * changes the roll keeps, the card's label, and the whole context of the check, from its pool and modifiers to its TN
 * record, outcome, notes, maneuvers, and an attack's damage pool. roll-check.js posts it; card.js renders it.
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/38_maneuvers.md, p.86
 * game-rules/40_grappling.md, p.88
 * game-rules/74_weapons.md, p.199
 */

import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getStackedModifiers } from "../../../utils/modifier-stacking.js";
import { getTn, isForRange } from "../../../utils/check.js";

/**
 * The TN changes the roll keeps: a change for the other attack range drops out, as a modifier does; an attack
 * starting a grapple, a choice made in the dialog, ignores the armor in the target's Armor TN. An arrow's change
 * comes with the context's changes (getCheckTnModifiers, collect.js).
 * game-rules/40_grappling.md, p.88
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms, with the maneuvers
 * @returns {{label: string, value: number, type?: string, fromTarget?: boolean}[]}
 */
export function buildTnModifiers(check, terms) {
  const { isDamage, ctx, target } = check;
  const { range, maneuvers } = terms;
  const tnModifiers = isDamage
    ? []
    : ctx.tnModifiers
        .filter(m => isForRange(m, range))
        .map(({ label, value, type, fromTarget }) => ({ label, value, type, fromTarget }));
  const armorBonus = toInt(target?.system.armorTn?.bonus);
  if (maneuvers?.grapple && armorBonus) {
    tnModifiers.push({
      label: T("l5r4.ui.combat.grappleIgnoresArmor"),
      value: -armorBonus,
      fromTarget: true
    });
  }
  return tnModifiers;
}

/**
 * The TN a check rolls against: the TN chosen, each declared Raise, the Free Raises spent on it, the wound penalty
 * when applied, and the TN changes, which do not stack within one type, as on the sheet
 * (module/utils/modifier-stacking.js). The check dialog shows it live; the posted card records it. Null on damage.
 * game-rules/28_raises.md, p.79
 * game-rules/33_wounds.md, p.82
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms, with the maneuvers
 * @param {object[]} tnModifiers - From buildTnModifiers
 * @returns {number|null}
 */
export function getCheckTn(check, terms, tnModifiers) {
  if (check.isDamage) {
    return null;
  }
  return getTn({
    base: terms.tnBase,
    raises: terms.raises,
    freeRaisesToTn: terms.freeRaisesToTn,
    woundPenalty: terms.applyWound ? check.woundPenalty : 0,
    modifiers: [getStackedModifiers(tnModifiers.map(m => ({ total: m.value, type: m.type }))).total]
  });
}

/**
 * The card's label: the request's, marked Unskilled, with the Emphasis, the Void Point, and the preparation's suffix.
 * @param {string} base - The request's label
 * @param {object} terms - The chosen and prepared terms
 * @returns {string}
 */
export function buildCheckLabel(base, terms) {
  const { rolledUnskilled, emphasis, voidPoint, labelSuffix } = terms;
  let label = base;
  if (rolledUnskilled) {
    label = F("l5r4.ui.mechanics.rolls.unskilledLabel", { label });
  }
  if (emphasis) {
    label = F("l5r4.ui.mechanics.rolls.emphasisLabel", { label, emphasisName: emphasis });
  }
  if (voidPoint) {
    label = F("l5r4.ui.mechanics.rolls.voidLabel", { label });
  }
  return formatLabelWithSuffix(label, labelSuffix);
}

/**
 * A label with a suffix after it, such as a spell slot's "[Use spell slot Fire]"; the label alone without one.
 * @param {string} label - The localized label
 * @param {string|undefined} suffix - The localized suffix
 * @returns {string}
 */
export function formatLabelWithSuffix(label, suffix) {
  return suffix ? F("l5r4.ui.check.labelWithSuffix", { label, suffix }) : label;
}

/**
 * A Spell Casting Roll's label marked with the Affinity or Deficiency that shifts its School Rank.
 * game-rules/66_magic_and_spell_casting.md, p.164
 * @param {string} label - The localized label
 * @param {number} shift - +1 for an Affinity, -1 for a Deficiency, 0 for neither
 * @returns {string}
 */
export function formatShiftedLabel(label, shift) {
  if (!shift) {
    return label;
  }
  const tag = shift > 0 ? "l5r4.magic.spells.affinityTag" : "l5r4.magic.spells.deficiencyTag";
  return formatLabelWithSuffix(label, T(tag));
}

/**
 * The `roll` message's system data: the whole context of the check (RollMessageData).
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms, with the maneuvers
 * @param {object} result - The pool, roll, TN, TN changes, outcome, and label
 * @returns {object}
 */
export function buildCheckSystem(check, terms, result) {
  const { pool, roll, tn, tnModifiers, outcome, label } = result;
  const { request, actor, kind, target, ctx, isDamage } = check;
  return {
    actorUuid: actor.uuid,
    kind,
    label,
    skill: request.skill ?? "",
    pool: { ...pool, unskilled: terms.rolledUnskilled },
    modifiers: terms.applied.map(storedModifierOf),
    voidPoint: terms.voidPoint,
    emphasis: terms.emphasis,
    tn: buildTnRecord(check, terms, { tn, tnModifiers }),
    target: { uuid: target?.uuid ?? "", name: target?.name ?? "" },
    outcome: {
      total: roll.total,
      success: outcome?.success ?? null,
      margin: outcome?.margin ?? null
    },
    weaponUuid: request.weapon?.uuid ?? "",
    notes: buildCheckNotes(ctx, terms.range),
    conditions: target ? ctx.applyConditions : [],
    ...(terms.maneuvers ? { maneuvers: terms.maneuvers } : {}),
    ...attackDamageOf(request),
    sources: isDamage ? ctx.damageSources : [],
    ignoreReduction: isDamage ? ctx.ignoreReduction : 0,
    attackOf: request.attackOf ?? "",
    range: terms.range ?? ""
  };
}

/**
 * The message's TN record. Its `armor` is the target's Armor TN against this attack: the base and the target's own
 * changes, without the attacker's Raises, wound penalty, or other TN changes (the Feint bonus reads it).
 * game-rules/38_maneuvers.md, p.86
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms
 * @param {{tn: number|null, tnModifiers: object[]}} resolved - The TN and the changes it kept
 * @returns {object}
 */
function buildTnRecord(check, terms, { tn, tnModifiers }) {
  const { kind, woundPenalty } = check;
  const { tnBase, raises, totalFreeRaises, freeRaisesToTn, applyWound } = terms;
  const fromTarget = tnModifiers.filter(m => m.fromTarget).reduce((sum, m) => sum + m.value, 0);
  return {
    base: tnBase,
    raises,
    freeRaises: totalFreeRaises,
    // The key is stored in posted roll messages (RollMessageData), so it keeps its name
    freeRaisesToTN: freeRaisesToTn,
    woundPenalty: tn === null || !applyWound ? 0 : woundPenalty,
    modifiers: tn === null ? [] : tnModifiers,
    armor: kind === "attack" && tn !== null ? tnBase + fromTarget : 0,
    effective: tn
  };
}

/**
 * The card's notes: each Note rule's text, a localization key (the system's own, such as Prone's) or a GM's plain
 * text, then the action each ActionCost rule for this range sets.
 * @param {object} ctx - The gathered check context (collect.js)
 * @param {"melee"|"ranged"|null} range - The roll's range; null for a roll with none
 * @returns {string[]}
 */
function buildCheckNotes(ctx, range) {
  return [
    ...ctx.notes.map(text => T(text)),
    ...ctx.actions
      .filter(a => isForRange(a, range))
      .map(({ label: source, action }) =>
        F("l5r4.ui.check.actionNote", { action: T(`l5r4.ui.check.actions.${action}`), source })
      )
  ];
}

/**
 * A modifier as the message stores it.
 * @param {object} modifier
 * @returns {{label: string, roll: number, keep: number, total: number, enabled: boolean}}
 */
function storedModifierOf(modifier) {
  const { label, roll, keep, total, enabled } = modifier;
  return { label, roll, keep, total, enabled };
}

/**
 * The damage pool an attack stores for its damage button: the caller's (a stat block's damage), or the weapon's
 * prepared pool, Strength or the bow and arrow included. None for other rolls.
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/74_weapons.md, p.199
 * @param {CheckRequest} request
 * @returns {{damage?: {label: string, roll: number, keep: number, bonus: number, explode: number}}} The message's
 *   `damage` field, or nothing to spread
 */
function attackDamageOf(request) {
  if (request.kind !== "attack") {
    return {};
  }
  if (request.damage) {
    return { damage: { bonus: 0, explode: 10, ...request.damage } };
  }
  const weapon = request.weapon;
  if (!weapon) {
    return {};
  }
  return {
    damage: {
      label: weapon.name,
      roll: toInt(weapon.system.derivedDamageRoll ?? weapon.system.damageRoll),
      keep: toInt(weapon.system.derivedDamageKeep ?? weapon.system.damageKeep),
      bonus: 0,
      explode: weapon.system.damageExplode
    }
  };
}
