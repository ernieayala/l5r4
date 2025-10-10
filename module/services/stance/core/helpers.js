/**
 * @fileoverview L5R4 Stance Helpers - Shared Utility Functions
 * 
 * This module provides shared helper functions used across the stance service.
 * Contains pure utility functions with no side effects for extracting and
 * analyzing stance-related data from actors and effects.
 * 
 * **Core Responsibilities:**
 * - **Stance Detection**: Extract active stance IDs from actor effects
 * - **Skill Lookup**: Find Defense skill rank for stance calculations
 * - **Effect Analysis**: Extract status IDs from ActiveEffect documents
 * - **Constants**: Shared stance ID definitions
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link ../index.js|Stance Service Index}
 */

import { toInt } from "../../../utils/type-coercion.js";

/* -------------------------------------------- */
/* Constants                                    */
/* -------------------------------------------- */

/**
 * Set of all recognized stance status IDs in the L5R4 system.
 * Used for filtering and validation of stance effects.
 * 
 * @type {Set<string>}
 * @constant
 */
export const STANCE_IDS = new Set([
  "attackStance",
  "fullAttackStance", 
  "defenseStance",
  "fullDefenseStance",
  "centerStance"
]);

/* -------------------------------------------- */
/* Helper Functions                             */
/* -------------------------------------------- */

/**
 * Get all active stance status effects on an actor.
 * Checks both modern statuses Set (v11+) and legacy statusId flag for compatibility.
 * 
 * @param {Actor} actor - The actor to check for active stances
 * @returns {string[]} Array of active stance IDs
 */
export function getActiveStances(actor) {
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
export function getDefenseSkillRank(actor) {
  for (const item of actor.items) {
    if (item.type === "skill" && item.name?.toLowerCase().includes("defense")) {
      return toInt(item.system?.rank || 0);
    }
  }
  return 0;
}

/**
 * Extract status IDs from an ActiveEffect document.
 * Handles both modern statuses Set (v11+) and legacy statusId flag.
 * 
 * @param {ActiveEffect} eff - ActiveEffect document to analyze
 * @returns {string[]} Array of status IDs associated with the effect
 */
export function getEffectStatusIds(eff) {
  const ids = [];
  // Modern approach: statuses Set (Foundry v11+)
  if (eff?.statuses?.size) ids.push(...eff.statuses);
  // Legacy approach: core.statusId flag (pre-v11 compatibility)
  const legacy = eff?.getFlag?.("core", "statusId");
  if (legacy) ids.push(legacy);
  return ids.filter(Boolean);
}
