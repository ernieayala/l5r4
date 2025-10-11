/**
 * @fileoverview L5R4 NPC Roll - NPC Roll Execution
 * 
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
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { toInt } from "../../../utils/type-coercion.js";
import { T, R } from "../../../utils/localization.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import { evaluateTN, calculateEffectiveTN, buildTNLabel, replaceFailureWithMissed } from "../core/tn-calculator.js";
import { getNpcRollOptions } from "../dialogs/npc-dialog.js";
import { getStanceDamageBonuses, getAllAttackBonuses } from "../../stance/rolls/attack-bonuses.js";
import { resolveTargets } from "../resources/target-resolver.js";

/**
 * Execute NPC rolls with simplified mechanics and optional void restrictions.
{{ ... }}
 * @param {object} opts - Roll configuration options
 * @param {boolean} [opts.npc=true] - NPC flag for void point restrictions
 * @param {string} [opts.rollName=null] - Display name for numeric rolls
 * @param {number} [opts.diceRoll=null] - Dice to roll for numeric rolls
 * @param {number} [opts.diceKeep=null] - Dice to keep for numeric rolls
 * @param {string} [opts.traitName=null] - Trait name for trait-based rolls
 * @param {number} [opts.traitRank=null] - Trait rank for trait-based rolls
 * @param {string} [opts.ringName=null] - Ring name for ring-based rolls
 * @param {number} [opts.ringRank=null] - Ring rank for ring-based rolls
 * @param {number} [opts.woundPenalty=0] - Wound penalty for target numbers
 * @param {string} [opts.rollType=null] - Roll type ("attack" for targeting)
 * @param {Actor} [opts.actor=null] - Actor performing the roll (for targeting)
 * @param {boolean} [opts.untrained=false] - Force unskilled roll
 * @param {string} [opts.weaponId=null] - Weapon ID for damage button on success
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
  const { autoTN, targetData } = resolveTargets(actor, rollType);

  // Use shared modifier dialog with trait flag for unskilled option
  const check = await getNpcRollOptions(String(rollName ?? ringName ?? traitName ?? ""), noVoid, Boolean(traitName));
  if (check?.cancelled) return;

  // Build display label matching PC roll format
  let label = "";
  if (traitName) {
    const traitKey = (String(traitName).toLowerCase() === "void") ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${String(traitName).toLowerCase()}`;
    label = `${game.i18n.localize(traitKey)} ${game.i18n.localize("l5r4.ui.common.roll")}`;
  } else if (ringName) {
    label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.ringRoll")}: ${ringName}`;
  } else {
    label = game.i18n.format("l5r4.ui.chat.rollName", { roll: String(rollName ?? "") });
  }

  let rollMod = toInt(check.rollMod);
  let keepMod = toInt(check.keepMod);
  let totalMod = toInt(check.totalMod);
  const unskilled = !!check.unskilled && !!traitName || untrained;

  // Apply attack bonuses (stance + mounted/higher ground) for attack rolls
  if (rollType === "attack" && actor) {
    const targetActor = targetData?.actor || null;
    const attackBonuses = getAllAttackBonuses(actor, targetActor);
    
    if (attackBonuses.roll > 0 || attackBonuses.keep > 0) {
      rollMod += attackBonuses.roll;
      keepMod += attackBonuses.keep;
    }
  }

  // Wound penalties affect TN for attack rolls (applied later), not dice pool

  if (check.void && !noVoid) {
    // NPCs don't track resource spending here — just mirror +1k1 like PCs and annotate.
    rollMod += 1;
    keepMod += 1;
    label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
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

  // Build formula and execute roll
  const formula = buildFormula(Rn, Kn, bonus, { unskilled });
  const roll = new Roll(formula);
  const rollHtml = await roll.render();

  // Calculate target number result matching PC roll format
  let baseTN = toInt(check.tn);
  
  // For attack rolls, use target's Armor TN if no TN was specified in dialog
  if (rollType === "attack" && baseTN === 0 && autoTN > 0) {
    baseTN = autoTN;
  }
  
  // Apply wound penalties to TN if this is an attack roll and a TN was provided
  const effTN = calculateEffectiveTN(baseTN, toInt(check.raises), rollType === "attack" ? woundPenalty : 0, rollType === "attack" && baseTN > 0);
  let tnResult = evaluateTN(roll.total ?? 0, effTN, toInt(check.raises));

  // For failed attacks, show "Missed" instead of "Failure"
  tnResult = replaceFailureWithMissed(tnResult, rollType);

  // Prepare weapon data for damage button on successful attack rolls
  let weaponData = null;
  if (rollType === "attack" && weaponId && actor && tnResult && tnResult.outcome === T("l5r4.ui.mechanics.rolls.success")) {
    const weapon = actor.items.get(weaponId);
    if (weapon && (weapon.type === "weapon")) {
      const stanceBonuses = getStanceDamageBonuses(actor);
      weaponData = {
        id: weaponId,
        name: weapon.name,
        damageRoll: weapon.system?.damageRoll || 0,
        damageKeep: weapon.system?.damageKeep || 0,
        actorId: actor.id,
        raises: toInt(check.raises),
        stanceRoll: stanceBonuses.roll,
        stanceKeep: stanceBonuses.keep
      };
    }
  }

  const content = await R(messageTemplate, { flavor: label, roll: rollHtml, tnResult, targetData, weaponData });
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content });
}
