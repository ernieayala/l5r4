/**
 * @fileoverview L5R4 Weapon Roll - Weapon Damage Roll Execution
 * 
 * Execute weapon damage rolls with optional modifier dialog. Uses weapon-specific
 * dice pool with Ten Dice Rule application and renders results using weapon chat
 * template.
 * 
 * **Roll Formula:** (diceRoll + rollMod)k(diceKeep + keepMod) x10 + bonus
 * 
 * **Features:**
 * - Ten Dice Rule: Automatic conversion of excess dice to bonuses
 * - Modifier Dialog: Optional roll, keep, and flat bonuses
 * - Weapon Template: Uses weapon-specific chat card template
 * - Description: Optional weapon description in chat flavor
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { GetWeaponOptions } from "../dialogs/weapon-dialog.js";

/**
 * Execute a weapon damage roll with optional modifier dialog.
 * 
 * @param {object} opts - Roll configuration options
 * @param {number} opts.diceRoll - Base dice to roll
 * @param {number} opts.diceKeep - Base dice to keep
 * @param {number} [opts.explodesOn=10] - Legacy parameter (always explodes on 10)
 * @param {string} opts.weaponName - Weapon name for display
 * @param {string} [opts.description] - Optional weapon description
 * @param {boolean} [opts.askForOptions=true] - Whether to show modifier dialog
 * @param {number} [opts.attackRaises=0] - Raises from attack roll (+1k0 each)
 * @param {number} [opts.stanceRollBonus=0] - Stance roll bonus (Full Attack: +1)
 * @param {number} [opts.stanceKeepBonus=0] - Stance keep bonus (Full Attack: +1)
 * @returns {Promise<ChatMessage|void>} Created chat message or void if cancelled
 */
export async function WeaponRoll({
  diceRoll = null,
  diceKeep = null,
  explodesOn = 10,
  weaponName = null,
  description = null,
  askForOptions = true,
  attackRaises = 0,
  stanceRollBonus = 0,
  stanceKeepBonus = 0
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.weaponCard;

  let rollMod = 0, keepMod = 0, bonus = 0;
  let label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.damageRoll")} ${weaponName}`;
  const optionsSetting = game.settings.get(SYS_ID, "showWeaponRollOptions");

  if (askForOptions !== optionsSetting) {
    const check = await GetWeaponOptions(weaponName, toInt(attackRaises));
    if (check?.cancelled) return;
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    bonus = toInt(check.totalMod);
  }

  // Apply automatic raise bonus (+1k0 per raise from attack roll)
  const raiseBonus = toInt(attackRaises);
  rollMod += raiseBonus;
  
  // Apply stance bonuses (Full Attack: +1k1)
  const stanceRoll = toInt(stanceRollBonus);
  const stanceKeep = toInt(stanceKeepBonus);
  rollMod += stanceRoll;
  keepMod += stanceKeep;

  const conv = TenDiceRule(toInt(diceRoll) + rollMod, toInt(diceKeep) + keepMod, toInt(bonus));
  const rollFormula = buildFormula(conv.diceRoll, conv.diceKeep, conv.bonus);
  const roll = new Roll(rollFormula);

  if (description) label += ` (${description})`;
  if (raiseBonus > 0) {
    label += ` [${game.i18n.localize("l5r4.ui.mechanics.rolls.raises")}: ${raiseBonus} (+${raiseBonus}k0)]`;
  }
  if (stanceRoll > 0 || stanceKeep > 0) {
    label += ` [Full Attack: +${stanceRoll}k${stanceKeep}]`;
  }
  return roll.toMessage({ flavor: label, speaker: ChatMessage.getSpeaker() });
}
