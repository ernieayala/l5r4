/**
 * Advancement Utilities
 *
 * Handles conversion between rank/points representation and decimal values for
 * character advancement in L5R4. The system tracks character progression (skills,
 * traits, honor, glory, status, etc.) using a rank/points structure where:
 * - **Rank:** The whole number level (0-10)
 * - **Points:** Fractional progress toward next rank (0-9)
 * - **Value:** Decimal representation (rank + points/10)
 *
 * Per L5R4 core rules:
 * - Skills cost XP = next rank (rank 2→3 costs 3 XP)
 * - Traits cost XP = 4 × next rank (Reflexes 2→3 costs 12 XP)
 * - Void Ring costs XP = 6 × next rank (Void 2→3 costs 18 XP)
 * - Maximum starting rank is 4; absolute maximum is 10
 *
 * Used by Foundry DataModel properties: honor, glory, status, insight, shadowTaint.
 *
 * @module utils/advancement
 */

import { clamp } from "./type-coercion.js";

/**
 * Rank/Points object structure used for character advancement tracking.
 *
 * @typedef {Object} RankPoints
 * @property {number} rank - Whole number rank (0-10)
 * @property {number} points - Fractional progress toward next rank (0-9)
 * @property {number} value - Decimal representation (rank + points/10)
 */

/**
 * Converts a rank/points object to its decimal value representation.
 *
 * Performs defensive coercion: treats nullish, undefined, or non-numeric values as 0.
 * Commonly used when reading character progression from Foundry DataModel properties.
 *
 * @param {RankPoints|null|undefined} rp - Rank/points object with optional rank and points properties
 * @returns {number} Decimal value (e.g., rank 3 + 5 points = 3.5)
 */
export function rankPointsToValue(rp) {
  const r = Number(rp?.rank ?? 0) || 0;
  const p = Number(rp?.points ?? 0) || 0;
  return r + p / 10;
}

/**
 * Converts a decimal value to a rank/points object with optional bounds enforcement.
 *
 * Automatically handles:
 * - Value clamping within [minRank, maxRank] range
 * - Points overflow (≥10 points increments rank by 1, resets points to 0)
 * - Max rank ceiling (at maxRank, points locked at 0)
 *
 * Commonly used when setting character progression values from user input or calculations.
 * Per L5R4 rules, most character attributes cap at rank 10.
 *
 * @param {number} value - Decimal value to convert (e.g., 3.5)
 * @param {number} [minRank=0] - Minimum allowed rank (default 0)
 * @param {number} [maxRank=10] - Maximum allowed rank per L5R4 rules (default 10)
 * @returns {RankPoints} Object with rank, points, and value properties
 */
export function valueToRankPoints(value, minRank = 0, maxRank = 10) {
  const min = Number(minRank) || 0;
  const max = Number(maxRank) || 10;
  const v = clamp(Number(value) || 0, min, max);

  if (v === max) {
    return { rank: max, points: 0, value: max };
  }

  let rank = Math.floor(v);
  // Add small epsilon to handle floating point precision issues before rounding
  // e.g., 0.95 * 10 might be 9.499999... which would round to 9 instead of 10
  let points = Math.round((v - rank) * 10 + 0.0001);

  // Handle points overflow (10 points = 1 rank)
  if (points >= 10) {
    rank++;
    points = 0;
  }

  // Enforce max rank cap after overflow
  if (rank > max) {
    rank = max;
    points = 0;
  }

  return { rank, points, value: rank + points / 10 };
}

/**
 * Applies a delta (positive or negative) to a rank/points value and returns the result.
 *
 * Useful for increment/decrement operations in character sheets (e.g., +1 or -1 clicks).
 * The delta can be fractional (e.g., +0.5 adds 5 points) or whole numbers.
 * Result is automatically clamped within [minRank, maxRank] bounds.
 *
 * Used by: PcAdjustmentHandler for trait/skill/honor/glory/status adjustments.
 *
 * @param {RankPoints|null|undefined} rp - Current rank/points object
 * @param {number} delta - Amount to add (positive) or subtract (negative)
 * @param {number} [minRank=0] - Minimum allowed rank (default 0)
 * @param {number} [maxRank=10] - Maximum allowed rank per L5R4 rules (default 10)
 * @returns {RankPoints} New rank/points object after applying delta
 */
export function applyRankPointsDelta(rp, delta, minRank = 0, maxRank = 10) {
  const now = rankPointsToValue(rp);
  const next = now + Number(delta || 0);
  return valueToRankPoints(next, minRank, maxRank);
}
