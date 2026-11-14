/**
 * @module fear
 * @description Fear Ranks and the TN to resist them (Core Rulebook p.90, `game-rules/42_fear.md`).
 */

/** The Fear Ranks the book gives, 1 to 10 (p.90). */
export const FEAR_RANKS = Object.freeze({ min: 1, max: 10 });

/**
 * The TN to resist a Fear effect: 5 + 5 × its Rank (p.90).
 * @param {number} rank  Fear Rank
 * @returns {number}
 *
 * @example
 * fearTN(3); // 20, the book's example
 */
export function fearTN(rank) {
  return 5 + 5 * rank;
}
