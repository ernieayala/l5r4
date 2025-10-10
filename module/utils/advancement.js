/**
 * @fileoverview L5R4 Character Advancement Utilities
 * 
 * Provides mathematical utilities for L5R4's rank/points XP advancement system.
 * Handles conversion between decimal values and rank/points pairs, supporting
 * the XP Manager and character progression mechanics.
 * 
 * **Core Responsibilities:**
 * - **Rank/Points Conversion**: Bidirectional conversion (decimal ↔ rank/points)
 * - **Delta Application**: Add/subtract XP while maintaining valid ranges
 * - **Normalization**: Ensure rank/points stay within L5R4 rules (0-10 ranks, 0-9 points)
 * 
 * **Design Principles:**
 * - **Pure Functions**: No side effects, deterministic outputs
 * - **Range Safety**: Automatic clamping to valid L5R4 ranges
 * - **Point Normalization**: Ensures points ∈ [0,9] with proper carry
 * - **Edge Case Handling**: Properly handles 10.0 (max rank, zero points)
 * 
 * **L5R4 Advancement System:**
 * - Ranks range from 0 to 10
 * - Points range from 0 to 9 within each rank
 * - Decimal representation: rank.points (e.g., 5.6 = rank 5, 6 points)
 * - 10 points roll over to next rank (e.g., 5.10 → 6.0)
 * - Maximum advancement is 10.0 (rank 10, no further points)
 * 
 * **Usage Examples:**
 * ```javascript
 * // Convert rank/points to decimal
 * const value = rankPointsToValue({ rank: 5, points: 6 }); // 5.6
 * 
 * // Convert decimal to rank/points
 * const rp = valueToRankPoints(5.6); // { rank: 5, points: 6, value: 5.6 }
 * 
 * // Apply XP delta
 * const current = { rank: 5, points: 6 };
 * const updated = applyRankPointsDelta(current, 0.5); // { rank: 6, points: 1, value: 6.1 }
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 */

/**
 * Convert a rank/points pair to a single decimal value (e.g., rank 5, points 6 = 5.6).
 * Used for XP calculations and advancement tracking.
 * 
 * Safely handles null/undefined inputs by defaulting to 0.
 * 
 * @param {{rank:number, points:number}|null|undefined} rp - Rank/points object (nullable)
 * @param {number} rp.rank - The rank value (0-10)
 * @param {number} rp.points - The points value (0-9)
 * @returns {number} Combined decimal value
 * @example
 * rankPointsToValue({ rank: 5, points: 6 }); // 5.6
 * rankPointsToValue({ rank: 0, points: 3 }); // 0.3
 * rankPointsToValue({ rank: 10, points: 0 }); // 10.0
 * rankPointsToValue(null); // 0.0 (safe default)
 * @pure
 * @see valueToRankPoints
 */
export function rankPointsToValue(rp) {
  const r = Number(rp?.rank ?? 0) || 0;
  const p = Number(rp?.points ?? 0) || 0;
  return r + (p / 10);
}

/**
 * Convert a decimal value (0.0..10.0) to normalized rank/points.
 * Ensures points ∈ [0,9], and 10.0 => { rank:10, points:0 }.
 * Automatically handles edge cases and clamping to valid ranges.
 * 
 * Safely handles null/undefined/NaN by treating as 0.
 * 
 * @param {number|null|undefined} value - Decimal value to convert (coerced to number)
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {{rank:number, points:number, value:number}} Normalized rank/points object
 * @example
 * valueToRankPoints(5.6);    // { rank: 5, points: 6, value: 5.6 }
 * valueToRankPoints(5.12);   // { rank: 6, points: 2, value: 6.2 } (normalized)
 * valueToRankPoints(10.0);   // { rank: 10, points: 0, value: 10.0 } (max)
 * valueToRankPoints(-1);     // { rank: 0, points: 0, value: 0.0 } (clamped)
 * valueToRankPoints(null);   // { rank: 0, points: 0, value: 0.0 } (safe default)
 * @pure
 * @see rankPointsToValue
 * @see applyRankPointsDelta
 */
export function valueToRankPoints(value, minRank = 0, maxRank = 10) {
  const min = Number(minRank) || 0;
  const max = Number(maxRank) || 10;
  let v = Math.max(min, Math.min(max, Number(value) || 0));
  if (v === max) return { rank: max, points: 0, value: max }; // exact 10.0
  const rank = Math.floor(v);
  let points = Math.round((v - rank) * 10);
  if (points >= 10) return { rank: Math.min(rank + 1, max), points: 0, value: Math.min(rank + 1, max) };
  return { rank, points, value: rank + points / 10 };
}

/**
 * Apply a decimal delta (e.g., +0.1, -1.0) to a rank/points pair and normalize.
 * Used when spending or gaining XP, with automatic normalization and clamping.
 * 
 * Safely handles null/undefined inputs by treating as 0.
 * Internally calls rankPointsToValue and valueToRankPoints for conversion.
 * 
 * @param {{rank:number, points:number}|null|undefined} rp - Current rank/points object (nullable)
 * @param {number|null|undefined} delta - Delta to apply (positive or negative, coerced to number)
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {{rank:number, points:number, value:number}} Updated and normalized rank/points object
 * @example
 * // Add 0.5 (5 points)
 * applyRankPointsDelta({ rank: 5, points: 6 }, 0.5);
 * // { rank: 6, points: 1, value: 6.1 }
 * 
 * // Subtract 1.2
 * applyRankPointsDelta({ rank: 5, points: 6 }, -1.2);
 * // { rank: 4, points: 4, value: 4.4 }
 * 
 * // At maximum (clamped)
 * applyRankPointsDelta({ rank: 10, points: 0 }, 0.5);
 * // { rank: 10, points: 0, value: 10.0 }
 * 
 * // Safe null handling
 * applyRankPointsDelta(null, 0.5);
 * // { rank: 0, points: 5, value: 0.5 }
 * @pure
 * @see rankPointsToValue
 * @see valueToRankPoints
 */
export function applyRankPointsDelta(rp, delta, minRank = 0, maxRank = 10) {
  const now = rankPointsToValue(rp);
  const next = now + Number(delta || 0);
  return valueToRankPoints(next, minRank, maxRank);
}
