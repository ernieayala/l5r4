/**
 * NPC Roll Options Dialog
 * Displays a DialogV2 prompt for NPC roll modifiers including Void points, raises, and target numbers.
 *
 * Purpose:
 * - Renders roll modifier input dialog for NPC trait and skill rolls
 * - Collects user input for roll/keep modifiers, Void spending, and unskilled rolls
 * - Supports L5R4 game mechanics: Raises (+5 TN each), Void points (+1k1), Unskilled rolls (no exploding dice)
 *
 * Architecture:
 * - getNpcRollOptions(): Public API that shows dialog and returns user selections
 * - _processNpcRollOptions(): Private processor that extracts form data
 *
 * Game Mechanics Implemented:
 * - Void Point spending: Adds +1k1 to any roll (player declaration before roll)
 * - Unskilled Rolls: Trait-only rolls with no dice explosion or raise benefits
 * - Raises: Voluntary TN increases (+5 per raise) for enhanced effects
 * - Target Numbers (TN): Difficulty thresholds for roll success
 * - Roll/Keep Modifiers: Situational bonuses to XkY dice formula
 *
 * Foundry VTT Requirements:
 * - Requires Foundry v13+ for DialogV2 API
 * - Uses foundry.applications.api.DialogV2.prompt() pattern
 * - Leverages Application v2 event system (rejectClose, modal)
 *
 * @module services/dice/dialogs/npc-dialog
 * @requires Foundry VTT v13+
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * @typedef {Object} NpcRollOptions
 * @property {string} rollMod - Roll dice modifier (added to rolled dice count)
 * @property {string} keepMod - Keep dice modifier (added to kept dice count)
 * @property {string} totalMod - Total modifier (flat bonus/penalty to roll result)
 * @property {boolean} void - True if Void point spent for +1k1 bonus
 * @property {boolean} unskilled - True if unskilled roll (no explosions, no raises)
 * @property {boolean} isRanged - True if ranged attack (affects condition penalties like Blinded)
 * @property {boolean} woundPenalty - True if wound penalty should be applied to roll
 * @property {number} tn - Target number for success (0 if not specified)
 * @property {number} raises - Number of raises declared (+5 TN each)
 */

/**
 * @typedef {Object} CancelledResult
 * @property {true} cancelled - Indicates dialog was cancelled or error occurred
 */

/**
 * Displays a modal dialog to collect roll modifiers for NPC trait or skill rolls.
 * Prompts user for Void point spending, unskilled roll declaration, raises, target number,
 * and situational modifiers (roll/keep/total adjustments).
 *
 * Dialog Fields (from roll-modifiers-dialog.hbs template):
 * - Void: Checkbox to spend a Void point (+1k1 to roll per core rules)
 * - Unskilled: Checkbox for trait-only rolls (no exploding dice, no raises)
 * - Roll/Keep/Total Modifiers: Numeric adjustments to dice formula
 * - Target Number (TN): Optional difficulty threshold for roll
 * - Raises: Number of voluntary TN increases (+5 each, max = Void Ring)
 *
 * Game Rules Context:
 * - Void Point: Enhances roll by +1k1 (one extra rolled and kept die)
 * - Unskilled Roll: Dice never explode on 10s, cannot benefit from raises
 * - Raises: Increase TN by +5 per raise for additional effects (maneuvers, extra targets, etc.)
 *
 * User Interaction:
 * - Modal dialog blocks until user clicks Roll or Cancel
 * - Clicking Roll returns processed form data
 * - Clicking Cancel or closing returns { cancelled: true }
 * - Exception during dialog also returns { cancelled: true } for safe fallback
 *
 * @async
 * @param {string} rollName - Display name for the roll (e.g., "Reflexes", "Agility", "Investigation")
 * @param {boolean} noVoid - If true, hides Void point checkbox (used when Void already spent or unavailable)
 * @param {boolean} [trait=false] - If true, shows Unskilled checkbox for trait-only rolls
 * @param {boolean} [isAttack=false] - If true, shows Ranged Attack checkbox for weapon attacks
 * @param {boolean} [isBow=false] - If true, pre-checks Ranged Attack checkbox (bows are always ranged)
 * @returns {Promise<NpcRollOptions|CancelledResult>} Processed roll options or cancellation indicator
 */
export async function getNpcRollOptions(
  rollName,
  noVoid,
  trait = false,
  isAttack = false,
  isBow = false
) {
  const content = await R(DIALOG_TEMPLATES.rollModifiers, {
    npcRoll: true,
    noVoid,
    trait,
    isAttack,
    isBow
  });
  try {
    const result = await DIALOG.prompt({
      window: { title: rollName },
      content,
      ok: {
        label: game.i18n.localize("l5r4.ui.common.roll"),
        callback: (_e, b, d) => _processNpcRollOptions(b.form ?? d.form)
      },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch {
    return { cancelled: true };
  }
}

/**
 * Extracts and normalizes roll modifier data from the dialog form submission.
 * Processes HTML form inputs into a structured options object for roll construction.
 *
 * Form Field Mapping:
 * - form.rollMod.value → rollMod (string): Number of dice to add/subtract from rolled dice
 * - form.keepMod.value → keepMod (string): Number of dice to add/subtract from kept dice
 * - form.totalMod.value → totalMod (string): Flat bonus/penalty to final roll total
 * - form.void?.checked → void (boolean): Void point expenditure flag (+1k1 if true)
 * - form.unskilled?.checked → unskilled (boolean): Unskilled roll flag (no explosions if true)
 * - form.isRanged?.checked → isRanged (boolean): Ranged attack flag (affects condition penalties)
 * - form.woundPenalty?.checked → woundPenalty (boolean): Apply wound penalty (defaults to true)
 * - form.tn?.value → tn (number): Target number for success threshold (defaults to 0)
 * - form.raises?.value → raises (number): Number of raises declared (defaults to 0)
 *
 * Optional Chaining:
 * Uses ?. operator for optional fields (void, unskilled, woundPenalty, tn, raises) to handle
 * conditional template rendering based on npcRoll/trait/noVoid flags.
 *
 * @private
 * @param {HTMLFormElement} form - The form element from DialogV2 callback (button.form or dialog.form)
 * @returns {NpcRollOptions} Structured roll options object
 */
function _processNpcRollOptions(form) {
  return {
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false,
    unskilled: form.unskilled?.checked ?? false,
    isRanged: form.isRanged?.checked ?? false,
    woundPenalty: form.woundPenalty?.checked ?? true,
    tn: form.tn?.value ?? 0,
    raises: form.raises?.value ?? 0
  };
}
