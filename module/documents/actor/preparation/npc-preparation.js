/**
 * @module documents/actor/preparation/npc-preparation
 * @description Prepares an NPC's derived data in dependency order: Traits and Rings, the Wounds rules and the Wound
 * Ranks in manual or formula mode, the other rules, Initiative (the GM's stored pool or the formula), Armor TN with its
 * rules, healing, movement, the owned items' formulas, and Fear. Modifies the actor's system data in place; reads
 * `actor._source` to tell a stored Initiative pool from a prepared one.
 */

import { NPC_INSIGHT_RANK, WOUND_LEVEL_ORDER } from "../../../config/game-mechanics.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getInitiativePool } from "../../../utils/initiative.js";
import {
  prepareTraitsAndRings,
  prepareMovement
} from "../calculations/shared-traits-rings-system.js";
import { prepareHealRate } from "../calculations/wound-system.js";
import {
  prepareNpcManualWounds,
  prepareNpcFormulaWounds,
  prepareVisibleWoundLevels
} from "../calculations/npc-wound-system.js";
import { prepareItemFormulas } from "../calculations/item-enrichment-system.js";
import { prepareFear } from "../calculations/fear-system.js";
import { applyArmorRules, applyDerivedRules, applyWoundRules } from "../rules.js";

/**
 * Prepares derived data for NPC actors.
 *
 * Calculates all derived values for NPCs including traits, initiative, wounds,
 * and Armor TN with its rules. Executes calculations in dependency order.
 *
 * @param {Actor} actor - The NPC actor being prepared
 * @param {object} sys - The actor's system data object (mutated in place)
 *
 * @returns {void} Mutates sys object in place
 */
export function prepareNpcData(actor, sys) {
  // Calculate base traits and rings first (required for initiative)
  prepareTraitsAndRings(sys);

  // The Wounds rules, then the Wound Rank, so every other rule can test `wound:` (#175)
  applyWoundRules(actor, sys);

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

  actor._finalizeWoundPenalties(sys, order, woundMode);

  // Rules that need Traits, Rings, and the Wound Rank, before the values their outputs feed (Initiative, Armor TN,
  // roll bonuses)
  applyDerivedRules(actor, sys);

  prepareNpcInitiative(actor, sys);
  prepareNpcArmorTn(actor, sys);

  // Healing per night's rest, an NPC counting as Insight Rank 1 (#40)
  prepareHealRate(sys, NPC_INSIGHT_RANK);

  // Calculate movement rates (depends on traits)
  prepareMovement(sys);

  // Determine which wound levels to show in UI
  prepareVisibleWoundLevels(sys, order);

  // Enrich embedded items with calculated data
  prepareItemFormulas(actor);

  prepareFear(sys);
}

/**
 * Prepare the Initiative pool: the GM's stored pool when both its numbers are above 0, otherwise Insight Rank +
 * Reflexes, keep Reflexes, an NPC counting as Insight Rank 1 (Ernie's ruling); then the modifiers, rules included.
 * game-rules/31_combat_round.md, p.81
 * @param {Actor} actor - The NPC actor; `actor._source` holds the stored pool
 * @param {object} sys - The actor's system data object (mutated in place)
 */
function prepareNpcInitiative(actor, sys) {
  const sourceRoll = toInt(actor._source.system.initiative.roll);
  const sourceKeep = toInt(actor._source.system.initiative.keep);
  const custom = sourceRoll > 0 && sourceKeep > 0;
  const formula = getInitiativePool({
    insightRank: NPC_INSIGHT_RANK,
    reflexes: toInt(sys._derived.traitsEff.ref)
  });
  sys.initiative.roll = (custom ? sourceRoll : formula.roll) + toInt(sys.initiative.rollMod);
  sys.initiative.keep = (custom ? sourceKeep : formula.keep) + toInt(sys.initiative.keepMod);
  sys.initiative.totalMod = toInt(sys.initiative.totalMod);
}

/**
 * Prepare the Armor TN: an NPC has one entered Armor TN with its armor in it, and the GM enters how much of it is
 * armor worn. That part is the armor bonus, so Grappled and Stunned (5 + armor) and "ignores armor" effects read it;
 * the rest is the base (#152). Then the ArmorTN and Reduction rules. An Armor TN of 18 with 3 from armor is base 15
 * and armor 3, so Grappled gives 8.
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} actor - The NPC actor
 * @param {object} sys - The actor's system data object (mutated in place)
 */
function prepareNpcArmorTn(actor, sys) {
  const armor = sys.armor.bonus;
  const base = toInt(sys.armor?.armorTn ?? 0) - armor;
  sys.armorTn = sys.armorTn || {};
  sys.armorTn.base = base;
  sys.armorTn.bonus = armor;
  sys.armorTn.reduction = toInt(sys.armor?.reduction ?? 0);
  applyArmorRules(actor, sys, { base, armor, other: 0 });
}
