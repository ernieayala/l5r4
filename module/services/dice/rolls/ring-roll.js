/**
 * Ring Roll and Spell Casting Service
 *
 * Handles L5R4 Ring-based rolls including raw Ring ability checks and shugenja
 * Spell Casting rolls. Ring rolls use a Ring value directly (XkX formula), while
 * Spell Casting rolls add School Rank to dice pool ((Ring + School Rank)kRing).
 *
 * Key Responsibilities:
 * - **Ring Rolls**: Raw ability checks using Ring value (resisting, raw attribute tests)
 * - **Spell Casting**: Shugenja invocations against spell TN (5 + Mastery Level × 5)
 * - **Resource Management**: Void Point and spell slot consumption
 * - **Modifier Application**: Roll/keep/total bonuses from effects and user input
 * - **TN Evaluation**: Calculate effective TN with raises and wound penalties
 * - **Chat Integration**: Construct and post roll messages with formatted results
 *
 * L5R4 Game Mechanics:
 * - **Ring Rolls**: XkX where X = Ring rank (used for trait-based ability checks)
 * - **Spell Casting**: (Ring + School Rank)k(Ring) vs TN 5 + (Mastery Level × 5)
 * - **Void Spending**: +1k1 bonus to any roll (one per round limit enforced by caller)
 * - **Raises**: Declared before rolling, +5 TN each for enhanced effects
 * - **Wound Penalties**: Incremental TN increases per wound rank (applied if enabled)
 * - **Spell Slots**: Elemental slots (equal to Ring rank) + Void bonus slots
 * - **Exploding Dice**: Tens explode (reroll and add result) per core rules
 * - **Ten Dice Rule**: Cap at 10 rolled/kept dice with overflow bonuses
 *
 * Foundry VTT Integration:
 * - Uses Roll API for dice formula evaluation and rendering (Foundry v13)
 * - Leverages ChatMessage.getSpeaker() for chat message creation
 * - Uses game.settings for user preference toggles (showSpellRollOptions)
 * - Uses game.i18n for localized labels and error messages
 * - Async operations: Dialog display, resource spending, actor updates, message posting
 *
 * Usage Pattern:
 * ```javascript
 * // Spell casting from actor sheet
 * await RingRoll({
 *   actor: myShugenja,
 *   ringRank: 3,
 *   ringName: "Fire",
 *   systemRing: "fire",
 *   askForOptions: true,
 *   woundPenalty: 5
 * });
 * ```
 *
 * @module services/dice/rolls/ring-roll
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Roll.html|Roll API}
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ChatMessage.html|ChatMessage API}
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { calculateEffectiveTN, evaluateTN } from "../core/tn-calculator.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { spendElementalSlot, spendVoidSlot } from "../resources/spell-slot-manager.js";
import { applyRingBonuses } from "../effects/bonus-applicator.js";
import { GetSpellOptions } from "../dialogs/ring-dialog.js";

/**
 * Generic resource spending wrapper with user notification.
 *
 * Abstracts the common pattern of spending a resource (spell slot, Void Point),
 * checking for success, displaying error notifications, and extracting values.
 * Centralizes error handling and provides consistent user feedback.
 *
 * Used for spell slot consumption where successful spends return a chat label
 * to append to the roll message (e.g., " [Fire Slot]").
 *
 * @param {Function} spendFn - Async function that returns {success, message, [successProp]}
 * @param {string} [successProp="label"] - Property name to extract from successful result
 * @returns {Promise<{success: boolean, value: *}>} Normalized result with extracted value
 * @private
 * @async
 */
async function spendResource(spendFn, successProp = "label") {
  const result = await spendFn();

  // Display user-facing error notification if spending failed
  if (!result.success) {
    ui.notifications?.warn(result.message);
    return { success: false, value: null };
  }

  return { success: true, value: result[successProp] };
}

/**
 * Execute a Ring roll or Spell Casting roll with full L5R4 mechanics.
 *
 * Handles two distinct roll types based on user selection in dialog:
 * 1. **Ring Roll**: Raw ability check (XkX formula) for resisting effects, lifting, etc.
 * 2. **Spell Casting**: Shugenja invocation ((Ring + School Rank)kRing) against spell TN
 *
 * Process Flow:
 * 1. Display modifier dialog (if enabled by settings or askForOptions parameter)
 * 2. Collect user input: modifiers, Void expenditure, spell slot selection, TN, raises
 * 3. Apply ring-specific bonuses from actor effects
 * 4. Spend Void Point if requested (+1k1 bonus per L5R4 rules)
 * 5. Spend spell slots if requested (elemental or Void bonus slot)
 * 6. Apply Ten Dice Rule to cap rolled/kept dice at 10 with overflow bonuses
 * 7. Build roll formula with emphasis support (if applicable)
 * 8. Execute roll and calculate TN result (success/failure with margin)
 * 9. Post chat message with formatted roll results and flavor text
 *
 * L5R4 Mechanics Implemented:
 * - **Ring Rolls**: Direct Ring value used for both rolled and kept dice
 * - **Spell Casting**: Ring + School Rank for rolled dice, Ring for kept dice
 * - **Raises**: Each raise adds +5 to effective TN (declared before rolling)
 * - **Void Points**: Grant +1k1 to roll (one die added to both roll and keep)
 * - **Wound Penalties**: Add to TN if enabled (based on wound rank severity)
 * - **Spell Slots**: Consumed on cast attempt (elemental slots or Void bonus slots)
 * - **Exploding Dice**: Tens reroll and add result (handled by Roll formula)
 * - **Ten Dice Rule**: Maximum 10 rolled/kept dice, overflow becomes bonuses
 *
 * User Settings:
 * - `showSpellRollOptions`: Controls whether modifier dialog appears by default
 * - `askForOptions`: Inverts settings behavior (true = show if setting false)
 *
 * Side Effects:
 * - May decrement actor.system.rings.void.value (Void Point spending)
 * - May decrement actor.system.spellSlots[ring] (elemental slot spending)
 * - May decrement actor.system.spellSlots.void (Void bonus slot spending)
 * - Posts ChatMessage to game chat log
 *
 * Error Handling:
 * - Returns false if dialog cancelled by user
 * - Returns false if resource spending fails (insufficient resources)
 * - Returns false if chat message posting fails (logs error to console)
 * - Displays ui.notifications warnings for resource failures
 *
 * @param {Object} options - Roll configuration options
 * @param {number} [options.woundPenalty=0] - Current wound penalty to add to TN (based on wound rank)
 * @param {number} [options.ringRank=null] - Ring value for dice pool (e.g., Fire 3 = ringRank 3)
 * @param {string} [options.ringName=null] - Display name of Ring for chat message (e.g., "Fire", "Void")
 * @param {string} [options.systemRing=null] - System key for Ring (lowercase, e.g., "fire") for slot tracking
 * @param {boolean} [options.askForOptions=true] - Invert showSpellRollOptions setting (controls dialog display)
 * @param {L5R4Actor} [options.actor=null] - Actor performing the roll (for resource spending and bonuses)
 *
 * @returns {Promise<ChatMessage|false>} Posted ChatMessage if successful, false if cancelled/failed
 * @async
 *
 * @see {@link GetSpellOptions} for dialog UI and user input collection
 * @see {@link spendVoidPoint} for Void Point mechanics and +1k1 bonus
 * @see {@link spendElementalSlot} for elemental spell slot consumption
 * @see {@link spendVoidSlot} for Void bonus slot consumption
 * @see {@link TenDiceRule} for dice pool capping per L5R4 core rules
 */
export async function RingRoll({
  woundPenalty = 0,
  ringRank = null,
  ringName = null,
  systemRing = null,
  askForOptions = true,
  actor = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  let label = ""; // Will be set after dialog processing based on roll type

  const optionsSetting = game.settings.get(SYS_ID, "showSpellRollOptions");

  // Roll configuration variables (populated from dialog or defaults)
  let normalRoll = true; // true = Ring Roll (XkX), false = Spell Casting ((Ring+School)kRing)
  let rollMod = 0; // Additional rolled dice (situational bonuses, techniques)
  let keepMod = 0; // Additional kept dice (rare, usually from techniques)
  let totalMod = 0; // Flat bonus to roll total (situational modifiers)
  let voidRoll = false; // Void Point spent for +1k1 bonus
  let applyWoundPenalty = true; // Apply wound rank TN penalty
  let spellSlot = false; // Elemental spell slot consumed
  let voidSlot = false; // Void bonus spell slot consumed
  let __tnInput = 0,
    __raisesInput = 0; // User-specified TN and raises

  // Show dialog if askForOptions inverts the setting (XOR logic)
  // Setting ON + askForOptions false = show dialog | Setting OFF + askForOptions true = show dialog
  if (askForOptions !== optionsSetting) {
    const choice = await GetSpellOptions(ringName);

    // User cancelled dialog - abort roll
    if (choice?.cancelled) return false;

    // Extract dialog choices
    applyWoundPenalty = !!choice.applyWoundPenalty;
    normalRoll = !!choice.normalRoll; // Dialog button determines Ring Roll vs Spell Casting
    rollMod = toInt(choice.rollMod);
    keepMod = toInt(choice.keepMod);
    totalMod = toInt(choice.totalMod);
    voidRoll = !!choice.void;
    spellSlot = !!choice.spellSlot;
    voidSlot = !!choice.voidSlot;

    __tnInput = toInt(choice.tn);
    __raisesInput = toInt(choice.raises);
  }

  // Set base label based on roll type (before appending modifiers)
  if (normalRoll) {
    label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.ringRoll")}: ${ringName}`;
  } else {
    label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.spellCasting")}: ${ringName}`;
  }

  // Apply actor-specific Ring bonuses from effects, techniques, advantages
  const bonuses = applyRingBonuses(actor, systemRing);
  rollMod += bonuses.roll;
  keepMod += bonuses.keep;
  totalMod += bonuses.total;

  // Void Point spending: +1k1 bonus per L5R4 Rings_and_Traits.md
  // Side effect: Decrements actor.system.rings.void.value by 1
  if (voidRoll) {
    const voidResult = await spendVoidPoint(actor);
    if (!voidResult.success) {
      ui.notifications?.warn(voidResult.message);
      return false; // Abort roll if Void Point unavailable
    }
    rollMod += voidResult.rollBonus; // +1 rolled die
    keepMod += voidResult.keepBonus; // +1 kept die
    label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
  }

  // Elemental spell slot consumption per L5R4 Spells.md
  // Side effect: Decrements actor.system.spellSlots[systemRing] by 1
  if (spellSlot && systemRing) {
    const result = await spendResource(() => spendElementalSlot(actor, systemRing));
    if (!result.success) return false; // Abort if slot unavailable
    label += result.value; // Append slot label (e.g., " [Fire Slot]")
  }

  // Void bonus spell slot consumption (flexible slot for any element)
  // Side effect: Decrements actor.system.spellSlots.void by 1
  if (voidSlot) {
    const result = await spendResource(() => spendVoidSlot(actor));
    if (!result.success) return false; // Abort if slot unavailable
    label += result.value; // Append slot label (e.g., " [Void Slot]")
  }

  // Determine dice pool based on roll type
  let diceToRoll, diceToKeep;

  if (normalRoll) {
    // Ring Roll: XkX where X = Ring rank
    diceToRoll = toInt(ringRank) + rollMod;
    diceToKeep = toInt(ringRank) + keepMod;
  } else {
    // Spell Casting: (Ring + School Rank)k(Ring)
    const schoolRank = toInt(actor?.system?.insight?.rank);

    // Validate school rank - cannot cast with rank 0
    if (schoolRank <= 0) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.schoolRankZero"));
      return false;
    }

    diceToRoll = toInt(ringRank) + schoolRank + rollMod;
    diceToKeep = toInt(ringRank) + keepMod;
  }

  // Append TN and raises to label if specified
  if (__tnInput || __raisesInput) {
    const __effTN = __tnInput + __raisesInput * 5;
    const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
    label += ` [TN ${__effTN}${__raisesInput ? ` (${raisesLabel}: ${__raisesInput})` : ""}]`;
  }

  // Apply Ten Dice Rule: Cap at 10 rolled/kept dice, overflow becomes bonuses
  // Example: 12k4 → 10k5, 14k12 → 10k10+12
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  // Build roll formula (e.g., "4d10x10kh3+2" for 4k3+2 with exploding tens)
  const rollFormula = buildFormula(diceRoll, diceKeep, bonus);

  // Execute roll using Foundry Roll API
  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render();

  // Calculate effective TN: base TN + (raises × 5) + wound penalty
  // Wound penalty only applied if enabled AND a TN was specified
  const effTN = calculateEffectiveTN(
    __tnInput,
    __raisesInput,
    woundPenalty,
    applyWoundPenalty && __tnInput > 0
  );

  // Evaluate success/failure with margin calculation
  const tnResult = evaluateTN(roll.total ?? 0, effTN, __raisesInput);

  // Render chat message content from template
  const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult });

  // Post to chat with error recovery
  try {
    return await roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  } catch (err) {
    console.error(`${SYS_ID}`, "RingRoll: Failed to post chat message after roll", {
      err,
      ringName
    });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false; // Roll succeeded but chat post failed
  }
}
