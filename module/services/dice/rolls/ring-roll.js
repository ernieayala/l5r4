/**
 * @fileoverview L5R4 Ring Roll - Ring and Spell Casting Roll Execution
 * 
 * Execute ring rolls for elemental tests, with optional spell-slot spending when
 * launched via the Spell dialog. The same dialog component is used for both the
 * plain ring roll and the spell roll buttons; when rendered with `{ spell: true }`
 * it includes `Use Spell Slot <Ring>` and `Use Void Spell Slot` checkboxes.
 * 
 * **Roll Types:**
 * - Normal Ring Roll: Standard ring-based test
 * - Spell Casting: Includes spell slot resource spending
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { calculateEffectiveTN, evaluateTN } from "../core/tn-calculator.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { spendElementalSlot, spendVoidSlot } from "../resources/spell-slot-manager.js";
import { applyRingBonuses } from "../effects/bonus-applicator.js";
import { GetSpellOptions } from "../dialogs/ring-dialog.js";

/**
 * Execute a ring roll for elemental tests, with optional spell-slot spending.
 * 
 * @param {object} opts - Roll configuration options
 * @param {number} [opts.woundPenalty=0] - Wound penalty for target numbers
 * @param {number} opts.ringRank - Ring rank for dice pool
 * @param {string} opts.ringName - Localized ring name for display
 * @param {string} [opts.systemRing] - Internal ring key for effects lookup
 * @param {number} [opts.schoolRank] - Shugenja school rank for spell bonuses
 * @param {boolean} [opts.askForOptions=true] - Whether to show modifier dialog
 * @param {boolean} [opts.unskilled=false] - Apply unskilled penalties
 * @param {Actor} [opts.actor=null] - Actor for effects and void point spending
 * @returns {Promise<ChatMessage|false>} Created chat message or false if cancelled
 */
export async function RingRoll({
  woundPenalty = 0,
  ringRank = null,
  ringName = null,
  systemRing = null,
  schoolRank = null,
  askForOptions = true,
  unskilled = false,
  actor = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  let label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.ringRoll")}: ${ringName}`;

  const optionsSetting = game.settings.get(SYS_ID, "showSpellRollOptions");

  let affinity = false;
  let deficiency = false;
  let normalRoll = true;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let voidRoll = false;
  let applyWoundPenalty = true;
  let spellSlot = false;
  let voidSlot = false;
  let __tnInput = 0, __raisesInput = 0;

  if (askForOptions !== optionsSetting) {
    const choice = await GetSpellOptions(ringName);
    if (choice?.cancelled) return false;

    applyWoundPenalty = !!choice.applyWoundPenalty;
    affinity = !!choice.affinity;
    deficiency = !!choice.deficiency;
    normalRoll = !!choice.normalRoll;
    rollMod = toInt(choice.rollMod);
    keepMod = toInt(choice.keepMod);
    totalMod = toInt(choice.totalMod);
    voidRoll = !!choice.void;
    // capture spell slot options when present on the form (spell dialog renders these fields)
    spellSlot = !!choice.spellSlot;
    voidSlot = !!choice.voidSlot;

    /** Record TN/Raises and annotate the label. */
    __tnInput = toInt(choice.tn);
    __raisesInput = toInt(choice.raises);
    if (__tnInput || __raisesInput) {
      const __effTN = __tnInput + (__raisesInput * 5);
      const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
      label += ` [TN ${__effTN}${__raisesInput ? ` (${raisesLabel}: ${__raisesInput})` : ""}]`;
    }
  }

  /** Active Effects: add ring-based bonuses (system.bonuses.ring[systemRing]). */
  const bonuses = applyRingBonuses(actor, systemRing);
  rollMod += bonuses.roll;
  keepMod += bonuses.keep;
  totalMod += bonuses.total;

  if (voidRoll) {
    const voidResult = await spendVoidPoint(actor);
    if (!voidResult.success) {
      ui.notifications?.warn(voidResult.message);
      return false;
    }

    // Apply void point bonus (+1k1) and update label
    rollMod += voidResult.rollBonus;
    keepMod += voidResult.keepBonus;
    label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
  }

  // Deduct spell slots when requested (works with either Ring Roll or Spell Casting Roll button)
  // Requires systemRing to identify which elemental slot to consume.
  if ((spellSlot || voidSlot) && systemRing) {
    // Elemental spell slot spend
    if (spellSlot) {
      const slotResult = await spendElementalSlot(actor, systemRing);
      if (!slotResult.success) {
        ui.notifications?.warn(slotResult.message);
        return false;
      }
      label += slotResult.label;
    }

    // Void spell slot spend
    if (voidSlot) {
      const vSlotResult = await spendVoidSlot(actor);
      if (!vSlotResult.success) {
        ui.notifications?.warn(vSlotResult.message);
        return false;
      }
      label += vSlotResult.label;
    }
  }

  if (normalRoll) {
    const diceToRoll = toInt(ringRank) + rollMod;
    const diceToKeep = toInt(ringRank) + keepMod;
    const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
    
    // Execute roll and render with target number evaluation
    const rollFormula = buildFormula(diceRoll, diceKeep, bonus);
    const roll = new Roll(rollFormula);
    const rollHtml = await roll.render();
    
    const effTN = calculateEffectiveTN(__tnInput, __raisesInput, woundPenalty, applyWoundPenalty && __tnInput > 0);
    const tnResult = evaluateTN(roll.total ?? 0, effTN, __raisesInput);

    const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult });
    
    // Post roll to chat with error handling for edge cases (network failures, module conflicts)
    try {
      return await roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
    } catch (err) {
      console.error(`${SYS_ID}`, "RingRoll: Failed to post chat message after roll", { err, ringName });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
      return false;
    }
  }

  // Note: A dedicated spell-casting dice path is not implemented yet beyond the
  // resource spending above. The current behavior always executes a standard
  // ring roll with any applicable modifiers.
  return false;
}
