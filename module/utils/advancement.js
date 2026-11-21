/**
 * @module utils/advancement
 * @description Utilities for L5R4 character advancement calculations.
 *
 * Handles conversion between rank-points representation and decimal values.
 * In L5R4, traits and skills use a rank (1-10) plus points (0-9) system.
 * This module converts between that representation and decimal values for calculations.
 *
 * Example: Rank 3, 5 points = 3.5 in decimal form
 */

import { getClamped, toNumber } from "./type-coercion.js";

/**
 * Converts rank-points object to decimal value.
 * Rank 3 with 5 points is 3.5; rank 5 with 0 points is 5.
 * @param {object} rp - Rank-points object
 * @param {number} rp.rank - The rank value (0-10)
 * @param {number} rp.points - The points value (0-9)
 * @returns {number} Decimal representation (e.g., rank 3 + 5 points = 3.5)
 */
export function toDecimalRank(rp) {
  const r = toNumber(rp?.rank, 0);
  const p = toNumber(rp?.points, 0);
  return r + p / 10;
}

/**
 * Converts decimal value to rank-points object.
 * 3.5 gives `{ rank: 3, points: 5, value: 3.5 }`; 10.5 with a maximum of 10 gives
 * `{ rank: 10, points: 0, value: 10 }`.
 * @param {number} value - Decimal value to convert
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {{rank: number, points: number, value: number}} The rank (0-10), the points (0-9), and the
 *   normalized decimal value
 */
export function toRankPoints(value, minRank = 0, maxRank = 10) {
  const min = toNumber(minRank, 0);
  const max = toNumber(maxRank, 10);
  const v = getClamped(toNumber(value, 0), min, max);

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
 * Rank 3 with 5 points plus 0.3 gives `{ rank: 3, points: 8, value: 3.8 }`; rank 9 with 8 points plus 0.5,
 * capped at 10, gives `{ rank: 10, points: 0, value: 10 }`.
 * @param {object} rp - Current rank-points object
 * @param {number} rp.rank - Current rank value
 * @param {number} rp.points - Current points value
 * @param {number} delta - Amount to add (positive) or subtract (negative)
 * @param {object} [range]
 * @param {number} [range.minRank=0] - Minimum allowed rank
 * @param {number} [range.maxRank=10] - Maximum allowed rank
 * @returns {{rank: number, points: number, value: number}} The new rank, points, and decimal value
 */
export function applyRankPointsDelta(rp, delta, { minRank = 0, maxRank = 10 } = {}) {
  const now = toDecimalRank(rp);
  const next = now + toNumber(delta, 0);
  return toRankPoints(next, minRank, maxRank);
}
