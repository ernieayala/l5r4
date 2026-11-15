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
 * - Apply ArmorTN rules from stances, conditions, and other effects
 * - Enrich embedded items
 *
 * Architecture: Pure calculation functions that mutate sys object in place.
 * Foundry API: Uses actor._source for detecting custom initiative values.
 */

import { toInt } from "../../../utils/type-coercion.js";
import { initiativeDice } from "../../../utils/initiative.js";

import { NPC_INSIGHT_RANK, WOUND_LEVEL_ORDER } from "../../../config/game-mechanics.js";
import {
  prepareTraitsAndRings,
  prepareMovement
} from "../calculations/shared-traits-rings-system.js";
import {
  prepareHealRate,
  prepareNpcManualWounds,
  prepareNpcFormulaWounds,
  prepareVisibleWoundLevels
} from "../calculations/wound-system.js";
import { enrichActorItems } from "../calculations/item-enrichment-system.js";
import { applyArmorRules, applyDerivedRules } from "../rules.js";

/**
 * Prepares derived data for NPC actors.
 *
 * Calculates all derived values for NPCs including traits, initiative, wounds,
 * and Armor TN with its rules. Executes calculations in dependency order.
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

  // Rules that need Traits and Rings, before the values their outputs feed (Initiative, Wounds, roll bonuses)
  applyDerivedRules(actor, sys);

  // Initiative pool (p.81): the GM's stored pool when both its numbers are above 0, otherwise Insight Rank +
  // Reflexes, keep Reflexes, an NPC counting as Insight Rank 1; then the modifiers, rules included
  const sourceRoll = toInt(actor._source.system.initiative.roll);
  const sourceKeep = toInt(actor._source.system.initiative.keep);
  const custom = sourceRoll > 0 && sourceKeep > 0;
  const formula = initiativeDice({
    insightRank: NPC_INSIGHT_RANK,
    reflexes: toInt(sys._derived.traitsEff.ref)
  });
  sys.initiative.roll = (custom ? sourceRoll : formula.roll) + toInt(sys.initiative.rollMod);
  sys.initiative.keep = (custom ? sourceKeep : formula.keep) + toInt(sys.initiative.keepMod);
  sys.initiative.totalMod = toInt(sys.initiative.totalMod);

  // Initialize armor TN structure
  // NPCs use simplified armor (single TN value, no calculation)
  sys.armorTn = sys.armorTn || {};
  sys.armorTn.base = 0;
  sys.armorTn.bonus = 0;
  sys.armorTn.reduction = toInt(sys.armor?.reduction ?? 0);
  // An NPC's Armor TN is one entered value with its armor in it, so it stands as the base and armor adds 0
  applyArmorRules(actor, sys, { base: toInt(sys.armor?.armorTn ?? 0), armor: 0, other: 0 });

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

  // Healing per night's rest, an NPC counting as Insight Rank 1 (#40)
  prepareHealRate(sys, NPC_INSIGHT_RANK);

  // Calculate movement rates (depends on traits)
  prepareMovement(sys);

  // Determine which wound levels to show in UI
  prepareVisibleWoundLevels(sys, order);

  // Enrich embedded items with calculated data
  enrichActorItems(actor);
}
