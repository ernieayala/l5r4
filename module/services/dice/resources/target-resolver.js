/**
 * Target Resolver Service
 *
 * Resolves attack targeting information from Foundry VTT token selection system.
 * Extracts Armor TN from targeted actors to auto-populate Target Numbers for
 * attack rolls in the L5R4 combat system.
 *
 * Key Responsibilities:
 * - **Token Target Detection**: Query Foundry's game.user.targets for selected tokens
 * - **Armor TN Extraction**: Defensively extract Armor TN from actor data models
 * - **Single Target Optimization**: Auto-populate TN when one target selected
 * - **Multi-Target Handling**: Detect multiple targets (cannot auto-populate TN)
 * - **Schema Compatibility**: Support multiple data paths for migrations
 *
 * L5R4 Game Mechanics:
 * Attack rolls in L5R4 are compared against the target's Armor TN. If the attack
 * roll meets or exceeds the Armor TN, the attack hits. Armor TN is calculated as:
 * (Reflexes × 5) + 5 + armor bonus + stance modifiers
 *
 * This module resolves the already-calculated Armor TN from targeted actors. The
 * actual Armor TN calculation happens in the actor document's prepareDerivedData.
 *
 * Foundry VTT Integration:
 * - Uses game.user.targets (v10+) for player's current token selection
 * - Accesses token.actor to retrieve Actor document from Token
 * - Reads actor.system properties via optional chaining for safety
 * - Handles multiple schema paths for backward compatibility
 *
 * @module services/dice/resources/target-resolver
 * @see {@link https://foundryvtt.com/api/v13/classes/client.User.html#targets|Foundry User Targeting API}
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
 * @typedef {Object} EmptyTarget
 * @property {number} autoTN - Always 0 (no auto-populated Target Number)
 * @property {string} targetInfo - Empty string (no target description text)
 * @property {null} targetData - No target metadata
 */
const EMPTY_TARGET = {
  autoTN: 0,
  targetInfo: "",
  targetData: null
};

/**
 * Single target resolution result with Armor TN.
 *
 * @typedef {Object} SingleTargetResult
 * @property {number} autoTN - Target's Armor TN to auto-populate attack roll TN
 * @property {string} targetInfo - Formatted string for UI display (e.g., " vs Hida Yakamo")
 * @property {Object} targetData - Target metadata for chat message rendering
 * @property {string} targetData.name - Target actor's display name
 * @property {number} targetData.armorTN - Target's Armor TN value
 * @property {boolean} targetData.single - Flag indicating single target (true)
 * @property {string} targetData.vsText - Localized "vs" text
 * @property {L5R4Actor} targetData.actor - Reference to target actor document
 */

/**
 * Multiple target resolution result.
 *
 * @typedef {Object} MultipleTargetResult
 * @property {number} autoTN - Always 0 (cannot auto-populate with multiple targets)
 * @property {string} targetInfo - Formatted string indicating multiple targets
 * @property {Object} targetData - Multi-target metadata
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
export function resolveTargets(actor, rollType) {
  if (rollType !== "attack" || !actor) {
    return EMPTY_TARGET;
  }

  const targetedTokens = Array.from(game.user.targets || []);

  if (targetedTokens.length === 1) {
    const targetActor = targetedTokens[0].actor;
    const armorTN = resolveArmorTN(targetActor);

    if (armorTN > 0) {
      return {
        autoTN: armorTN,
        targetInfo: ` ${T("l5r4.ui.mechanics.combat.targeting.vs")} ${targetActor.name}`,
        targetData: {
          name: targetActor.name,
          armorTN: armorTN,
          single: true,
          vsText: T("l5r4.ui.mechanics.combat.targeting.vs"),
          actor: targetActor
        }
      };
    }
  }

  if (targetedTokens.length > 1) {
    return {
      autoTN: 0,
      targetInfo: ` (${T("l5r4.ui.mechanics.combat.targeting.multipleTargets")})`,
      targetData: {
        multiple: true,
        count: targetedTokens.length,
        multipleText: T("l5r4.ui.mechanics.combat.targeting.multipleTargets")
      }
    };
  }

  return EMPTY_TARGET;
}

/**
 * Extract numeric value from flexible actor data structures.
 *
 * Handles two common data patterns in Foundry actor systems:
 *
 * 1. **Value Objects**: { current: 25, max: 30 } → extracts current
 * 2. **Raw Numbers**: 25 → returns directly
 * 3. **Invalid/Missing**: null, undefined, strings → returns null
 *
 * Used for defensive property access when actor schema may vary across
 * versions or when accessing optional properties that may not exist.
 *
 * Foundry Pattern:
 * Many Foundry systems store attributes as objects with current/max values
 * (e.g., HP: {current: 15, max: 20}). This helper normalizes access.
 *
 * @param {Object|number|*} value - Value to extract from (may be object, number, or invalid)
 * @returns {number|null} Numeric value if found, null otherwise
 * @private
 */
function extractNumericValue(value) {
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
 * - Uses extractNumericValue() to handle both object and raw number formats
 * - Coerces final result via toInt() to ensure valid integer (0 if invalid)
 *
 * @param {L5R4Actor} targetActor - Target actor document to extract Armor TN from
 * @returns {number} Target's Armor TN as integer, or 0 if not found/invalid
 * @private
 */
function resolveArmorTN(targetActor) {
  if (!targetActor) {
    return 0;
  }

  const armorTN =
    extractNumericValue(targetActor?.system?.armorTn) ||
    extractNumericValue(targetActor?.system?.wounds?.armorTn) ||
    extractNumericValue(targetActor?.system?._derived?.armorTn) ||
    targetActor?.system?.armor?.tn ||
    targetActor?.system?.armor?.armorTn;

  return toInt(armorTN);
}
