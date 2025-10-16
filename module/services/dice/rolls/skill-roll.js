/**
 * Skill Roll Service
 *
 * Handles skill roll execution following L5R4 core mechanics:
 * - Skill rolls use (Skill + Trait)k(Trait) formula
 * - Emphasis allows re-rolling 1s once per roll
 * - Raises increase TN by +5 each (max Void Ring)
 * - Void spending grants +1k1 bonus
 * - Ten Dice Rule enforced (max 10 rolled/kept dice)
 * - Wound penalties apply to effective TN
 * - Honor Rank adds to social resistance rolls (resisting Intimidation/Temptation)
 *
 * Foundry VTT Integration:
 * - Uses Foundry Roll API for dice mechanics
 * - Posts results via ChatMessage API
 * - Respects system settings for roll dialog display
 * - Handles localization via game.i18n
 *
 * Side Effects:
 * - May deduct void points from actor if spent
 * - Creates chat message with roll results
 * - Shows notifications on errors or void spending failure
 *
 * @module services/dice/rolls/skill-roll
 * @requires foundry.api.Roll Foundry VTT Roll API (v13+)
 * @requires foundry.api.ChatMessage Foundry VTT Chat API (v13+)
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import {
  calculateEffectiveTN,
  evaluateTN,
  replaceFailureWithMissed
} from "../core/tn-calculator.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { resolveTargets } from "../resources/target-resolver.js";
import { applySkillAndTraitBonuses } from "../effects/bonus-applicator.js";
import { GetSkillOptions } from "../dialogs/skill-dialog.js";
import {
  getConditionRollPenalties,
  getConditionTNPenalty
} from "../../../utils/condition-penalties.js";
import { getArmorTNPenalty } from "../../../utils/armor-penalties.js";

/**
 * Executes a skill roll following L5R4 mechanics.
 *
 * Implements the core L5R4 skill roll system where rolls are calculated as
 * (Skill Rank + Trait)k(Trait). The function handles all roll modifiers including
 * bonuses from effects, void point spending, emphasis, raises, wound penalties,
 * and Honor bonuses for social resistance.
 *
 * Skill Roll Mechanics (per Skills_and_Rolls.md):
 * - Skilled formula (Rank > 0): Roll (Skill + Trait + rollMod) dice, keep (Trait + keepMod) dice
 * - Unskilled formula (Rank = 0): Roll (Trait + rollMod)k(Trait + keepMod) - no exploding dice, no raises
 * - Emphasis: When applicable, re-roll any dice showing 1 (once per die)
 * - Raises: Each raise increases effective TN by +5 (declared before roll)
 * - Void Points: Spending void grants +1k1 bonus to the roll
 * - Ten Dice Rule: Enforced automatically (excess dice convert to kept or bonuses)
 * - Wound Penalties: Applied to effective TN if enabled
 * - Social Resistance: Honor Rank added to total when resisting Intimidation/Temptation (Honor_Glory_Status.md)
 *
 * Dialog Behavior:
 * The function conditionally shows a roll options dialog based on the askForOptions
 * parameter and the "showSkillRollOptions" system setting. If these values differ
 * (XOR logic), the dialog is displayed. The dialog includes a checkbox for social
 * resistance which adds the character's Honor Rank as a flat bonus to the roll.
 * Otherwise, uses provided bonuses directly.
 *
 * Attack Rolls:
 * When rollType is "attack" and no manual TN is set, automatically resolves the
 * target's Armor TN from selected tokens.
 *
 * @async
 * @param {Object} options - Skill roll configuration options
 * @param {number} [options.woundPenalty=0] - Current wound penalty value (applied to TN)
 * @param {number|null} [options.actorTrait=null] - Actor's trait value (kept dice)
 * @param {number|null} [options.skillRank=null] - Skill rank value (rolled dice)
 * @param {string|null} [options.skillName=null] - Skill identifier for i18n and bonuses
 * @param {string|null} [options.skillTrait=null] - Trait identifier ("void" or trait name)
 * @param {boolean} [options.askForOptions=true] - Request dialog display (XOR with setting)
 * @param {boolean} [options.npc=false] - Whether roller is an NPC (affects void availability)
 * @param {number} [options.rollBonus=0] - Additional rolled dice from effects
 * @param {number} [options.keepBonus=0] - Additional kept dice from effects
 * @param {number} [options.totalBonus=0] - Flat bonus added to roll total
 * @param {L5R4Actor|null} [options.actor=null] - Actor performing the roll (for bonuses/void/honor)
 * @param {string|null} [options.rollType=null] - Roll type identifier (e.g., "attack")
 *
 * @returns {Promise<ChatMessage|false>} The created chat message, or false on error
 *
 * @throws {Error} Logs to console if chat message creation fails, shows UI notification
 *
 * @see {@link https://foundryvtt.com/api/classes/client.Roll.html|Foundry Roll API}
 * @see {@link https://foundryvtt.com/api/classes/client.ChatMessage.html|Foundry ChatMessage API}
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
  const traitI18nKey =
    skillTrait === "void"
      ? "l5r4.ui.mechanics.rings.void"
      : `l5r4.ui.mechanics.traits.${skillTrait}`;
  const optionsSetting = game.settings.get(SYS_ID, "showSkillRollOptions");

  const tryKey =
    typeof skillName === "string" ? `l5r4.character.skills.names.${skillName.toLowerCase()}` : "";
  const skillLabel =
    tryKey && game.i18n?.has?.(tryKey)
      ? game.i18n.localize(tryKey)
      : String(skillName ?? game.i18n.localize("l5r4.ui.common.skill"));
  let label = `${game.i18n.localize(
    "l5r4.ui.mechanics.rolls.skillRoll"
  )}: ${skillLabel} / ${game.i18n.localize(traitI18nKey)}`;

  let emphasis = false;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let applyWoundPenalty = true;
  let socialResistance = false;

  // Resolve target TN and info string from selected tokens (attack rolls only)
  const { autoTN, targetInfo } = resolveTargets(actor, rollType);

  // Apply active effects and abilities that modify skill/trait rolls
  const bonuses = applySkillAndTraitBonuses(actor, skillName, skillTrait) ?? {
    roll: 0,
    keep: 0,
    total: 0
  };
  rollBonus = toInt(rollBonus) + bonuses.roll;
  keepBonus = toInt(keepBonus) + bonuses.keep;
  totalBonus = toInt(totalBonus) + bonuses.total;

  // Apply condition penalties (blinded, dazed, fatigued, prone, etc.)
  const conditionPenalties = getConditionRollPenalties(actor, rollType, "melee");
  rollBonus += conditionPenalties.roll; // Will be negative if conditions active
  keepBonus += conditionPenalties.keep;

  // XOR logic: Show dialog if askForOptions differs from system setting
  // This allows callers to override the global setting on a per-roll basis
  let check;
  if (askForOptions !== optionsSetting) {
    const noVoid = npc && !game.settings.get(SYS_ID, "allowNpcVoidPoints");
    check = await GetSkillOptions(skillName, noVoid, rollBonus, keepBonus, totalBonus);
    if (!check || check.cancelled) return;

    if (check.void) {
      const voidResult = await spendVoidPoint(actor);
      if (!voidResult || !voidResult.success) {
        ui.notifications?.warn(voidResult?.message ?? "Void point spending failed");
        return;
      }

      rollMod += voidResult.rollBonus ?? 0;
      keepMod += voidResult.keepBonus ?? 0;
      label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
    }
  } else {
    // Dialog skipped - use default values with provided bonuses
    check = {
      tn: 0,
      raises: 0,
      rollMod: rollBonus,
      keepMod: keepBonus,
      totalMod: totalBonus,
      emphasis: false,
      applyWoundPenalty: true,
      socialResistance: false
    };
  }

  // Extract emphasis, wound penalty, and social resistance flags from dialog/default check object
  ({ emphasis, applyWoundPenalty, socialResistance } = check);
  rollMod += toInt(check.rollMod);
  keepMod += toInt(check.keepMod);
  totalMod += toInt(check.totalMod);

  // Apply Honor Rank bonus for social resistance (L5R4 rule: resisting Intimidation/Temptation)
  let honorRank = 0;
  if (socialResistance && actor) {
    honorRank = toInt(actor.system?.honor?.rank ?? 0);
    totalMod += honorRank;
  }

  // L5R4 Unskilled Roll Rule (Skills_and_Rolls.md):
  // When skill rank = 0, "effectively making a Trait Roll" = (Trait)k(Trait) with no exploding dice
  const isUnskilled = toInt(skillRank) === 0;
  let diceToRoll, diceToKeep;

  if (isUnskilled) {
    // Unskilled formula: (Trait)k(Trait) - no exploding dice
    diceToRoll = toInt(actorTrait) + rollMod;
    diceToKeep = toInt(actorTrait) + keepMod;
  } else {
    // Skilled formula: (Skill + Trait)k(Trait)
    diceToRoll = toInt(actorTrait) + toInt(skillRank) + rollMod;
    diceToKeep = toInt(actorTrait) + keepMod;
  }

  // Enforce Ten Dice Rule: max 10 rolled/kept, excess converts to bonuses
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  const rollFormula = buildFormula(diceRoll, diceKeep, bonus, { emphasis, unskilled: isUnskilled });

  // Build chat message label with modifiers and emphasis notation
  let baseLabel = label;
  if (isUnskilled) {
    baseLabel += ` [${game.i18n.localize("l5r4.ui.mechanics.rolls.unskilled")}]`;
  }
  if (emphasis) {
    baseLabel += ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.emphasis")})`;
  }
  if (socialResistance && honorRank > 0) {
    baseLabel += ` [${game.i18n.localize("l5r4.character.ranks.honorRank")} +${honorRank}]`;
  }
  if (rollMod || keepMod || totalMod) {
    baseLabel += ` ${game.i18n.localize("l5r4.ui.common.mod")} (${rollMod}k${keepMod}${
      totalMod < 0 ? totalMod : "+" + totalMod
    })`;
  }

  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render();

  let baseTN = toInt(check.tn);
  const raises = toInt(check.raises);

  // Special case: Attack rolls with no manual TN use auto-resolved target Armor TN
  if (rollType === "attack" && baseTN === 0 && autoTN > 0) {
    baseTN = autoTN;
  }

  // Calculate effective TN: baseTN + (raises × 5) + wound penalty + condition penalty + armor penalty (if applicable)
  const conditionTNPenalty = getConditionTNPenalty(actor);
  const armorTNPenalty = getArmorTNPenalty(actor, skillName, skillTrait);
  let effTN =
    calculateEffectiveTN(baseTN, raises, woundPenalty, applyWoundPenalty) +
    conditionTNPenalty +
    armorTNPenalty;
  effTN = Math.max(0, effTN); // TN cannot be negative
  let tnResult = evaluateTN(roll.total ?? 0, effTN, raises);

  // Append target info and TN/raises display to final chat message label
  let finalLabel = baseLabel;
  if (targetInfo) {
    finalLabel += targetInfo;
  }
  if (baseTN || raises) {
    const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
    finalLabel += ` [TN ${effTN}${raises ? ` (${raisesLabel}: ${raises})` : ""}]`;
  }

  // Convert "failure" to "missed" for attack rolls (better UX messaging)
  tnResult = replaceFailureWithMissed(tnResult, rollType);

  const content = await R(messageTemplate, { flavor: finalLabel, roll: rollHtml, tnResult });

  // Post roll to chat, handle errors gracefully
  try {
    return await roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  } catch (err) {
    console.error(`${SYS_ID}`, "SkillRoll: Failed to post chat message after roll", {
      err,
      skillName
    });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false;
  }
}
