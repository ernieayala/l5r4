/**
 * Spell Casting Dialog Service
 *
 * Provides simplified user input dialog for L5R4 spell casting with automatic
 * affinity/deficiency detection, TN calculation, and spell slot management.
 *
 * L5R4 Mechanics:
 * - Spell Casting: (Ring + School Rank)k(Ring) against TN 5+(Mastery Level×5)
 * - Affinity: +1 to effective School Rank (auto-detected from actor school)
 * - Deficiency: -1 to effective School Rank (auto-detected from actor school)
 * - Spell Slots: Consumed automatically (elemental slot preferred, void slot fallback)
 * - Raises: +5 TN each, declared before rolling for enhanced effects
 *
 * Foundry VTT Requirements:
 * - Requires Foundry v13+ for DialogV2 API
 * - Uses foundry.applications.api.DialogV2 for modal dialogs
 * - Leverages Promise-based dialog pattern with custom button callbacks
 *
 * @module services/dice/dialogs/spell-dialog
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html|DialogV2 API}
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { getMaxRaises } from "../../../utils/raises-validator.js";
import { calculateFreeRaises } from "../resources/raise-manager.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Spell casting options selected by user.
 *
 * @typedef {Object} SpellCastOptions
 * @property {boolean} applyWoundPenalty - Apply wound rank TN penalty
 * @property {number} rollMod - Additional rolled dice modifier (situational bonuses)
 * @property {number} keepMod - Additional kept dice modifier (rare, usually from techniques)
 * @property {number} totalMod - Flat bonus to roll total (situational adjustments)
 * @property {boolean} void - Void Point spent for +1k1 bonus
 * @property {number} raises - Number of Raises declared (+5 TN each)
 * @property {boolean} useVoidSlot - Force use of Void bonus spell slot instead of elemental
 * @property {boolean} [cancelled] - true if dialog was cancelled/closed
 */

/**
 * Display simplified dialog for spell casting modifiers.
 *
 * Presents a streamlined modal dialog focused on spell casting essentials:
 * - Wound Penalty toggle (TN increase per wound rank)
 * - Void Point expenditure (+1k1 to roll per core rules)
 * - Roll/Keep/Total modifiers (situational bonuses/penalties)
 * - Use Void Spell Slot (force use of void slot instead of elemental slot)
 * - Raises (declared before rolling, +5 TN each)
 *
 * Automatic Handling (no user input required):
 * - Affinity/Deficiency: Auto-detected from actor's school and applied to School Rank
 * - Target Number: Auto-calculated from spell's Mastery Level (5 + ML × 5)
 * - Spell Slot: Auto-consumed (elemental slot preferred, unless void slot checkbox is checked)
 *
 * Spell Slot Behavior:
 * - If "Use Void Spell Slot" is unchecked: Uses elemental slot first, void slot as fallback
 * - If "Use Void Spell Slot" is checked: Uses void slot first, elemental slot as fallback
 *
 * Foundry Implementation:
 * - Uses DialogV2.render() for modal presentation
 * - Promise resolves when user clicks "Spell Casting Roll" or "Cancel"
 * - Form data extracted via button callback with fallback to dialog form reference
 * - Fallback pattern (`b.form ?? d.form`) handles different callback signatures
 *
 * @param {string} spellName - Name of the spell being cast
 * @param {string} ringName - Display name of the Ring (e.g., "Fire", "Earth")
 * @param {Actor} actor - The actor casting the spell (for max raises and free raises calculation)
 * @returns {Promise<SpellCastOptions>} Resolves with user-selected modifiers, or {cancelled: true} if dialog closed
 *
 * @example
 * const options = await GetSpellCastOptions("Fires from Within", "Fire");
 * if (!options.cancelled) {
 *   // options.void = true if Void Point spent
 *   // options.raises = number of raises declared
 *   // options.useVoidSlot = true if forcing void slot usage
 *   // options.applyWoundPenalty = true if wound penalties should apply
 * }
 */
export async function GetSpellCastOptions(spellName, ringName, actor) {
  // Calculate max Raises from Void Ring and Free Raises from items/effects
  const voidRing = actor?.system?.rings?.void?.value ?? 0;
  const maxRaises = getMaxRaises(voidRing);
  const freeRaises = calculateFreeRaises(actor);

  const content = await R(DIALOG_TEMPLATES.spellCast, {
    maxRaises,
    freeRaises: freeRaises ?? 0
  });

  return await new Promise(resolve => {
    new DIALOG({
      window: {
        title: game.i18n.format("l5r4.ui.mechanics.rolls.castSpell", {
          spell: spellName,
          ring: ringName
        })
      },
      position: { width: 460 },
      content,
      buttons: [
        {
          label: game.i18n.localize("l5r4.ui.mechanics.rolls.spellCasting"),
          // Spell Casting button: Execute spell casting roll
          callback: (_e, b, d) => {
            // Foundry v13 DialogV2 callback signature: (event, button, dialog)
            // Form reference may be on button or dialog object depending on context
            const form = b.form ?? d.form;
            resolve(_processSpellCastOptions(form));
          }
        },
        {
          action: "cancel",
          label: game.i18n.localize("l5r4.ui.common.cancel")
        }
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
 * Extract and normalize form data from spell casting dialog.
 *
 * Processes HTML form fields into a structured options object for roll construction.
 * Handles optional fields with fallback to zero/false when not provided.
 *
 * @param {HTMLFormElement} form - Dialog form element containing user inputs
 * @returns {SpellCastOptions} Normalized spell casting options
 * @private
 */
function _processSpellCastOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty?.checked ?? true,
    rollMod: parseInt(form.rollMod?.value) || 0,
    keepMod: parseInt(form.keepMod?.value) || 0,
    totalMod: parseInt(form.totalMod?.value) || 0,
    void: form.void?.checked ?? false,
    freeRaises: parseInt(form.freeRaises?.value) || 0,
    raises: parseInt(form.raises?.value) || 0,
    useVoidSlot: form.useVoidSlot?.checked ?? false
  };
}
