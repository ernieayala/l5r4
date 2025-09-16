/**
 * L5R4 dice & roll utilities (Foundry VTT v13)
 *
 * Responsibilities
 * - Build roll formulas (Xd10kY) with emphasis, wound penalties, and modifiers.
 * - Enforce the Ten Dice Rule conversion for dice/keeps/bonus.
 * - Prompt for modifiers using DialogV2 and shared dialog templates.
 * - Render chat cards via Handlebars templates.
 *
 * Dependencies
 * - Foundry VTT v13 client API: https://foundryvtt.com/api/
 * - ./config.js: CHAT_TEMPLATES with simpleRoll, rollModifiers, weaponCard
 * - ./utils.js: R (renderTemplate wrapper), toInt, T (localize helper)
 *
 * Exports
 * - SkillRoll, RingRoll, TraitRoll, WeaponRoll, NpcRoll
 * - TenDiceRule, roll_parser
 */

import { CHAT_TEMPLATES, SYS_ID } from "../config.js";
import { R, toInt, T } from "../utils.js";

const DIALOG = foundry.applications.api.DialogV2;

// ---------------------------------------------------------------------------
// SKILL ROLLS
// ---------------------------------------------------------------------------

/**
 * Roll a Skill: (Trait + Skill + rollMod)d10k(Trait + keepMod) x10 + totalMod
 * @param {Object} opts
 * @param {number} [opts.woundPenalty=0] - Subtracted from total if applyWoundPenalty is true.
 * @param {number} opts.actorTrait - Base trait dice/keep value.
 * @param {number} opts.skillRank - Skill ranks to add to rolled dice.
 * @param {string} opts.skillName - I18n key suffix for the skill (e.g., "kenjutsu").
 * @param {"str"|"ref"|"agi"|"awa"|"int"|"per"|"sta"|"wil"|"voi"|"void"} opts.skillTrait
 * @param {boolean} [opts.askForOptions=true] - If true (and setting permits), show dialog.
 * @param {boolean} [opts.npc=false] - When true, honor allowNpcVoidPoints setting.
 * @param {number} [opts.rollBonus=0] - Pre-supplied +R (rolled) modifier.
 * @param {number} [opts.keepBonus=0] - Pre-supplied +K (kept) modifier.
 * @param {number} [opts.totalBonus=0] - Pre-supplied flat bonus to total.
 * @returns {Promise<void>}
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
  actor = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  const traitI18nKey = skillTrait === "void" ? "l5r4.mechanics.rings.void" : `l5r4.mechanics.traits.${skillTrait}`;
  const optionsSetting = game.settings.get(SYS_ID, "showSkillRollOptions");
  // Prefer an i18n key if it exists; otherwise use the item’s display name
  const tryKey = typeof skillName === "string" ? `l5r4.skills.${skillName.toLowerCase()}` : "";
  const skillLabel = (tryKey && game.i18n?.has?.(tryKey)) ? game.i18n.localize(tryKey) : String(skillName ?? game.i18n.localize("l5r4.ui.common.skill"));
  let label = `${game.i18n.localize("l5r4.ui.rolls.skillRoll")}: ${skillLabel} / ${game.i18n.localize(traitI18nKey)}`;

  let emphasis = false;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let applyWoundPenalty = true;
  let __tnInput = 0, __raisesInput = 0;

  if (askForOptions !== optionsSetting) {
    /** Active Effects: fold AE defaults into dialog inputs (skill + trait). */
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
    const check = await GetSkillOptions(skillName, noVoid, rollBonus, keepBonus, totalBonus);
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
      label += ` [TN ${__effTN}${__raisesInput ? ` (${game.i18n.localize("l5r4.ui.rolls.raises")}: ${__raisesInput})` : ""}]`;
    }

    if (check.void) {
      /**
       * Spend 1 Void Point if available, otherwise warn and abort the roll.
       * Foundry API:
       * - ChatMessage.getSpeaker(): https://foundryvtt.com/api/classes/documents.ChatMessage.html#static-getSpeaker
       * - game.actors.get(id):     https://foundryvtt.com/api/classes/foundry.collections.WorldCollection.html#get
       * - Actor.update():          https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
       * - ui.notifications.warn(): https://foundryvtt.com/api/classes/client.ui.Notifications.html#warn
       * @returns {void}
       */
      const spendActor = actor
        ?? canvas?.tokens?.controlled?.[0]?.actor
        ?? game.user?.character
        ?? (ChatMessage.getSpeaker()?.actor ? game.actors?.get(ChatMessage.getSpeaker().actor) : null);

      if (!spendActor) {
        ui.notifications?.warn(T("l5r4.ui.notifications.noActorForVoid"));
        return;
      }

      const curVoid = Number(spendActor.system?.rings?.void?.value ?? 0) || 0;
      if (curVoid <= 0) {
        const labelVP = game.i18n?.localize?.("l5r4.mechanics.rings.voidPoints") || "Void Points";
        ui.notifications?.warn(`${labelVP}: 0`);
        return;
      }

      // Deduct 1 point immediately so the UI stays in sync.
      await spendActor.update({ "system.rings.void.value": curVoid - 1 }, { diff: true });

      // Apply +1k1 and annotate the label.
      rollMod += 1; keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
    }
  } else {
    rollMod = toInt(rollBonus);
    keepMod = toInt(keepBonus);
    totalMod = toInt(totalBonus);
  }

  const diceToRoll = toInt(actorTrait) + toInt(skillRank) + rollMod;
  const diceToKeep = toInt(actorTrait) + keepMod;
  const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);

  let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
  if (emphasis) {
    label += ` (${game.i18n.localize("l5r4.ui.rolls.emphasis")})`;
    rollFormula = `${diceRoll}d10r1k${diceKeep}x10+${bonus}`;
  }
  if (rollMod || keepMod || totalMod) {
    label += ` ${game.i18n.localize("l5r4.ui.rolls.mod")} (${rollMod}k${keepMod}${totalMod < 0 ? totalMod : "+" + totalMod})`;
  }

  /** @added: Render roll, then inject into our wrapper template. */
  const roll = new Roll(rollFormula);
  const rollHtml = await roll.render(); // Foundry core dice card
  /** @added: Compute and package TN outcome for the template. */
  let __effTN = toInt(__tnInput) + (toInt(__raisesInput) * 5);
  if (applyWoundPenalty && __effTN > 0) {
    __effTN += toInt(woundPenalty);
  }
  const tnResult = (__effTN > 0) ? {
    effective: __effTN,
    raises: toInt(__raisesInput) || 0,
    outcome: ((roll.total ?? 0) >= __effTN) ? T("l5r4.mechanics.rolls.success") : T("l5r4.mechanics.rolls.failure")
  } : null;
  const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}

// ---------------------------------------------------------------------------
// RING ROLLS (normal ring or spell casting path)
// ---------------------------------------------------------------------------

/**
 * Roll a Ring test or Spell casting check driven by a Ring.
 * If the options dialog chooses the Spell path, affinity/deficiency flags are applied.
 * @param {Object} opts
 * @param {number} [opts.woundPenalty=0]
 * @param {number} opts.ringRank
 * @param {string} opts.ringName - Localized label to show in chat (e.g., "Water").
 * @param {string} [opts.systemRing] - Internal key if needed by templates.
 * @param {number} [opts.schoolRank] - For shugenja calculations, if used by templates.
 * @param {boolean} [opts.askForOptions=true]
 * @param {boolean} [opts.unskilled=false]
 * @returns {Promise<void|false>}
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
  let label = `${game.i18n.localize("l5r4.ui.rolls.ringRoll")}: ${ringName}`;

  const optionsSetting = game.settings.get(SYS_ID, "showSpellRollOptions");

  let affinity = false;
  let deficiency = false;
  let normalRoll = true;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let voidRoll = false;
  let applyWoundPenalty = true;
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

    /** @added: Record TN/Raises and annotate the label. */
    __tnInput = toInt(choice.tn);
    __raisesInput = toInt(choice.raises);
    if (__tnInput || __raisesInput) {
      const __effTN = __tnInput + (__raisesInput * 5);
      label += ` [TN ${__effTN}${__raisesInput ? ` (${game.i18n.localize("l5r4.ui.rolls.raises")}: ${__raisesInput})` : ""}]`;
    }
  }

  /** Active Effects: add ring-based bonuses (system.bonuses.ring[systemRing]). */
  const bRing = actor?.system?.bonuses?.ring?.[String(systemRing).toLowerCase?.()] || {};
  rollMod  += toInt(bRing.roll);
  keepMod  += toInt(bRing.keep);
  totalMod += toInt(bRing.total);

  if (voidRoll) {
    /** Active Effects: add ring-based bonuses (system.bonuses.ring[systemRing]). */
    const bRing = actor?.system?.bonuses?.ring?.[String(systemRing).toLowerCase?.()] || {};
    rollMod  += toInt(bRing.roll);
    keepMod  += toInt(bRing.keep);
    totalMod += toInt(bRing.total);

    /**
     * Spend 1 Void Point if available, otherwise warn and abort the roll.
     * Foundry API:
     * - ChatMessage.getSpeaker(): https://foundryvtt.com/api/classes/documents.ChatMessage.html#static-getSpeaker
     * - game.actors.get(id):     https://foundryvtt.com/api/classes/foundry.collections.WorldCollection.html#get
     * - Actor.update():          https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
     * - ui.notifications.warn(): https://foundryvtt.com/api/classes/client.ui.Notifications.html#warn
     * @returns {void}
     */
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

    // Deduct 1 point immediately so the UI stays in sync.
    await spendActor.update({ "system.rings.void.value": curVoid - 1 }, { diff: true });

    // Apply +1k1 and annotate the label.
    rollMod += 1; keepMod += 1;
    label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
  }

  if (normalRoll) {
    const diceToRoll = toInt(ringRank) + rollMod;
    const diceToKeep = toInt(ringRank) + keepMod;
    const { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
    /** @added: Render via wrapper template with TN result. */
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
    const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult });
    return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
  }

  // If the spell path were extended to custom logic, place it here.
  // Currently, the dialog returns modifiers which are already used above.
  return false;
}

// ---------------------------------------------------------------------------
// TRAIT ROLLS
// ---------------------------------------------------------------------------

/**
 * Roll a Trait test: (Trait + R)d10k(Trait + K) x10 + bonus
 * If the user selects "Void" in the dialog, this will only roll when the actor
 * has at least 1 Void Point remaining and will automatically deduct 1 point.
 * @param {Object} opts
 * @param {number} [opts.woundPenalty=0]
 * @param {number} [opts.traitRank=null]
 * @param {string} [opts.traitName=null] - short key: "ref","awa","agi","int","per","sta","wil","str","void"
 * @param {boolean} [opts.askForOptions=true]
 * @param {boolean} [opts.unskilled=false]
 * @param {Actor|null} [opts.actor=null] - Actor whose Void Points are spent; if null, defaults to ChatMessage speaker or game.user.character
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

  // Resolve the actor to get wound penalty from.
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
      label += ` [TN ${__effTN}${__raisesInput ? ` (${game.i18n.localize("l5r4.ui.rolls.raises")}: ${__raisesInput})` : ""}]`;
    }

    /** Active Effects: add trait-based bonuses (system.bonuses.trait[traitName]). */
    const bTrait = targetActor?.system?.bonuses?.trait?.[String(traitName).toLowerCase?.()] || {};
    rollMod  += toInt(bTrait.roll);
    keepMod  += toInt(bTrait.keep);
    totalMod += toInt(bTrait.total);

    if (check.void) {
      /** Active Effects: add trait-based bonuses (system.bonuses.trait[traitName]). */
      const bTrait = targetActor?.system?.bonuses?.trait?.[String(traitName).toLowerCase?.()] || {};
      rollMod  += toInt(bTrait.roll);
      keepMod  += toInt(bTrait.keep);
      totalMod += toInt(bTrait.total);

      // If we can't resolve an actor, be conservative and block the Void spend.
      if (!targetActor) {
        ui.notifications?.warn(T("l5r4.ui.notifications.noActorForVoid"));
        return;
      }

      const curVoid = Number(targetActor.system?.rings?.void?.value ?? 0) || 0;
      if (curVoid <= 0) {
        // Warn and do not roll.
        const labelVP = game.i18n?.localize?.("l5r4.mechanics.rings.voidPoints") || "Void Points";
        ui.notifications?.warn(`${labelVP}: 0`);
        return;
      }

      // Deduct 1 point immediately so the UI stays in sync.
      await targetActor.update({ "system.rings.void.value": curVoid - 1 }, { diff: true });

      // Apply +1k1 to the roll label and math.
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
    flavor += ` (${game.i18n.localize("l5r4.ui.rolls.unskilledRoll")})`;
  }

  /** @added: Render via wrapper template with TN result. */
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
  const content = await R(messageTemplate, { flavor, roll: rollHtml, tnResult });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}

// ---------------------------------------------------------------------------
// WEAPON DAMAGE ROLLS
// ---------------------------------------------------------------------------

/**
 * Weapon damage roll: (R)d10k(K) x10 + bonus, with dialog modifiers.
 * @param {Object} opts
 * @param {number} opts.diceRoll
 * @param {number} opts.diceKeep
 * @param {number} [opts.explodesOn=10] - Kept for compatibility; always x10.
 * @param {string} opts.weaponName
 * @param {string} [opts.description]
 * @param {boolean} [opts.askForOptions=true]
 * @returns {Promise<void>}
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
 * NPC numeric/simple rolls. Uses the same chat wrapper as PC rolls.
 * Supports optional trait/ring inputs, but sheet ring/trait buttons now call the PC functions directly.
 * @param {Object} opts
 * @param {string|null} opts.rollName - Display name for simple/attack rolls.
 * @param {number|null} opts.diceRoll - Numeric R (for simple/attack).
 * @param {number|null} opts.diceKeep - Numeric K (for simple/attack).
 * @param {string|null} opts.traitName
 * @param {number|null} opts.traitRank
 * @param {string|null} opts.ringName
 * @param {number|null} opts.ringRank
 */
export async function NpcRoll({
  npc = true,
  rollName = null,
  diceRoll = null,
  diceKeep = null,
  traitName = null,
  traitRank = null,
  ringName = null,
  ringRank = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;
  const noVoid = !game.settings.get(SYS_ID, "allowNpcVoidPoints");

  // Dialog uses the same modifier partial; we pass 'trait' to show Unskilled when appropriate.
  const check = await getNpcRollOptions(String(rollName ?? ringName ?? traitName ?? ""), noVoid, Boolean(traitName));
  if (check?.cancelled) return;

  // Build label to mirror PC wording.
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
  const unskilled = !!check.unskilled && !!traitName;

  if (check.void && !noVoid) {
    // NPCs don’t track resource spending here — just mirror +1k1 like PCs and annotate.
    rollMod += 1; keepMod += 1;
    label += ` ${game.i18n.localize("l5r4.mechanics.rings.void")}!`;
  }

  // Compute dice pool: prefer numeric R/K for simple/attack; else trait/ring.
  let Rn, Kn, bonus;
  const hasRK = (diceRoll !== undefined && diceRoll !== null) && (diceKeep !== undefined && diceKeep !== null);
  if (hasRK && Number.isFinite(Number(diceRoll)) && Number.isFinite(Number(diceKeep))) {
    ({ diceRoll: Rn, diceKeep: Kn, bonus } = TenDiceRule(toInt(diceRoll) + rollMod, toInt(diceKeep) + keepMod, totalMod));
  } else if (traitName) {
    ({ diceRoll: Rn, diceKeep: Kn, bonus } = TenDiceRule(toInt(traitRank) + rollMod, toInt(traitRank) + keepMod, totalMod));
  } else {
    ({ diceRoll: Rn, diceKeep: Kn, bonus } = TenDiceRule(toInt(ringRank) + rollMod, toInt(ringRank) + keepMod, totalMod));
  }

  // Unskilled trait rolls do not explode.
  const formula = unskilled ? `${Rn}d10k${Kn}+${bonus}` : `${Rn}d10k${Kn}x10+${bonus}`;
  const roll = new Roll(formula);
  const rollHtml = await roll.render();

  // Show TN/Raises result like PCs if provided.
  const effTN = toInt(check.tn) + (toInt(check.raises) * 5);
  const tnResult = (effTN > 0)
    ? { effective: effTN, raises: toInt(check.raises) || 0, outcome: ((roll.total ?? 0) >= effTN) ? T("l5r4.mechanics.rolls.success") : T("l5r4.mechanics.rolls.failure") }
    : null;

  const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}

// ---------------------------------------------------------------------------
// OPTION DIALOGS (DialogV2)
// ---------------------------------------------------------------------------

async function GetSkillOptions(skillName, noVoid, rollBonus = 0, keepBonus = 0, totalBonus = 0) {
  const content = await R(CHAT_TEMPLATES.rollModifiers, { skill: true, noVoid, rollBonus, keepBonus, totalBonus });
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.system.chat.skillRoll", { skill: skillName }) },
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
    /** Localize trait label for dialog title. */
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

function _processRingRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    tn: form.tn?.value,
    raises: form.raises?.value,
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
 * Convert excess rolled and kept dice per L5R Ten Dice Rule and house rules.
 * @param {number} diceRoll - Rolled dice (R)
 * @param {number} diceKeep - Kept dice (K)
 * @param {number} [bonus=0] - Flat modifier to total
 * @returns {{diceRoll:number,diceKeep:number,bonus:number}}
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
 * Parse a compact roll string like "6k3x10+4", with optional flags:
 *  - "u" for unskilled, "e" for emphasis
 * Returns normalized roll parts after applying Ten Dice Rule.
 * @param {string} roll
 * @returns {{dice_count:number, kept:number, explode_bonus:number, bonus:number, unskilled:boolean, emphasis:boolean}}
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

// Legacy helpers kept for parity with existing parser utilities
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
