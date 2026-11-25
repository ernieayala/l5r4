/**
 * @module services/animations/attack-animations
 * @description Plays weapon attack animations with Sequencer and JB2A, on this client only: a katana slash toward the
 * target for a melee attack, and for a bow an arrow from attacker to target.
 */

import { isJb2aAvailable, isMotionReduced, isSequencerAvailable } from "./asset-library.js";

/**
 * The JB2A arrow entry. It holds a file per range (5, 15, 30, 60, 90 feet), and Sequencer stretches the one that
 * covers the distance between the tokens (`SequencerFileRangeFind#getFileForDistance`).
 *
 * @constant {string}
 */
const ARROW_PATH = "jb2a.arrow.physical.white.01";

/**
 * Katana melee attack animation variants.
 * One is randomly selected for each melee attack.
 *
 * @constant {string[]}
 */
const KATANA_VARIANTS = Object.freeze([
  "jb2a.melee_attack.04.katana.01.0",
  "jb2a.melee_attack.04.katana.01.1",
  "jb2a.melee_attack.04.katana.01.2",
  "jb2a.melee_attack.04.katana.01.3"
]);

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
 */
export async function startMeleeAnimation(attackerToken, targetToken) {
  // Early return: Check module availability
  if (!isSequencerAvailable() || !isJb2aAvailable()) {
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

    await sequence.play({ local: true });
  } catch (error) {
    console.warn("L5R4 | Failed to play melee attack animation:", error);
  }
}

/**
 * Play arrow attack animation from attacker to target.
 *
 * Creates a projectile animation using Sequencer that travels from the
 * attacking token to the target token, in the arrow file for that distance.
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
 */
export async function startArrowAnimation(attackerToken, targetToken) {
  // Early return: Check module availability
  if (!isSequencerAvailable() || !isJb2aAvailable()) {
    return;
  }

  // Early return: Validate tokens
  if (!attackerToken || !targetToken) {
    console.warn("L5R4 | Missing attacker or target token for arrow animation");
    return;
  }

  try {
    const sequence = new Sequence();

    sequence
      .effect()
      .file(ARROW_PATH)
      .atLocation(attackerToken)
      .stretchTo(targetToken)
      .waitUntilFinished(-500); // Start next effect 500ms before arrow completes

    await sequence.play({ local: true });
  } catch (error) {
    console.warn("L5R4 | Failed to play arrow attack animation:", error);
  }
}

/**
 * Whether a weapon shoots arrows: a bow (`system.isBow`, the flag the bow rules read), or a `bow` item from a world
 * older than the bow-to-weapon migration. The name does not count (#198 ruling).
 *
 * @param {Item} weapon - The weapon item to check
 * @returns {boolean} True if weapon is a bow
 */
export function isBowWeapon(weapon) {
  return weapon.system.isBow === true || weapon.type === "bow";
}

/**
 * Play a hit's attack animation on this client: an arrow for a bow, a katana slash for any other weapon. Each client
 * plays its own, and only when it sees both tokens and its user did not ask for less motion, so a hidden attacker's
 * square stays hidden (#198).
 *
 * @param {Actor} attacker - The attacking actor
 * @param {Actor} target - The target actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<void>}
 */
export async function startAttackAnimation(attacker, target, weapon) {
  // A user who asked for less motion reads the hit from the chat card (motion.md rule 5)
  if (isMotionReduced()) {
    return;
  }

  // The first of each actor's tokens on this client's canvas, when this client sees it
  const attackerToken = attacker.getActiveTokens()[0];
  const targetToken = target.getActiveTokens()[0];
  if (!attackerToken?.isVisible || !targetToken?.isVisible) {
    return;
  }

  // Check weapon type and play appropriate animation
  if (isBowWeapon(weapon)) {
    // Ranged attack: Play arrow animation
    await startArrowAnimation(attackerToken, targetToken);
  } else if (weapon.type === "weapon") {
    // Melee attack: Play katana slash animation
    await startMeleeAnimation(attackerToken, targetToken);
  }
}
