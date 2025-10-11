/**
 * @fileoverview L5R4 Target Resolver - Automatic Target Number Detection
 * 
 * Provides automatic target number resolution from selected tokens on the canvas.
 * Handles single-target, multi-target scenarios and resolves Armor TN from
 * various possible actor data paths for maximum compatibility.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { toInt } from "../../../utils/type-coercion.js";
import { T } from "../../../utils/localization.js";

/**
 * Resolve target information from currently selected tokens for attack rolls.
 * Returns auto-populated TN and display information for single or multiple targets.
 * 
 * @param {Actor|null} actor - Attacking actor (for context)
 * @param {string} rollType - Type of roll ("attack" for combat targeting)
 * @returns {{autoTN: number, targetInfo: string, targetData: object|null}} Target resolution result
 * 
 * @example
 * // Single target
 * resolveTargets(actor, "attack");
 * // Returns: { autoTN: 20, targetInfo: " vs Goblin", targetData: {...} }
 * 
 * @example
 * // Multiple targets
 * resolveTargets(actor, "attack");
 * // Returns: { autoTN: 0, targetInfo: " (Multiple Targets)", targetData: {...} }
 * 
 * @example
 * // Non-attack roll
 * resolveTargets(actor, "skill");
 * // Returns: { autoTN: 0, targetInfo: "", targetData: null }
 */
export function resolveTargets(actor, rollType) {
  // Only auto-target for attack rolls
  if (rollType !== "attack" || !actor) {
    return {
      autoTN: 0,
      targetInfo: "",
      targetData: null
    };
  }

  const targetedTokens = Array.from(game.user.targets || []);

  // Single target - populate TN
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
          actor: targetActor // Include target actor for mounted bonus calculation
        }
      };
    }
  }

  // Multiple targets
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

  // No targets
  return {
    autoTN: 0,
    targetInfo: "",
    targetData: null
  };
}

/**
 * Resolve Armor TN from actor with fallback path checking.
 * Tries multiple possible data paths for maximum compatibility with
 * different actor types and system versions.
 * 
 * @param {Actor} targetActor - Target actor to resolve Armor TN from
 * @returns {number} Armor TN value or 0 if not found
 * 
 * @private
 */
function resolveArmorTN(targetActor) {
  if (!targetActor) return 0;

  // Try multiple possible paths for Armor TN
  const armorTN = targetActor?.system?.armorTn?.current
    || (typeof targetActor?.system?.armorTn === 'number' ? targetActor?.system?.armorTn : null)
    || targetActor?.system?.wounds?.armorTn?.current
    || (typeof targetActor?.system?.wounds?.armorTn === 'number' ? targetActor?.system?.wounds?.armorTn : null)
    || targetActor?.system?._derived?.armorTn?.current
    || (typeof targetActor?.system?._derived?.armorTn === 'number' ? targetActor?.system?._derived?.armorTn : null)
    || targetActor?.system?.armor?.tn
    || targetActor?.system?.armor?.armorTn;

  return toInt(armorTN);
}
