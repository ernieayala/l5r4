/**
 * Stance Service Initialization
 * 
 * Registers Foundry VTT hooks to automate the L5R4 stance system during combat.
 * Stances (Attack, Full Attack, Defense, Full Defense, Center) are implemented
 * as ActiveEffects with automated behavior, mutual exclusivity, and bonus calculations.
 * 
 * This module wires up the stance automation by hooking into ActiveEffect lifecycle
 * events (create, update, delete) to handle stance switching, conflict resolution,
 * and mechanical effects like Full Defense rolls.
 * 
 * @module services/stance/initialize
 * @requires foundry.documents.ActiveEffect - Foundry v13+ ActiveEffect API
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseActiveEffect.html}
 */

import {
  onPreCreateActiveEffect,
  onCreateActiveEffect,
  onUpdateActiveEffect,
  onDeleteActiveEffect
} from "./hooks/effect-lifecycle.js";

/**
 * Initialize the stance service by registering ActiveEffect lifecycle hooks.
 * 
 * Registers four Foundry hooks that manage stance behavior:
 * - `preCreateActiveEffect`: Validates stance data, removes conflicting stances
 * - `createActiveEffect`: Triggers Full Defense roll if needed, refreshes display
 * - `updateActiveEffect`: Handles enable/disable stance toggling
 * - `deleteActiveEffect`: Cleans up stance flags and refreshes actor display
 * 
 * Called during system initialization (Phase 7: Services) before the game is ready.
 * Stances are mutually exclusive - activating a new stance automatically removes
 * any existing stance effect from the same actor.
 * 
 * @function initializeStanceService
 * @returns {void}
 * @see {@link module:services/stance/hooks/effect-lifecycle}
 */
export function initializeStanceService() {
  Hooks.on("preCreateActiveEffect", onPreCreateActiveEffect);
  Hooks.on("createActiveEffect", onCreateActiveEffect);
  Hooks.on("updateActiveEffect", onUpdateActiveEffect);
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
}
