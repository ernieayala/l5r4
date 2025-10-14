/**
 * Stance System Helpers
 *
 * Core utilities for L5R4 stance mechanics implementation in Foundry VTT.
 * Provides stance detection, validation, and Defense skill rank retrieval
 * for the stance automation system.
 *
 * Key Responsibilities:
 * - **Stance Detection**: Identify active stances from actor effects
 * - **Defense Skill Lookup**: Retrieve Defense skill rank for Full Defense calculations
 * - **Effect Status Extraction**: Parse Foundry v13 and legacy status IDs
 *
 * L5R4 Game Rules Context:
 * Implements the five core combat stances (Attack, Full Attack, Defense, Full Defense, Center)
 * and supports Defense skill integration for the Full Defense stance mechanic, which requires
 * a Defense/Reflexes roll per core rules.
 *
 * Foundry VTT Integration:
 * - Uses Actor.effects collection to query active stance effects
 * - Handles Foundry v13 ActiveEffect.statuses Set pattern
 * - Maintains compatibility with pre-v13 core.statusId flag pattern
 *
 * @module services/stance/core/helpers
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html|Actor API}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActiveEffect.html|ActiveEffect API}
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Canonical set of L5R4 stance status effect IDs.
 *
 * Defines all five combat stances from L5R4 core rules, each tied to one of the Five Rings:
 * - **attackStance**: Water Ring stance (fluid, versatile, no restrictions)
 * - **fullAttackStance**: Fire Ring stance (aggressive, +2k1 attack, -10 Armor TN)
 * - **defenseStance**: Air Ring stance (reactive, +Air Ring + Defense Skill to Armor TN, cannot attack)
 * - **fullDefenseStance**: Earth Ring stance (unmoving, Defense/Reflexes roll + half to Armor TN, only Free Actions)
 * - **centerStance**: Void Ring stance (focused preparation, +1k1 + Void Ring to next roll, +10 Initiative)
 *
 * Used for validating effect status IDs to confirm they represent stance effects
 * rather than other status conditions (Prone, Stunned, etc.).
 *
 * @constant {Set<string>}
 * @see module:services/stance/core/effect-templates for stance effect creation
 */
export const STANCE_IDS = new Set([
  "attackStance",
  "fullAttackStance",
  "defenseStance",
  "fullDefenseStance",
  "centerStance"
]);

/**
 * Retrieves all active stance status IDs from an actor's effects.
 *
 * Iterates through the actor's effect collection to identify which L5R4 combat stances
 * are currently active. Filters out disabled effects and non-stance status effects.
 *
 * Foundry VTT Pattern:
 * - Queries Actor.effects collection (EffectCollection in v13+)
 * - Checks ActiveEffect.disabled flag to skip inactive effects
 * - Extracts status IDs using v13 .statuses Set + legacy flag compatibility
 *
 * Typical Usage:
 * The stance automation system calls this during stance transitions to detect
 * conflicting stances (only one stance allowed at a time per L5R4 rules).
 *
 * @param {Actor} actor - The L5R4 actor document to query
 * @returns {string[]} Array of active stance IDs (e.g., ["fullAttackStance"])
 * @see getEffectStatusIds for status ID extraction logic
 */
export function getActiveStances(actor) {
  const activeStances = [];

  for (const effect of actor.effects) {
    if (effect.disabled) continue;

    const statusIds = getEffectStatusIds(effect);
    for (const statusId of statusIds) {
      if (STANCE_IDS.has(statusId)) {
        activeStances.push(statusId);
      }
    }
  }

  return activeStances;
}

/**
 * Retrieves the Defense skill rank from an actor's skill items.
 *
 * Searches the actor's items for a skill with "defense" in its name (case-insensitive).
 * Used by Full Defense stance to calculate the Defense/Reflexes roll per L5R4 rules:
 * "A character in Full Defense Stance makes a Defense/Reflexes roll and adds half
 * the total (rounding up) to Armor TN until their following Turn."
 *
 * Search Strategy:
 * - Case-insensitive to handle variations ("Defense", "defense", "DEFENSE")
 * - Uses .includes() to match partial names ("Defense", "Defense Skill", etc.)
 * - Returns first matching skill (assumes actors have only one Defense skill)
 *
 * Edge Cases:
 * - Returns 0 if actor has no Defense skill (untrained defense roll)
 * - Returns 0 if item.system.rank is null/undefined/invalid
 *
 * @param {Actor} actor - The L5R4 actor document to search
 * @returns {number} Defense skill rank (0 if not found or untrained)
 * @see module:services/stance/rolls/full-defense-roll for usage in Defense/Reflexes rolls
 */
export function getDefenseSkillRank(actor) {
  for (const item of actor.items) {
    // Case-insensitive search handles user input variations and localized skill names
    if (item.type === "skill" && item.name?.toLowerCase().includes("defense")) {
      return toInt(item.system?.rank || 0);
    }
  }
  return 0;
}

/**
 * Extracts all status effect IDs from an ActiveEffect document.
 *
 * Handles Foundry v13's dual status storage pattern for backward compatibility:
 * 1. **Foundry v13+**: ActiveEffect.statuses Set (modern pattern)
 * 2. **Pre-v13 Legacy**: flags.core.statusId string (deprecated but still supported)
 *
 * This dual-path approach ensures stance effects created before the v13 migration
 * continue to function correctly. New effects use the .statuses Set exclusively.
 *
 * Foundry v13 Migration Context:
 * Prior to v13, status effects were stored as a single flag (core.statusId).
 * v13 introduced ActiveEffect.statuses as a Set to support multiple simultaneous
 * status effects. This helper bridges both patterns during the transition period.
 *
 * @param {ActiveEffect} eff - The effect document to extract status IDs from
 * @returns {string[]} Array of status IDs (e.g., ["fullDefenseStance"])
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActiveEffect.html#statuses|ActiveEffect.statuses}
 */
export function getEffectStatusIds(eff) {
  const ids = [];
  // v13+ uses .statuses Set for multiple simultaneous status effects
  if (eff?.statuses?.size) ids.push(...eff.statuses);
  // Legacy support for pre-v13 effects using core.statusId flag
  const legacy = eff?.getFlag?.("core", "statusId");
  if (legacy) ids.push(legacy);
  return ids.filter(Boolean);
}
