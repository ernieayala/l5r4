/**
 * Attack Animation System
 *
 * Handles visual animations for weapon attacks, particularly ranged attacks with bows.
 * Plays projectile animations from attacker to target using Sequencer and JB2A.
 *
 * Key Responsibilities:
 * - Detect bow attacks
 * - Calculate distance between attacker and target
 * - Select appropriate arrow animation based on distance
 * - Play projectile animation from source to target
 *
 * Distance Ranges (JB2A arrow variants):
 * - 05ft: Close range
 * - 15ft: Short range
 * - 30ft: Medium range
 * - 60ft: Long range
 * - 90ft: Extreme range
 *
 * @module services/animations/attack-animations
 * @requires Foundry VTT v13+
 * @requires Sequencer module
 * @requires JB2A module
 */

import { isJB2AAvailable, isSequencerAvailable } from "./asset-library.js";

/**
 * Arrow animation base path for physical white arrows.
 * Distance variant will be appended (05ft, 15ft, 30ft, 60ft, 90ft).
 *
 * @constant {string}
 */
const ARROW_BASE_PATH = "jb2a.arrow.physical.white.01";

/**
 * Available arrow distance variants in ascending order.
 * Used to select closest matching animation for actual distance.
 *
 * @constant {number[]}
 */
const ARROW_DISTANCES = [5, 15, 30, 60, 90];

/**
 * Katana melee attack animation variants.
 * One is randomly selected for each melee attack.
 *
 * @constant {string[]}
 */
const KATANA_VARIANTS = [
  "jb2a.melee_attack.04.katana.01.0",
  "jb2a.melee_attack.04.katana.01.1",
  "jb2a.melee_attack.04.katana.01.2",
  "jb2a.melee_attack.04.katana.01.3"
];

/**
 * Calculate grid distance between two tokens.
 *
 * Uses Foundry's grid system to calculate distance in feet/units.
 * Handles both gridded and gridless scenes.
 *
 * @param {Token} sourceToken - The attacking token
 * @param {Token} targetToken - The target token
 * @returns {number} Distance in grid units (feet)
 */
function calculateDistance(sourceToken, targetToken) {
  if (!sourceToken || !targetToken) {
    return 0;
  }

  // Get token centers
  const source = {
    x: sourceToken.x + sourceToken.width / 2,
    y: sourceToken.y + sourceToken.height / 2
  };

  const target = {
    x: targetToken.x + targetToken.width / 2,
    y: targetToken.y + targetToken.height / 2
  };

  // Calculate distance using Foundry's measurement system
  const ray = new Ray(source, target);
  const distance = canvas.grid.measureDistances([{ ray }], { gridSpaces: true })[0];

  return Math.round(distance);
}

/**
 * Select appropriate arrow animation variant based on distance.
 *
 * Chooses the closest matching distance variant from available options.
 * If distance exceeds all variants, uses the longest (90ft).
 *
 * @param {number} distance - Actual distance in feet
 * @returns {string} Full JB2A arrow animation path
 */
function selectArrowAnimation(distance) {
  // Find the closest distance variant that's >= actual distance
  let selectedDistance = ARROW_DISTANCES[ARROW_DISTANCES.length - 1]; // Default to 90ft

  for (const variant of ARROW_DISTANCES) {
    if (distance <= variant) {
      selectedDistance = variant;
      break;
    }
  }

  // Format distance with leading zero (5 -> 05)
  const formattedDistance = String(selectedDistance).padStart(2, "0");

  return `${ARROW_BASE_PATH}.${formattedDistance}ft`;
}

/**
 * Play melee attack animation from attacker toward target.
 *
 * Creates a katana slash animation using Sequencer that originates from the
 * attacking token and is directed toward the target token. Animation variant
 * is randomly selected from available katana slash animations.
 *
 * Defensive Coding:
 * - Returns early if Sequencer or JB2A not available
 * - Returns early if tokens are missing
 * - Wraps Sequencer API in try/catch
 * - Logs warnings on failure (non-fatal)
 *
 * @param {Token} attackerToken - The token making the attack
 * @param {Token} targetToken - The token being attacked
 * @returns {Promise<void>}
 *
 * @example
 * await playMeleeAttack(attackerToken, targetToken);
 */
export async function playMeleeAttack(attackerToken, targetToken) {
  // Early return: Check module availability
  if (!isSequencerAvailable() || !isJB2AAvailable()) {
    return;
  }

  // Early return: Validate tokens
  if (!attackerToken || !targetToken) {
    console.warn("L5R4 | Missing attacker or target token for melee animation");
    return;
  }

  try {
    // Randomly select a katana variant
    const randomIndex = Math.floor(Math.random() * KATANA_VARIANTS.length);
    const katanaPath = KATANA_VARIANTS[randomIndex];

    // Create and play Sequencer animation
    const sequence = new Sequence();

    sequence
      .effect()
      .file(katanaPath)
      .atLocation(attackerToken)
      .rotateTowards(targetToken)
      .scale(1)
      .waitUntilFinished(-200); // Start next effect 200ms before slash completes

    await sequence.play();
  } catch (error) {
    console.warn("L5R4 | Failed to play melee attack animation:", error);
  }
}

/**
 * Play arrow attack animation from attacker to target.
 *
 * Creates a projectile animation using Sequencer that travels from the
 * attacking token to the target token. Animation variant is automatically
 * selected based on distance between tokens.
 *
 * Defensive Coding:
 * - Returns early if Sequencer or JB2A not available
 * - Returns early if tokens are missing
 * - Wraps Sequencer API in try/catch
 * - Logs warnings on failure (non-fatal)
 *
 * @param {Token} attackerToken - The token making the attack
 * @param {Token} targetToken - The token being attacked
 * @returns {Promise<void>}
 *
 * @example
 * await playArrowAttack(attackerToken, targetToken);
 */
export async function playArrowAttack(attackerToken, targetToken) {
  // Early return: Check module availability
  if (!isSequencerAvailable() || !isJB2AAvailable()) {
    return;
  }

  // Early return: Validate tokens
  if (!attackerToken || !targetToken) {
    console.warn("L5R4 | Missing attacker or target token for arrow animation");
    return;
  }

  try {
    // Calculate distance and select appropriate animation
    const distance = calculateDistance(attackerToken, targetToken);
    const arrowPath = selectArrowAnimation(distance);

    // Create and play Sequencer animation
    const sequence = new Sequence();

    sequence
      .effect()
      .file(arrowPath)
      .atLocation(attackerToken)
      .stretchTo(targetToken)
      .waitUntilFinished(-500); // Start next effect 500ms before arrow completes

    await sequence.play();
  } catch (error) {
    console.warn("L5R4 | Failed to play arrow attack animation:", error);
  }
}

/**
 * Check if a weapon is a bow (ranged weapon).
 *
 * Determines if the weapon should trigger arrow animations.
 * Checks weapon.system.isBow flag (primary) and legacy type checks.
 *
 * L5R4 Weapon Structure:
 * - Modern bows: type='weapon' with system.isBow=true
 * - Legacy bows: type='bow' (pre-v1.0.0 migration)
 *
 * @param {Item} weapon - The weapon item to check
 * @returns {boolean} True if weapon is a bow
 */
export function isBowWeapon(weapon) {
  if (!weapon) {
    return false;
  }

  // Primary check: system.isBow flag (modern weapons)
  if (weapon.system?.isBow === true) {
    return true;
  }

  // Legacy check: type='bow' (pre-v1.0.0 worlds)
  if (weapon.type === "bow") {
    return true;
  }

  // Fallback: Check weapon name for bow/yumi keywords
  const weaponName = weapon.name?.toLowerCase() ?? "";
  return weaponName.includes("bow") || weaponName.includes("yumi");
}

/**
 * Handle attack roll for potential weapon animation.
 *
 * Called when an attack roll is made. Checks if it's a bow or melee attack
 * and plays appropriate animation (arrow for bows, katana slash for melee).
 *
 * @param {Actor} attacker - The attacking actor
 * @param {Actor} target - The target actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<void>}
 */
export async function handleAttackRoll(attacker, target, weapon) {
  if (!weapon) {
    return;
  }

  // Get tokens for attacker and target
  const attackerTokens = attacker?.getActiveTokens() ?? [];
  const targetTokens = target?.getActiveTokens() ?? [];

  if (attackerTokens.length === 0 || targetTokens.length === 0) {
    return;
  }

  // Use first active token for each
  const attackerToken = attackerTokens[0];
  const targetToken = targetTokens[0];

  // Check weapon type and play appropriate animation
  if (isBowWeapon(weapon)) {
    // Ranged attack: Play arrow animation
    await playArrowAttack(attackerToken, targetToken);
  } else if (weapon.type === "weapon") {
    // Melee attack: Play katana slash animation
    await playMeleeAttack(attackerToken, targetToken);
  }
}
