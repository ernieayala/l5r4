/**
 * Skill Roll Dialog Service
 * 
 * Provides dialog prompts for skill roll modifiers in the L5R4 system.
 * Handles user input for raises, emphasis, Void points, wound penalties, and situational bonuses.
 * 
 * L5R4 Skill Roll Mechanics:
 * - Formula: (Skill + Trait)k(Trait) - Roll dice equal to skill+trait, keep dice equal to trait
 * - Emphasis: Re-roll any 1s once when emphasis applies to the situation
 * - Raises: Voluntarily increase TN by +5 per raise for extra effects (max = Void Ring)
 * - Void Points: Spend to gain +1k1 bonus to roll (limited resource)
 * - Wound Penalties: Injuries increase TN of all rolls (+3 to +40 based on wound rank)
 * 
 * Foundry VTT Integration:
 * - Uses DialogV2.prompt() pattern for modal roll modifier input (Foundry v13+)
 * - Implements rejectClose to prevent accidental cancellation
 * - Returns structured options object for roll service consumption
 * 
 * @module services/dice/dialogs/skill-dialog
 * @requires Foundry VTT v13+ (DialogV2 API)
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html|DialogV2 API}
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Prompts the user for skill roll modifiers and options via modal dialog.
 * 
 * Presents a form allowing players to configure:
 * - Raises: Number of voluntary TN increases (+5 each) for enhanced effects
 * - Emphasis: Whether skill emphasis applies (re-roll 1s once per game rules)
 * - Void Point: Spend a Void point for +1k1 bonus
 * - Wound Penalty: Whether to apply current wound rank TN penalty
 * - Situational Modifiers: Manual roll/keep/total adjustments
 * - Target Number: Optional TN for success evaluation
 * 
 * The dialog displays pre-calculated bonuses from effects (rollBonus, keepBonus, totalBonus)
 * to inform the player's decisions before rolling.
 * 
 * @param {string} skillName - Display name of skill being rolled (localized, e.g., "Kenjutsu")
 * @param {boolean} noVoid - If true, hides Void point option (e.g., for NPCs when setting disabled)
 * @param {number} [rollBonus=0] - Pre-calculated bonus to rolled dice from effects/advantages
 * @param {number} [keepBonus=0] - Pre-calculated bonus to kept dice from effects/advantages
 * @param {number} [totalBonus=0] - Pre-calculated flat bonus to roll total from effects/advantages
 * @returns {Promise<Object|null>} Roll options object with user selections, or {cancelled: true} if dialog closed
 * @returns {boolean} return.applyWoundPenalty - Whether to apply wound rank TN penalty
 * @returns {boolean} return.emphasis - Whether skill emphasis applies (re-roll 1s)
 * @returns {number} return.rollMod - Additional rolled dice modifier from user input
 * @returns {number} return.keepMod - Additional kept dice modifier from user input
 * @returns {number} return.totalMod - Additional flat total modifier from user input
 * @returns {boolean} return.void - Whether user chose to spend a Void point
 * @returns {number} [return.tn] - Target number entered by user (if any)
 * @returns {number} [return.raises] - Number of raises declared by user (if any)
 * @returns {boolean} [return.cancelled] - True if dialog was cancelled/closed without submission
 * 
 * @async
 */
export async function GetSkillOptions(skillName, noVoid, rollBonus = 0, keepBonus = 0, totalBonus = 0) {
  // Render template with context: skill=true enables skill-specific UI (emphasis checkbox)
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { skill: true, noVoid, rollBonus, keepBonus, totalBonus });

  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.ui.chat.rollName", { roll: skillName }) },
      content,
      // Callback extracts form data; b.form ?? d.form handles DialogV2 API variations
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processSkillRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,  // Treat close button as cancel, not silent rejection
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { 
    // Catch thrown rejection if user closes dialog, normalize to cancellation
    return { cancelled: true }; 
  }
}

/**
 * Extracts and structures user input from the skill roll modifier dialog form.
 * 
 * Maps HTML form elements to a structured options object for the roll service.
 * Uses optional chaining (?.) and nullish coalescing (??) for defensive extraction
 * since some fields may be conditionally rendered (e.g., void checkbox when noVoid=true).
 * 
 * Form Field Mapping:
 * - woundPenalty: Checkbox for applying wound rank TN penalties
 * - emphasis: Checkbox for skill emphasis (re-roll 1s mechanic)
 * - rollMod: Number input for additional rolled dice
 * - keepMod: Number input for additional kept dice
 * - totalMod: Number input for flat total bonus
 * - void: Checkbox for spending Void point (may be undefined if noVoid=true)
 * - tn: Number input for target number (optional)
 * - raises: Number input for declared raises (optional)
 * 
 * @param {HTMLFormElement} form - The dialog's form element containing user inputs
 * @returns {Object} Structured roll options object for consumption by SkillRoll()
 * @returns {boolean} return.applyWoundPenalty - Whether to apply wound penalties
 * @returns {boolean} return.emphasis - Whether emphasis applies (re-roll 1s)
 * @returns {string} return.rollMod - Additional rolled dice modifier (string from input.value)
 * @returns {string} return.keepMod - Additional kept dice modifier (string from input.value)
 * @returns {string} return.totalMod - Additional flat total modifier (string from input.value)
 * @returns {boolean} return.void - Whether to spend Void point (false if field absent)
 * @returns {string|undefined} return.tn - Target number if entered (undefined if empty)
 * @returns {string|undefined} return.raises - Number of raises if entered (undefined if empty)
 * 
 * @private
 */
function _processSkillRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    emphasis: form.emphasis.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    // Optional chaining: void field absent when noVoid=true, default to false
    void: form.void?.checked ?? false,
    tn: form.tn?.value,
    raises: form.raises?.value
  };
}
