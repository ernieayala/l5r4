/**
 * @fileoverview XP Cost Calculation Constants and Formulas
 * 
 * Pure functions and constants for calculating experience point costs according
 * to L5R4 rules. Provides triangular progression formulas and emphasis costs.
 * 
 * **Responsibilities:**
 * - Define XP cost formulas for skill advancement
 * - Calculate triangular progression costs
 * - Provide emphasis cost constants
 * 
 * **Architecture:**
 * Pure mathematical functions with no side effects or runtime dependencies.
 * Used by lifecycle XP tracking modules for cost calculation.
 * 
 * **L5R4 Skill XP Rules:**
 * - Regular skills: Cost = 1+2+3+...+rank (triangular progression)
 * - School skills: First rank is free, then 2+3+4+...+rank
 * - Emphasis: 2 XP per emphasis specialization
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

/**
 * Cost in XP for each emphasis specialization.
 * @constant {number}
 */
export const EMPHASIS_COST = 2;

/**
 * Calculate triangular number (sum of integers from 1 to n).
 * Used for L5R4 skill rank XP cost calculations.
 * 
 * Formula: n × (n + 1) / 2
 * Examples: tri(3) = 1+2+3 = 6, tri(5) = 1+2+3+4+5 = 15
 * 
 * @param {number} n - The number to calculate triangular sum for
 * @returns {number} Sum of integers from 1 to n
 */
export function triangular(n) {
  return (n * (n + 1)) / 2;
}

/**
 * Calculate XP cost for a skill at given rank with optional free ranks.
 * 
 * **School Skills**: First rank (or more) may be free, reducing total cost.
 * Cost = triangular(rank) - triangular(freeRanks)
 * 
 * **Examples:**
 * - Regular skill rank 3: triangular(3) - triangular(0) = 6 - 0 = 6 XP
 * - School skill rank 3 (1 free): triangular(3) - triangular(1) = 6 - 1 = 5 XP
 * - School skill rank 1 (1 free): triangular(1) - triangular(1) = 1 - 1 = 0 XP
 * 
 * @param {number} rank - Current skill rank (1-10+)
 * @param {number} freeRanks - Number of free ranks from school/family bonuses
 * @returns {number} Total XP cost for skill at this rank
 */
export function calculateSkillCost(rank, freeRanks = 0) {
  const baseline = Math.max(0, freeRanks);
  if (rank <= baseline) return 0;
  return triangular(rank) - triangular(baseline);
}

/**
 * Calculate XP delta between two skill ranks.
 * Used for tracking XP cost when skills increase in rank.
 * 
 * @param {number} oldRank - Previous skill rank
 * @param {number} newRank - New skill rank
 * @param {number} freeRanks - Number of free ranks from school/family bonuses
 * @returns {number} XP cost difference (always non-negative)
 */
export function calculateSkillRankDelta(oldRank, newRank, freeRanks = 0) {
  const oldCost = calculateSkillCost(oldRank, freeRanks);
  const newCost = calculateSkillCost(newRank, freeRanks);
  return Math.max(0, newCost - oldCost);
}

/**
 * Calculate XP cost for emphasis additions.
 * 
 * @param {number} oldCount - Previous number of emphases
 * @param {number} newCount - New number of emphases
 * @param {number} freeEmphasis - Number of free emphases from school bonuses
 * @returns {number} XP cost for new emphases (EMPHASIS_COST × paid count)
 */
export function calculateEmphasisCost(oldCount, newCount, freeEmphasis = 0) {
  const oldPaidCount = Math.max(0, oldCount - freeEmphasis);
  const newPaidCount = Math.max(0, newCount - freeEmphasis);
  const emphasisDelta = Math.max(0, newPaidCount - oldPaidCount);
  return emphasisDelta * EMPHASIS_COST;
}
