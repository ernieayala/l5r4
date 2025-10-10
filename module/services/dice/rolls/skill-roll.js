/**
 * @fileoverview L5R4 Skill Roll - Skill Roll Execution
 * 
 * Execute skill rolls with L5R4 mechanics, optional modifier dialog, and
 * comprehensive integration with void points, Active Effects, targeting,
 * and chat rendering. Combines trait and skill ranks with modifiers, applies
 * Ten Dice Rule, and renders results to chat with target number evaluation.
 * 
 * **Roll Formula:** (Trait + Skill + rollMod)k(Trait + keepMod) x10 + totalMod
 * 
 * **Special Features:**
 * - Emphasis: Rerolls 1s when enabled (adds r1 to formula)
 * - Void Points: +1k1 bonus with automatic point deduction
 * - Wound Penalties: Applied to effective target numbers
 * - Active Effects: Automatic bonus integration from actor effects
 * - Target Numbers: Success/failure evaluation with raise calculation
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
import { calculateEffectiveTN, evaluateTN, replaceFailureWithMissed } from "../core/tn-calculator.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { resolveTargets } from "../resources/target-resolver.js";
import { applySkillAndTraitBonuses } from "../effects/bonus-applicator.js";
import { GetSkillOptions } from "../dialogs/skill-dialog.js";

/**
 * Execute a skill roll with L5R4 mechanics and optional modifier dialog.
 * Combines trait and skill ranks with modifiers, applies Ten Dice Rule, and
 * renders results to chat with target number evaluation.
 * 
 * @integration-test Scenario: Complete skill roll with real Actor, Roll, and ChatMessage
 * @integration-test Reason: Unit tests mock all Foundry APIs (Roll, ChatMessage, Active Effects)
 * @integration-test Validates: Roll formula generation, dice explosion, chat rendering, Active Effects application
 * 
 * @param {object} opts - Roll configuration options
 * @param {number} [opts.woundPenalty=0] - Wound penalty applied to target numbers
 * @param {number} opts.actorTrait - Base trait value for dice pool and keep
 * @param {number} opts.skillRank - Skill ranks added to rolled dice
 * @param {string} opts.skillName - Skill name for localization and display
 * @param {string} opts.skillTrait - Trait key ("str"|"ref"|"agi"|"awa"|"int"|"per"|"sta"|"wil"|"void")
 * @param {boolean} [opts.askForOptions=true] - Whether to show modifier dialog
 * @param {boolean} [opts.npc=false] - Apply NPC void point restrictions
 * @param {number} [opts.rollBonus=0] - Bonus dice to roll
 * @param {number} [opts.keepBonus=0] - Bonus dice to keep
 * @param {number} [opts.totalBonus=0] - Flat bonus to total
 * @param {Actor} [opts.actor=null] - Actor for void point spending and effects
 * @param {string} [opts.rollType=null] - Roll type ("attack" for targeting)
 * @returns {Promise<ChatMessage|void>} Created chat message or void if cancelled
 */
export async function SkillRoll({
  woundPenalty = 0,
  actorTrait = null,
  skillRank = null,
  skillName = null,
  skillTrait = null,
  askForOptions = true,
  npc = false,
  rollBonus = 0,
  keepBonus = 0,
  totalBonus = 0,
  actor = null,
  rollType = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  const traitI18nKey = skillTrait === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${skillTrait}`;
  const optionsSetting = game.settings.get(SYS_ID, "showSkillRollOptions");
  
  // Prefer an i18n key if it exists; otherwise use the item's display name
  const tryKey = typeof skillName === "string" ? `l5r4.character.skills.names.${skillName.toLowerCase()}` : "";
  const skillLabel = (tryKey && game.i18n?.has?.(tryKey)) ? game.i18n.localize(tryKey) : String(skillName ?? game.i18n.localize("l5r4.ui.common.skill"));
  let label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.skillRoll")}: ${skillLabel} / ${game.i18n.localize(traitI18nKey)}`;

  let emphasis = false;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let applyWoundPenalty = true;
  let __tnInput = 0, __raisesInput = 0;

  // Check for targeting and auto-populate TN for attack rolls
  const { autoTN, targetInfo } = resolveTargets(actor, rollType);

  // Declare check variable at function scope
  let check;

  // ALWAYS apply Active Effects bonuses regardless of dialog visibility
  // This ensures advantages/disadvantages apply correctly to the dice pool
  // before Ten Dice Rule conversion
  const bonuses = applySkillAndTraitBonuses(actor, skillName, skillTrait) ?? { roll: 0, keep: 0, total: 0 };
  rollBonus = toInt(rollBonus) + bonuses.roll;
  keepBonus = toInt(keepBonus) + bonuses.keep;
  totalBonus = toInt(totalBonus) + bonuses.total;

  if (askForOptions !== optionsSetting) {
    const noVoid = npc && !game.settings.get(SYS_ID, "allowNpcVoidPoints");
    check = await GetSkillOptions(skillName, noVoid, rollBonus, keepBonus, totalBonus);
    if (!check || check.cancelled) return;
    
    ({ emphasis, applyWoundPenalty } = check);
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    totalMod = toInt(check.totalMod);

    /** Record TN/Raises for later use. */
    __tnInput = toInt(check.tn);
    __raisesInput = toInt(check.raises);

    if (check.void) {
      const voidResult = await spendVoidPoint(actor);
      if (!voidResult || !voidResult.success) {
        ui.notifications?.warn(voidResult?.message ?? "Void point spending failed");
        return;
      }

      // Apply void point bonus (+1k1) and update label
      rollMod += voidResult.rollBonus ?? 0;
      keepMod += voidResult.keepBonus ?? 0;
      label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
    }
  } else {
    rollMod = toInt(rollBonus);
    keepMod = toInt(keepBonus);
    totalMod = toInt(totalBonus);
    // Create default check object when dialog is skipped
    check = {
      tn: 0,
      raises: 0,
      emphasis: false,
      applyWoundPenalty: true
    };
    ({ emphasis, applyWoundPenalty } = check);
  }

  const diceToRoll = toInt(actorTrait) + toInt(skillRank) + rollMod;
  const diceToKeep = toInt(actorTrait) + keepMod;
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  const rollFormula = buildFormula(diceRoll, diceKeep, bonus, { emphasis });
  
  // Build base label without target info first
  let baseLabel = label;
  if (emphasis) {
    baseLabel += ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.emphasis")})`;
  }
  if (rollMod || keepMod || totalMod) {
    baseLabel += ` ${game.i18n.localize("l5r4.ui.common.mod")} (${rollMod}k${keepMod}${totalMod < 0 ? totalMod : "+" + totalMod})`;
  }

  // Execute roll and render with custom template wrapper
  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render(); // Foundry's core dice visualization
  
  // Calculate effective target number and success/failure
  let baseTN = toInt(check.tn);
  
  // For attack rolls, use target's Armor TN if no TN was specified in dialog
  if (rollType === "attack" && baseTN === 0 && autoTN > 0) {
    baseTN = autoTN;
  }
  
  const effTN = calculateEffectiveTN(baseTN, toInt(check.raises), woundPenalty, applyWoundPenalty);
  let tnResult = evaluateTN(roll.total ?? 0, effTN, toInt(check.raises));

  // Add target info and TN to label
  let finalLabel = baseLabel;
  if (targetInfo) {
    finalLabel += targetInfo;
  }
  if (__tnInput || __raisesInput) {
    const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
    finalLabel += ` [TN ${effTN}${__raisesInput ? ` (${raisesLabel}: ${__raisesInput})` : ""}]`;
  }

  // For failed attacks, show "Missed" instead of "Failure"
  tnResult = replaceFailureWithMissed(tnResult, rollType);

  const content = await R(messageTemplate, { flavor: finalLabel, roll: rollHtml, tnResult });
  
  // Post roll to chat with error handling for edge cases (network failures, module conflicts)
  try {
    return await roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  } catch (err) {
    console.error(`${SYS_ID}`, "SkillRoll: Failed to post chat message after roll", { err, skillName });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false;
  }
}
