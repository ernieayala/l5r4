/**
 * XP Cost Calculation Utilities
 *
 * Pure calculation functions for L5R4 character advancement costs.
 * Implements the Experience Point system from the core rulebook for
 * Skills and Emphases.
 *
 * Key Responsibilities:
 * - **Skill XP Costs**: Calculate total or incremental XP for skill ranks
 * - **Emphasis XP Costs**: Calculate XP for skill emphases
 * - **Free Rank Handling**: Account for school-granted free ranks/emphases
 *
 * **L5R4 Rules Context:**
 * - Skills cost XP equal to the next rank (rank 1 = 1 XP, rank 2 = 2 XP, etc.)
 * - Total cost from rank 0→N is a triangular sum: 1+2+3+...+N = N(N+1)/2
 * - Emphases cost 2 XP each per the advancement rules
 * - Schools grant free ranks in school skills (typically rank 1)
 * - Some Techniques or Advantages grant free emphases
 *
 * Usage:
 * - Called by xp-tracking.js when items are created/updated
 * - Referenced in xp-system.js for total XP spent calculations
 * - Used in XP Manager UI for cost previews
 *
 * @module documents/item/constants/xp-costs
 * @see module:documents/item/lifecycle/xp-tracking - XP logging system
 * @see module:documents/actor/calculations/xp-system - Total XP calculations
 */

/**
 * XP cost per emphasis per L5R4 advancement rules.
 *
 * From Character Creation and Advancement rules:
 * "An Emphasis may be purchased for a Skill by spending 2 Experience Points."
 *
 * @constant {number}
 */
export const EMPHASIS_COST = 2;

/**
 * Calculate triangular number (sum from 1 to n).
 *
 * Computes the sum 1 + 2 + 3 + ... + n using the closed-form formula
 * n(n+1)/2. This is the mathematical foundation for L5R4 skill costs
 * since advancing from rank 0 to rank N costs 1+2+3+...+N XP.
 *
 * Mathematical property: triangular(5) = 1+2+3+4+5 = 15
 *
 * Used internally to calculate total skill costs efficiently without
 * iterating through all rank costs.
 *
 * @param {number} n - The upper bound of the summation (rank to calculate to)
 * @returns {number} The sum 1+2+3+...+n, or 0 if n≤0
 */
export function triangular(n) {
  return (n * (n + 1)) / 2;
}

/**
 * Calculate total XP cost to advance a skill from rank 0 to target rank.
 *
 * Implements L5R4 skill advancement rules where each rank costs XP equal
 * to its rank number (rank 1 = 1 XP, rank 2 = 2 XP, rank 3 = 3 XP, etc.).
 *
 * **Free Ranks:** Schools grant rank 1 for free in school skills. This function
 * subtracts the cost of free ranks from the total, so a character with a
 * school skill at rank 3 only pays for ranks 2 and 3 (2+3 = 5 XP total).
 *
 * **L5R4 Rules:**
 * - "Skills may be purchased for a number of Experience Points equal to
 *    the next rank in the Skill."
 * - Schools grant free rank 1 in all school skills
 *
 * Cost calculation:
 * - No free ranks: rank 3 costs triangular(3) = 1+2+3 = 6 XP
 * - 1 free rank: rank 3 costs triangular(3) - triangular(1) = 6-1 = 5 XP
 *
 * @param {number} rank - Target skill rank to calculate cost for
 * @param {number} [freeRanks=0] - Number of free ranks granted (usually 0 or 1)
 * @returns {number} Total XP cost from rank 0 to target rank (accounting for free ranks)
 */
export function calculateSkillCost(rank, freeRanks = 0) {
  const baseline = Math.max(0, freeRanks);
  if (rank <= baseline) return 0;
  return triangular(rank) - triangular(baseline);
}

/**
 * Calculate incremental XP cost to advance a skill from one rank to another.
 *
 * Used when a skill rank changes to determine only the additional XP needed
 * for the rank increase. Handles free ranks properly by using total costs
 * and computing the difference.
 *
 * Scenarios:
 * - Advancing rank 2→3 with no free ranks: costs 3 XP (next rank cost)
 * - Advancing rank 2→3 with 1 free rank: costs 3 XP (next rank cost)
 * - Advancing rank 0→2 with 1 free rank: costs 2 XP (only pay for rank 2)
 * - Decreasing rank (negative delta): returns 0 (no XP refunds)
 *
 * **Usage:** Called by xp-tracking.js when skill rank is updated via sheet.
 *
 * @param {number} oldRank - Current skill rank before change
 * @param {number} newRank - Target skill rank after change
 * @param {number} [freeRanks=0] - Number of free ranks granted (usually 0 or 1)
 * @returns {number} Additional XP cost for the rank change (never negative)
 */
export function calculateSkillRankDelta(oldRank, newRank, freeRanks = 0) {
  const oldCost = calculateSkillCost(oldRank, freeRanks);
  const newCost = calculateSkillCost(newRank, freeRanks);
  return Math.max(0, newCost - oldCost);
}

/**
 * Calculate incremental XP cost when adding emphases to a skill.
 *
 * Implements L5R4 emphasis advancement rules where each emphasis costs 2 XP.
 * Handles free emphases granted by Schools, Techniques, or Advantages
 * (e.g., "Gain one free emphasis in a School skill").
 *
 * **L5R4 Rules:**
 * - "An Emphasis may be purchased for a Skill by spending 2 Experience Points."
 * - Some Techniques grant free emphases in specific skills
 * - Emphases allow re-rolling 1s when applicable to the task
 *
 * Cost calculation:
 * - Adding 1st emphasis with no free: 1 × 2 = 2 XP
 * - Adding 2nd emphasis with no free: 1 × 2 = 2 XP (emphases stack)
 * - Adding 2nd emphasis with 1 free: (2-1) × 2 = 2 XP (first is free)
 * - Removing emphases: returns 0 (no XP refunds)
 *
 * **Usage:** Called by xp-tracking.js when skill emphasis string is updated.
 *
 * @param {number} oldCount - Number of emphases before change
 * @param {number} newCount - Number of emphases after change
 * @param {number} [freeEmphasis=0] - Number of free emphases granted (usually 0 or 1)
 * @returns {number} Additional XP cost for new emphases (never negative)
 */
export function calculateEmphasisCost(oldCount, newCount, freeEmphasis = 0) {
  const oldPaidCount = Math.max(0, oldCount - freeEmphasis);
  const newPaidCount = Math.max(0, newCount - freeEmphasis);
  const emphasisDelta = Math.max(0, newPaidCount - oldPaidCount);
  return emphasisDelta * EMPHASIS_COST;
}
