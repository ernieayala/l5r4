/**
 * Simple Roll Service
 *
 * A roll from a pool the caller already knows, through the roll pipeline
 * (module/services/dice/check/roll-check.js): NPC attacks and damage from the stat block, an unskilled weapon attack,
 * an NPC Trait or Ring Roll, or a plain XkY roll.
 *
 * @module services/dice/rolls/simple-roll
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { normalizeTraitKey } from "../../../utils/mechanics.js";
import { rollCheck } from "../check/roll-check.js";
import { resolveActor } from "../resources/void-manager.js";

/**
 * Executes a roll from a known pool.
 *
 * Pool source, in order: diceRoll/diceKeep when both are given, else traitRank (a Trait Roll), else ringRank (a
 * Ring Roll).
 *
 * @async
 * @param {Object} params
 * @param {string|null} [params.rollName=null] - Name for a plain roll's label
 * @param {number|null} [params.diceRoll=null] - Rolled dice
 * @param {number|null} [params.diceKeep=null] - Kept dice
 * @param {string|null} [params.traitName=null] - Trait of a Trait Roll
 * @param {number|null} [params.traitRank=null] - Its rank
 * @param {string|null} [params.ringName=null] - Ring of a Ring Roll
 * @param {number|null} [params.ringRank=null] - Its rank
 * @param {number} [params.modifier=0] - Flat bonus from the stat block, listed as a modifier
 * @param {string|null} [params.rollType=null] - "attack", "damage", or null
 * @param {L5R4Actor|null} [params.actor=null] - The roller
 * @param {boolean} [params.untrained=false] - An Unskilled Roll (p.80)
 * @param {string|null} [params.weaponId=null] - The attacking weapon's item id
 * @param {boolean} [params.isBow=false] - The attack starts as ranged
 * @param {string|null} [params.skillName=null] - Skill the attack would use, for armor penalties and rules
 * @param {string|null} [params.skillTrait=null] - Trait the attack uses
 * @param {boolean} [params.askForOptions=true] - Show the roll dialog
 * @param {{label: string, roll: number, keep: number, bonus?: number}|null} [params.damage=null] - An attack's
 *   damage pool when no weapon gives one (a stat block's damage)
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled
 */
export async function SimpleRoll({
  rollName = null,
  diceRoll = null,
  diceKeep = null,
  traitName = null,
  traitRank = null,
  ringName = null,
  ringRank = null,
  modifier = 0,
  rollType = null,
  actor = null,
  untrained = false,
  weaponId = null,
  isBow = false,
  skillName = null,
  skillTrait = null,
  askForOptions = true,
  damage = null
} = {}) {
  const roller = resolveActor(actor);
  const traitKey = traitName ? normalizeTraitKey(traitName) : null;
  const ringKey = ringName ? String(ringName).toLowerCase() : null;

  let base;
  let label;
  let kind = rollType === "attack" || rollType === "damage" ? rollType : "roll";
  if (diceRoll !== null && diceKeep !== null) {
    base = { roll: toInt(diceRoll), keep: toInt(diceKeep) };
    label = `${T("l5r4.ui.common.roll")}: ${String(rollName ?? "")}`;
  } else if (traitKey) {
    base = { roll: toInt(traitRank), keep: toInt(traitRank) };
    label = `${T(`l5r4.ui.mechanics.traits.${traitKey}`)} ${T("l5r4.ui.common.roll")}`;
    kind = rollType ? kind : "trait";
  } else {
    base = { roll: toInt(ringRank), keep: toInt(ringRank) };
    label = `${T("l5r4.ui.mechanics.rolls.ringRoll")}: ${T(`l5r4.ui.mechanics.rings.${ringKey}`)}`;
    kind = rollType ? kind : "ring";
  }

  const weapon = weaponId ? roller.items.get(weaponId) : null;
  return rollCheck({
    actor: roller,
    kind,
    label,
    base,
    skill: skillName ? String(skillName).toLowerCase() : undefined,
    trait: skillTrait ?? traitKey ?? undefined,
    ring: kind === "ring" ? ringKey : undefined,
    unskilled: Boolean(untrained),
    weapon,
    explode: kind === "damage" ? (weapon?.system.explodesOn ?? 10) : 10,
    ranged: Boolean(isBow),
    modifiers: modifier ? [{ label: T("l5r4.ui.check.statBlock"), total: toInt(modifier) }] : [],
    askForOptions,
    ...(damage ? { damage } : {})
  });
}
