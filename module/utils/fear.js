/**
 * @module utils/fear
 * @description Fear Ranks and the TN to resist them.
 * game-rules/42_fear.md, p.90
 */

/**
 * Failing the Fear roll by this much or more overwhelms the character.
 * game-rules/42_fear.md, p.90
 */
const CATASTROPHIC_MARGIN = 15;

/**
 * The Fear Ranks the book gives, 1 to 10.
 * game-rules/42_fear.md, p.90
 */
export const FEAR_RANKS = Object.freeze({ min: 1, max: 10 });

/**
 * The TN to resist a Fear effect: 5 + 5 × its Rank. Rank 3 gives 20, the book's example.
 * game-rules/42_fear.md, p.90
 * @param {number} rank - Fear Rank
 * @returns {number}
 */
export function getFearTn(rank) {
  return 5 + 5 * rank;
}

/**
 * Whether a failed Fear roll is a Catastrophic Failure, failing by 15 or more: at TN 20, a 5 is and a 6 is not.
 * game-rules/42_fear.md, p.90
 * @param {number} total
 * @param {number} tn
 * @returns {boolean}
 */
export function isCatastrophicFear(total, tn) {
  return total - tn <= -CATASTROPHIC_MARGIN;
}
