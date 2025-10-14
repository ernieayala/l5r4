/**
 * Weapon Damage Roll Service
 * 
 * Handles weapon damage rolls following successful weapon attacks in the L5R4 system.
 * Implements damage roll mechanics including Strength bonuses, attack raises converted
 * to damage, stance bonuses (Full Attack), and optional modifier dialogs.
 * 
 * L5R4 Weapon Damage Mechanics:
 * - Formula: (Weapon DR + Strength)kWeapon Keep (e.g., Katana 3k2 + Strength 3 = 6k2)
 * - Strength: Added to rolled dice for melee weapons (some ranged weapons)
 * - Attack Raises: Can be converted to damage via Increased Damage maneuver (+1k0 per raise)
 * - Full Attack Stance: Grants +2k1 to damage rolls (applied via stanceRollBonus/stanceKeepBonus)
 * - Exploding Dice: All damage dice explode on 10s (re-roll and add)
 * - Ten Dice Rule: Caps rolls at 10k10, excess converts to flat bonus
 * 
 * Service Flow:
 * 1. Optionally prompt user for additional damage modifiers via dialog
 * 2. Apply attack raises as rolled dice bonus (Increased Damage maneuver)
 * 3. Apply stance bonuses (Full Attack +2k1)
 * 4. Enforce Ten Dice Rule to cap at 10k10
 * 5. Build and execute damage roll formula
 * 6. Post damage result to chat with annotated label
 * 
 * Dialog Bypass:
 * The damage modifier dialog can be bypassed via "showWeaponRollOptions" world setting.
 * When bypassed, only base weapon damage + Strength + stance bonuses are rolled.
 * The askForOptions parameter inverts this setting for specific calls.
 * 
 * Foundry VTT Integration:
 * - Requires: Foundry VTT v13+ (Roll API, ChatMessage.getSpeaker)
 * - Uses: game.settings.get() for dialog bypass behavior
 * - Uses: game.i18n.localize() for chat labels
 * - Returns: ChatMessage promise from Roll.toMessage()
 * 
 * Related Services:
 * - GetWeaponOptions: Prompts user for damage modifiers via DialogV2
 * - TenDiceRule: Enforces 10k10 cap with conversion to flat bonuses
 * - buildFormula: Constructs Foundry Roll formula string
 * 
 * @module services/dice/rolls/weapon-roll
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { GetWeaponOptions } from "../dialogs/weapon-dialog.js";
import { spendVoidPoint } from "../resources/void-manager.js";

/**
 * Executes a weapon damage roll with L5R4 mechanics and posts result to chat.
 * 
 * Performs weapon damage rolls after successful weapon attacks, applying Strength
 * bonuses, attack raises (Increased Damage maneuver), stance modifiers (Full Attack),
 * and optional user-specified bonuses via dialog prompt.
 * 
 * Damage Calculation Process:
 * 1. Base damage: Weapon DR (diceRoll/diceKeep) provided by caller
 * 2. User modifiers: Optional dialog for additional roll/keep/flat bonuses
 * 3. Attack raises: Converted to rolled dice (+1k0 per raise, Increased Damage maneuver)
 * 4. Stance bonuses: Full Attack stance grants +2k1 (via stanceRollBonus/stanceKeepBonus)
 * 5. Ten Dice Rule: Enforces 10k10 cap, excess converts to flat bonus
 * 6. Roll execution: Exploding d10s, post to chat with annotated label
 * 
 * Dialog Behavior:
 * The damage modifier dialog appears based on inverted logic of "showWeaponRollOptions"
 * world setting. If askForOptions !== setting value, dialog is shown. This allows
 * specific calls to override the global setting (e.g., right-click to force dialog).
 * 
 * Chat Label Annotations:
 * - Base: "Damage Roll: [Weapon Name]"
 * - Description: Appended if provided (e.g., special attack notes)
 * - Raises: Shows attack raises and damage bonus (e.g., "[Raises: 2 (+2k0)]")
 * - Stance: Shows Full Attack bonus (e.g., "[Full Attack: +2k1]")
 * 
 * @param {Object} options - Weapon damage roll parameters
 * @param {number} [options.diceRoll=null] - Base rolled dice from weapon DR (before Strength, usually 0-6)
 * @param {number} [options.diceKeep=null] - Base kept dice from weapon DR (usually 1-4)
 * @param {string} [options.weaponName=null] - Name of weapon for chat label (e.g., "Katana", "Yumi")
 * @param {string} [options.description=null] - Optional description appended to label (e.g., "Called Shot: Head")
 * @param {boolean} [options.askForOptions=true] - If true, inverts "showWeaponRollOptions" setting (forces dialog when setting is false)
 * @param {number} [options.attackRaises=0] - Number of raises spent on attack roll, converted to damage via Increased Damage maneuver (+1k0 per raise)
 * @param {number} [options.stanceRollBonus=0] - Rolled dice bonus from stance (Full Attack grants +2)
 * @param {number} [options.stanceKeepBonus=0] - Kept dice bonus from stance (Full Attack grants +1)
 * @param {L5R4Actor} [options.actor=null] - Actor making the damage roll (for Void point spending)
 * @returns {Promise<ChatMessage|undefined>} ChatMessage if roll succeeds, undefined if dialog cancelled
 * 
 * @async
 */
export async function WeaponRoll({
  diceRoll = null,
  diceKeep = null,
  weaponName = null,
  description = null,
  askForOptions = true,
  attackRaises = 0,
  stanceRollBonus = 0,
  stanceKeepBonus = 0,
  actor = null
} = {}) {

  let rollMod = 0, keepMod = 0, bonus = 0;
  let label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.damageRoll")} ${weaponName}`;
  const optionsSetting = game.settings.get(SYS_ID, "showWeaponRollOptions");

  // Inverted boolean logic: Dialog appears when askForOptions !== setting
  // This allows callers to force dialog (askForOptions=false) when setting is true,
  // or skip dialog (askForOptions=true) when setting is false
  if (askForOptions !== optionsSetting) {
    const check = await GetWeaponOptions(weaponName, toInt(attackRaises), actor);
    if (check?.cancelled) return;
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    bonus = toInt(check.totalMod);
    
    // Handle Void point spending if user checked the Void checkbox
    // Void grants +1k1 bonus per L5R4 core rules (page 93)
    if (check.void) {
      const voidResult = await spendVoidPoint(actor);
      if (!voidResult || !voidResult.success) {
        ui.notifications?.warn(voidResult?.message ?? "Void point spending failed");
        return;
      }
      
      rollMod += voidResult.rollBonus ?? 0;
      keepMod += voidResult.keepBonus ?? 0;
      label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
    }
  }

  // Apply Increased Damage maneuver: Attack raises convert to +1k0 per raise
  // Raises declared during attack roll can be spent to increase damage
  const raiseBonus = toInt(attackRaises);
  rollMod += raiseBonus;

  // Apply stance damage bonuses (Full Attack stance provides +2k1 to damage)
  const stanceRoll = toInt(stanceRollBonus);
  const stanceKeep = toInt(stanceKeepBonus);
  rollMod += stanceRoll;
  keepMod += stanceKeep;

  // Enforce Ten Dice Rule: Cap at 10k10, convert excess to flat bonus
  const conv = TenDiceRule(toInt(diceRoll) + rollMod, toInt(diceKeep) + keepMod, toInt(bonus));
  const rollFormula = buildFormula(conv.diceRoll, conv.diceKeep, conv.bonus);
  const roll = new Roll(rollFormula);

  // Build chat label with optional annotations for description, raises, and stance bonuses
  if (description) label += ` (${description})`;
  if (raiseBonus > 0) {
    label += ` [${game.i18n.localize("l5r4.ui.mechanics.rolls.raises")}: ${raiseBonus} (+${raiseBonus}k0)]`;
  }
  if (stanceRoll > 0 || stanceKeep > 0) {
    label += ` [Full Attack: +${stanceRoll}k${stanceKeep}]`;
  }

  return roll.toMessage({ flavor: label, speaker: ChatMessage.getSpeaker() });
}
