/**
 * Weapon Damage Roll Dialog Service
 *
 * Provides dialog prompts for weapon damage roll modifiers in the L5R4 system.
 * Handles user input for damage modifiers after a successful weapon attack,
 * including attack raises converted to damage bonuses and situational adjustments.
 *
 * L5R4 Weapon Damage Mechanics:
 * - Formula: (Weapon DR + Strength)kWeapon Keep - Damage is XkY where X = rolled dice, Y = kept dice
 * - Strength: Always added to rolled dice for melee weapons (some ranged weapons)
 * - Attack Raises: Raises spent on attack can become damage via Increased Damage maneuver (+1k0 per raise)
 * - Modifiers: Situational bonuses (Full Attack stance, advantages, spell effects)
 * - Exploding Dice: Tens explode and reroll (added to total) per core roll rules
 *
 * Foundry VTT Integration:
 * - Uses DialogV2.prompt() pattern for modal damage modifier input (Foundry v13+)
 * - Implements rejectClose to prevent accidental cancellation
 * - Returns structured options object for roll service consumption
 *
 * @module services/dice/dialogs/weapon-dialog
 * @requires Foundry VTT v13+ (DialogV2 API)
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html|DialogV2 API}
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Prompts the user for weapon damage roll modifiers and options via modal dialog.
 *
 * Presents a form allowing players to configure damage rolls after successful weapon attacks:
 * - Roll Modifier: Additional rolled dice (from raises, stances, abilities)
 * - Keep Modifier: Additional kept dice (from raises, abilities)
 * - Total Modifier: Flat damage bonus (from strength bonuses, abilities)
 * - Void Point: Spend a Void point for +1k1 bonus (L5R4 core mechanic)
 *
 * Attack raises are displayed for player reference - if the player declared raises
 * during the attack roll, those raises can be converted to damage using the Increased
 * Damage maneuver (+1k0 per raise). This conversion happens in the roll service layer.
 *
 * Called by WeaponRoll service after a successful weapon attack to gather final
 * damage modifiers before rolling damage dice. The dialog can be bypassed via
 * system settings for faster gameplay.
 *
 * @param {string} weaponName - Name of weapon being used for damage (e.g., "Katana", "Yumi")
 * @param {number} [attackRaises=0] - Number of raises spent on attack roll (displayed for reference, affects damage calculation)
 * @param {L5R4Actor} [actor=null] - Actor making the damage roll (for Void point availability check)
 * @returns {Promise<Object>} Damage roll options object with user selections, or {cancelled: true} if dialog closed
 * @returns {string} return.rollMod - Additional rolled dice modifier from user input (string from form.value)
 * @returns {string} return.keepMod - Additional kept dice modifier from user input (string from form.value)
 * @returns {string} return.totalMod - Additional flat damage modifier from user input (string from form.value)
 * @returns {boolean} return.void - Whether user chose to spend a Void point (false if not available or not checked)
 * @returns {boolean} [return.cancelled] - True if dialog was cancelled/closed without submission
 *
 * @async
 */
export async function GetWeaponOptions(weaponName, attackRaises = 0, actor = null) {
  // Determine if Void checkbox should be hidden based on actor's Void Ring rank
  // Hide for NPCs with Void Ring = 0, show for NPCs with Void Ring >= 1, always show for PCs
  const isNpc = actor ? actor.type === "npc" : false;
  const voidRing = isNpc
    ? actor?.system?.rings?.void?.rank ?? 0
    : actor?.system?.rings?.void?.value ?? 0;
  const noVoid = isNpc && voidRing < 1;

  // Render template with context: weapon=true enables weapon-specific UI, attackRaises shown for reference
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { weapon: true, attackRaises, noVoid });
  try {
    const result = await DIALOG.prompt({
      window: {
        title: `${game.i18n.localize("l5r4.ui.mechanics.rolls.damageRoll")} (${weaponName})`
      },
      content,
      // Callback extracts form data; b.form ?? d.form handles DialogV2 API variations
      ok: {
        label: game.i18n.localize("l5r4.ui.common.roll"),
        callback: (_e, b, d) => _processWeaponRollOptions(b.form ?? d.form)
      },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true, // Treat close button as cancel, not silent rejection
      modal: true
    });
    return result ?? { cancelled: true };
  } catch {
    // Catch thrown rejection if user closes dialog, normalize to cancellation
    return { cancelled: true };
  }
}

/**
 * Extracts and structures user input from the weapon damage roll modifier dialog form.
 *
 * Maps HTML form elements to a structured options object for the damage roll service.
 *
 * Form Field Mapping:
 * - rollMod: Number input for additional rolled dice
 * - keepMod: Number input for additional kept dice
 * - totalMod: Number input for flat damage bonus
 * - void: Checkbox for Void point expenditure (+1k1 to damage roll)
 *
 * @param {HTMLFormElement} form - The dialog's form element containing user inputs
 * @returns {Object} Structured damage roll options object for consumption by WeaponRoll()
 * @returns {string} return.rollMod - Additional rolled dice modifier (string from input.value)
 * @returns {string} return.keepMod - Additional kept dice modifier (string from input.value)
 * @returns {string} return.totalMod - Additional flat damage modifier (string from input.value)
 * @returns {boolean} return.void - Whether user chose to spend Void point (false if field absent)
 *
 * @private
 */
export function _processWeaponRollOptions(form) {
  return {
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    // Optional chaining: void field absent when noVoid=true, default to false
    void: form.void?.checked ?? false
  };
}
