import { SYS_ID } from "../../../config/constants.js";
import { T } from "../../../utils/localization.js";

/**
 * Stance Effect Templates
 * 
 * Creates Active Effect data structures for L5R4 combat stances. These templates
 * define the visual presentation (name, icon) and mechanical data (bonuses, penalties,
 * descriptions) that are applied when a character adopts a stance.
 * 
 * The effect templates follow the Foundry VTT v13+ Active Effects data model:
 * - `name`: Localized display name
 * - `icon`: Path to stance icon asset
 * - `statuses`: Array of status ID strings for identification
 * - `flags[SYS_ID]`: System-specific data including stanceType and mechanical effects
 * 
 * These templates are consumed by the stance automation system which applies
 * the mechanical effects to actor stats during `prepareDerivedData()`.
 * 
 * Game rules implemented per Stances_Actions_Maneuvers chapter.
 * 
 * @module services/stance/core/effect-templates
 * @requires module:config/constants~SYS_ID
 * @requires module:utils/localization~T
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.DataModel.html|Foundry Active Effects API}
 */

/**
 * @typedef {Object} StanceEffectTemplate
 * @property {string} name - Localized stance name displayed in UI
 * @property {string} icon - Path to stance icon asset
 * @property {string[]} statuses - Status IDs for identifying active stance on actor
 * @property {Object} flags - System-specific data storage
 * @property {Object} flags.l5r4 - L5R4 system namespace
 * @property {string} flags.l5r4.stanceType - Stance identifier (e.g., "fullAttack", "defense")
 * @property {string} flags.l5r4.description - Brief description of stance mechanics
 * @property {Object} [flags.l5r4.attackBonus] - Attack roll modifier (Full Attack only)
 * @property {number} [flags.l5r4.attackBonus.roll] - Dice to roll (e.g., 2 for 2k1)
 * @property {number} [flags.l5r4.attackBonus.keep] - Dice to keep (e.g., 1 for 2k1)
 */

/**
 * Creates Full Attack stance effect template.
 * 
 * Full Attack is the Ring of Fire stance - aggressive and all-consuming. Characters
 * in Full Attack gain +2k1 to attack rolls but suffer -10 to Armor TN. Movement is
 * restricted to closing with enemies only, and no ranged attacks are permitted.
 * 
 * Game rules: Characters in Full Attack may only take actions to make attacks and
 * Move Actions to get closer to enemies. Cannot be used while mounted (unless
 * Horsemanship rank 3+). If a Move Action is taken, character moves +5 feet beyond
 * normal (once per round, cannot exceed maximum movement).
 * 
 * @returns {StanceEffectTemplate} Full Attack stance effect data
 */
export function createFullAttackEffect() {
  return {
    name: T("l5r4.ui.mechanics.stances.fullAttack"),
    icon: `systems/${SYS_ID}/assets/icons/full-attack-stance.webp`,
    statuses: ["fullAttackStance"],
    flags: {
      [SYS_ID]: {
        stanceType: "fullAttack",
        attackBonus: { roll: 2, keep: 1 },
        description: "Full Attack Stance: +2k1 to attack rolls, -10 to Armor TN"
      }
    }
  };
}

/**
 * Creates Defense stance effect template.
 * 
 * Defense is the Ring of Air stance - adaptable and reactive. Characters in Defense
 * add their Air Ring plus Defense Skill rank to Armor TN, but cannot make attacks.
 * All other actions are permitted.
 * 
 * Game rules: Defense stance allows freedom of action (Skill Rolls, Spell Casting,
 * movement) while providing defensive bonuses. Useful for performing complex actions
 * while under threat without being completely vulnerable.
 * 
 * @returns {StanceEffectTemplate} Defense stance effect data
 */
export function createDefenseStanceEffect() {
  return {
    name: T("l5r4.ui.mechanics.stances.defense"),
    icon: `systems/${SYS_ID}/assets/icons/defence-stance.webp`,
    statuses: ["defenseStance"],
    flags: {
      [SYS_ID]: {
        stanceType: "defense",
        description: "Defense Stance: Air Ring + Defense Skill to Armor TN, cannot attack"
      }
    }
  };
}

/**
 * Creates Full Defense stance effect template.
 * 
 * Full Defense is the Ring of Earth stance - reserved, unmoving, and unassailable.
 * Upon declaring Full Defense, character makes a Defense/Reflexes roll (Complex Action)
 * and adds half the result (rounded up) to Armor TN until their next turn. Only Free
 * Actions are permitted while in Full Defense.
 * 
 * Game rules: The Defense/Reflexes roll is a Complex Action, consuming the character's
 * turn. The bonus persists until the character's next turn. The roll is stored in actor
 * flags and must be made before the defensive bonus is applied.
 * 
 * @returns {StanceEffectTemplate} Full Defense stance effect data
 */
export function createFullDefenseStanceEffect() {
  return {
    name: T("l5r4.ui.mechanics.stances.fullDefense"),
    icon: `systems/${SYS_ID}/assets/icons/full-defense-stance.webp`,
    statuses: ["fullDefenseStance"],
    flags: {
      [SYS_ID]: {
        stanceType: "fullDefense",
        description: "Full Defense Stance: Defense/Reflexes roll + half to Armor TN, only Free Actions"
      }
    }
  };
}

/**
 * Creates Attack stance effect template.
 * 
 * Attack is the Ring of Water stance - fluid and versatile. This is the standard
 * combat stance with no restrictions on actions or movement. Characters in Attack
 * stance may freely take any combination of actions available to them.
 * 
 * Game rules: Attack stance is the default stance most bushi adopt. No mechanical
 * bonuses or penalties, complete freedom of action.
 * 
 * @returns {StanceEffectTemplate} Attack stance effect data
 */
export function createAttackStanceEffect() {
  return {
    name: T("l5r4.ui.mechanics.stances.attack"),
    icon: `systems/${SYS_ID}/assets/icons/attack-stance.webp`,
    statuses: ["attackStance"],
    flags: {
      [SYS_ID]: {
        stanceType: "attack",
        description: "Attack Stance: Standard combat stance with no restrictions"
      }
    }
  };
}

/**
 * Creates Center stance effect template.
 * 
 * Center is the Ring of Void stance - focused preparation and inner balance. Characters
 * in Center stance forfeit all actions to focus energy for the following round. The
 * mechanical benefits (bonus roll dice and initiative) are applied by the automation
 * system, not stored in this effect template.
 * 
 * Game rules: Character takes no actions while in Center stance. On the following round,
 * gains +1k1 + Void Ring bonus to any one roll during their turn, and adds +10 to
 * Initiative Score for that round only. Particularly valuable in iaijutsu dueling.
 * 
 * Note: The description in this template is intentionally simplified for UI display.
 * The actual mechanical bonuses are handled by the stance automation system based on
 * the character's Void Ring value.
 * 
 * @returns {StanceEffectTemplate} Center stance effect data
 */
export function createCenterStanceEffect() {
  return {
    name: T("l5r4.ui.mechanics.stances.center"),
    icon: `systems/${SYS_ID}/assets/icons/centered-stance.webp`,
    statuses: ["centerStance"],
    flags: {
      [SYS_ID]: {
        stanceType: "center",
        description: "Center Stance: Focused preparation for next round"
      }
    }
  };
}

/**
 * Retrieves the appropriate effect creator function for a given stance ID.
 * 
 * This lookup utility maps stance identifiers to their corresponding creator functions,
 * allowing the stance service to generate effect templates dynamically based on user
 * input or actor state changes.
 * 
 * @param {string} stanceId - The stance identifier (e.g., "attackStance", "fullAttackStance")
 * @returns {Function|null} The effect creator function, or null if stance ID is invalid
 */
export function getStanceEffectCreator(stanceId) {
  const creators = {
    "attackStance": createAttackStanceEffect,
    "fullAttackStance": createFullAttackEffect,
    "defenseStance": createDefenseStanceEffect,
    "fullDefenseStance": createFullDefenseStanceEffect,
    "centerStance": createCenterStanceEffect
  };
  
  return creators[stanceId] || null;
}
