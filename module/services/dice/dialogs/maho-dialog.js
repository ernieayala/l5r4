/**
 * Maho Casting Dialog Service
 *
 * Displays dialog for maho (blood magic) casting with blood cost controls.
 * Collects user choices for blood expenditure, modifiers, and raises before
 * executing forbidden maho spell casting.
 *
 * L5R4 Maho Mechanics:
 * - Blood Cost: 2×Mastery Rank Wounds (required)
 * - Free Raises: +1 per additional blood cost spent
 * - Casting Roll: (Insight Rank + Ring)k(Ring)
 * - Taint Gain: (Mastery Rank - 1) points on success, minimum 1
 * - Master of Blood: -1 Wound cost, Taint reduced by Earth (min 1)
 *
 * @module services/dice/dialogs/maho-dialog
 * @requires Foundry VTT v13+
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { getMaxRaises } from "../../../utils/raises-validator.js";
import { calculateFreeRaises } from "../resources/raise-manager.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Maho casting options selected by user.
 *
 * @typedef {Object} MahoCastOptions
 * @property {string} bloodSource - Source of blood: "self" or "other"
 * @property {number} additionalBlood - Additional blood spent for free raises
 * @property {boolean} applyWoundPenalty - Apply wound rank TN penalty
 * @property {number} rollMod - Additional rolled dice modifier
 * @property {number} keepMod - Additional kept dice modifier
 * @property {number} totalMod - Flat bonus to roll total
 * @property {boolean} void - Void Point spent for +1k1 bonus
 * @property {number} raises - Number of Raises declared (+5 TN each)
 * @property {boolean} [cancelled] - true if dialog was cancelled/closed
 */

/**
 * Display maho casting dialog with blood cost controls.
 *
 * Presents dialog for forbidden blood magic casting:
 * - Blood source selection (self or other)
 * - Additional blood expenditure (for free raises)
 * - Standard modifiers (wound penalty, void, bonuses)
 * - Raises declaration
 *
 * Blood Mechanics:
 * - Base blood cost: 2×Mastery Rank Wounds (always required)
 * - Each additional blood cost amount = +1 Free Raise
 * - Blood must be spilled regardless of casting success
 *
 * @param {string} spellName - Name of the maho spell being cast
 * @param {string} ringName - Display name of the Ring
 * @param {number} bloodCost - Base blood cost in Wounds (2×Mastery Rank)
 * @param {Actor} actor - The actor casting the spell (for max raises and free raises calculation)
 * @returns {Promise<MahoCastOptions>} User-selected options or {cancelled: true}
 *
 * @example
 * const options = await GetMahoCastOptions("Touch of Death", "Earth", 10);
 * if (!options.cancelled) {
 *   // options.bloodSource = "self" or "other"
 *   // options.additionalBlood = extra wounds for free raises
 * }
 */
export async function GetMahoCastOptions(spellName, ringName, bloodCost, actor) {
  // Calculate max Raises from Void Ring and Free Raises from items/effects
  const voidRing = actor?.system?.rings?.void?.value ?? 0;
  const maxRaises = getMaxRaises(voidRing);
  const freeRaises = calculateFreeRaises(actor);

  const content = await R(DIALOG_TEMPLATES.mahoCast, {
    bloodCost,
    maxRaises,
    freeRaises: freeRaises ?? 0
  });

  return await new Promise(resolve => {
    new DIALOG({
      window: {
        title: game.i18n.format("l5r4.ui.mechanics.rolls.castMaho", {
          spell: spellName,
          ring: ringName
        })
      },
      position: { width: 480 },
      content,
      buttons: [
        {
          action: "cast",
          label: game.i18n.localize("l5r4.magic.maho.castMaho"),
          default: true,
          callback: (event, button, dialog) => {
            const form = button.form ?? dialog.form;
            resolve(_processMahoCastOptions(form));
          }
        },
        {
          action: "cancel",
          label: game.i18n.localize("l5r4.ui.common.cancel")
        }
      ],
      submit: result => {
        if (result === "cast") {
          return;
        }
        resolve({ cancelled: true });
      },
      close: () => {
        resolve({ cancelled: true });
      }
    }).render({ force: true });
  });
}

/**
 * Extract and normalize form data from maho casting dialog.
 *
 * Processes HTML form fields into structured options object for roll construction.
 * Handles blood cost fields and standard modifiers.
 *
 * @param {HTMLFormElement} form - Dialog form element containing user inputs
 * @returns {MahoCastOptions} Normalized maho casting options
 * @private
 */
function _processMahoCastOptions(form) {
  return {
    bloodSource: form.bloodSource?.value ?? "self",
    additionalBlood: parseInt(form.additionalBlood?.value) || 0,
    applyWoundPenalty: form.woundPenalty?.checked ?? true,
    rollMod: parseInt(form.rollMod?.value) || 0,
    keepMod: parseInt(form.keepMod?.value) || 0,
    totalMod: parseInt(form.totalMod?.value) || 0,
    void: form.void?.checked ?? false,
    freeRaises: parseInt(form.freeRaises?.value) || 0,
    raises: parseInt(form.raises?.value) || 0
  };
}
