/**
 * @module condition-effects
 * @description Applies L5R4 combat condition effects to actor system data.
 *
 * Handles mechanical effects of conditions like Blinded, Dazed, Stunned, etc.
 * Each condition modifies roll penalties, armor TN, and applies restrictions.
 *
 * Architecture:
 * - Reads active conditions from Foundry Active Effects
 * - Applies cumulative penalties to sys._conditionEffects
 * - Modifies armor TN with override logic (lowest TN wins)
 * - Enforces minimum armor TN of 5 per L5R4 rules
 *
 * Foundry Integration:
 * - Uses actor.effects collection for condition tracking
 * - Reads effect.statuses for condition identification
 * - Uses effect flags for condition-specific data (e.g., Fear rank)
 */

import { SYS_ID } from "../../../config/constants.js";
import { CONDITION_IDS } from "../../../config/condition-ids.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";

/**
 * Extracts active L5R4 conditions from actor's Foundry Active Effects.
 *
 * @param {Actor} actor - The actor to check for conditions
 * @returns {Set<string>} Set of active condition IDs (e.g., "blinded", "stunned")
 *
 * @description
 * Iterates through actor's effects, filtering for:
 * - Non-disabled effects
 * - Effects with statuses matching CONDITION_IDS
 * Returns unique set of condition IDs for processing.
 */
function getActiveConditions(actor) {
  const conditions = new Set();

  if (!actor?.effects) {
    return conditions;
  }

  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }

    const statuses = effect.statuses || new Set();
    for (const statusId of statuses) {
      if (CONDITION_IDS.has(statusId)) {
        conditions.add(statusId);
      }
    }
  }

  return conditions;
}

/**
 * Applies all active condition effects to actor's system data.
 *
 * @param {Actor} actor - The actor with conditions
 * @param {Object} sys - Actor's system data object to modify
 *
 * @description
 * Main entry point for condition effect processing:
 * 1. Initializes _conditionEffects tracking object
 * 2. Applies each active condition's mechanical effects
 * 3. Resolves armor TN overrides (lowest wins)
 * 4. Enforces minimum armor TN of 5
 *
 * Modifies sys._conditionEffects with:
 * - active: Array of condition IDs
 * - rollPenalties: Roll/keep penalties for melee/ranged/defense
 * - tnPenalty: Flat TN penalty (e.g., Fatigued)
 * - armorTnOverride: Forced armor TN value (Blinded/Stunned/Grappled)
 * - armorTnModifier: Additive armor TN change (Prone/Guarded/Guarding)
 * - waterRingPenalty: Penalty to Water Ring usage
 * - restrictions: Array of i18n keys for condition restrictions
 *
 * @example
 * // Called during actor data preparation
 * applyConditionEffects(actor, actor.system);
 */
export function applyConditionEffects(actor, sys) {
  if (!actor || !sys) {
    return;
  }

  try {
    const activeConditions = getActiveConditions(actor);

    // Initialize condition effects tracking object
    // All penalties accumulate; armorTnOverride uses lowest value
    sys._conditionEffects = {
      active: Array.from(activeConditions),
      rollPenalties: {
        melee: { roll: 0, keep: 0 },
        ranged: { roll: 0, keep: 0 },
        defense: { roll: 0, keep: 0 }
      },
      // Reserved for future use: separate keep-only penalties
      keepPenalties: {
        melee: { roll: 0, keep: 0 },
        ranged: { roll: 0, keep: 0 },
        defense: { roll: 0, keep: 0 }
      },
      tnPenalty: 0,
      restrictions: [],
      armorTnOverride: null,
      armorTnModifier: 0,
      waterRingPenalty: 0
    };

    for (const conditionId of activeConditions) {
      switch (conditionId) {
        case "blinded":
          applyBlindedCondition(sys);
          break;
        case "dazed":
          applyDazedCondition(sys);
          break;
        case "entangled":
          applyEntangledCondition(sys);
          break;
        case "fatigued":
          applyFatiguedCondition(sys);
          break;
        case "feared":
          applyFearedCondition(actor, sys);
          break;
        case "grappled":
          applyGrappledCondition(sys);
          break;
        case "guarded":
          applyGuardedCondition(sys);
          break;
        case "guarding":
          applyGuardingCondition(sys);
          break;
        case "prone":
          applyProneCondition(sys);
          break;
        case "stunned":
          applyStunnedCondition(sys);
          break;
      }
    }

    // Apply armor TN override if any condition set one (Blinded/Stunned/Grappled)
    // Override replaces base TN but preserves stance modifier
    if (sys._conditionEffects.armorTnOverride !== null) {
      const stanceMod = sys.armorTn.stanceMod || 0;
      sys.armorTn.current = sys._conditionEffects.armorTnOverride + stanceMod;
      sys.armorTn.conditionOverride = true;
    }

    // Apply additive armor TN modifiers (Prone/Guarded/Guarding)
    if (sys._conditionEffects.armorTnModifier !== 0) {
      sys.armorTn.current += sys._conditionEffects.armorTnModifier;
    }

    // Enforce minimum armor TN of 5 per L5R4 core rules
    if (sys.armorTn.current < 5) {
      sys.armorTn.current = 5;
    }
  } catch (err) {
    logError("Failed to apply condition effects", err, {
      actorId: actor?.id,
      actorName: actor?.name
    });

    // Provide safe fallback - no condition effects
    sys._conditionEffects = {
      active: [],
      rollPenalties: {
        melee: { roll: 0, keep: 0 },
        ranged: { roll: 0, keep: 0 },
        defense: { roll: 0, keep: 0 }
      },
      // Reserved for future use: separate keep-only penalties
      keepPenalties: {
        melee: { roll: 0, keep: 0 },
        ranged: { roll: 0, keep: 0 },
        defense: { roll: 0, keep: 0 }
      },
      tnPenalty: 0,
      armorTnOverride: null,
      armorTnModifier: 0,
      waterRingPenalty: 0,
      restrictions: []
    };
  }
}

/**
 * Applies Blinded condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Blinded characters suffer severe combat penalties:
 * - Ranged attacks: -3k3 (nearly impossible to hit)
 * - Melee attacks: -1k1 (reduced accuracy)
 * - Defense rolls: -1k1 (harder to avoid attacks)
 * - Armor TN: Reflexes + 5 + armor bonus (can't see attacks coming)
 * - Water Ring: -2 penalty (reduced awareness)
 * - Cannot perform actions requiring sight
 */
function applyBlindedCondition(sys) {
  // Severe ranged penalty - can't see target
  sys._conditionEffects.rollPenalties.ranged.roll += -3;
  sys._conditionEffects.rollPenalties.ranged.keep += -3;

  // Moderate melee penalty - fighting blind
  sys._conditionEffects.rollPenalties.melee.roll += -1;
  sys._conditionEffects.rollPenalties.melee.keep += -1;

  // Moderate defense penalty - can't see incoming attacks
  sys._conditionEffects.rollPenalties.defense.roll += -1;
  sys._conditionEffects.rollPenalties.defense.keep += -1;

  // Calculate blinded armor TN: Reflexes + 5 + armor bonus
  const ref = toInt(sys.traits?.ref || 0);
  const armorBonus = toInt(sys.armorTn?.bonus || 0);
  const blindedTN = ref + 5 + armorBonus;

  // Use lowest armor TN if multiple overrides apply
  if (
    sys._conditionEffects.armorTnOverride === null ||
    blindedTN < sys._conditionEffects.armorTnOverride
  ) {
    sys._conditionEffects.armorTnOverride = blindedTN;
  }

  // Reduced awareness affects Water Ring usage
  sys._conditionEffects.waterRingPenalty += -2;

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.blinded.restrictions");
}

/**
 * Applies Dazed condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Dazed characters are disoriented and confused:
 * - All attack rolls: -3 rolled dice (reduced accuracy)
 * - Defense rolls: -3 rolled dice (slower reactions)
 * - Cannot perform complex actions
 */
function applyDazedCondition(sys) {
  // Uniform penalty to all combat rolls - disoriented state
  sys._conditionEffects.rollPenalties.melee.roll += -3;
  sys._conditionEffects.rollPenalties.ranged.roll += -3;
  sys._conditionEffects.rollPenalties.defense.roll += -3;

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.dazed.restrictions");
}

/**
 * Applies Entangled condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Entangled characters are physically restrained:
 * - Cannot move from current position
 * - May require Strength check to break free
 * - No direct combat penalties (handled by restrictions)
 */
function applyEntangledCondition(sys) {
  // Movement and action restrictions only
  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.entangled.restrictions");
}

/**
 * Applies Fatigued condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Fatigued characters are exhausted:
 * - All TNs increased by +5 (harder to succeed at everything)
 * - Reduced physical and mental performance
 */
function applyFatiguedCondition(sys) {
  // Universal TN penalty - exhaustion affects all actions
  sys._conditionEffects.tnPenalty += 5;

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.fatigued.restrictions");
}

/**
 * Applies Feared condition effects per L5R4 rules.
 *
 * @param {Actor} actor - The actor to check for Fear effects
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Feared characters are terrified and panicked:
 * - Penalty equals highest Fear rank from all Fear effects
 * - All attack rolls: -[Fear Rank] rolled dice
 * - Defense rolls: -[Fear Rank] rolled dice
 * - May be unable to approach fear source
 *
 * Multiple Fear effects don't stack - only highest rank applies.
 */
function applyFearedCondition(actor, sys) {
  let maxFearRank = 0;

  // Find highest Fear rank among all active Fear effects
  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }

    const statuses = effect.statuses || new Set();
    if (statuses.has("feared")) {
      const fearRank = toInt(effect.getFlag(SYS_ID, "fearRank") || 0);
      if (fearRank > maxFearRank) {
        maxFearRank = fearRank;
      }
    }
  }

  // Apply penalty based on highest Fear rank
  if (maxFearRank > 0) {
    sys._conditionEffects.rollPenalties.melee.roll += -maxFearRank;
    sys._conditionEffects.rollPenalties.ranged.roll += -maxFearRank;
    sys._conditionEffects.rollPenalties.defense.roll += -maxFearRank;

    sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.feared.restrictions");
  }
}

/**
 * Applies Grappled condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Grappled characters are held by opponent:
 * - Armor TN: 5 + armor bonus (minimal defense while held)
 * - Cannot move or perform most actions
 * - May attempt to break free on their turn
 */
function applyGrappledCondition(sys) {
  // Calculate grappled armor TN: base 5 + armor bonus only
  const armorBonus = toInt(sys.armorTn?.bonus || 0);
  const grappledTN = 5 + armorBonus;

  // Use lowest armor TN if multiple overrides apply
  if (
    sys._conditionEffects.armorTnOverride === null ||
    grappledTN < sys._conditionEffects.armorTnOverride
  ) {
    sys._conditionEffects.armorTnOverride = grappledTN;
  }

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.grappled.restrictions");
}

/**
 * Applies Guarded condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Guarded characters are protected by another character:
 * - Armor TN: +10 bonus (guardian intercepts attacks)
 * - Guardian must be adjacent and using Guard action
 */
function applyGuardedCondition(sys) {
  // Significant defensive bonus from guardian's protection
  sys._conditionEffects.armorTnModifier += 10;

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.guarded.restrictions");
}

/**
 * Applies Guarding condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Guarding characters are protecting another character:
 * - Armor TN: -5 penalty (exposed while protecting ally)
 * - Must remain adjacent to guarded character
 * - Intercepts attacks targeting guarded character
 */
function applyGuardingCondition(sys) {
  // Defensive penalty from exposed position while guarding
  sys._conditionEffects.armorTnModifier += -5;

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.guarding.restrictions");
}

/**
 * Applies Prone condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Prone characters are knocked down or lying flat:
 * - Armor TN: -10 penalty (easier to hit while down)
 * - Melee attacks: -2 rolled dice (awkward position)
 * - Ranged attacks: -2 rolled dice (unstable aim)
 * - Must use Simple Action to stand up
 */
function applyProneCondition(sys) {
  // Severe defensive penalty from being on ground
  sys._conditionEffects.armorTnModifier += -10;
  sys.armorTn.pronePenalty = -10;

  // Attack penalties from awkward prone position
  sys._conditionEffects.rollPenalties.melee.roll += -2;
  sys._conditionEffects.rollPenalties.ranged.roll += -2;

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.prone.restrictions");
}

/**
 * Applies Stunned condition effects per L5R4 rules.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Stunned characters are temporarily incapacitated:
 * - Armor TN: 5 + armor bonus (minimal defense)
 * - Cannot take actions while stunned
 * - Typically lasts until start of next turn
 */
function applyStunnedCondition(sys) {
  // Calculate stunned armor TN: base 5 + armor bonus only
  const armorBonus = toInt(sys.armorTn?.bonus || 0);
  const stunnedTN = 5 + armorBonus;

  // Use lowest armor TN if multiple overrides apply
  if (
    sys._conditionEffects.armorTnOverride === null ||
    stunnedTN < sys._conditionEffects.armorTnOverride
  ) {
    sys._conditionEffects.armorTnOverride = stunnedTN;
  }

  sys._conditionEffects.restrictions.push("l5r4.mechanics.conditions.stunned.restrictions");
}
