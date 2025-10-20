/**
 * Ring Roll Dialog Service
 *
 * Provides user input dialogs for L5R4 Ring rolls and spellcasting.
 * Handles the distinction between raw Ring rolls (trait-based ability checks)
 * and Spell Casting rolls (shugenja invocations).
 *
 * L5R4 Mechanics:
 * - Ring Rolls: XkX where X = Ring value (used for raw ability checks)
 * - Spell Casting: (Ring + School Rank)k(Ring) against TN 5+(Mastery Level×5)
 * - Void Spending: +1k1 bonus to any roll (declared before rolling)
 * - Raises: +5 TN each, declared before rolling for enhanced effects
 * - Wound Penalties: Incremental TN penalties based on wound rank
 * - Spell Slots: Limited casts per element (Ring value) + Void bonus slots
 * - Void Slots: Bonus spell slots usable for any element
 *
 * Foundry VTT Requirements:
 * - Requires Foundry v13+ for DialogV2 API
 * - Uses foundry.applications.api.DialogV2 for modal dialogs
 * - Leverages Promise-based dialog pattern with custom button callbacks
 * - Form data extracted via callback parameters (button and dialog references)
 *
 * @module services/dice/dialogs/ring-dialog
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html|DialogV2 API}
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { getMaxRaises } from "../../../utils/raises-validator.js";
import { calculateFreeRaises } from "../resources/raise-manager.js";
import { getAffinityDeficiencyModifier } from "../../../utils/mechanics.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Ring roll or spell casting options selected by user.
 *
 * @typedef {Object} RingRollOptions
 * @property {boolean} applyWoundPenalty - Apply wound rank TN penalty
 * @property {number} rollMod - Additional rolled dice modifier (situational bonuses)
 * @property {number} keepMod - Additional kept dice modifier (rare, usually from techniques)
 * @property {number} totalMod - Flat bonus to roll total (situational adjustments)
 * @property {boolean} void - Void Point spent for +1k1 bonus
 * @property {number} [tn] - Target Number for contested/specific checks
 * @property {number} [raises] - Number of Raises declared (+5 TN each)
 * @property {boolean} affinity - Affinity active (+1 to School Rank)
 * @property {boolean} deficiency - Deficiency active (-1 to School Rank)
 * @property {boolean} spellSlot - Spell slot consumed (elemental slot)
 * @property {boolean} voidSlot - Void slot consumed (bonus slot for any element)
 * @property {boolean} normalRoll - true for Ring roll, false for Spell Casting roll
 * @property {boolean} [cancelled] - true if dialog was cancelled/closed
 */

/**
 * Display dialog for Ring roll or Spell Casting modifiers.
 *
 * Presents a modal dialog with two primary roll options:
 * 1. Ring Roll: Raw ability check using Ring value (e.g., Earth roll to resist Taint)
 * 2. Spell Casting: Shugenja invocation against spell TN
 *
 * User can configure:
 * - Roll/Keep/Total modifiers (situational bonuses/penalties)
 * - Void Point expenditure (+1k1 to roll per core rules)
 * - Wound Penalty application (TN increase per wound rank)
 * - Target Number (for contested or specific TN checks)
 * - Raises (declared before rolling, +5 TN each)
 * - Spell Slot consumption (elemental slot vs void slot)
 * - Void Slot usage (flexible bonus slots for any element)
 *
 * Spell Slot Mechanics:
 * - Shugenja have slots equal to Ring value in each element
 * - Void Ring provides bonus slots usable for any element
 * - Failed spell casts still consume slots
 * - Interrupted casts (before completion) do not consume slots
 *
 * Foundry Implementation:
 * - Uses DialogV2.render() for modal presentation
 * - Promise resolves when user clicks button or cancels
 * - Form data extracted via button callback with fallback to dialog form reference
 * - Fallback pattern (`b.form ?? d.form`) handles different callback signatures
 *
 * @param {string} ringName - Name of the Ring being rolled (e.g., "Fire", "Earth", "Void")
 * @param {L5R4Actor} [actor=null] - Actor casting spell (for affinity/deficiency detection)
 * @param {string} [systemRing=null] - System ring key ("air", "fire", etc.) for affinity/deficiency
 * @returns {Promise<RingRollOptions>} Resolves with user-selected modifiers, or {cancelled: true} if dialog closed
 *
 * @example
 * const options = await GetRingOptions("Fire", actor, "fire");
 * if (!options.cancelled) {
 *   // options.normalRoll = false for spellcasting, true for ring roll
 *   // options.void = true if Void Point spent
 *   // options.affinity/deficiency pre-checked based on school
 *   // options.spellSlot/voidSlot indicate slot consumption
 * }
 */
export async function GetRingOptions(ringName, actor, systemRing = null) {
  const voidRing = actor?.system?.rings?.void?.value ?? 0;
  const maxRaises = getMaxRaises(voidRing);
  const freeRaises = calculateFreeRaises(actor);

  // Detect affinity/deficiency from school to pre-check appropriate checkbox
  let hasAffinity = false;
  let hasDeficiency = false;
  if (actor && systemRing) {
    const modifier = getAffinityDeficiencyModifier(actor, systemRing);
    hasAffinity = modifier > 0;
    hasDeficiency = modifier < 0;
  }

  const content = await R(DIALOG_TEMPLATES.rollModifiers, {
    maxRaises,
    freeRaises: freeRaises ?? 0,
    spell: true,
    ring: ringName,
    hasAffinity,
    hasDeficiency
  });
  return await new Promise(resolve => {
    new DIALOG({
      window: { title: game.i18n.format("l5r4.ui.chat.ringRoll", { ring: ringName }) },
      position: { width: 460 },
      content,
      buttons: [
        {
          action: "normal",
          label: game.i18n.localize("l5r4.ui.mechanics.rolls.ringRoll"),
          // Ring Roll button: Raw ability check (XkX) without spell casting mechanics
          callback: (_e, b, d) => {
            // Foundry v13 DialogV2 callback signature: (event, button, dialog)
            // Form reference may be on button or dialog object depending on context
            const form = b.form ?? d.form;
            resolve(_processRingRollOptions(form, false));
          }
        },
        {
          label: game.i18n.localize("l5r4.ui.mechanics.rolls.spellCasting"),
          // Spell Casting button: Invocation roll ((Ring + School Rank)kRing)
          callback: (_e, b, d) => {
            const form = b.form ?? d.form;
            resolve(_processRingRollOptions(form, true));
          }
        },
        { action: "cancel", label: game.i18n.localize("l5r4.ui.common.cancel") }
      ],
      submit: result => {
        // Handle dialog close/cancel events
        if (result === "cancel" || result == null) {
          resolve({ cancelled: true });
        } else {
          resolve(result);
        }
      }
    }).render({ force: true });
  });
}

/**
 * Extract and normalize form data from Ring roll dialog.
 *
 * Processes HTML form fields into a structured options object for roll construction.
 * Handles optional fields (TN, raises) with fallback to undefined when not provided.
 *
 * L5R4 Mechanics Extracted:
 * - Wound penalty toggle (affects TN per wound rank)
 * - Roll/Keep/Total modifiers (numeric inputs)
 * - Void Point expenditure (checkbox for +1k1)
 * - Target Number (optional numeric input)
 * - Raises (optional, +5 TN per raise)
 * - Affinity/Deficiency checkboxes (School Rank ±1)
 * - Spell slot type (elemental vs void slot consumption)
 *
 * @param {HTMLFormElement} form - Dialog form element containing user inputs
 * @param {boolean} [isSpellCasting=false] - true for Spell Casting roll, false for Ring roll
 * @returns {RingRollOptions} Normalized roll options ready for dice service consumption
 * @private
 */
export function _processRingRollOptions(form, isSpellCasting = false) {
  return {
    applyWoundPenalty: form.woundPenalty?.checked ?? true,
    void: form.void?.checked ?? false,
    affinity: form.affinity?.checked ?? false,
    deficiency: form.deficiency?.checked ?? false,
    spellSlot: form.spellSlot?.checked ?? false,
    voidSlot: form.voidSlot?.checked ?? false,
    rollMod: parseInt(form.rollMod?.value) || 0,
    keepMod: parseInt(form.keepMod?.value) || 0,
    totalMod: parseInt(form.totalMod?.value) || 0,
    tn: parseInt(form.tn?.value) || 0,
    freeRaises: parseInt(form.freeRaises?.value) || 0,
    raises: parseInt(form.raises?.value) || 0,
    normalRoll: !isSpellCasting
  };
}
