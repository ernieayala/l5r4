/**
 * @module services/dice/rolls/weapon-roll
 * @description A damage roll through the roll pipeline (module/services/dice/check/roll-check.js): the weapon's DR
 * with Strength already in its rolled dice (item/preparation/derived-data.js), +1k0 per Raise the attack spent on
 * Increased Damage, damage rules and stance damage bonuses, dice exploding on the weapon's "Explodes on" value
 * (#37). No Void Point on damage.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/29_types_of_rolls.md, p.80
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { rollCheck } from "../check/roll-check.js";
import { resolveActor } from "../resources/void-points.js";

/**
 * Rolls weapon damage.
 *
 * @param {object} options
 * @param {number} [options.diceRoll=null] - Rolled dice, Strength included
 * @param {number} [options.diceKeep=null] - Kept dice
 * @param {string} [options.weaponName=null] - Weapon name for the label
 * @param {string} [options.description=null] - Note appended to the label
 * @param {boolean} [options.askForOptions=true] - Show the roll dialog
 * @param {number} [options.attackRaises=0] - Raises the attack spent on Increased Damage (+1k0 each)
 * @param {Item} [options.weapon=null] - The weapon, for its explode value
 * @param {L5R4Actor} [options.actor=null] - The roller
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled
 */
export async function WeaponRoll({
  diceRoll = null,
  diceKeep = null,
  weaponName = null,
  description = null,
  askForOptions = true,
  attackRaises = 0,
  weapon = null,
  actor = null
} = {}) {
  const raises = Math.max(0, toInt(attackRaises));
  let label = `${T("l5r4.ui.check.damageFor")} ${weaponName}`;
  if (description) {
    label += ` (${description})`;
  }
  return rollCheck({
    actor: resolveActor(actor),
    kind: "damage",
    label,
    base: { roll: toInt(diceRoll), keep: toInt(diceKeep) },
    weapon,
    explode: weapon ? weapon.system.damageExplode : 10,
    modifiers: raises ? [{ label: T("l5r4.ui.check.increasedDamage"), roll: raises }] : [],
    askForOptions
  });
}
