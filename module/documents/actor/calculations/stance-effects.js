/**
 * @fileoverview L5R4 Stance Effects - Pure Stance Calculation Logic
 * 
 * Pure calculation functions for applying stance mechanical effects during actor
 * data preparation. Extracted from services layer to maintain proper architectural
 * separation - documents should compute derived data independently.
 * 
 * **Core Responsibilities:**
 * - **Stat Calculation**: Apply stance bonuses/penalties to derived statistics
 * - **Armor TN Modification**: Calculate Armor TN adjustments from active stances
 * - **UI Data Preparation**: Prepare stance effect data for template display
 * 
 * **L5R4 Stance Mechanics:**
 * - **Full Attack**: -10 to Armor TN (attack bonus handled separately)
 * - **Defense**: +Air Ring +Defense Skill to Armor TN
 * - **Full Defense**: +half of Defense/Reflexes roll to Armor TN
 * 
 * **Design Principles:**
 * - Pure functions with no side effects
 * - No Active Effect lifecycle management (that stays in services)
 * - No async operations (flag clearing handled by services)
 * - All logic operates on actor document and system data only
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link ../actor.js|Actor Document} - Calls applyStanceEffects during prepareDerivedData
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";

/* -------------------------------------------- */
/* Helper Functions                             */
/* -------------------------------------------- */

/**
 * Set of all recognized stance status IDs in the L5R4 system.
 * Used for filtering and validation of stance effects.
 * 
 * @type {Set<string>}
 * @constant
 */
const STANCE_IDS = new Set([
  "attackStance",
  "fullAttackStance", 
  "defenseStance",
  "fullDefenseStance",
  "centerStance"
]);

/**
 * Get all active stance status effects on an actor.
 * Checks both modern statuses Set (v11+) and legacy statusId flag for compatibility.
 * 
 * @param {Actor} actor - The actor to check for active stances
 * @returns {string[]} Array of active stance IDs
 */
function getActiveStances(actor) {
  const activeStances = [];
  
  for (const effect of actor.effects) {
    if (effect.disabled) continue;
    
    // Check modern statuses Set (v11+)
    if (effect.statuses?.size) {
      for (const statusId of effect.statuses) {
        if (STANCE_IDS.has(statusId)) {
          activeStances.push(statusId);
        }
      }
    }
    
    // Check legacy statusId flag (pre-v11 compatibility)
    const legacyId = effect.getFlag?.("core", "statusId");
    if (legacyId && STANCE_IDS.has(legacyId)) {
      activeStances.push(legacyId);
    }
  }
  
  return activeStances;
}

/**
 * Find the Defense skill rank for an actor.
 * Handles case-insensitive partial matching to support localized skill names.
 * 
 * @param {Actor} actor - The actor to search
 * @returns {number} Defense skill rank (0 if not found)
 */
function getDefenseSkillRank(actor) {
  for (const item of actor.items) {
    if (item.type === "skill" && item.name?.toLowerCase().includes("defense")) {
      return toInt(item.system?.rank || 0);
    }
  }
  return 0;
}

/* -------------------------------------------- */
/* Stance Effect Calculation Functions         */
/* -------------------------------------------- */

/**
 * Apply stance mechanical effects to actor derived statistics.
 * Called during actor data preparation to modify stats based on active stances.
 * 
 * **Pure Calculation Function:**
 * - No side effects (only modifies passed sys object)
 * - No async operations
 * - No Active Effect lifecycle management
 * - Idempotent (can be called multiple times safely)
 * 
 * **Stance Effects Applied:**
 * - Full Attack: -10 Armor TN
 * - Defense: +Air Ring +Defense Skill to Armor TN
 * - Full Defense: +half of Defense roll to Armor TN
 * 
 * @param {Actor} actor - The actor to apply stance effects to
 * @param {object} sys - The actor's system data object (modified in place)
 * @returns {void} Modifies sys object in place
 * 
 * @example
 * // Called from Actor.prepareDerivedData()
 * applyStanceEffects(this, sys);
 */
export function applyStanceEffects(actor, sys) {
  if (!actor || !sys) return;

  const activeStances = getActiveStances(actor);
  
  // Initialize stance modifier tracking
  sys.armorTn = sys.armorTn || {};
  sys.armorTn.stanceMod = 0; // Reset stance modifier each time
  
  // Apply stance-specific automations
  for (const stanceId of activeStances) {
    switch (stanceId) {
      case "fullAttackStance":
        applyFullAttackStance(actor, sys);
        break;
      case "defenseStance":
        applyDefenseStance(actor, sys);
        break;
      case "fullDefenseStance":
        applyFullDefenseStance(actor, sys);
        break;
      case "centerStance":
      default:
        break;
    }
  }
  
  // Apply final stance modifier to current Armor TN
  if (sys.armorTn.stanceMod !== 0) {
    sys.armorTn.current = (sys.armorTn.current || 0) + sys.armorTn.stanceMod;
  }
}

/**
 * Apply Full Attack Stance effects:
 * - +2k1 to all attack rolls (handled via Active Effects)
 * - +1k1 to all damage rolls (handled via Active Effects)
 * - -10 to Armor TN
 * 
 * @param {Actor} actor - The actor in Full Attack Stance
 * @param {object} sys - The actor's system data object
 * @private
 */
function applyFullAttackStance(actor, sys) {
  // Apply -10 to Armor TN via stance modifier
  sys.armorTn.stanceMod += -10;
  
  // Store stance info for UI display
  sys._stanceEffects = sys._stanceEffects || {};
  sys._stanceEffects.fullAttack = {
    armorTnPenalty: -10,
    attackBonus: "+2k1",
    damageBonus: "+1k1"
  };
}

/**
 * Apply Defense Stance effects:
 * - Add Air Ring + Defense Skill Rank to Armor TN
 * 
 * @param {Actor} actor - The actor in Defense Stance
 * @param {object} sys - The actor's system data object
 * @private
 */
function applyDefenseStance(actor, sys) {
  const airRing = toInt(sys.rings?.air || 0);
  const defenseSkillRank = getDefenseSkillRank(actor);
  const defenseBonus = airRing + defenseSkillRank;
  
  // Apply bonus to Armor TN via stance modifier
  sys.armorTn.stanceMod += defenseBonus;
  
  // Store stance info for UI display
  sys._stanceEffects = sys._stanceEffects || {};
  sys._stanceEffects.defense = {
    armorTnBonus: defenseBonus,
    airRing: airRing,
    defenseSkill: defenseSkillRank
  };
}

/**
 * Apply Full Defense Stance effects:
 * - Trigger Defense/Reflexes roll when stance is selected
 * - Add half the Defense roll (rounded up) to Armor TN
 * 
 * @param {Actor} actor - The actor in Full Defense Stance
 * @param {object} sys - The actor's system data object
 * @private
 */
function applyFullDefenseStance(actor, sys) {
  // Check if we need to make the Defense/Reflexes roll
  const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");
  
  if (!existingRoll) {
    // Don't trigger roll during data preparation - defer to stance activation
    // Just apply a default bonus for now
    const defaultBonus = 5; // Reasonable default until roll is made
    sys.armorTn.stanceMod += defaultBonus;
    
    // Store stance info for UI display
    sys._stanceEffects = sys._stanceEffects || {};
    sys._stanceEffects.fullDefense = {
      rollResult: game.i18n.localize("l5r4.ui.mechanics.stances.pending"),
      armorTnBonus: defaultBonus,
      needsRoll: true
    };
  } else {
    // Apply existing roll result
    const rollResult = toInt(existingRoll.total || 0);
    const armorBonus = Math.ceil(rollResult / 2); // Half rounded up
    
    // Apply bonus to Armor TN via stance modifier
    sys.armorTn.stanceMod += armorBonus;
    
    // Store stance info for UI display
    sys._stanceEffects = sys._stanceEffects || {};
    sys._stanceEffects.fullDefense = {
      rollResult: rollResult,
      armorTnBonus: armorBonus
    };
  }
}
