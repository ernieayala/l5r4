/**
 * Maho Casting Roll Service
 *
 * Handles forbidden blood magic (maho) spell casting with blood cost mechanics,
 * Taint gain, and special rules for kansen invocation. Maho uses different
 * mechanics than normal spell casting.
 *
 * L5R4 Maho Mechanics:
 * - Casting Roll: (Insight Rank + Ring)k(Ring) vs TN 5+(Mastery Level×5)
 * - Blood Cost: 2×Mastery Rank Wounds (required, paid before roll)
 * - Free Raises: +1 per additional blood cost amount spent
 * - Taint Gain: (Mastery Rank - 1) points on successful cast, minimum 1
 * - Master of Blood: -1 Wound cost, Taint reduced by Earth (min 1)
 * - No spell slots consumed (maho uses blood, not slots)
 *
 * @module services/dice/rolls/maho-cast-roll
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { calculateEffectiveTN, evaluateTN } from "../core/tn-calculator.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { applyRingBonuses } from "../effects/bonus-applicator.js";
import { GetMahoCastOptions } from "../dialogs/maho-dialog.js";

/**
 * Execute a maho (blood magic) casting roll with blood cost and Taint mechanics.
 *
 * Maho casting process:
 * 1. Show maho dialog (blood source, additional blood for free raises)
 * 2. Inflict blood cost wounds (required, regardless of success)
 * 3. Calculate free raises from additional blood spent
 * 4. Execute casting roll: (Insight Rank + Ring)k(Ring)
 * 5. On successful cast: Inflict Taint (Mastery Level - 1, min 1)
 * 6. Post formatted chat message with results and warnings
 *
 * Master of Blood Power:
 * - Reduces blood cost by 1 Wound
 * - Reduces Taint gain by Earth Ring (minimum 1)
 *
 * @param {Object} options - Maho casting configuration
 * @param {L5R4Actor} options.actor - Actor casting the maho spell
 * @param {Item} options.spell - Maho spell item being cast
 * @param {number} options.woundPenalty - Current wound penalty TN modifier
 * @param {boolean} [options.showDialog=true] - Show maho dialog
 * @returns {Promise<ChatMessage|false>} Posted chat message or false if cancelled
 * @async
 */
export async function MahoCastRoll({ actor, spell, woundPenalty = 0, showDialog = true } = {}) {
  if (!actor || !spell || spell.type !== "spell" || !spell.system?.maho) {
    console.error(`${SYS_ID}`, "MahoCastRoll: Invalid actor or maho spell", { actor, spell });
    return false;
  }

  const ringKey = String(spell.system?.ring ?? "earth").toLowerCase();
  const ringValue = toInt(actor.system?.rings?.[ringKey]) || 2;
  const ringName = game.i18n.localize(`l5r4.ui.mechanics.rings.${ringKey}`);
  const masteryLevel = toInt(spell.system?.mastery) || 1;
  const baseTN = 5 + masteryLevel * 5;

  // Calculate base blood cost: 2×Mastery Rank
  let baseBloodCost = masteryLevel * 2;

  // Check for Master of Blood power
  const hasMasterOfBlood = actor.items.some(
    i => i.type === "advantage" && i.name?.toLowerCase().includes("master of blood")
  );

  if (hasMasterOfBlood) {
    baseBloodCost = Math.max(baseBloodCost - 1, 1);
  }

  // Get dialog options or use defaults
  let options = {
    bloodSource: "self",
    additionalBlood: 0,
    applyWoundPenalty: true,
    rollMod: 0,
    keepMod: 0,
    totalMod: 0,
    void: false,
    raises: 0
  };

  if (showDialog) {
    options = await GetMahoCastOptions(spell.name, ringName, baseBloodCost);
    if (options.cancelled) {
      return false;
    }
  }

  // Calculate total blood cost and free raises
  const totalBloodCost = baseBloodCost + options.additionalBlood;
  const freeRaises = Math.floor(options.additionalBlood / baseBloodCost);

  // Inflict blood cost wounds (required, paid before roll)
  const currentWounds = toInt(actor.system?.suffered) || 0;
  const maxWounds = toInt(actor.system?.wounds?.max) || 40;

  if (options.bloodSource === "self") {
    const newWounds = Math.min(currentWounds + totalBloodCost, maxWounds);
    await actor.update({ "system.suffered": newWounds });
  }
  // Note: If bloodSource is "other", wounds are inflicted on another actor
  // This must be handled manually by GM or through separate targeting system

  // Use Insight Rank instead of School Rank for maho
  const insightRank = toInt(actor.system?.insight?.rank) || 1;

  // Build chat label
  let label = `${game.i18n.localize("l5r4.magic.maho.mahoCasting")}: ${spell.name}`;
  label += ` [${game.i18n.localize("l5r4.magic.maho.bloodCost")}: ${totalBloodCost}]`;

  if (freeRaises > 0) {
    label += ` [${game.i18n.localize("l5r4.magic.maho.freeRaises")}: ${freeRaises}]`;
  }

  // Apply actor bonuses from effects/techniques
  const bonuses = applyRingBonuses(actor, ringKey);
  let rollMod = options.rollMod + bonuses.roll;
  let keepMod = options.keepMod + bonuses.keep;
  const totalMod = options.totalMod + bonuses.total;

  // Handle Void Point spending
  if (options.void) {
    const voidResult = await spendVoidPoint(actor);
    if (!voidResult.success) {
      ui.notifications?.warn(voidResult.message);
      return false;
    }
    rollMod += voidResult.rollBonus;
    keepMod += voidResult.keepBonus;
    label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
  }

  // Calculate dice pool: (Insight Rank + Ring)k(Ring)
  const diceToRoll = ringValue + insightRank + rollMod;
  const diceToKeep = ringValue + keepMod;

  // Calculate effective TN with declared raises and free raises
  const totalRaises = options.raises + freeRaises;
  const effTN = calculateEffectiveTN(
    baseTN,
    options.raises, // Only declared raises add to TN, not free raises
    woundPenalty,
    options.applyWoundPenalty
  );

  // Append TN to label
  const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
  if (totalRaises > 0) {
    label += ` [TN ${effTN} (${raisesLabel}: ${options.raises}`;
    if (freeRaises > 0) {
      label += ` + ${freeRaises} ${game.i18n.localize("l5r4.ui.common.free")}`;
    }
    label += ")]";
  } else {
    label += ` [TN ${effTN}]`;
  }

  // Apply Ten Dice Rule
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  // Build and execute roll
  const rollFormula = buildFormula(diceRoll, diceKeep, bonus);
  const roll = new Roll(rollFormula);
  await roll.evaluate();
  const rollHtml = await roll.render();

  // Evaluate TN result
  const tnResult = evaluateTN(roll.total ?? 0, effTN, totalRaises);

  // On successful cast: Apply Taint
  if (tnResult && tnResult.outcome === T("l5r4.ui.mechanics.rolls.success")) {
    let taintGain = Math.max(masteryLevel - 1, 1);

    if (hasMasterOfBlood) {
      const earthRing = toInt(actor.system?.rings?.earth) || 1;
      taintGain = Math.max(taintGain - earthRing, 1);
    }

    const currentTaint = toInt(actor.system?.shadowTaint?.points) || 0;
    await actor.update({ "system.shadowTaint.points": currentTaint + taintGain });

    label += ` [${game.i18n.localize("l5r4.magic.maho.taintGained")}: ${taintGain}]`;

    ui.notifications?.warn(
      game.i18n.format("l5r4.magic.maho.taintGainedNotification", {
        taint: taintGain
      })
    );
  }

  // Render and post chat message
  const content = await R(CHAT_TEMPLATES.simpleRoll, {
    flavor: label,
    roll: rollHtml,
    tnResult
  });

  try {
    return await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), content });
  } catch (err) {
    console.error(`${SYS_ID}`, "MahoCastRoll: Failed to post chat message", {
      err,
      spell: spell.name
    });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false;
  }
}
