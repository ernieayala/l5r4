/**
 * @module services/dice/resources/target-resolver
 * @description An attack's target from the user's targeted tokens (`game.user.targets`). An attack hits when its
 * roll meets the target's Armor TN, so with one target that Armor TN becomes the attack's default TN; with several,
 * none does, since each has its own. The Armor TN is prepared on the actor (Reflexes × 5 + 5, plus armor and
 * stances); this file only reads it, through optional chaining, from the paths an actor may hold it in.
 * game-rules/32_attack_and_defense.md, p.82
 */

import { toInt } from "../../../utils/type-coercion.js";
import { T } from "../../../utils/localization.js";

/**
 * Empty target result returned when no valid target is found.
 *
 * Used as fallback for:
 * - Non-attack roll types (skills, spells, etc. don't need targets)
 * - No actor provided to resolver
 * - No tokens targeted by user
 * - Target found but Armor TN is 0 or invalid
 *
 * @typedef {object} EmptyTarget
 * @property {number} autoTn - Always 0 (no auto-populated Target Number)
 * @property {null} targetData - No target metadata
 */
const EMPTY_TARGET = Object.freeze({
  autoTn: 0,
  targetData: null
});

/**
 * Single target resolution result with Armor TN.
 *
 * @typedef {object} SingleTargetResult
 * @property {number} autoTn - Target's Armor TN to auto-populate attack roll TN
 * @property {object} targetData - Target metadata for chat message rendering
 * @property {string} targetData.name - Target actor's display name
 * @property {number} targetData.armorTn - Target's Armor TN value
 * @property {boolean} targetData.single - Flag indicating single target (true)
 * @property {string} targetData.vsText - Localized "vs" text
 * @property {L5R4Actor} targetData.actor - Reference to target actor document
 */

/**
 * Multiple target resolution result.
 *
 * @typedef {object} MultipleTargetResult
 * @property {number} autoTn - Always 0 (cannot auto-populate with multiple targets)
 * @property {object} targetData - Multi-target metadata
 * @property {boolean} targetData.multiple - Flag indicating multiple targets (true)
 * @property {number} targetData.count - Number of tokens targeted
 * @property {string} targetData.multipleText - Localized multiple targets text
 */

/**
 * Resolve targeting information from Foundry's token selection.
 *
 * Queries game.user.targets to detect selected tokens and extracts Armor TN
 * for attack roll auto-population. Handles three cases:
 *
 * 1. **Single Target**: Returns target's Armor TN and metadata for chat display
 * 2. **Multiple Targets**: Returns count (cannot auto-populate TN)
 * 3. **No Targets**: Returns empty result
 *
 * L5R4 Combat Mechanic:
 * When attacking, the player's roll is compared to the target's Armor TN.
 * If one target is selected, we can auto-populate the TN field for convenience.
 * If multiple targets are selected, each has a different Armor TN, so we cannot
 * auto-populate (player must manually select which target for each attack).
 *
 * Foundry Integration:
 * - Reads from game.user.targets Set (contains Token documents)
 * - Accesses token.actor to get Actor document
 * - Only processes for rollType === "attack" (other rolls don't use Armor TN)
 *
 * @param {L5R4Actor} actor - The attacking actor (currently unused but reserved for future stance modifiers)
 * @param {string} rollType - Type of roll being made ("attack", "skill", "spell", etc.)
 * @returns {EmptyTarget|SingleTargetResult|MultipleTargetResult} Target resolution result
 */
export function getTargets(actor, rollType) {
  if (rollType !== "attack" || !actor) {
    return EMPTY_TARGET;
  }

  const targetedTokens = Array.from(game.user.targets || []);

  if (targetedTokens.length === 1) {
    const targetActor = targetedTokens[0].actor;
    const armorTn = armorTnOf(targetActor);

    if (armorTn > 0) {
      return buildSingleTarget(targetActor, armorTn);
    }
  }

  if (targetedTokens.length > 1) {
    return buildMultipleTargets(targetedTokens.length);
  }

  return EMPTY_TARGET;
}

/**
 * The result for one target whose Armor TN becomes the attack's TN.
 * @param {L5R4Actor} targetActor - The target's actor
 * @param {number} armorTn - The target's Armor TN, above 0
 * @returns {SingleTargetResult}
 */
function buildSingleTarget(targetActor, armorTn) {
  return {
    autoTn: armorTn,
    targetData: {
      name: targetActor.name,
      armorTn,
      single: true,
      vsText: T("l5r4.ui.combat.vs"),
      actor: targetActor
    }
  };
}

/**
 * The result for several targets, which gives the attack no TN.
 * @param {number} count - How many tokens are targeted
 * @returns {MultipleTargetResult}
 */
function buildMultipleTargets(count) {
  return {
    autoTn: 0,
    targetData: {
      multiple: true,
      count,
      multipleText: T("l5r4.ui.combat.multipleTargets")
    }
  };
}

/**
 * Read a number from a value that may be a `{current, max}` object or a bare number.
 * An object gives its `current` (25 for `{ current: 25, max: 30 }`), a number gives itself (25), and anything else
 * (null, undefined, a string) gives null, so a path the actor does not hold reads as no value.
 *
 * @param {object|number|*} value - Value to extract from (may be object, number, or invalid)
 * @returns {number|null} Numeric value if found, null otherwise
 */
function currentValueOf(value) {
  if (value?.current !== undefined) {
    return value.current;
  }
  if (typeof value === "number") {
    return value;
  }
  return null;
}

/**
 * Resolve Armor TN from target actor's data model.
 *
 * Implements defensive multi-path lookup to handle schema variations across
 * system versions and data migrations. Checks multiple possible locations in
 * priority order until a valid value is found.
 *
 * L5R4 Combat Mechanic:
 * Armor TN is the target number attackers must meet or exceed to hit. It is
 * calculated as: (Reflexes × 5) + 5 + armor bonus + stance modifiers.
 *
 * This function extracts the already-calculated Armor TN value from the actor's
 * derived data. The calculation itself happens in L5R4Actor.prepareDerivedData().
 *
 * Data Path Priority (Defensive Fallbacks):
 * 1. **actor.system.armorTn** - Current primary location
 * 2. **actor.system.wounds.armorTn** - Legacy location from older schema
 * 3. **actor.system._derived.armorTn** - Alternative derived data location
 * 4. **actor.system.armor.tn** - Fallback for schema variations
 * 5. **actor.system.armor.armorTn** - Additional fallback path
 *
 * Multiple paths provide backward compatibility during data migrations and
 * handle potential schema inconsistencies gracefully.
 *
 * Foundry Integration:
 * - Accesses actor.system using optional chaining for safety
 * - Uses currentValueOf() to handle both object and raw number formats
 * - Coerces final result via toInt() to ensure valid integer (0 if invalid)
 *
 * @param {L5R4Actor} targetActor - Target actor document to extract Armor TN from
 * @returns {number} Target's Armor TN as integer, or 0 if not found/invalid
 */
function armorTnOf(targetActor) {
  if (!targetActor) {
    return 0;
  }

  const armorTn =
    currentValueOf(targetActor?.system?.armorTn) ||
    currentValueOf(targetActor?.system?.wounds?.armorTn) ||
    currentValueOf(targetActor?.system?._derived?.armorTn) ||
    targetActor?.system?.armor?.tn ||
    targetActor?.system?.armor?.armorTn;

  return toInt(armorTn);
}
