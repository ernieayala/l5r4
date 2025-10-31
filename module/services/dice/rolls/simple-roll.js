/**
 * Simple Roll Service
 *
 * General-purpose roll handler for both PCs and NPCs using pre-calculated dice pools.
 * Handles trait rolls, ring rolls, weapon attacks, and damage rolls with L5R4 mechanics
 * including the Ten Dice Rule, unskilled rolls, Void point spending, raises, and wound penalties.
 *
 * **Usage Context:**
 * This function is used when dice pools are pre-calculated (XkY format) rather than
 * needing skill emphasis or other PC-specific mechanics. It serves both PC weapon attacks
 * (after skill resolution) and NPC rolls (which use simpler mechanics).
 *
 * Roll Types Supported:
 * - Trait Rolls: XkX where X = trait rank (resisting, lifting, raw ability checks)
 * - Ring Rolls: XkX where X = ring rank (magical/supernatural effects)
 * - Attack Rolls: Pre-calculated (Skill + Trait)k(Trait) with wound penalties and stance bonuses
 * - Damage Rolls: Pre-calculated weapon damage with stance bonuses
 *
 * Game Mechanics Implemented:
 * - Ten Dice Rule: Caps rolls at 10k10, converting excess to flat bonuses
 * - Unskilled Rolls: Dice never explode, no raise benefits (trait-only)
 * - Void Point Spending: Adds +1k1 to any roll (declared before rolling)
 * - Raises: Voluntary TN increase (+5 per raise, max = Void Ring)
 * - Wound Penalties: Applied to attack rolls based on current health
 * - Attack Bonuses: Stance and mounted combat modifiers (Full Attack: +2k1)
 * - Damage Roll Integration: Auto-generates weapon damage buttons for successful attacks
 *
 * Architecture:
 * - Opens roll options dialog for user input (modifiers, Void, raises, TN)
 * - Applies Ten Dice Rule to calculated dice pools
 * - Constructs Foundry Roll with formula including unskilled flag
 * - Evaluates roll against TN with raise consideration
 * - Generates chat message with roll results and optional weapon damage buttons
 *
 * Foundry VTT Requirements:
 * - Requires Foundry v13+ for Roll API and ChatMessage.toMessage()
 * - Uses Actor.items collection for weapon lookups
 * - Leverages game.settings for NPC Void point availability
 * - Integrates with stance effects system for attack/damage bonuses
 *
 * @module services/dice/rolls/simple-roll
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { toInt } from "../../../utils/type-coercion.js";
import { T, R } from "../../../utils/localization.js";
import { TenDiceRule } from "../core/ten-dice-rule.js";
import { buildFormula } from "../core/formula-builder.js";
import {
  evaluateTN,
  calculateEffectiveTN,
  replaceFailureWithMissed
} from "../core/tn-calculator.js";
import { getNpcRollOptions } from "../dialogs/npc-dialog.js";
import { getStanceDamageBonuses, getAllAttackBonuses } from "../../stance/rolls/attack-bonuses.js";
import { resolveTargets } from "../resources/target-resolver.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import {
  getConditionRollPenalties,
  getConditionTNPenalty
} from "../../../utils/condition-penalties.js";
import { getArmorTNPenalty } from "../../../utils/armor-penalties.js";

/**
 * Parameters for constructing a simple roll
 * @typedef {Object} SimpleRollParams
 * @property {boolean} [npc=true] - True if actor is NPC (affects Void availability)
 * @property {string|null} [rollName=null] - Display name for custom rolls
 * @property {number|null} [diceRoll=null] - Explicit rolled dice count (overrides trait/ring)
 * @property {number|null} [diceKeep=null] - Explicit kept dice count (overrides trait/ring)
 * @property {string|null} [traitName=null] - Trait name for trait rolls (e.g., "Reflexes", "Stamina")
 * @property {number|null} [traitRank=null] - Trait rank value for XkX rolls
 * @property {string|null} [ringName=null] - Ring name for ring rolls (e.g., "Earth", "Fire")
 * @property {number|null} [ringRank=null] - Ring rank value for XkX rolls
 * @property {number} [woundPenalty=0] - Current wound penalty TN modifier (e.g., +10 for Hurt)
 * @property {number} [modifier=0] - Flat bonus/penalty to roll total (for NPC attacks/damage)
 * @property {string|null} [rollType=null] - Type of roll: "attack" or null for general rolls
 * @property {L5R4Actor|null} [actor=null] - Actor making the roll (required for attack bonuses/weapons)
 * @property {boolean} [untrained=false] - Force unskilled roll (no explosions, no raises)
 * @property {string|null} [weaponId=null] - Item ID of weapon for attack roll damage integration
 * @property {boolean} [isBow=false] - True if weapon is a bow (pre-checks ranged attack in dialog)
 */

/**
 * Result structure from TN evaluation
 * @typedef {Object} TNResult
 * @property {string} outcome - Localized outcome string ("Success", "Failure", "Missed")
 * @property {number} effectiveTN - Final TN including raises and wound penalties
 * @property {number} total - Roll total result
 */

/**
 * Executes a simple roll (XkY) with full L5R4 mechanics support.
 *
 * Prompts user for roll modifiers via dialog, applies Ten Dice Rule, constructs
 * and evaluates roll against target number, and posts results to chat. For successful
 * attack rolls, automatically generates weapon damage roll buttons in chat message.
 *
 * **Used By:**
 * - PC weapon attacks (after skill resolution in RollHandler)
 * - NPC trait rolls, ring rolls, attacks, and damage
 * - Any pre-calculated XkY roll that doesn't need skill emphasis mechanics
 *
 * Roll Construction Priority:
 * 1. If diceRoll and diceKeep provided: Use explicit values (custom rolls)
 * 2. Else if traitName provided: Use traitRank for both rolled and kept dice (Trait Roll)
 * 3. Else: Use ringRank for both rolled and kept dice (Ring Roll)
 *
 * Modifier Application Order:
 * 1. User dialog modifiers (rollMod, keepMod, totalMod)
 * 2. Attack bonuses (if rollType === "attack"): Stance bonuses, mounted combat
 * 3. Void point spending (if enabled): +1k1 to roll
 * 4. Ten Dice Rule conversions: Caps at 10k10, converts excess to bonuses
 * 5. Unskilled penalty: Disables exploding dice if flagged
 *
 * Attack Roll Specifics:
 * - Applies wound penalties to effective TN calculation (not damage rolls)
 * - Integrates stance attack bonuses (+2k1 for Full Attack stance)
 * - Auto-resolves target's Armor TN if single target selected
 * - Generates weapon damage button for successful hits with weaponId provided
 * - Includes stance damage bonuses in weapon data payload
 * - Replaces "Failure" outcome with "Missed" for attack semantics
 *
 * Unskilled Roll Rules:
 * - Triggered by untrained=true OR user checking "Unskilled" in dialog (for trait rolls only)
 * - Dice never explode on 10s (buildFormula receives unskilled flag)
 * - Cannot benefit from raises (per core rules page 80)
 * - Represents trait-only roll without skill training
 *
 * Void Point Mechanics:
 * - NPCs respect world setting "allowNpcVoidPoints" (disabled by default)
 * - PCs always have access to Void checkbox (if they have Void points)
 * - Void spending adds +1 rolled die AND +1 kept die to roll
 * - Declared before rolling via dialog checkbox
 * - Appends "Void!" to roll label for chat visibility
 * - Deducts 1 Void point from actor's pool
 *
 * Raise System:
 * - Each raise increases effective TN by +5
 * - Maximum raises = Void Ring (enforced by dialog validation)
 * - Roll must meet raised TN or fails even if base TN exceeded
 * - Used for combat maneuvers, spell effects, extra targets, etc.
 *
 * Ten Dice Rule Application:
 * - Prevents unwieldy high-level dice pools (per core rulebook)
 * - Caps rolled dice at 10, kept dice at 10
 * - Excess rolled dice convert to kept at 2:1 ratio
 * - Excess kept dice convert to +2 flat bonus per die
 * - Example: 12k4 → 10k5, 13k9 → 10k10+2, 14k12 → 10k10+12
 *
 * Chat Message Output:
 * - Uses simpleRoll template (flavor, rollHtml, tnResult, targetData, weaponData)
 * - Shows roll formula, total, TN success/failure, target info
 * - Includes clickable weapon damage button for successful attacks
 * - Displays stance bonuses applied to attack/damage
 *
 * @async
 * @param {SimpleRollParams} params - Destructured parameters object
 * @returns {Promise<ChatMessage|undefined>} Created chat message, or undefined if cancelled
 */
export async function SimpleRoll({
  npc = true,
  rollName = null,
  diceRoll = null,
  diceKeep = null,
  traitName = null,
  traitRank = null,
  ringName = null,
  ringRank = null,
  woundPenalty = 0,
  modifier = 0,
  rollType = null,
  actor = null,
  untrained = false,
  weaponId = null,
  isBow = false,
  skillName = null,
  skillTrait = null
} = {}) {
  const messageTemplate = CHAT_TEMPLATES.simpleRoll;

  // Determine if actor is actually an NPC by checking actor.type
  // If actor exists, use actor.type; otherwise fall back to npc parameter
  const isActuallyNpc = actor ? actor.type === "npc" : npc;

  // Only hide Void checkbox for actual NPCs when setting is disabled
  // PCs always have access to Void checkbox (assuming they have Void points)
  const noVoid = isActuallyNpc && !game.settings.get(SYS_ID, "allowNpcVoidPoints");

  const { autoTN, targetData } = resolveTargets(actor, rollType);

  const check = await getNpcRollOptions(
    String(rollName ?? ringName ?? traitName ?? ""),
    noVoid,
    Boolean(traitName),
    rollType === "attack", // isAttack - show ranged checkbox for attacks
    isBow // isBow - pre-check ranged if weapon is a bow
  );
  if (check?.cancelled) {
    return;
  }

  let label = "";
  if (traitName) {
    const traitKey =
      String(traitName).toLowerCase() === "void"
        ? "l5r4.ui.mechanics.rings.void"
        : `l5r4.ui.mechanics.traits.${String(traitName).toLowerCase()}`;
    label = `${game.i18n.localize(traitKey)} ${game.i18n.localize("l5r4.ui.common.roll")}`;
  } else if (ringName) {
    label = `${game.i18n.localize("l5r4.ui.mechanics.rolls.ringRoll")}: ${ringName}`;
  } else {
    label = `${game.i18n.localize("l5r4.ui.common.roll")}: ${String(rollName ?? "")}`;
  }

  let rollMod = toInt(check.rollMod);
  let keepMod = toInt(check.keepMod);
  let totalMod = toInt(check.totalMod) + toInt(modifier);

  // Unskilled roll triggered by: (1) user dialog checkbox AND trait roll, OR (2) explicit untrained param
  // Trait rolls can be unskilled if character lacks training; ring/custom rolls cannot be unskilled
  const unskilled = (!!check.unskilled && !!traitName) || untrained;

  if (rollType === "attack" && actor) {
    const targetActor = targetData?.actor || null;
    const attackBonuses = getAllAttackBonuses(actor, targetActor);

    if (attackBonuses.roll > 0 || attackBonuses.keep > 0) {
      rollMod += attackBonuses.roll;
      keepMod += attackBonuses.keep;
    }

    // Apply condition penalties (blinded, dazed, prone, etc.)
    // Use isRanged from dialog checkbox (user decides ranged vs melee per attack)
    const attackType = check.isRanged ? "ranged" : "melee";
    const conditionPenalties = getConditionRollPenalties(actor, "attack", attackType);
    rollMod += conditionPenalties.roll; // Will be negative if conditions active
    keepMod += conditionPenalties.keep;
  }

  // Handle Void point spending if user checked the Void checkbox
  // Void grants +1k1 bonus per L5R4 core rules and decrements actor's Void pool
  if (check.void && !noVoid) {
    const voidResult = await spendVoidPoint(actor);
    if (!voidResult || !voidResult.success) {
      ui.notifications?.warn(voidResult?.message ?? "Void point spending failed");
      return;
    }

    rollMod += voidResult.rollBonus ?? 0;
    keepMod += voidResult.keepBonus ?? 0;
    label += ` ${game.i18n.localize("l5r4.ui.mechanics.rings.void")}!`;
  }

  // Determine final TN early
  // For attack rolls, autoTN from target may override user's TN input
  const userTN = toInt(check.tn);
  let finalTN = userTN;
  if (rollType === "attack" && finalTN === 0 && autoTN > 0) {
    finalTN = autoTN;
  }

  // Apply wound penalty to roll total (ALWAYS subtract from roll, never add to TN)
  // Wound penalties reduce the character's effectiveness by subtracting from their roll result
  const applyWoundPenalty = check.woundPenalty ?? true;
  if (applyWoundPenalty && woundPenalty > 0) {
    totalMod -= woundPenalty;
  }

  // Determine dice pool source: explicit diceRoll/diceKeep > traitRank > ringRank
  // Explicit values for custom rolls, trait for Trait Rolls, ring for Ring Rolls
  let Rn, Kn, bonus;
  const hasRK =
    diceRoll !== undefined && diceRoll !== null && diceKeep !== undefined && diceKeep !== null;
  if (hasRK && Number.isFinite(Number(diceRoll)) && Number.isFinite(Number(diceKeep))) {
    ({
      diceRoll: Rn,
      diceKeep: Kn,
      bonus
    } = TenDiceRule(toInt(diceRoll) + rollMod, toInt(diceKeep) + keepMod, totalMod));
  } else if (traitName) {
    ({
      diceRoll: Rn,
      diceKeep: Kn,
      bonus
    } = TenDiceRule(toInt(traitRank) + rollMod, toInt(traitRank) + keepMod, totalMod));
  } else {
    ({
      diceRoll: Rn,
      diceKeep: Kn,
      bonus
    } = TenDiceRule(toInt(ringRank) + rollMod, toInt(ringRank) + keepMod, totalMod));
  }

  const formula = buildFormula(Rn, Kn, bonus, { unskilled });
  const roll = new Roll(formula);
  const rollHtml = await roll.render();

  // Use finalTN calculated earlier (already includes autoTN resolution for attack rolls)
  const baseTN = finalTN;

  // Calculate effective TN: baseTN + (raises × 5) + condition penalty + armor penalty (if applicable)
  // Only apply condition and armor TN penalties when there's an actual target (baseTN > 0)
  let effTN = calculateEffectiveTN(
    baseTN,
    toInt(check.raises),
    0,
    0, // Never apply wound penalty to TN
    false // Wound penalty flag no longer used for TN calculation
  );
  if (baseTN > 0) {
    const conditionTNPenalty = actor ? getConditionTNPenalty(actor) : 0;
    const armorTNPenalty = actor ? getArmorTNPenalty(actor, skillName, skillTrait) : 0;
    effTN += conditionTNPenalty; // Add condition TN penalties (Fatigued, etc.)
    effTN += armorTNPenalty; // Add armor TN penalties (Light/Heavy/Riding armor)
  }
  effTN = Math.max(0, effTN); // TN cannot be negative
  let tnResult = evaluateTN(roll.total ?? 0, effTN, toInt(check.raises));

  tnResult = replaceFailureWithMissed(tnResult, rollType);

  // For successful attack rolls, prepare weapon damage data for chat button
  // Includes stance bonuses from Full Attack (+1k0) and mounted combat bonuses
  let weaponData = null;
  if (
    rollType === "attack" &&
    weaponId &&
    actor &&
    tnResult &&
    tnResult.outcome === T("l5r4.ui.mechanics.rolls.success")
  ) {
    const weapon = actor.items.get(weaponId);
    if (weapon && weapon.type === "weapon") {
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

  const content = await R(messageTemplate, {
    flavor: label,
    roll: rollHtml,
    tnResult,
    targetData,
    weaponData
  });

  // Store attack raises and target in message flags to prevent HTML injection exploits
  // Validates raises when damage button is clicked to ensure they match original roll
  // Target actor ID is stored for animation system to use correct target across all clients
  const flags = weaponData
    ? {
        "l5r4-enhanced": {
          attackRaises: toInt(check.raises),
          weaponId: weaponData.id,
          targetActorId: targetData?.actor?.id || null
        }
      }
    : {};

  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content, flags });
}
