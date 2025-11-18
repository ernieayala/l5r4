/**
 * @module stance-effects
 * @description Applies L5R4 combat stance effects to actor system data.
 *
 * L5R4 Stance System:
 * - Characters can adopt combat stances that modify their capabilities
 * - Full Attack: +2k1 attack, +1k1 damage, -10 Armor TN (aggressive)
 * - Defense: +[Air Ring + Defense Skill] Armor TN (cautious)
 * - Full Defense: +[Defense Roll ÷ 2] Armor TN (total defense)
 *
 * Architecture:
 * - Reads active stances from actor flags
 * - Applies cumulative stance modifiers to armor TN
 * - Stores stance effect details in sys._stanceEffects for UI display
 * - Full Defense uses persistent roll stored in actor flags
 *
 * Foundry Integration:
 * - Called during actor data preparation
 * - Uses actor.getFlag() for Full Defense roll persistence
 * - Modifies sys.armorTn and sys._stanceEffects in place
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import { T } from "../../../utils/localization.js";
import { getActiveStances, getDefenseSkillRank } from "../../../services/stance/core/helpers.js";

/**
 * Applies all active stance effects to actor's system data.
 *
 * @param {Actor} actor - The actor with active stances
 * @param {Object} sys - Actor's system data object to modify
 *
 * @description
 * Main entry point for stance effect processing:
 * 1. Retrieves active stances from actor flags
 * 2. Initializes stance tracking structures
 * 3. Applies each active stance's mechanical effects
 * 4. Applies cumulative armor TN modifier
 *
 * Stances can stack (e.g., multiple stance effects can apply),
 * though typically only one stance is active at a time.
 *
 * Modifies sys with:
 * - armorTn.stanceMod: Cumulative armor TN modifier from stances
 * - armorTn.current: Updated with stance modifier
 * - _stanceEffects: Object containing active stance details for UI
 *
 * @example
 * // Actor in Full Attack stance
 * applyStanceEffects(actor, actor.system);
 * // actor.system.armorTn.stanceMod = -10
 * // actor.system._stanceEffects.fullAttack = { armorTnPenalty: -10, ... }
 */
export function applyStanceEffects(actor, sys) {
  if (!actor || !sys) {
    return;
  }

  try {
    const activeStances = getActiveStances(actor);

    // Initialize stance tracking structures
    sys.armorTn = sys.armorTn || {};
    sys.armorTn.stanceMod = 0;
    sys._stanceEffects = {};

    // Apply each active stance's effects
    for (const stanceId of activeStances) {
      switch (stanceId) {
        case "fullAttackStance":
          applyFullAttackStance(sys);
          break;
        case "defenseStance":
          applyDefenseStance(actor, sys);
          break;
        case "fullDefenseStance":
          applyFullDefenseStance(actor, sys);
          break;
      }
    }

    // Apply cumulative stance modifier to armor TN
    if (sys.armorTn.stanceMod !== 0) {
      sys.armorTn.current = (sys.armorTn.current || 0) + sys.armorTn.stanceMod;
    }
  } catch (err) {
    logError("Failed to apply stance effects", err, {
      actorId: actor?.id,
      actorName: actor?.name
    });

    // Provide safe fallback - no stance effects
    sys.armorTn = sys.armorTn || {};
    sys.armorTn.stanceMod = 0;
    sys._stanceEffects = {};
  }
}

/**
 * Applies Full Attack stance effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Full Attack stance represents an aggressive, all-out attack:
 * - Armor TN: -10 penalty (leaving defenses open)
 * - Attack rolls: +2k1 bonus (more aggressive strikes)
 * - Damage rolls: +1k1 bonus (putting more force behind attacks)
 *
 * This stance is high-risk, high-reward: significant offensive boost
 * at the cost of being much easier to hit.
 *
 * Attack/damage bonuses are applied during item enrichment,
 * not here. This function only tracks the effects for reference.
 */
function applyFullAttackStance(sys) {
  // Severe armor TN penalty - character is exposed while attacking
  sys.armorTn.stanceMod += -10;

  // Store stance details for UI display and reference
  sys._stanceEffects.fullAttack = {
    armorTnPenalty: -10,
    attackBonus: "+2k1", // Applied in item enrichment
    damageBonus: "+1k1" // Future implementation
  };
}

/**
 * Applies Defense stance effects per L5R4 rules.
 *
 * @param {Actor} actor - The actor in Defense stance
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Defense stance represents a cautious, defensive posture:
 * - Armor TN: +[Air Ring + Defense Skill Rank] bonus
 * - No attack or damage modifiers
 *
 * Defense Skill Priority:
 * 1. Defense skill (if character has it)
 * 2. Reflexes trait (fallback)
 *
 * This stance provides a moderate defensive boost based on the
 * character's agility and defensive training.
 */
function applyDefenseStance(actor, sys) {
  const airRing = toInt(sys.rings?.air || 0);
  const defenseSkillRank = getDefenseSkillRank(actor);

  // Calculate defense bonus: Air Ring + Defense Skill
  const defenseBonus = airRing + defenseSkillRank;

  sys.armorTn.stanceMod += defenseBonus;

  // Store components for UI display
  sys._stanceEffects.defense = {
    armorTnBonus: defenseBonus,
    airRing: airRing,
    defenseSkill: defenseSkillRank
  };
}

/**
 * Applies Full Defense stance effects per L5R4 rules.
 *
 * @param {Actor} actor - The actor in Full Defense stance
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Full Defense stance represents total commitment to defense:
 * - Character makes a Defense/Reflexes roll
 * - Armor TN: +[Roll Result ÷ 2, rounded up] bonus
 * - Cannot attack while in Full Defense
 *
 * Roll Persistence:
 * - Roll result stored in actor flag for the round
 * - If no roll exists, applies default +5 bonus
 * - Player must make Defense roll to get full benefit
 *
 * This stance provides the strongest defensive option but
 * prevents offensive actions.
 *
 * @example
 * // Defense roll of 24
 * // Armor TN bonus: Math.ceil(24 / 2) = 12
 */
function applyFullDefenseStance(actor, sys) {
  // Check for existing Defense roll stored in actor flags
  const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");

  if (!existingRoll) {
    // No roll yet - apply default bonus until player rolls
    const defaultBonus = 5;
    sys.armorTn.stanceMod += defaultBonus;

    sys._stanceEffects.fullDefense = {
      rollResult: T("l5r4.ui.label.pending"),
      armorTnBonus: defaultBonus,
      needsRoll: true // Flag for UI to prompt roll
    };
  } else {
    // Roll exists - calculate bonus from roll result
    const rollResult = toInt(existingRoll.total || 0);

    // L5R4 rule: Armor TN bonus = roll result ÷ 2, rounded up
    const armorBonus = Math.ceil(rollResult / 2);

    sys.armorTn.stanceMod += armorBonus;

    sys._stanceEffects.fullDefense = {
      rollResult: rollResult,
      armorTnBonus: armorBonus
    };
  }
}
