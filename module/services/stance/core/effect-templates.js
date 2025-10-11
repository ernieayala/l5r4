/**
 * @fileoverview L5R4 Stance Effect Templates - Active Effect Factory Functions
 * 
 * This module provides factory functions for creating Active Effect data structures
 * for each combat stance type. These templates define the visual appearance, status
 * flags, and metadata for stance effects without implementing the mechanical bonuses
 * (which are handled by the automation module).
 * 
 * **Core Responsibilities:**
 * - **Effect Creation**: Generate Active Effect data objects for each stance
 * - **Metadata Definition**: Configure icons, names, and descriptions
 * - **Status Assignment**: Set appropriate status IDs for effect tracking
 * - **Factory Lookup**: Provide lookup function for stance-to-creator mapping
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
 */

import { SYS_ID } from "../../../config/constants.js";
import { T } from "../../../utils/localization.js";

/* -------------------------------------------- */
/* Effect Template Factories                    */
/* -------------------------------------------- */

/**
 * Create a Full Attack Stance Active Effect with +2k1 attack bonus and -10 Armor TN.
 * The bonuses are handled by the stance automation system during rolls.
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Full Attack Stance effect data
 */
export function createFullAttackEffect(actor) {
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
 * Create a Defense Stance Active Effect.
 * The Armor TN bonus is calculated dynamically in the stance automation module.
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Defense Stance
 */
export function createDefenseStanceEffect(actor) {
  return {
    name: game.i18n.localize("l5r4.ui.mechanics.stances.defense"),
    icon: `systems/${SYS_ID}/assets/icons/defence-stance.webp`,
    statuses: ["defenseStance"],
    changes: [
      // Disable attack actions (handled by UI restrictions)
    ],
    flags: {
      [SYS_ID]: {
        stanceType: "defense",
        description: "Defense Stance: Air Ring + Defense Skill to Armor TN, cannot attack"
      }
    }
  };
}

/**
 * Create a Full Defense Stance Active Effect.
 * The Defense roll and Armor TN bonus are handled by the stance automation module.
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Full Defense Stance
 */
export function createFullDefenseStanceEffect(actor) {
  return {
    name: game.i18n.localize("l5r4.ui.mechanics.stances.fullDefense"),
    icon: `systems/${SYS_ID}/assets/icons/full-defense-stance.webp`,
    statuses: ["fullDefenseStance"],
    changes: [
      // All restrictions handled by stance automation
    ],
    flags: {
      [SYS_ID]: {
        stanceType: "fullDefense",
        description: "Full Defense Stance: Defense/Reflexes roll + half to Armor TN, only Free Actions"
      }
    }
  };
}

/**
 * Create an Attack Stance Active Effect (no mechanical changes per requirements).
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Attack Stance
 */
export function createAttackStanceEffect(actor) {
  return {
    name: game.i18n.localize("l5r4.ui.mechanics.stances.attack"),
    icon: `systems/${SYS_ID}/assets/icons/attack-stance.webp`,
    statuses: ["attackStance"],
    changes: [],
    flags: {
      [SYS_ID]: {
        stanceType: "attack",
        description: "Attack Stance: Standard combat stance with no restrictions"
      }
    }
  };
}

/**
 * Create a Center Stance Active Effect (no mechanical changes per requirements).
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Center Stance
 */
export function createCenterStanceEffect(actor) {
  return {
    name: game.i18n.localize("l5r4.ui.mechanics.stances.center"),
    icon: `systems/${SYS_ID}/assets/icons/centered-stance.webp`,
    statuses: ["centerStance"],
    changes: [],
    flags: {
      [SYS_ID]: {
        stanceType: "center",
        description: "Center Stance: Focused preparation for next round"
      }
    }
  };
}

/**
 * Get the appropriate Active Effect creator function for a stance.
 * 
 * @param {string} stanceId - The stance status ID
 * @returns {Function|null} Effect creator function or null if not found
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
