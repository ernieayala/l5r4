/**
 * Trait Roll Service
 *
 * Handles trait-based rolls using innate abilities without skill training.
 * Implements the Legend of the Five Rings 4th Edition Trait Roll mechanic
 * where characters roll XkX dice (X = trait rank) for raw ability checks.
 *
 * Key Responsibilities:
 * - **Trait Roll Construction**: Build XkX roll formula from trait rank
 * - **Void Ring Support**: Handle Void Ring rolls (special case - no traits)
 * - **Roll Modifiers**: Apply bonuses, raises, Void points, wound penalties
 * - **Chat Integration**: Post roll results to Foundry chat with TN evaluation
 *
 * L5R4 Game Mechanics:
 * - Formula: XkX where X = trait rank (e.g., Stamina 3 = 3k3)
 * - Usage: Raw ability checks (resisting, enduring, raw mental/physical tasks)
 * - Exploding Dice: Tens explode (re-roll and add) unless unskilled
 * - Unskilled Rolls: Dice never explode, no raises allowed (rare for trait rolls)
 * - Raises: Voluntarily increase TN by +5 per raise for enhanced effects (max = Void Ring)
 * - Void Spending: +1k1 bonus (declared before rolling)
 * - Wound Penalties: Injuries increase TN based on wound rank
 *
 * Foundry VTT Integration:
 * - Requires: Foundry VTT v13+ (Roll API, ChatMessage API)
 * - Uses Roll class for dice formula evaluation with exploding dice (x10 modifier)
 * - Posts results via ChatMessage.create() through roll.toMessage()
 * - Integrates with ui.notifications for error/warning messages
 *
 * Related Services:
 * - GetTraitRollOptions: Dialog for user input (raises, modifiers, Void)
 * - applyTraitBonuses: Retrieves passive bonuses from actor data
 * - spendVoidPoint: Handles Void point expenditure and validation
 * - TenDiceRule: Enforces 10-dice cap with conversion to bonuses
 * - buildFormula: Constructs Foundry Roll formula string
 * - calculateEffectiveTN/evaluateTN: TN calculation and success evaluation
 *
 * @module services/dice/rolls/trait-roll
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Roll.html|Foundry Roll API}
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ChatMessage.html|ChatMessage API}
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { calculateEffectiveTN, evaluateTN } from "../core/tn-calculator.js";
import { spendVoidPoint, resolveActor } from "../resources/void-manager.js";
import { applyTraitBonuses } from "../effects/bonus-applicator.js";
import { GetTraitRollOptions } from "../dialogs/trait-dialog.js";
import { getArmorTNPenalty } from "../../../utils/armor-penalties.js";
import {
  getConditionRollPenalties,
  getConditionTNPenalty
} from "../../../utils/condition-penalties.js";

/**
 * Execute a trait roll for innate ability checks in the L5R4 system.
 *
 * Handles rolling XkX dice based on a character's trait rank (Stamina, Willpower,
 * Reflexes, etc.) or Void Ring rank. Trait rolls represent raw innate abilities
 * without skill training - used for resisting effects, endurance checks, mental
 * focus, and other situations where only natural ability matters.
 *
 * L5R4 Trait Roll Mechanics:
 * - Formula: XkX where X = trait rank (roll and keep same number)
 * - Example: Stamina 4 = 4k4 (roll 4d10, keep 4 highest)
 * - Exploding Dice: Tens explode unless unskilled flag set
 * - Typical Uses: Lifting (Strength), resisting poison (Stamina), mental focus (Willpower)
 *
 * Process Flow:
 * 1. Check system setting for "always show trait roll options" vs askForOptions override
 * 2. If showing dialog: Prompt user for raises, modifiers, Void point, wound penalty
 * 3. Apply passive bonuses from advantages/techniques via applyTraitBonuses()
 * 4. Handle Void point expenditure if requested (deduct from pool, apply +1k1)
 * 5. Apply Ten Dice Rule to cap at 10k10 with excess as flat bonuses
 * 6. Build roll formula with exploding dice (unless unskilled)
 * 7. Execute roll and calculate effective TN (base + raises*5 + wound penalties)
 * 8. Evaluate success/failure and post to chat
 *
 * Dialog Options (if askForOptions matches system setting):
 * - Raises: Number of voluntary TN increases (+5 each, max = Void Ring)
 * - Unskilled: Disables exploding dice and raises (rare for traits)
 * - Void Point: Spend for +1k1 bonus (if available)
 * - Wound Penalty: Apply current wound rank TN penalty
 * - Manual Modifiers: Additional roll/keep/total adjustments
 * - Target Number: Optional TN for success evaluation
 *
 * Void Ring Special Case:
 * Void is technically a Ring, not a Trait (it has no associated traits per L5R4 rules).
 * However, Void rolls use the same XkX mechanic as trait rolls, so this function
 * handles both trait rolls and Void Ring rolls using the same logic.
 *
 * Foundry Integration:
 * - Async operation (awaits dialog, Void spending, roll rendering, chat posting)
 * - Uses game.settings.get() for "showTraitRollOptions" world setting
 * - Posts to chat via roll.toMessage() with ChatMessage.getSpeaker()
 * - Error handling with try/catch and ui.notifications.error()
 *
 * @param {Object} options - Trait roll configuration object
 * @param {number|null} [options.traitRank=null] - Trait rank value (1-10, pre-calculated from actor)
 * @param {string|null} [options.traitName=null] - Trait name for localization (e.g., "stamina", "willpower", "void")
 * @param {boolean} [options.askForOptions=true] - Override for system setting (true=show dialog, false=skip dialog)
 * @param {boolean} [options.unskilled=false] - If true, disables exploding dice and raises per Unskilled Roll rules
 * @param {L5R4Actor|null} [options.actor=null] - Actor performing the roll (null uses resolveActor fallback chain)
 *
 * @returns {Promise<ChatMessage|false>} ChatMessage document if successful, false if cancelled or error
 *
 * @throws {Error} Logs to console if chat message posting fails, shows ui.notification.error to user
 *
 * @async
 */
export async function TraitRoll({
  traitRank = null,
  traitName = null,
  askForOptions = true,
  unskilled = false,
  actor = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  const labelTrait = String(traitName).toLowerCase();
  const traitKey =
    labelTrait === "void"
      ? "l5r4.ui.mechanics.rings.void"
      : `l5r4.ui.mechanics.traits.${labelTrait}`;

  // Read system world setting for "always show trait roll options dialog"
  // askForOptions parameter allows per-call override of this setting
  const optionsSetting = game.settings.get(SYS_ID, "showTraitRollOptions");
  let rollMod = 0,
    keepMod = 0,
    totalMod = 0,
    applyWoundPenalty = true;
  let label = `${game.i18n.localize(traitKey)} ${game.i18n.localize("l5r4.ui.common.roll")}`;
  let userTN = 0,
    userRaises = 0;

  const targetActor = resolveActor(actor);
  const currentWoundPenalty = targetActor?.system?.woundPenalty ?? 0;

  // Show dialog if askForOptions doesn't match the setting (XOR logic - show when override differs from default)
  if (askForOptions !== optionsSetting) {
    const check = await GetTraitRollOptions(traitName, targetActor);
    if (check?.cancelled) {
      return;
    }

    unskilled = !!check.unskilled;
    applyWoundPenalty = !!check.applyWoundPenalty;
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    totalMod = toInt(check.totalMod);

    userTN = toInt(check.tn);
    const userFreeRaises = toInt(check.freeRaises) || 0;
    userRaises = toInt(check.raises);
    if (userTN || userRaises || userFreeRaises) {
      // Calculate effective TN: base TN + (raises × 5)
      const displayTN = userTN + userRaises * 5;
      const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
      const freeRaisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.freeRaises");
      label += ` [TN ${displayTN}`;
      if (userRaises || userFreeRaises) {
        label += ` (${raisesLabel}: ${userRaises}`;
        if (userFreeRaises) {
          label += ` + ${userFreeRaises} ${freeRaisesLabel}`;
        }
        label += ")";
      }
      label += "]";
    }

    // Apply passive bonuses from advantages, techniques, and effects
    // Returns {roll, keep, total} bonuses specific to this trait
    const bonuses = applyTraitBonuses(targetActor, traitName);
    rollMod += bonuses.roll;
    keepMod += bonuses.keep;
    totalMod += bonuses.total;

    // Handle Void point expenditure (if user selected in dialog)
    if (check.void) {
      // Attempt to spend Void point - validates availability and decrements pool
      // Returns {success, rollBonus, keepBonus, message} with +1k1 if successful
      const voidResult = await spendVoidPoint(targetActor);
      if (!voidResult.success) {
        // Void unavailable (depleted or no actor) - warn user and cancel roll
        ui.notifications?.warn(voidResult.message);
        return;
      }

      // L5R4 Void Point Rules:
      // - Normal trait rolls: +1k1 bonus
      // - Unskilled trait rolls (edge case): Treat like unskilled skill roll - +1k0 with explosions
      if (unskilled) {
        // Void on unskilled: Only add to rolled dice, not kept dice
        // This makes it effectively a "skilled" roll with explosions enabled
        rollMod += voidResult.rollBonus;
        // Don't add to keepMod - unskilled void gives +1k0
        unskilled = false; // Void removes unskilled penalty (enables explosions)
        label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
      } else {
        // Standard void on trait roll: +1k1 bonus
        rollMod += voidResult.rollBonus;
        keepMod += voidResult.keepBonus;
        label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}`;
      }
    }
  }

  // Apply wound penalty to roll total (ALWAYS subtract from roll, never add to TN)
  // Wound penalties reduce the character's effectiveness by subtracting from their roll result
  // CRITICAL: This must be OUTSIDE the dialog block so it applies even when dialog is skipped
  if (applyWoundPenalty && currentWoundPenalty > 0) {
    totalMod -= currentWoundPenalty;
  }

  // Apply condition penalties (blinded, dazed, fatigued, prone, etc.)
  // Trait rolls are general actions, so use null rollType to get universal penalties
  const conditionPenalties = getConditionRollPenalties(targetActor, null, "melee");
  rollMod += conditionPenalties.roll; // Will be negative if conditions active
  keepMod += conditionPenalties.keep;

  // Calculate final dice pool: trait rank + all modifiers
  const traitValue = toInt(traitRank);
  const diceToRoll = traitValue + rollMod;
  const diceToKeep = traitValue + keepMod;
  // Apply Ten Dice Rule: cap at 10k10, convert excess to flat bonuses
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  const rollFormula = buildFormula(diceRoll, diceKeep, bonus, { unskilled });
  let flavor = label;

  // Add "Unskilled" label if applicable (rare for trait rolls, used for special cases)
  // Unskilled rolls never explode and cannot benefit from raises per L5R4 rules
  if (unskilled) {
    flavor += ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.unskilledRoll")})`;
  }

  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render();

  // Calculate final effective TN: base + (raises × 5) + armor penalty + condition TN penalty
  // Armor penalty only applies to Agility/Reflexes trait rolls with Riding Armor (per Equipment rules)
  const armorTNPenalty = getArmorTNPenalty(targetActor, null, traitName);
  const conditionTNPenalty = getConditionTNPenalty(targetActor); // Fatigued: +5 TN
  const baseTN = calculateEffectiveTN(
    userTN,
    userRaises,
    0,
    0, // Never apply wound penalty to TN
    false // Wound penalty flag no longer used for TN calculation
  );
  const effTN = baseTN + armorTNPenalty + conditionTNPenalty;
  const tnResult = evaluateTN(roll.total ?? 0, effTN, userRaises);

  const content = await R(messageTemplate, { flavor, roll: rollHtml, tnResult });

  try {
    return await roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  } catch (err) {
    console.error(`${SYS_ID}`, "TraitRoll: Failed to post chat message after roll", {
      err,
      traitName
    });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false;
  }
}
