/**
 * @module advancement
 * @description Utilities for L5R4 character advancement calculations.
 *
 * Handles conversion between rank-points representation and decimal values.
 * In L5R4, traits and skills use a rank (1-10) plus points (0-9) system.
 * This module converts between that representation and decimal values for calculations.
 *
 * Example: Rank 3, 5 points = 3.5 in decimal form
 */

import { clamp, toNumber } from "./type-coercion.js";

/**
 * Converts rank-points object to decimal value.
 *
 * @param {Object} rp - Rank-points object
 * @param {number} rp.rank - The rank value (0-10)
 * @param {number} rp.points - The points value (0-9)
 * @returns {number} Decimal representation (e.g., rank 3 + 5 points = 3.5)
 *
 * @example
 * rankPointsToValue({ rank: 3, points: 5 }) // Returns 3.5
 * rankPointsToValue({ rank: 5, points: 0 }) // Returns 5.0
 */
export function rankPointsToValue(rp) {
  const r = toNumber(rp?.rank, 0);
  const p = toNumber(rp?.points, 0);
  return r + p / 10;
}

/**
 * Converts decimal value to rank-points object.
 *
 * @param {number} value - Decimal value to convert
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {Object} Rank-points object with normalized values
 * @returns {number} return.rank - The rank component (0-10)
 * @returns {number} return.points - The points component (0-9)
 * @returns {number} return.value - The normalized decimal value
 *
 * @example
 * valueToRankPoints(3.5) // Returns { rank: 3, points: 5, value: 3.5 }
 * valueToRankPoints(10.5, 0, 10) // Returns { rank: 10, points: 0, value: 10 }
 */
export function valueToRankPoints(value, minRank = 0, maxRank = 10) {
  const min = toNumber(minRank, 0);
  const max = toNumber(maxRank, 10);
  const v = clamp(toNumber(value, 0), min, max);

  // At maximum rank, always return max rank with 0 points
  if (v === max) {
    return { rank: max, points: 0, value: max };
  }

  let rank = Math.floor(v);
  // Add 0.0001 to handle floating point precision issues
  let points = Math.round((v - rank) * 10 + 0.0001);

  // Handle points overflow (e.g., 9.95 rounds to 10 points)
  if (points >= 10) {
    rank++;
    points = 0;
  }

  // Enforce maximum rank constraint
  if (rank > max) {
    rank = max;
    points = 0;
  }

  return { rank, points, value: rank + points / 10 };
}

/**
 * Applies a delta to rank-points and returns normalized result.
 *
 * @param {Object} rp - Current rank-points object
 * @param {number} rp.rank - Current rank value
 * @param {number} rp.points - Current points value
 * @param {number} delta - Amount to add (positive) or subtract (negative)
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {Object} New rank-points object after applying delta
 * @returns {number} return.rank - The new rank component
 * @returns {number} return.points - The new points component
 * @returns {number} return.value - The new decimal value
 *
 * @example
 * applyRankPointsDelta({ rank: 3, points: 5 }, 0.3) // Returns { rank: 3, points: 8, value: 3.8 }
 * applyRankPointsDelta({ rank: 9, points: 8 }, 0.5, 0, 10) // Returns { rank: 10, points: 0, value: 10 }
 */
export function applyRankPointsDelta(rp, delta, minRank = 0, maxRank = 10) {
  const now = rankPointsToValue(rp);
  const next = now + toNumber(delta, 0);
  return valueToRankPoints(next, minRank, maxRank);
}
