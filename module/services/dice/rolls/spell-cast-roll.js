/**
 * Spell Casting Roll Service
 *
 * Simplified spell casting that automatically handles affinity/deficiency detection,
 * TN calculation, and spell slot management. Provides streamlined dialog and direct
 * spell casting without requiring users to manually configure spell-specific parameters.
 *
 * L5R4 Mechanics:
 * - Spell Casting: (Ring + School Rank)k(Ring) vs TN 5+(Mastery Level×5)
 * - Affinity: +1 School Rank (auto-detected from actor's shugenja school)
 * - Deficiency: -1 School Rank (auto-detected from actor's shugenja school)
 * - Spell Slots: Elemental slots (Ring value) + Void bonus slots
 * - Automatic slot consumption: Elemental preferred, void fallback
 *
 * @module services/dice/rolls/spell-cast-roll
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { calculateEffectiveTN, evaluateTN } from "../core/tn-calculator.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { applyRingBonuses } from "../effects/bonus-applicator.js";
import { GetSpellCastOptions } from "../dialogs/spell-dialog.js";

/**
 * Execute a spell casting roll with automatic affinity/deficiency/TN/slot handling.
 *
 * Streamlined spell casting process:
 * 1. Auto-detect affinity/deficiency from actor's shugenja school
 * 2. Auto-calculate TN from spell's Mastery Level
 * 3. Show simplified dialog (wound penalty, void, modifiers, void slot choice, raises)
 * 4. Auto-consume spell slot based on user choice:
 *    - If "Use Void Spell Slot" unchecked: elemental slot first, void slot fallback
 *    - If "Use Void Spell Slot" checked: void slot first, elemental slot fallback
 * 5. Execute roll with full L5R4 mechanics
 * 6. Post formatted chat message with results
 *
 * @param {Object} options - Spell casting configuration
 * @param {L5R4Actor} options.actor - Actor casting the spell
 * @param {Item} options.spell - Spell item being cast
 * @param {number} options.woundPenalty - Current wound penalty TN modifier
 * @param {boolean} [options.showDialog=true] - Show modifier dialog (false for instant cast)
 * @returns {Promise<ChatMessage|false>} Posted chat message or false if cancelled
 * @async
 */
export async function SpellCastRoll({ actor, spell, woundPenalty = 0, showDialog = true } = {}) {
  if (!actor || !spell || spell.type !== "spell") {
    console.error(`${SYS_ID}`, "SpellCastRoll: Invalid actor or spell", { actor, spell });
    return false;
  }

  const ringKey = String(spell.system?.ring ?? "earth").toLowerCase();
  const ringValue = toInt(actor.system?.rings?.[ringKey]) || 2;
  const ringName = game.i18n.localize(`l5r4.ui.mechanics.rings.${ringKey}`);
  const masteryLevel = toInt(spell.system?.mastery) || 1;
  const baseTN = 5 + masteryLevel * 5;

  // Get dialog options or use defaults
  let options = {
    applyWoundPenalty: true,
    rollMod: 0,
    keepMod: 0,
    totalMod: 0,
    void: false,
    raises: 0,
    useVoidSlot: false
  };

  if (showDialog) {
    options = await GetSpellCastOptions(spell.name, ringName, actor);
    if (options.cancelled) {
      return false;
    }
  }

  // Auto-detect affinity/deficiency from shugenja school
  const school = actor.items.find(i => i.type === "technique" && i.system?.shugenja);
  let schoolRankMod = 0;

  if (school) {
    const affinity = String(school.system?.affinity ?? "").toLowerCase();
    const deficiency = String(school.system?.deficiency ?? "").toLowerCase();

    if (affinity === ringKey) {
      schoolRankMod = 1;
    } else if (deficiency === ringKey) {
      schoolRankMod = -1;
    }
  }

  const baseSchoolRank = toInt(actor?.system?.insight?.rank) || 1;
  const effectiveSchoolRank = baseSchoolRank + schoolRankMod;

  // Validate effective school rank
  if (effectiveSchoolRank <= 0) {
    const msg =
      schoolRankMod < 0
        ? game.i18n.format("l5r4.ui.notifications.deficiencyBlocksCasting", { ring: ringName })
        : game.i18n.localize("l5r4.ui.notifications.schoolRankZero");
    ui.notifications?.warn(msg);
    return false;
  }

  // Validate and consume spell slot
  const slots = actor.system?.spellSlots;
  if (!slots) {
    ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noSpellSlots"));
    return false;
  }

  const elementalCurrent = toInt(slots[ringKey]);
  const voidCurrent = toInt(slots.void);

  // Determine which slot to use:
  // 1. If user explicitly checked "Use Void Spell Slot", try to use void slot
  // 2. Otherwise, use auto-detection: elemental preferred, void fallback
  let useElementalSlot = false;
  let useVoidSlot = false;

  if (options.useVoidSlot) {
    // User wants to use void slot explicitly
    useVoidSlot = voidCurrent > 0;
    useElementalSlot = !useVoidSlot && elementalCurrent > 0;
  } else {
    // Auto-detect: prefer elemental slot, fallback to void
    useElementalSlot = elementalCurrent > 0;
    useVoidSlot = !useElementalSlot && voidCurrent > 0;
  }

  if (!useElementalSlot && !useVoidSlot) {
    const slotType = options.useVoidSlot ? "void" : ringName;
    ui.notifications?.warn(
      game.i18n.format("l5r4.ui.notifications.noSpellSlots", { ring: slotType })
    );
    return false;
  }

  // Store slot consumption details for later (after roll succeeds)
  const slotPath = useElementalSlot ? `system.spellSlots.${ringKey}` : "system.spellSlots.void";
  const currentSlots = useElementalSlot ? elementalCurrent : voidCurrent;

  // Build chat label
  let label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.spellCasting")}: ${spell.name}`;

  if (schoolRankMod > 0) {
    label += ` [${game.i18n.localize("l5r4.magic.spells.affinity")}]`;
  } else if (schoolRankMod < 0) {
    label += ` [${game.i18n.localize("l5r4.magic.spells.deficiency")}]`;
  }

  const slotLabel = useElementalSlot
    ? game.i18n.localize("l5r4.magic.spells.useSpellSlot") + " " + ringName
    : game.i18n.localize("l5r4.magic.spells.voidSlot");
  label += ` [${slotLabel}]`;

  // Apply actor bonuses from effects/techniques
  const bonuses = applyRingBonuses(actor, ringKey);
  let rollMod = options.rollMod + bonuses.roll;
  let keepMod = options.keepMod + bonuses.keep;
  let totalMod = options.totalMod + bonuses.total;

  // Apply wound penalty to roll total (ALWAYS subtract from roll, never add to TN)
  // Wound penalties reduce the character's effectiveness by subtracting from their roll result
  if (options.applyWoundPenalty && woundPenalty > 0) {
    totalMod -= woundPenalty;
  }

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

  // Calculate dice pool: (Ring + School Rank)k(Ring)
  const diceToRoll = ringValue + effectiveSchoolRank + rollMod;
  const diceToKeep = ringValue + keepMod;

  // Use free raises from dialog
  const freeRaises = options.freeRaises || 0;

  // Calculate effective TN: baseTN + (raises × 5)
  const effTN = calculateEffectiveTN(
    baseTN,
    options.raises,
    freeRaises,
    0, // Never apply wound penalty to TN
    false // Wound penalty flag no longer used for TN calculation
  );

  // Append TN to label
  if (baseTN || options.raises || freeRaises) {
    const raisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.raises");
    const freeRaisesLabel = game.i18n.localize("l5r4.ui.mechanics.rolls.freeRaises");
    label += ` [TN ${effTN}`;
    if (options.raises || freeRaises) {
      label += ` (${raisesLabel}: ${options.raises}`;
      if (freeRaises) {
        label += ` + ${freeRaises} ${freeRaisesLabel}`;
      }
      label += ")";
    }
    label += "]";
  }

  // Apply Ten Dice Rule
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  // Build and execute roll
  const rollFormula = buildFormula(diceRoll, diceKeep, bonus);
  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render();

  // Evaluate TN result
  const tnResult = evaluateTN(roll.total ?? 0, effTN, options.raises, freeRaises);

  // Render and post chat message
  const content = await R(CHAT_TEMPLATES.simpleRoll, {
    flavor: label,
    roll: rollHtml,
    tnResult
  });

  try {
    const message = await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), content });

    // Consume slot AFTER roll succeeds
    // Per L5R4 rules: slot consumed when Spell Casting Roll is made (not before)
    // This ensures slot is only lost if spell actually casts
    await actor.update({ [slotPath]: currentSlots - 1 });

    return message;
  } catch (err) {
    console.error(`${SYS_ID}`, "SpellCastRoll: Failed to post chat message", {
      err,
      spell: spell.name
    });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return false;
  }
}
