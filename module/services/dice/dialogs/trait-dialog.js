/**
 * Trait Roll Dialog Service
 *
 * Provides dialog prompts for trait roll modifiers in the L5R4 system.
 * Handles user input for raises, Void points, wound penalties, and situational modifiers
 * when rolling raw trait checks (innate abilities without skill training).
 *
 * L5R4 Trait Roll Mechanics:
 * - Formula: XkX - Roll and keep dice equal to trait rank (e.g., Stamina 3 = 3k3)
 * - Usage: Raw ability checks (resisting effects, lifting, endurance, mental focus)
 * - Exploding Dice: Tens explode and reroll (added to total) on skilled trait rolls
 * - Unskilled: If checked, dice do not explode and raises are not allowed
 * - Raises: Voluntarily increase TN by +5 per raise for enhanced effects (max = Void Ring)
 * - Void Points: Spend to gain +1k1 bonus to roll (limited resource, refreshes after rest)
 * - Wound Penalties: Injuries increase TN of all actions (+3 to +40 based on wound rank)
 *
 * Foundry VTT Integration:
 * - Uses DialogV2.prompt() pattern for modal roll modifier input (Foundry v13+)
 * - Implements rejectClose to prevent accidental cancellation
 * - Returns structured options object for roll service consumption
 *
 * @module services/dice/dialogs/trait-dialog
 * @requires Foundry VTT v13+ (DialogV2 API)
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html|DialogV2 API}
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { getMaxRaises } from "../../../utils/raises-validator.js";
import { calculateFreeRaises } from "../resources/raise-manager.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Prompts the user for trait roll modifiers and options via modal dialog.
 *
 * Presents a form allowing players to configure trait-based rolls (innate abilities):
 * - Raises: Number of voluntary TN increases (+5 each) for enhanced effects
 * - Unskilled: Disables exploding dice and raises (unusual for traits, used for special cases)
 * - Void Point: Spend a Void point for +1k1 bonus
 * - Wound Penalty: Whether to apply current wound rank TN penalty
 * - Situational Modifiers: Manual roll/keep/total adjustments
 * - Target Number: Optional TN for success evaluation
 *
 * Trait rolls represent raw ability without skill training (e.g., Stamina to resist poison,
 * Willpower to resist fear, Reflexes to dodge). The formula is XkX where X = trait rank.
 * Called by TraitRoll service when user initiates a check using innate abilities.
 *
 * @param {string} traitName - Name of trait being rolled (e.g., "Stamina", "Willpower", "Void")
 * @param {Actor} actor - The actor making the roll (for Void Ring and Free Raises calculation)
 * @returns {Promise<Object>} Roll options object with user selections, or {cancelled: true} if dialog closed
 * @returns {boolean} return.applyWoundPenalty - Whether to apply wound rank TN penalty
 * @returns {boolean} return.unskilled - If true, disables exploding dice and raises
 * @returns {string} return.rollMod - Additional rolled dice modifier from user input (string from form.value)
 * @returns {string} return.keepMod - Additional kept dice modifier from user input (string from form.value)
 * @returns {string} return.totalMod - Additional flat total modifier from user input (string from form.value)
 * @returns {boolean} return.void - Whether user chose to spend a Void point
 * @returns {string|undefined} [return.tn] - Target number entered by user (undefined if not provided)
 * @returns {string|undefined} [return.raises] - Number of raises declared by user (undefined if not provided)
 * @returns {boolean} [return.cancelled] - True if dialog was cancelled/closed without submission
 *
 * @async
 */
export async function GetTraitRollOptions(traitName, actor) {
  // Calculate max Raises from Void Ring and Free Raises from items/effects
  const voidRing = actor?.system?.rings?.void?.rank ?? 0;
  const maxRaises = getMaxRaises(voidRing);
  const freeRaises = calculateFreeRaises(actor);

  // Render template with context: trait=true enables trait-specific UI (unskilled checkbox)
  const content = await R(DIALOG_TEMPLATES.rollModifiers, {
    trait: true,
    maxRaises,
    freeRaises: freeRaises ?? 0
  });
  try {
    const lowerTrait = String(traitName).toLowerCase();
    const traitKey =
      lowerTrait === "void"
        ? "l5r4.ui.mechanics.rings.void"
        : `l5r4.ui.mechanics.traits.${lowerTrait}`;
    const traitLabel = game.i18n.localize(traitKey);
    const result = await DIALOG.prompt({
      window: {
        title: `${game.i18n.localize("l5r4.ui.mechanics.rolls.traitRoll")} (${traitLabel})`
      },
      content,
      // Callback extracts form data; b.form ?? d.form handles DialogV2 API variations
      ok: {
        label: game.i18n.localize("l5r4.ui.common.roll"),
        callback: (_e, b, d) => _processTraitRollOptions(b.form ?? d.form)
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
 * Extracts and structures user input from the trait roll modifier dialog form.
 *
 * Maps HTML form elements to a structured options object for the roll service.
 * Uses optional chaining (?.) for defensive extraction of conditionally rendered fields.
 *
 * Form Field Mapping:
 * - woundPenalty: Checkbox for applying wound rank TN penalties
 * - unskilled: Checkbox for disabling exploding dice and raises (unusual for trait rolls)
 * - rollMod: Number input for additional rolled dice
 * - keepMod: Number input for additional kept dice
 * - totalMod: Number input for flat total bonus
 * - void: Checkbox for spending Void point (always present in trait roll template)
 * - tn: Number input for target number (optional)
 * - raises: Number input for declared raises (optional)
 *
 * @param {HTMLFormElement} form - The dialog's form element containing user inputs
 * @returns {Object} Structured roll options object for consumption by TraitRoll()
 * @returns {boolean} return.applyWoundPenalty - Whether to apply wound penalties
 * @returns {boolean} return.unskilled - Whether to disable exploding dice
 * @returns {string} return.rollMod - Additional rolled dice modifier (string from input.value)
 * @returns {string} return.keepMod - Additional kept dice modifier (string from input.value)
 * @returns {string} return.totalMod - Additional flat total modifier (string from input.value)
 * @returns {boolean} return.void - Whether to spend Void point
 * @returns {string|undefined} return.tn - Target number if entered (undefined if empty)
 * @returns {string|undefined} return.raises - Number of raises if entered (undefined if empty)
 * @returns {string|undefined} return.freeRaises - Number of free raises if entered (undefined if empty)
 *
 * @private
 */
function _processTraitRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    unskilled: form.unskilled?.checked ?? false,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false,
    tn: form.tn?.value,
    freeRaises: form.freeRaises?.value,
    raises: form.raises?.value
  };
}
