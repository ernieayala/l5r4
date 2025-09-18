/**
 * @fileoverview L5R4 Dice Service - Roll Mechanics and Dialog System for Foundry VTT v13+
 * 
 * This service module provides comprehensive dice rolling functionality for the L5R4 system,
 * including roll formula construction, Ten Dice Rule enforcement, modifier dialogs, and
 * chat card rendering with target number evaluation.
 *
 * **Core Responsibilities:**
 * - **Roll Formula Construction**: Build L5R4 dice formulas (XkY) with modifiers and special rules
 * - **Ten Dice Rule Enforcement**: Convert excess dice to bonuses per L5R4 rules
 * - **Modifier Dialogs**: Interactive dialogs for roll options using DialogV2 API
 * - **Chat Integration**: Render roll results with custom templates and TN evaluation
 * - **Void Point Management**: Automatic void point spending and validation
 * - **Active Effects Integration**: Apply bonuses from actor effects to rolls
 * - **Targeting System**: Auto-populate target numbers from selected tokens
 *
 * **Roll Types Supported:**
 * - **Skill Rolls**: (Trait + Skill + mods)k(Trait + mods) with emphasis and wound penalties
 * - **Ring Rolls**: Ring-based tests (with optional spell slot spending when using Spell dialog)
 * - **Trait Rolls**: Pure trait tests with unskilled and void point options
 * - **Weapon Rolls**: Damage rolls with weapon-specific modifiers
 * - **NPC Rolls**: Simplified rolls for NPCs with optional void point restrictions
 *
 * **Special Mechanics:**
 * - **Emphasis**: Reroll 1s on skill rolls (r1 modifier)
 * - **Unskilled**: No exploding dice on trait rolls
 * - **Void Points**: +1k1 bonus with automatic point deduction
 * - **Wound Penalties**: Applied to target numbers when enabled
 * - **Ten Dice Rule**: Excess dice converted to bonuses and kept dice
 * - **Auto-Targeting**: Automatically sets TN from targeted token's Armor TN
 *
 * **Dialog System:**
 * The service provides interactive dialogs for roll customization using Foundry's DialogV2 API.
 * Dialogs support modifier input, void point spending, emphasis selection, and target number setting.
 * All dialogs respect user preferences for automatic display vs. shift-click activation.
 *
 * **Ten Dice Rule Implementation:**
 * L5R4's Ten Dice Rule is automatically applied to all rolls:
 * - Dice pools > 10: Excess dice become flat bonuses
 * - Keep values > 10: Excess keep becomes flat bonuses (2 per excess keep)
 * - Special case: 10k10 + extras becomes 10k10 + (extras × 2)
 *
 * **Code Navigation Guide:**
 * 1. `SkillRoll()` - Main skill roll function with targeting and void point support
 * 2. `RingRoll()` - Ring-based rolls for elemental tests.
 *    When invoked from the Spell dialog, it can optionally deduct elemental/void spell slots.
 * 3. `TraitRoll()` - Pure trait tests with unskilled option
 * 4. `NpcRoll()` - Simplified NPC roll function
 * 5. `TenDiceRule()` - Core Ten Dice Rule implementation
 * 6. `GetSkillOptions()` - Skill roll modifier dialog
 * 7. `GetSpellOptions()` - Ring/spell roll modifier dialog (renders spell slot checkboxes)
 * 8. `GetTraitRollOptions()` - Trait roll modifier dialog
 * 9. `roll_parser()` - Inline roll notation parser for chat
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.dice.Roll.html|Roll}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html|DialogV2}
 * @see {@link https://foundryvtt.com/api/classes/documents.ChatMessage.html|ChatMessage}
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
 */

import { CHAT_TEMPLATES, SYS_ID } from "../config.js";
import { R, toInt, T } from "../utils.js";

/** Foundry's DialogV2 API for creating modal roll option dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

// ---------------------------------------------------------------------------
// SKILL ROLLS
// ---------------------------------------------------------------------------

/**
 * Execute a skill roll with L5R4 mechanics and optional modifier dialog.
 * Combines trait and skill ranks with modifiers, applies Ten Dice Rule, and
 * renders results to chat with target number evaluation.
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
  const traitI18nKey = skillTrait === "void" ? "l5r4.mechanics.rings.void" : `l5r4.mechanics.traits.${skillTrait}`;
  const optionsSetting = game.settings.get(SYS_ID, "showSkillRollOptions");
  // Prefer an i18n key if it exists; otherwise use the item’s display name
  const tryKey = typeof skillName === "string" ? `l5r4.skills.${skillName.toLowerCase()}` : "";
  const skillLabel = (tryKey && game.i18n?.has?.(tryKey)) ? game.i18n.localize(tryKey) : String(skillName ?? game.i18n.localize("l5r4.ui.common.skill"));
  let label = `${game.i18n.localize("l5r4.mechanics.rolls.skillRoll")}: ${skillLabel} / ${game.i18n.localize(traitI18nKey)}`;

  let emphasis = false;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let applyWoundPenalty = true;
  let __tnInput = 0, __raisesInput = 0;
  let autoTN = 0;
  let targetInfo = "";

  // Check for targeting and auto-populate TN for attack rolls
  if (rollType === "attack" && actor) {
    const targetedTokens = Array.from(game.user.targets || []);
    if (targetedTokens.length === 1) {
      const targetActor = targetedTokens[0].actor;
      if (targetActor?.system?.armorTn?.current) {
        autoTN = toInt(targetActor.system.armorTn.current);
        targetInfo = ` vs ${targetActor.name} (Armor TN ${autoTN})`;
      }
    } else if (targetedTokens.length > 1) {
      targetInfo = ` (Multiple targets - TN not auto-set)`;
    }
  }

  // Declare check variable at function scope
  let check;

  if (askForOptions !== optionsSetting) {
    // Apply Active Effects bonuses before showing dialog
    const bb = actor?.system?.bonuses;
    if (bb) {
      const kSkill = String(skillName).toLowerCase?.();
      const kTrait = String(skillTrait).toLowerCase?.();
      const bSkill = (bb.skill && bb.skill[kSkill]) || {};
      const bTrait = (bb.trait && bb.trait[kTrait]) || {};
      rollBonus  = toInt(rollBonus)  + toInt(bSkill.roll)  + toInt(bTrait.roll);
      keepBonus  = toInt(keepBonus)  + toInt(bSkill.keep)  + toInt(bTrait.keep);
      totalBonus = toInt(totalBonus) + toInt(bSkill.total) + toInt(bTrait.total);
    }

    const noVoid = npc && !game.settings.get(SYS_ID, "allowNpcVoidPoints");
    check = await GetSkillOptions(skillName, noVoid, rollBonus, keepBonus, totalBonus);
    if (check?.cancelled) return;
    ({ emphasis, applyWoundPenalty } = check);
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    totalMod = toInt(check.totalMod);

    /** @added: Record TN/Raises and annotate the label. */
    __tnInput = toInt(check.tn);
    __raisesInput = toInt(check.raises);
    if (__tnInput || __raisesInput) {
      const __effTN = __tnInput + (__raisesInput * 5);
      label += ` [TN ${__effTN}${__raisesInput ? ` (${game.i18n.localize("l5r4.mechanics.rolls.raises")}: ${__raisesInput})` : ""}]`;
    }

    if (check.void) {
      // Handle void point spending with validation and actor resolution
      const spendActor = actor
        ?? canvas?.tokens?.controlled?.[0]?.actor
        ?? game.user?.character
        ?? (ChatMessage.getSpeaker()?.actor ? game.actors?.get(ChatMessage.getSpeaker().actor) : null);

      if (!spendActor) {
        const messageData = {
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor }),
          content: await renderTemplate(messageTemplate, {
            rollHtml: "",
            label,
            tnResult: null,
            rollType,
            targetData: null
          })
        };
        ui.notifications?.warn(T("l5r4.ui.notifications.noActorForVoid"));
        return;
      }

      const curVoid = Number(spendActor.system?.rings?.void?.value ?? 0) || 0;
      if (curVoid <= 0) {
        const labelVP = game.i18n?.localize?.("l5r4.mechanics.rings.voidPoints") || "Void Points";
        ui.notifications?.warn(`${labelVP}: 0`);
        return;
      }

      // Deduct void point immediately for UI synchronization
      await spendActor.update({ "system.rings.void.value": curVoid - 1 }, { diff: true });

      // Apply void point bonus (+1k1) and update label
      rollMod += 1; keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
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

  let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
  if (emphasis) {
    label += ` (${game.i18n.localize("l5r4.mechanics.rolls.emphasis")})`;
    rollFormula = `${diceRoll}d10r1k${diceKeep}x10+${bonus}`;
  }
  // Build base label without target info first
  let baseLabel = label;
  if (rollMod || keepMod || totalMod) {
    baseLabel += ` ${game.i18n.localize("l5r4.mechanics.rolls.mod")} (${rollMod}k${keepMod}${totalMod < 0 ? totalMod : "+" + totalMod})`;
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
  
  let effTN = baseTN + (toInt(check.raises) * 5);
  if (applyWoundPenalty && woundPenalty > 0) {
    effTN += woundPenalty;
  }

  const tnResult = (effTN > 0)
    ? { effective: effTN, raises: toInt(check.raises) || 0, outcome: ((roll.total ?? 0) >= effTN) ? T("l5r4.mechanics.rolls.success") : T("l5r4.mechanics.rolls.failure") }
    : null;

  // Determine final label and TN result based on GM status and attack success
  let finalLabel = baseLabel;
  let finalTnResult = tnResult;
  
  if (rollType === "attack" && !game.user.isGM && tnResult && tnResult.outcome === T("l5r4.mechanics.rolls.failure")) {
    // Hide target information and TN result on missed attacks for non-GM players
    finalTnResult = null;
    // Don't add target info to label for failed attacks
  } else {
    // Add target info for successful attacks or GM users
    if (targetInfo) {
      finalLabel += targetInfo;
    }
  }

  const content = await R(messageTemplate, { flavor: finalLabel, roll: rollHtml, tnResult: finalTnResult });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}

// ---------------------------------------------------------------------------
// RING ROLLS (normal ring or spell casting path)
// ---------------------------------------------------------------------------

/**
 * Execute a ring roll for elemental tests, with optional spell-slot spending when
 * launched via the Spell dialog. The same dialog component is used for both the
 * plain ring roll and the spell roll buttons; when rendered with `{ spell: true }`
 * it includes `Use Spell Slot <Ring>` and `Use Void Spell Slot` checkboxes. If those
 * are checked, this function deducts from `system.spellSlots.<ring>` or
 * `system.spellSlots.void` before resolving the roll.
 * 
 * **Roll Types:**
 * - Normal Ring Roll: Standard ring-based test
 * - Spell Casting: Not custom-modeled beyond resource spending yet; the dice math is
 *   identical to a normal ring roll. Affinity/deficiency and school rank can be layered
 *   in the future if desired.
 * 
 * **Spell Modifiers:**
 * - Affinity: Bonus for favorable elemental alignment
 * - Deficiency: Penalty for unfavorable elemental alignment
 * - School Rank: Shugenja school progression bonuses
 * 
 * @param {object} opts - Roll configuration options
 * @param {number} [opts.woundPenalty=0] - Wound penalty for target numbers
 * @param {number} opts.ringRank - Ring rank for dice pool
 * @param {string} opts.ringName - Localized ring name for display
 * @param {string} [opts.systemRing] - Internal ring key for effects lookup
 * @param {number} [opts.schoolRank] - Shugenja school rank for spell bonuses
 * @param {boolean} [opts.askForOptions=true] - Whether to show modifier dialog
 * @param {boolean} [opts.unskilled=false] - Apply unskilled penalties
 *
 * Dialog-derived options (when using the Spell dialog):
 * - `choice.spellSlot` (boolean) - spend elemental spell slot for `systemRing`
 * - `choice.voidSlot` (boolean)   - spend from `system.spellSlots.void`
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
  let label = `${game.i18n.localize("l5r4.mechanics.rolls.ringRoll")}: ${ringName}`;

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

    /** @added: Record TN/Raises and annotate the label. */
    __tnInput = toInt(choice.tn);
    __raisesInput = toInt(choice.raises);
    if (__tnInput || __raisesInput) {
      const __effTN = __tnInput + (__raisesInput * 5);
      label += ` [TN ${__effTN}${__raisesInput ? ` (${game.i18n.localize("l5r4.mechanics.rolls.raises")}: ${__raisesInput})` : ""}]`;
    }
  }

  /** Active Effects: add ring-based bonuses (system.bonuses.ring[systemRing]). */
  const bRing = actor?.system?.bonuses?.ring?.[String(systemRing).toLowerCase?.()] || {};
  rollMod  += toInt(bRing.roll);
  keepMod  += toInt(bRing.keep);
  totalMod += toInt(bRing.total);

  if (voidRoll) {
    // Apply ring-specific Active Effects bonuses
    const bRing = actor?.system?.bonuses?.ring?.[String(systemRing).toLowerCase?.()] || {};
    rollMod  += toInt(bRing.roll);
    keepMod  += toInt(bRing.keep);
    totalMod += toInt(bRing.total);

    // Handle void point spending with validation
    const spendActor = actor
      ?? canvas?.tokens?.controlled?.[0]?.actor
      ?? game.user?.character
      ?? (ChatMessage.getSpeaker()?.actor ? game.actors?.get(ChatMessage.getSpeaker().actor) : null);

    if (!spendActor) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noActorForVoid"));
      return false;
    }

    const curVoid = Number(spendActor.system?.rings?.void?.value ?? 0) || 0;
    if (curVoid <= 0) {
      const labelVP = game.i18n?.localize?.("l5r4.mechanics.rings.voidPoints") || "Void Points";
      ui.notifications?.warn(`${labelVP}: 0`);
      return false;
    }

    // Deduct void point immediately for UI synchronization
    await spendActor.update({ "system.rings.void.value": curVoid - 1 }, { diff: true });

    // Apply void point bonus (+1k1) and update label
    rollMod += 1; keepMod += 1;
    label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
  }

  // Deduct spell slots when requested (works with either Ring Roll or Spell Casting Roll button)
  // Requires systemRing to identify which elemental slot to consume.
  if ((spellSlot || voidSlot) && systemRing) {
    const spendActor = actor
      ?? canvas?.tokens?.controlled?.[0]?.actor
      ?? game.user?.character
      ?? (ChatMessage.getSpeaker()?.actor ? game.actors?.get(ChatMessage.getSpeaker().actor) : null);

    if (!spendActor) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noActorForVoid"));
      return false;
    }

    // Normalize ring key and validate
    const ringKey = String(systemRing).toLowerCase();
    const validRings = ["water", "air", "fire", "earth", "void"];
    if (!validRings.includes(ringKey)) {
      ui.notifications?.warn(`Invalid ring for spell slot: ${ringKey}`);
      return false;
    }

    // Elemental spell slot spend
    if (spellSlot) {
      const path = `system.spellSlots.${ringKey}`;
      const current = Number(foundry.utils.getProperty(spendActor, path) ?? 0) || 0;
      if (current <= 0) {
        const ringLabel = game.i18n.localize(`l5r4.mechanics.rings.${ringKey}`) || ringKey;
        ui.notifications?.warn(`${ringLabel}: 0`);
        return false;
      }
      await spendActor.update({ [path]: current - 1 }, { diff: true });
      const ringDisplay = game.i18n.localize(`l5r4.mechanics.rings.${ringKey}`) || ringKey;
      label += ` [${ringDisplay} Slot]`;
    }

    // Void spell slot spend
    if (voidSlot) {
      const vPath = "system.spellSlots.void";
      const vCurrent = Number(foundry.utils.getProperty(spendActor, vPath) ?? 0) || 0;
      if (vCurrent <= 0) {
        ui.notifications?.warn(`${game.i18n.localize("l5r4.mechanics.rings.void")} ${game.i18n.localize("l5r4.magic.spells.voidSlot")} : 0`);
        return false;
      }
      await spendActor.update({ [vPath]: vCurrent - 1 }, { diff: true });
      label += ` [${game.i18n.localize("l5r4.mechanics.rings.void")} Slot]`;
    }
  }

  if (normalRoll) {
    const diceToRoll = toInt(ringRank) + rollMod;
    const diceToKeep = toInt(ringRank) + keepMod;
    const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
    // Execute roll and render with target number evaluation
    const roll = new Roll(`${diceRoll}d10k${diceKeep}x10+${bonus}`);
    const rollHtml = await roll.render();
    let __effTN = toInt(__tnInput) + (toInt(__raisesInput) * 5);
    if (applyWoundPenalty && __effTN > 0) {
      __effTN += toInt(woundPenalty);
    }
    const tnResult = (__effTN > 0) ? {
      effective: __effTN,
      raises: toInt(__raisesInput) || 0,
      outcome: ((roll.total ?? 0) >= __effTN) ? T("l5r4.mechanics.rolls.success") : T("l5r4.mechanics.rolls.failure")
    } : null;

    // Hide TN information for non-GM players on missed attack rolls (if this is used for attacks)
    let finalTnResult = tnResult;
    if (!game.user.isGM && tnResult && tnResult.outcome === T("l5r4.mechanics.rolls.failure")) {
      // Note: RingRoll doesn't currently support rollType parameter, but we include this for consistency
      // and future-proofing in case attack rolls use ring rolls
      finalTnResult = null;
    }

    const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult: finalTnResult });
    return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  }

  // Note: A dedicated spell-casting dice path is not implemented yet beyond the
  // resource spending above. The current behavior always executes a standard
  // ring roll with any applicable modifiers.
  return false;
}

// ---------------------------------------------------------------------------
// TRAIT ROLLS
// ---------------------------------------------------------------------------

/**
 * Execute a pure trait roll for attribute tests.
 * Supports unskilled rolls (no exploding dice) and void point spending for bonuses.
 * Automatically resolves actor for void point deduction and wound penalty application.
 * 
 * **Roll Formula:** (Trait + rollMod)k(Trait + keepMod) x10 + totalMod
 * 
 * **Special Features:**
 * - Unskilled: Removes exploding dice (no x10 modifier)
 * - Void Points: +1k1 bonus with automatic point deduction
 * - Actor Resolution: Finds actor from token, user character, or chat speaker
 * - Wound Penalties: Applied to effective target numbers from actor data
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
  const traitKey = labelTrait === "void" ? "l5r4.mechanics.rings.void" : `l5r4.mechanics.traits.${labelTrait}`;

  const optionsSetting = game.settings.get(SYS_ID, "showTraitRollOptions");
  let rollMod = 0, keepMod = 0, totalMod = 0, applyWoundPenalty = true;
  let label = `${game.i18n.localize(traitKey)} ${game.i18n.localize("l5r4.ui.common.roll")}`;
  let __tnInput = 0, __raisesInput = 0;

  // Resolve actor for void point spending and wound penalty lookup
  const targetActor = actor
    ?? canvas?.tokens?.controlled?.[0]?.actor
    ?? game.user?.character
    ?? (ChatMessage.getSpeaker()?.actor ? game.actors?.get(ChatMessage.getSpeaker().actor) : null);

  const currentWoundPenalty = targetActor?.system?.woundPenalty ?? 0;

  if (askForOptions !== optionsSetting) {
    const check = await GetTraitRollOptions(traitName);
    if (check?.cancelled) return;

    unskilled = !!check.unskilled;
    applyWoundPenalty = !!check.applyWoundPenalty;
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    totalMod = toInt(check.totalMod);

    /** @added: Record TN/Raises and annotate the label. */
    __tnInput = toInt(check.tn);
    __raisesInput = toInt(check.raises);
    if (__tnInput || __raisesInput) {
      const __effTN = __tnInput + (__raisesInput * 5);
      label += ` [TN ${__effTN}${__raisesInput ? ` (${game.i18n.localize("l5r4.mechanics.rolls.raises")}: ${__raisesInput})` : ""}]`;
    }

    // Apply Active Effects bonuses for this trait
    const bTrait = targetActor?.system?.bonuses?.trait?.[String(traitName).toLowerCase?.()] || {};
    rollMod  += toInt(bTrait.roll);
    keepMod  += toInt(bTrait.keep);
    totalMod += toInt(bTrait.total);

    if (check.void) {
      // Apply trait-specific Active Effects bonuses for void roll
      const bTrait = targetActor?.system?.bonuses?.trait?.[String(traitName).toLowerCase?.()] || {};
      rollMod  += toInt(bTrait.roll);
      keepMod  += toInt(bTrait.keep);
      totalMod += toInt(bTrait.total);

      // Validate actor availability for void point spending
      if (!targetActor) {
        ui.notifications?.warn(T("l5r4.ui.notifications.noActorForVoid"));
        return;
      }

      const curVoid = Number(targetActor.system?.rings?.void?.value ?? 0) || 0;
      if (curVoid <= 0) {
        const labelVP = game.i18n?.localize?.("l5r4.mechanics.rings.voidPoints") || "Void Points";
        ui.notifications?.warn(`${labelVP}: 0`);
        return;
      }

      // Deduct void point immediately for UI synchronization
      await targetActor.update({ "system.rings.void.value": curVoid - 1 }, { diff: true });

      // Apply void point bonus (+1k1) and update label
      rollMod += 1;
      keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
    }
  }

  const diceToRoll = toInt(traitRank) + rollMod;
  const diceToKeep = toInt(traitRank) + keepMod;
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
  let flavor = label;

  if (unskilled) {
    rollFormula = `${diceRoll}d10k${diceKeep}+${bonus}`;
    flavor += ` (${game.i18n.localize("l5r4.mechanics.rolls.unskilledRoll")})`;
  }

  // Execute roll and render with target number evaluation
  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render();
  let __effTN = toInt(__tnInput) + (toInt(__raisesInput) * 5);
    if (applyWoundPenalty && __effTN > 0) {
    __effTN += toInt(currentWoundPenalty);
  }
  const tnResult = (__effTN > 0) ? {
    effective: __effTN,
    raises: toInt(__raisesInput) || 0,
    outcome: ((roll.total ?? 0) >= __effTN) ? T("l5r4.mechanics.rolls.success") : T("l5r4.mechanics.rolls.failure")
  } : null;

  // Hide TN information for non-GM players on missed attack rolls (if this is used for attacks)
  let finalTnResult = tnResult;
  if (!game.user.isGM && tnResult && tnResult.outcome === T("l5r4.mechanics.rolls.failure")) {
    // Note: TraitRoll doesn't currently support rollType parameter, but we include this for consistency
    // and future-proofing in case attack rolls use trait rolls
    finalTnResult = null;
  }

  const content = await R(messageTemplate, { flavor, roll: rollHtml, tnResult: finalTnResult });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}

// ---------------------------------------------------------------------------
// WEAPON DAMAGE ROLLS
// ---------------------------------------------------------------------------

/**
 * Execute a weapon damage roll with optional modifier dialog.
 * Uses weapon-specific dice pool with Ten Dice Rule application and
 * renders results using weapon chat template.
 * 
 * **Roll Formula:** (diceRoll + rollMod)k(diceKeep + keepMod) x10 + bonus
 * 
 * **Features:**
 * - Ten Dice Rule: Automatic conversion of excess dice to bonuses
 * - Modifier Dialog: Optional roll, keep, and flat bonuses
 * - Weapon Template: Uses weapon-specific chat card template
 * - Description: Optional weapon description in chat flavor
 * 
 * @param {object} opts - Roll configuration options
 * @param {number} opts.diceRoll - Base dice to roll
 * @param {number} opts.diceKeep - Base dice to keep
 * @param {number} [opts.explodesOn=10] - Legacy parameter (always explodes on 10)
 * @param {string} opts.weaponName - Weapon name for display
 * @param {string} [opts.description] - Optional weapon description
 * @param {boolean} [opts.askForOptions=true] - Whether to show modifier dialog
 * @returns {Promise<ChatMessage|void>} Created chat message or void if cancelled
 */
export async function WeaponRoll({
  diceRoll = null,
  diceKeep = null,
  explodesOn = 10,
  weaponName = null,
  description = null,
  askForOptions = true
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.weaponCard;

  let rollMod = 0, keepMod = 0, bonus = 0;
  let label = `${game.i18n.localize("l5r4.mechanics.rolls.damageRoll")} ${weaponName}`;
  const optionsSetting = game.settings.get(SYS_ID, "showWeaponRollOptions");

  if (askForOptions !== optionsSetting) {
    const check = await GetWeaponOptions(weaponName);
    if (check?.cancelled) return;
    rollMod = toInt(check.rollMod);
    keepMod = toInt(check.keepMod);
    bonus = toInt(check.totalMod);
  }

  const conv = TenDiceRule(toInt(diceRoll) + rollMod, toInt(diceKeep) + keepMod, toInt(bonus));
  const roll = new Roll(`${conv.diceRoll}d10k${conv.diceKeep}x10+${conv.bonus}`);

  if (description) label += ` (${description})`;
  return roll.toMessage({ flavor: label, speaker: ChatMessage.getSpeaker() });
}

// ---------------------------------------------------------------------------
// NPC ROLLS
// ---------------------------------------------------------------------------

/**
 * Execute NPC rolls with simplified mechanics and optional void restrictions.
 * Supports both numeric dice pools and trait/ring-based rolls with the same
 * chat template as PC rolls but with NPC-specific void point handling.
 * 
 * **Roll Types:**
 * - Numeric Rolls: Direct dice pool specification (diceRoll/diceKeep)
 * - Trait Rolls: Trait-based with unskilled option
 * - Ring Rolls: Ring-based tests
 * 
 * **NPC Features:**
 * - Void Restrictions: Configurable void point availability
 * - Simplified Mechanics: No resource tracking for void points
 * - Unified Template: Uses same chat template as PC rolls
 * - Target Numbers: Full TN evaluation like PC rolls
 * - Targeting Support: Automatically uses target's Armor TN for attack rolls
 * 
 * @param {object} opts - Roll configuration options
 * @param {boolean} [opts.npc=true] - NPC flag for void point restrictions
 * @param {string} [opts.rollName=null] - Display name for numeric rolls
 * @param {number} [opts.diceRoll=null] - Dice to roll for numeric rolls
 * @param {number} [opts.diceKeep=null] - Dice to keep for numeric rolls
 * @param {string} [opts.traitName=null] - Trait name for trait-based rolls
 * @param {number} [opts.traitRank=null] - Trait rank for trait-based rolls
 * @param {string} [opts.ringName=null] - Ring name for ring-based rolls
 * @param {number} [opts.ringRank=null] - Ring rank for ring-based rolls
 * @param {Actor} [opts.actor=null] - Actor performing the roll (for targeting)
 * @returns {Promise<ChatMessage|void>} Created chat message or void if cancelled
 */
export async function NpcRoll({
  npc = true,
  rollName = null,
  diceRoll = null,
  diceKeep = null,
  traitName = null,
  traitRank = null,
  ringName = null,
  ringRank = null,
  woundPenalty = 0,
  rollType = null,
  actor = null,
  untrained = false,
  weaponId = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  const noVoid = !game.settings.get(SYS_ID, "allowNpcVoidPoints");

  // Check for targeting and auto-populate TN for attack rolls
  let autoTN = 0;
  let targetData = null;
  if (rollType === "attack" && actor) {
    const targetedTokens = Array.from(game.user.targets || []);
    if (targetedTokens.length === 1) {
      const targetActor = targetedTokens[0].actor;
      
      // Try multiple possible paths for Armor TN - check for actual numeric values
      const armorTN = targetActor?.system?.armorTn?.current 
        || (typeof targetActor?.system?.armorTn === 'number' ? targetActor?.system?.armorTn : null)
        || targetActor?.system?.wounds?.armorTn?.current
        || (typeof targetActor?.system?.wounds?.armorTn === 'number' ? targetActor?.system?.wounds?.armorTn : null)
        || targetActor?.system?._derived?.armorTn?.current
        || (typeof targetActor?.system?._derived?.armorTn === 'number' ? targetActor?.system?._derived?.armorTn : null)
        || targetActor?.system?.armor?.tn
        || targetActor?.system?.armor?.armorTn;
        
      if (armorTN) {
        autoTN = toInt(armorTN);
        targetData = {
          name: targetActor.name,
          armorTN: autoTN,
          single: true
        };
      }
    } else if (targetedTokens.length > 1) {
      targetData = {
        multiple: true,
        count: targetedTokens.length
      };
    }
  }

  // Use shared modifier dialog with trait flag for unskilled option
  const check = await getNpcRollOptions(String(rollName ?? ringName ?? traitName ?? ""), noVoid, Boolean(traitName));
  if (check?.cancelled) return;

  // Build display label matching PC roll format
  let label = "";
  if (traitName) {
    const traitKey = (String(traitName).toLowerCase() === "void") ? "l5r4.mechanics.rings.void" : `l5r4.mechanics.traits.${String(traitName).toLowerCase()}`;
    label = `${game.i18n.localize(traitKey)} ${game.i18n.localize("l5r4.ui.common.roll")}`;
  } else if (ringName) {
    label = `${game.i18n.localize("l5r4.mechanics.rolls.ringRoll")}: ${ringName}`;
  } else {
    label = game.i18n.format("l5r4.system.chat.rollName", { roll: String(rollName ?? "") });
  }


  let rollMod = toInt(check.rollMod);
  let keepMod = toInt(check.keepMod);
  let totalMod = toInt(check.totalMod);
  const unskilled = !!check.unskilled && !!traitName || untrained;

  // Wound penalties affect TN for attack rolls (applied later), not dice pool

  if (check.void && !noVoid) {
    // NPCs don’t track resource spending here — just mirror +1k1 like PCs and annotate.
    rollMod += 1; 
    keepMod += 1;
    label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
  }

  // Determine dice pool: numeric values take precedence over trait/ring
  let Rn, Kn, bonus;
  const hasRK = (diceRoll !== undefined && diceRoll !== null) && (diceKeep !== undefined && diceKeep !== null);
  if (hasRK && Number.isFinite(Number(diceRoll)) && Number.isFinite(Number(diceKeep))) {
    ({ diceRoll: Rn, diceKeep: Kn, bonus } = TenDiceRule(toInt(diceRoll) + rollMod, toInt(diceKeep) + keepMod, totalMod));
  } else if (traitName) {
    ({ diceRoll: Rn, diceKeep: Kn, bonus } = TenDiceRule(toInt(traitRank) + rollMod, toInt(traitRank) + keepMod, totalMod));
  } else {
    ({ diceRoll: Rn, diceKeep: Kn, bonus } = TenDiceRule(toInt(ringRank) + rollMod, toInt(ringRank) + keepMod, totalMod));
  }

  // Apply unskilled modifier (removes exploding dice)
  const formula = unskilled ? `${Rn}d10k${Kn}+${bonus}` : `${Rn}d10k${Kn}x10+${bonus}`;
  const roll = new Roll(formula);
  const rollHtml = await roll.render();

  // Calculate target number result matching PC roll format
  let baseTN = toInt(check.tn);
  
  // For attack rolls, use target's Armor TN if no TN was specified in dialog
  if (rollType === "attack" && baseTN === 0 && autoTN > 0) {
    baseTN = autoTN;
  }
  
  let effTN = baseTN + (toInt(check.raises) * 5);
  // Apply wound penalties to TN if this is an attack roll and a TN was provided
  if (rollType === "attack" && effTN > 0) {
    effTN += toInt(woundPenalty);
  }
  const tnResult = (effTN > 0)
    ? { effective: effTN, raises: toInt(check.raises) || 0, outcome: ((roll.total ?? 0) >= effTN) ? T("l5r4.mechanics.rolls.success") : T("l5r4.mechanics.rolls.failure") }
    : null;

  // Pre-localize target data strings for template
  if (targetData) {
    if (targetData.single) {
      targetData.vsText = T("l5r4.mechanics.combat.targeting.vs");
      targetData.armorTnText = T("l5r4.mechanics.wounds.armorTn");
    } else if (targetData.multiple) {
      targetData.multipleText = T("l5r4.mechanics.combat.targeting.multipleTargets");
    }
  }

  // Hide TN and enemy information for non-GM players on missed attack rolls
  let finalTargetData = targetData;
  let finalTnResult = tnResult;
  
  if (rollType === "attack" && !game.user.isGM && tnResult && tnResult.outcome === T("l5r4.mechanics.rolls.failure")) {
    // Hide target information on missed attacks for non-GM players
    finalTargetData = null;
    finalTnResult = null;
  }

  // Prepare weapon data for damage button on successful attack rolls
  let weaponData = null;
  if (rollType === "attack" && weaponId && actor && tnResult && tnResult.outcome === T("l5r4.mechanics.rolls.success")) {
    const weapon = actor.items.get(weaponId);
    if (weapon && (weapon.type === "weapon" || weapon.type === "bow")) {
      weaponData = {
        id: weaponId,
        name: weapon.name,
        damageRoll: weapon.system?.damageRoll || 0,
        damageKeep: weapon.system?.damageKeep || 0,
        actorId: actor.id
      };
    }
  }

  const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult: finalTnResult, targetData: finalTargetData, weaponData });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}

// ---------------------------------------------------------------------------
// OPTION DIALOGS (DialogV2)
// ---------------------------------------------------------------------------

async function GetSkillOptions(skillName, noVoid, rollBonus = 0, keepBonus = 0, totalBonus = 0) {
  const content = await R(CHAT_TEMPLATES.rollModifiers, { skill: true, noVoid, rollBonus, keepBonus, totalBonus });
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.system.chat.rollName", { roll: skillName }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processSkillRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

function _processSkillRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    emphasis: form.emphasis.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false,
    tn: form.tn?.value,
    raises: form.raises?.value
  };
}

async function GetTraitRollOptions(traitName) {
  const content = await R(CHAT_TEMPLATES.rollModifiers, { trait: true });
  try {
    // Localize trait label for dialog title
    const traitKey = String(traitName).toLowerCase() === "void" ? "l5r4.mechanics.rings.void" : `l5r4.mechanics.traits.${String(traitName).toLowerCase()}`;
    const traitLabel = game.i18n.localize(traitKey);
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.system.chat.traitRoll", { trait: traitLabel }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processTraitRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

function _processTraitRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    unskilled: form.unskilled.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    tn: form.tn?.value,
    raises: form.raises?.value
  };
}

/**
 * Display the Ring/Spell roll options dialog.
 * When rendered with `{ spell: true }`, the template includes spell-only options:
 * - `spellSlot` (checkbox) to spend an elemental spell slot for the current `systemRing`
 * - `voidSlot` (checkbox) to spend a Void spell slot (`system.spellSlots.void`)
 *
 * Returns a plain object with the same shape as `_processRingRollOptions` plus
 * `spellSlot` and `voidSlot` when present.
 *
 * @param {string} ringName - Localized ring name for dialog title
 * @returns {Promise<object>} Parsed form values
 */
async function GetSpellOptions(ringName) {
  const content = await R(CHAT_TEMPLATES.rollModifiers, { spell: true, ring: ringName });
  return await new Promise((resolve) => {
    new DIALOG({
      window: { title: game.i18n.format("l5r4.system.chat.ringRoll", { ring: ringName }) },
      position: { width: 460 },
      content,
      buttons: [
        {
          action: "normal",
          label: game.i18n.localize("l5r4.mechanics.rolls.ringRoll"),
          callback: (_e, b, d) => resolve(_processRingRollOptions(b.form ?? d.form, false))
        },
        {
          label: game.i18n.localize("l5r4.mechanics.rolls.spellCasting"),
          callback: (_e, b, d) => resolve(_processRingRollOptions(b.form ?? d.form, true))
        },
        { action: "cancel", label: game.i18n.localize("l5r4.ui.common.cancel") }
      ],
      submit: (result) => {
        if (result === "cancel" || result == null) resolve({ cancelled: true });
        else resolve(result);
      }
    }).render({ force: true });
  });
}

function _processSpellRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    affinity: form.affinity.checked,
    deficiency: form.deficiency.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    tn: form.tn?.value,
    raises: form.raises?.value,
    spellSlot: form.spellSlot.checked,
    voidSlot: form.voidSlot.checked,
    normalRoll: false
  };
}

/**
 * Parse Ring/Spell dialog form values into a normalized options object.
 * Always returns the base ring fields; when the dialog was rendered with
 * `{ spell: true }` the returned object also includes `spellSlot` and `voidSlot`.
 *
 * @param {HTMLFormElement} form - Dialog form element
 * @returns {{
 *  applyWoundPenalty: boolean,
 *  rollMod: number|string,
 *  keepMod: number|string,
 *  totalMod: number|string,
 *  void: boolean,
 *  tn: number|string,
 *  raises: number|string,
 *  spellSlot?: boolean,
 *  voidSlot?: boolean,
 *  normalRoll: boolean
 * }}
 */
function _processRingRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    tn: form.tn?.value,
    raises: form.raises?.value,
    // These fields exist when the dialog is rendered with { spell: true }
    spellSlot: form.spellSlot?.checked ?? false,
    voidSlot: form.voidSlot?.checked ?? false,
    normalRoll: true
  };
}

async function GetWeaponOptions(weaponName) {
  const content = await R(CHAT_TEMPLATES.rollModifiers, { weapon: true });
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.system.chat.damageRoll", { weapon: weaponName }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processWeaponRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

function _processWeaponRollOptions(form) {
  return { rollMod: form.rollMod.value, keepMod: form.keepMod.value, totalMod: form.totalMod.value };
}

async function getNpcRollOptions(rollName, noVoid, trait = false) {
  const content = await R(CHAT_TEMPLATES.rollModifiers, { npcRoll: true, noVoid, trait });
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.system.chat.rollName", { roll: rollName }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processNpcRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

function _processNpcRollOptions(form) {
  return {
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false,
    unskilled: form.unskilled?.checked ?? false,
    tn: form.tn?.value ?? 0,
    raises: form.raises?.value ?? 0
  };
}

// ---------------------------------------------------------------------------
// TEN DICE RULE + PARSER UTILITIES
// ---------------------------------------------------------------------------

/**
 * Apply the L5R4 Ten Dice Rule to convert excess dice to bonuses.
 * Implements the core L5R4 mechanic where dice pools are capped at 10k10
 * with excess dice converted to kept dice and flat bonuses.
 * 
 * **Ten Dice Rule Logic:**
 * 1. Cap rolled dice at 10, convert excess to "extras"
 * 2. Every 3 extras become +2 kept dice
 * 3. Cap kept dice at 10, convert excess pairs to "rises"
 * 4. Apply Lieutenant Exception bonus if enabled
 * 5. Convert remaining extras to flat bonuses
 * 
 * @param {number} diceRoll - Initial rolled dice count
 * @param {number} diceKeep - Initial kept dice count
 * @param {number} [bonus=0] - Base flat modifier
 * @returns {{diceRoll: number, diceKeep: number, bonus: number}} Normalized dice pool
 */
export function TenDiceRule(diceRoll, diceKeep, bonus = 0) {
  let extras = 0;
  if (diceRoll > 10) { extras = diceRoll - 10; diceRoll = 10; }

  while (extras >= 3) { diceKeep += 2; extras -= 3; }

  const addLtBonus = !!game.settings.get(SYS_ID, "LtException");
  let rises = 0;

  while (diceKeep > 10) { diceKeep -= 2; rises++; }

  if (addLtBonus && diceKeep < 10) bonus += 2;
  if (diceKeep === 10 && extras >= 0) bonus += extras * 2;

  return { diceRoll, diceKeep, bonus };
}

/**
 * Parse L5R4 roll notation strings into normalized dice pool components.
 * Supports compact roll notation with special flags and applies Ten Dice Rule.
 * 
 * **Supported Formats:**
 * - Basic: "6k3" (6 dice, keep 3)
 * - With exploding: "6k3x10" (explode on 10s)
 * - With bonus: "6k3x10+4" (flat +4 bonus)
 * - With flags: "6k3x10+4u" (unskilled), "6k3x10+4e" (emphasis)
 * 
 * **Special Flags:**
 * - "u": Unskilled roll (no exploding dice)
 * - "e": Emphasis (reroll 1s)
 * 
 * @param {string} roll - Roll notation string to parse
 * @returns {{dice_count: number, kept: number, explode_bonus: number, bonus: number, unskilled: boolean, emphasis: boolean}} Parsed roll components
 */
export function roll_parser(roll) {
  let unskilled = false;
  let emphasis = false;

  if (roll.includes("u")) { roll = roll.replace("u", ""); unskilled = true; }
  else if (roll.includes("e")) { roll = roll.replace("e", ""); emphasis = true; }

  let [dices, kept_explode_bonus] = roll.split`k`.map(parseIntIfPossible);
  let kept, explode_bonus, bonus, dice_count = dices, result;
  let keeps = kept_explode_bonus;

  if (kept_explode_bonus >= 10) {
    [kept_explode_bonus, bonus] = roll.split`+`.map(parseIntIfPossible);
    if (kept_explode_bonus >= 10) {
      [kept, explode_bonus] = kept_explode_bonus.toString().split`x`.map(parseIntIfPossible);
    } else {
      [kept, explode_bonus] = roll.split`x`.map(parseIntIfPossible);
    }
  } else {
    // split on either 'x' or '+' without requiring a regex literal
    [kept, explode_bonus, bonus] = roll.split(new RegExp('[x+]')).map(parseIntIfPossible);
  }

  if (!bonus) bonus = 0;

  const u_modifiers = { kept, rises: 0, bonus };
  const e_modifiers = { kept, rises: 0, bonus };
  const { kept: new_kept, rises } = unskilled ? unskilledModifiers(u_modifiers) : emphasisModifiers(e_modifiers);

  if (bonus < 0) {
    result = { dice_count, kept: new_kept, explode_bonus, bonus, unskilled };
  } else {
    result = TenDiceRule(dice_count, new_kept, calculate_bonus({ rises, bonus }));
    result.unskilled = unskilled;
  }

  result.explode_bonus = explode_bonus;
  result.emphasis = emphasis;
  return result;
}

function parseIntIfPossible(x) {
  const s = x?.toString();
  if (!s) return x;
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  if (digits && [...digits].every(ch => ch >= '0' && ch <= '9')) return parseInt(s, 10);
  return x;
}

function unskilledModifiers(roll) {
  const { kept } = roll;
  let { rises } = roll;
  while (rises) {
    if (rises > 2) rises -= 3;
    else if (rises > 1) rises -= 2;
    else rises--;
  }
  return { kept, rises };
}

function emphasisModifiers(roll) {
  let { kept } = roll; let { rises } = roll;
  while (rises) {
    if (rises > 2) { kept += 2; rises -= 3; }
    else if (rises > 1) { kept++; rises -= 2; }
    else break;
  }
  return { kept, rises };
}

function calculate_bonus({ rises, bonus } = roll) {
  return bonus + rises * 2;
}

/**
 * Legacy roll calculation helpers maintained for backward compatibility.
 * These functions provide alternative roll parsing logic that may be used
 * by existing templates or external integrations.
 * 
 * @deprecated Use TenDiceRule() and roll_parser() for new implementations
 */
function calculate_roll(roll) {
  let calculated_roll = roll;
  let { dices, rises: rises1 } = calculate_rises(roll);
  calculated_roll.dices = dices; calculated_roll.rises = rises1;
  let { kept, rises: rises2 } = calculate_keeps(calculated_roll);
  calculated_roll.rises = rises2; calculated_roll.kept = kept;
  calculated_roll.bonus = calculate_bonus(calculated_roll);
  return calculated_roll;
}

function calculate_rises({ dices, rises } = roll) {
  if (dices > 10) { rises = dices - 10; dices = 10; }
  return { dices, rises };
}

function calculate_keeps({ dices, kept, rises } = roll) {
  if (dices < 10) {
    if (kept > 10) kept = 10;
  } else if (kept >= 10) {
    rises += kept - 10; kept = 10;
  }
  while (kept < 10) {
    if (rises > 1) { kept++; rises -= 2; }
    else break;
  }
  return { dices, kept, rises };
}
