/**
 * @fileoverview L5R4 Trait Roll - Pure Trait Roll Execution
 * 
 * Execute pure trait rolls for attribute tests. Supports unskilled rolls (no
 * exploding dice) and void point spending for bonuses. Automatically resolves
 * actor for void point deduction and wound penalty application.
 * 
 * **Roll Formula:** (Trait + rollMod)k(Trait + keepMod) x10 + totalMod
 * 
 * **Special Features:**
 * - Unskilled: Removes exploding dice (no x10 modifier)
 * - Void Points: +1k1 bonus with automatic point deduction
 * - Actor Resolution: Finds actor from token, user character, or chat speaker
 * - Wound Penalties: Applied to effective target numbers from actor data
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
import { spendVoidPoint, resolveActor } from "../resources/void-manager.js";
import { applyTraitBonuses } from "../effects/bonus-applicator.js";
import { GetTraitRollOptions } from "../dialogs/trait-dialog.js";

/**
 * Execute a pure trait roll for attribute tests.
 * 
 * @param {object} opts - Roll configuration options
 * @param {number} [opts.woundPenalty=0] - Base wound penalty (overridden by actor data)
 * @param {number} [opts.traitRank=null] - Trait rank for dice pool
 * @param {string} [opts.traitName=null] - Trait key ("ref"|"awa"|"agi"|"int"|"per"|"sta"|"wil"|"str"|"void")
 * @param {boolean} [opts.askForOptions=true] - Whether to show modifier dialog
 * @param {boolean} [opts.unskilled=false] - Remove exploding dice
 * @param {Actor} [opts.actor=null] - Actor for void points and wound penalties
 * @returns {Promise<ChatMessage|void>} Created chat message or void if cancelled
 */
export async function TraitRoll({
  woundPenalty = 0,
  traitRank = null,
  traitName = null,
  askForOptions = true,
  unskilled = false,
  actor = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  const labelTrait = String(traitName).toLowerCase();
  const traitKey = labelTrait === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${labelTrait}`;

  const optionsSetting = game.settings.get(SYS_ID, "showTraitRollOptions");
  let rollMod = 0, keepMod = 0, totalMod = 0, applyWoundPenalty = true;
  let label = `${game.i18n.localize(traitKey)} ${game.i18n.localize("l5r4.ui.common.roll")}`;
  let __tnInput = 0, __raisesInput = 0;

  // Resolve actor for void point spending and wound penalty lookup
  const targetActor = resolveActor(actor);
  const currentWoundPenalty = targetActor?.system?.woundPenalty ?? 0;

  if (askForOptions !== optionsSetting) {
    const check = await GetTraitRollOptions(traitName);
    if (check?.cancelled) return;

    unskilled = !!check.unskilled;
    applyWoundPenalty = !!check.applyWoundPenalty;
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    totalMod = toInt(check.totalMod);

    /** Record TN/Raises and annotate the label. */
    __tnInput = toInt(check.tn);
    __raisesInput = toInt(check.raises);
    if (__tnInput || __raisesInput) {
      const __effTN = __tnInput + (__raisesInput * 5);
      const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
      label += ` [TN ${__effTN}${__raisesInput ? ` (${raisesLabel}: ${__raisesInput})` : ""}]`;
    }

    // Apply Active Effects bonuses for this trait
    const bonuses = applyTraitBonuses(targetActor, traitName);
    rollMod += bonuses.roll;
    keepMod += bonuses.keep;
    totalMod += bonuses.total;

    if (check.void) {
      const voidResult = await spendVoidPoint(targetActor);
      if (!voidResult.success) {
        ui.notifications?.warn(voidResult.message);
        return;
      }

      // Apply void point bonus (+1k1) and update label
      rollMod += voidResult.rollBonus;
      keepMod += voidResult.keepBonus;
      label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
    }
  }

  const diceToRoll = toInt(traitRank) + rollMod;
  const diceToKeep = toInt(traitRank) + keepMod;
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  const rollFormula = buildFormula(diceRoll, diceKeep, bonus, { unskilled });
  let flavor = label;

  if (unskilled) {
    flavor += ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.unskilledRoll")})`;
  }

  // Execute roll and render with target number evaluation
  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render();
  
  const effTN = calculateEffectiveTN(__tnInput, __raisesInput, currentWoundPenalty, applyWoundPenalty && __tnInput > 0);
  const tnResult = evaluateTN(roll.total ?? 0, effTN, __raisesInput);

  const content = await R(messageTemplate, { flavor, roll: rollHtml, tnResult });
  
  // Post roll to chat with error handling for edge cases (network failures, module conflicts)
  try {
    return await roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  } catch (err) {
    console.error(`${SYS_ID}`, "TraitRoll: Failed to post chat message after roll", { err, traitName });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false;
  }
}
