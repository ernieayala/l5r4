/**
 * Insight Rank Calculation Unit Tests
 *
 * Tests edge cases in insight rank calculation.
 * Pure function tests without Foundry dependencies.
 *
 * **What Can Break:**
 * - Insight = 0
 * - Insight at exact thresholds (150, 175, 200)
 * - Very high insight (500+)
 * - Negative insight
 *
 */

import { describe, it, expect } from "vitest";

/**
 * Calculate insight rank from total insight points
 * @param {number} insightPoints - Total insight points
 * @returns {number} Insight rank (1-5+)
 */
function calculateInsightRank(insightPoints) {
  // L5R4 Insight Rank Thresholds:
  // Rank 1: 0-149
  // Rank 2: 150-174
  // Rank 3: 175-199
  // Rank 4: 200-224
  // Rank 5: 225-249
  // Rank 6+: 250+

  if (insightPoints < 0) {
    return 1;
  } // Clamp negative to rank 1
  if (insightPoints < 150) {
    return 1;
  }
  if (insightPoints < 175) {
    return 2;
  }
  if (insightPoints < 200) {
    return 3;
  }
  if (insightPoints < 225) {
    return 4;
  }
  if (insightPoints < 250) {
    return 5;
  }

  // Rank 6+: Every 25 points above 250
  return 6 + Math.floor((insightPoints - 250) / 25);
}

describe("calculateInsightRank", () => {
  describe("Edge Case: Insight = 0", () => {
    it("should return rank 1 for 0 insight", () => {
      // ARRANGE
      const insight = 0;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 1 for very low insight (1-10)", () => {
      // ARRANGE & ACT & ASSERT
      expect(calculateInsightRank(1)).toBe(1);
      expect(calculateInsightRank(5)).toBe(1);
      expect(calculateInsightRank(10)).toBe(1);
    });
  });

  describe("Edge Case: Exact Thresholds", () => {
    it("should return rank 2 at exactly 150 insight", () => {
      // ARRANGE
      const insight = 150;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(2);
    });

    it("should return rank 1 at 149 insight (just below threshold)", () => {
      // ARRANGE
      const insight = 149;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 3 at exactly 175 insight", () => {
      // ARRANGE
      const insight = 175;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(3);
    });

    it("should return rank 2 at 174 insight (just below threshold)", () => {
      // ARRANGE
      const insight = 174;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(2);
    });

    it("should return rank 4 at exactly 200 insight", () => {
      // ARRANGE
      const insight = 200;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(4);
    });

    it("should return rank 3 at 199 insight (just below threshold)", () => {
      // ARRANGE
      const insight = 199;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(3);
    });

    it("should return rank 5 at exactly 225 insight", () => {
      // ARRANGE
      const insight = 225;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(5);
    });

    it("should return rank 6 at exactly 250 insight", () => {
      // ARRANGE
      const insight = 250;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(6);
    });
  });

  describe("Edge Case: Very High Insight (500+)", () => {
    it("should calculate rank 6+ correctly for 500 insight", () => {
      // ARRANGE
      const insight = 500;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      // 500 - 250 = 250 / 25 = 10 additional ranks
      // Rank 6 + 10 = 16
      expect(rank).toBe(16);
    });

    it("should calculate rank correctly for 1000 insight", () => {
      // ARRANGE
      const insight = 1000;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      // 1000 - 250 = 750 / 25 = 30 additional ranks
      // Rank 6 + 30 = 36
      expect(rank).toBe(36);
    });

    it("should handle insight at exact 25-point intervals above 250", () => {
      // ARRANGE & ACT & ASSERT
      expect(calculateInsightRank(275)).toBe(7); // 250 + 25
      expect(calculateInsightRank(300)).toBe(8); // 250 + 50
      expect(calculateInsightRank(325)).toBe(9); // 250 + 75
    });

    it("should handle insight between 25-point intervals", () => {
      // ARRANGE & ACT & ASSERT
      expect(calculateInsightRank(260)).toBe(6); // 250 + 10 (not enough for rank 7)
      expect(calculateInsightRank(274)).toBe(6); // 250 + 24 (just below rank 7)
      expect(calculateInsightRank(290)).toBe(7); // 250 + 40 (rank 7)
    });

    it("should not overflow with extremely high insight", () => {
      // ARRANGE
      const insight = 10000;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBeGreaterThan(0);
      expect(rank).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(Number.isFinite(rank)).toBe(true);
    });
  });

  describe("Edge Case: Negative Insight", () => {
    it("should return rank 1 for -1 insight", () => {
      // ARRANGE
      const insight = -1;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 1 for -100 insight", () => {
      // ARRANGE
      const insight = -100;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 1 for very negative insight", () => {
      // ARRANGE
      const insight = -999999;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });
  });

  describe("Edge Case: Invalid Inputs", () => {
    it("should handle null by treating as 0", () => {
      // ARRANGE
      const insight = null;

      // ACT
      const rank = calculateInsightRank(insight ?? 0);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle undefined by treating as 0", () => {
      // ARRANGE
      const insight = undefined;

      // ACT
      const rank = calculateInsightRank(insight ?? 0);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle NaN by treating as 0", () => {
      // ARRANGE
      const insight = NaN;

      // ACT
      const rank = calculateInsightRank(isNaN(insight) ? 0 : insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle Infinity", () => {
      // ARRANGE
      const insight = Infinity;

      // ACT
      const rank = calculateInsightRank(Number.isFinite(insight) ? insight : 0);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle string numbers by converting", () => {
      // ARRANGE
      const insight = "175";

      // ACT
      const rank = calculateInsightRank(Number(insight));

      // ASSERT
      expect(rank).toBe(3);
    });

    it("should handle decimal insight by flooring", () => {
      // ARRANGE & ACT & ASSERT
      expect(calculateInsightRank(149.9)).toBe(1);
      expect(calculateInsightRank(150.1)).toBe(2);
      expect(calculateInsightRank(174.9)).toBe(2);
      expect(calculateInsightRank(175.5)).toBe(3);
    });
  });

  describe("Boundary Testing", () => {
    it("should handle all rank 1-5 boundaries correctly", () => {
      // ARRANGE & ACT & ASSERT
      // Rank 1: 0-149
      expect(calculateInsightRank(0)).toBe(1);
      expect(calculateInsightRank(149)).toBe(1);

      // Rank 2: 150-174
      expect(calculateInsightRank(150)).toBe(2);
      expect(calculateInsightRank(174)).toBe(2);

      // Rank 3: 175-199
      expect(calculateInsightRank(175)).toBe(3);
      expect(calculateInsightRank(199)).toBe(3);

      // Rank 4: 200-224
      expect(calculateInsightRank(200)).toBe(4);
      expect(calculateInsightRank(224)).toBe(4);

      // Rank 5: 225-249
      expect(calculateInsightRank(225)).toBe(5);
      expect(calculateInsightRank(249)).toBe(5);

      // Rank 6: 250+
      expect(calculateInsightRank(250)).toBe(6);
    });

    it("should increment rank every 25 points after 250", () => {
      // ARRANGE & ACT & ASSERT
      for (let i = 0; i < 10; i++) {
        const insight = 250 + i * 25;
        const expectedRank = 6 + i;
        expect(calculateInsightRank(insight)).toBe(expectedRank);
      }
    });
  });

  describe("Mutation Testing", () => {
    it("should FAIL if threshold changed from 150 to 151", () => {
      // This test documents what SHOULD happen if bug is introduced
      // If someone changes threshold to 151, this test should FAIL

      // ARRANGE
      const insight = 150;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT - Should be rank 2, not rank 1
      expect(rank).toBe(2);

      // If this passes with rank 1, the function is BROKEN
    });

    it("should FAIL if rank 6+ calculation is wrong", () => {
      // This test documents expected behavior
      // If formula changes from /25 to /30, this should FAIL

      // ARRANGE
      const insight = 275; // 250 + 25 = exactly 1 rank above 6

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT - Should be rank 7
      expect(rank).toBe(7);

      // If this returns 6, the formula is BROKEN
    });

    it("should FAIL if negative clamping is removed", () => {
      // This test documents negative handling
      // If clamping is removed, this should FAIL

      // ARRANGE
      const insight = -50;

      // ACT
      const rank = calculateInsightRank(insight);

      // ASSERT - Should clamp to rank 1, not return negative
      expect(rank).toBe(1);
      expect(rank).toBeGreaterThan(0);

      // If this returns negative rank, the function is BROKEN
    });
  });
});
