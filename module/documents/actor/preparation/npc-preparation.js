/**
 * @file NPC Actor Data Preparation
 * @module documents/actor/preparation/npc-preparation
 *
 * Handles derived data calculation for NPC actors in the L5R4 system.
 * Coordinates trait/ring calculations, initiative, wounds, stance automation,
 * and condition effects in the correct dependency order.
 *
 * Key responsibilities:
 * - Calculate NPC initiative (custom or formula-based)
 * - Process wound levels (manual or formula mode)
 * - Apply stance and condition effects
 * - Enrich embedded items
 *
 * Architecture: Pure calculation functions that mutate sys object in place.
 * Foundry API: Uses actor._source for detecting custom initiative values.
 */

import { toInt } from "../../../utils/type-coercion.js";

import { applyStanceAutomation } from "../../../services/stance/core/automation.js";

import { WOUND_LEVEL_ORDER } from "../../../config/game-mechanics.js";
import { prepareTraitsAndRings, prepareMovement } from "../calculations/shared-traits-rings.js";
import {
  prepareNpcManualWounds,
  prepareNpcFormulaWounds,
  prepareVisibleWoundLevels
} from "../calculations/wound-system.js";
import { applyConditionEffects } from "../calculations/condition-effects.js";
import { enrichActorItems } from "../calculations/item-enrichment.js";

/**
 * Prepares derived data for NPC actors.
 *
 * Calculates all derived values for NPCs including traits, initiative, wounds,
 * and applies stance/condition effects. Executes calculations in dependency order.
 *
 * @param {Actor} actor - The NPC actor being prepared
 * @param {object} sys - The actor's system data object (mutated in place)
 * @param {Function} finalizeWoundPenaltiesFn - Callback to finalize wound penalties
 *
 * @returns {void} Mutates sys object in place
 *
 * @example
 * // Called from Actor.prepareData()
 * prepareNpcData(this, this.system, finalizeWoundPenalties);
 */
export function prepareNpcData(actor, sys, finalizeWoundPenaltiesFn) {
  // Calculate base traits and rings first (required for initiative)
  prepareTraitsAndRings(sys);

  // Initialize initiative structure
  sys.initiative = sys.initiative || {};
  const ref = toInt(sys.traits?.ref);
  const insightRank = toInt(sys.insight?.rank) || 0;

  // Check for custom initiative values in source data
  // NPCs can have manually set initiative instead of formula
  const sourceRoll = toInt(actor._source?.system?.initiative?.roll);
  const sourceKeep = toInt(actor._source?.system?.initiative?.keep);

  const hasCustomInitiative = sourceRoll > 0 && sourceKeep > 0;
  const baseRoll = hasCustomInitiative ? sourceRoll : insightRank + ref;
  const baseKeep = hasCustomInitiative ? sourceKeep : ref;

  const rollMod = toInt(sys.initiative.rollMod) || 0;
  const keepMod = toInt(sys.initiative.keepMod) || 0;

  // Store effective values (before modifiers)
  sys.initiative.effRoll = baseRoll;
  sys.initiative.effKeep = baseKeep;

  // Calculate final initiative with modifiers
  sys.initiative.roll = baseRoll + rollMod;
  sys.initiative.keep = baseKeep + keepMod;
  sys.initiative.totalMod = toInt(sys.initiative.totalMod);

  // Initialize armor TN structure
  // NPCs use simplified armor (single TN value, no calculation)
  sys.armorTn = sys.armorTn || {};
  sys.armorTn.base = 0;
  sys.armorTn.bonus = 0;
  sys.armorTn.reduction = toInt(sys.armor?.reduction ?? 0);
  sys.armorTn.current = toInt(sys.armor?.armorTn ?? 0);

  // Initialize wound level structures
  sys.woundLevels = sys.woundLevels || {};
  sys.manualWoundLevels = sys.manualWoundLevels || {};
  const order = WOUND_LEVEL_ORDER;

  // Process wounds based on mode (manual entry or formula calculation)
  const woundMode = sys.woundMode || "manual";

  if (woundMode === "manual") {
    prepareNpcManualWounds(sys, order);
  } else {
    prepareNpcFormulaWounds(sys, order);
  }

  // Apply wound penalties to traits/rings
  finalizeWoundPenaltiesFn(sys, order, woundMode);

  // Apply stance effects (must happen after traits are calculated)
  applyStanceAutomation(actor, sys);

  // Apply condition effects (must happen after stance)
  applyConditionEffects(actor, sys);

  // Calculate movement rates (depends on traits)
  prepareMovement(sys);

  // Determine which wound levels to show in UI
  prepareVisibleWoundLevels(sys, order);

  // Enrich embedded items with calculated data
  enrichActorItems(actor);
}
