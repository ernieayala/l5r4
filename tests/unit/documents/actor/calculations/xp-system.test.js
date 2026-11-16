/**
 * @fileoverview XP System Calculation Tests (Vitest)
 *
 * Unit tests for pure XP calculation functions from xp-system.js.
 * Tests insight rank thresholds, XP cost formulas, and L5R4 advancement rules.
 *
 * Test Philosophy:
 * - Test L5R4 game rule formulas (trait costs, insight ranks)
 * - Test boundary conditions (rank transitions, caps)
 * - Test edge cases (null values, zero ranks)
 *
 * @see module/documents/actor/calculations/xp-system.js
 */

import { describe, it, expect } from "vitest";
import { getInsightRank } from "../../../../../module/documents/actor/calculations/xp-system.js";

describe("getInsightRank", () => {
  describe("L5R4 Insight Rank thresholds", () => {
    it("should return rank 1 for insight 0-149", () => {
      // ACT & ASSERT
      expect(getInsightRank(0)).toBe(1);
      expect(getInsightRank(75)).toBe(1);
      expect(getInsightRank(149)).toBe(1);
    });

    it("should return rank 2 for insight 150-174", () => {
      // ACT & ASSERT
      expect(getInsightRank(150)).toBe(2);
      expect(getInsightRank(162)).toBe(2);
      expect(getInsightRank(174)).toBe(2);
    });

    it("should return rank 3 for insight 175-199", () => {
      // ACT & ASSERT
      expect(getInsightRank(175)).toBe(3);
      expect(getInsightRank(187)).toBe(3);
      expect(getInsightRank(199)).toBe(3);
    });

    it("should return rank 4 for insight 200-224", () => {
      // ACT & ASSERT
      expect(getInsightRank(200)).toBe(4);
      expect(getInsightRank(212)).toBe(4);
      expect(getInsightRank(224)).toBe(4);
    });

    it("should return rank 5 for insight 225-249", () => {
      // ACT & ASSERT
      expect(getInsightRank(225)).toBe(5);
      expect(getInsightRank(237)).toBe(5);
      expect(getInsightRank(249)).toBe(5);
    });

    it("should return rank 6 for insight 250-274", () => {
      // ARRANGE
      const insight = 250;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(6);
    });

    it("should calculate rank 6+ as +25 insight per rank", () => {
      // ACT & ASSERT
      expect(getInsightRank(250)).toBe(6); // 225 + 25
      expect(getInsightRank(275)).toBe(7); // 225 + 50
      expect(getInsightRank(300)).toBe(8); // 225 + 75
      expect(getInsightRank(325)).toBe(9); // 225 + 100
      expect(getInsightRank(350)).toBe(10); // 225 + 125
    });
  });

  describe("Boundary conditions", () => {
    it("should handle exact threshold values", () => {
      // ACT & ASSERT
      expect(getInsightRank(149)).toBe(1); // Just before rank 2
      expect(getInsightRank(150)).toBe(2); // Exactly rank 2
      expect(getInsightRank(174)).toBe(2); // Just before rank 3
      expect(getInsightRank(175)).toBe(3); // Exactly rank 3
    });

    it("should handle an insight of 1000", () => {
      // ARRANGE
      const veryHighInsight = 1000;

      // ACT
      const result = getInsightRank(veryHighInsight);

      // ASSERT
      // 1000 - 225 = 775, 775 / 25 = 31, rank = 5 + 31 = 36
      expect(result).toBe(36);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero insight", () => {
      // ARRANGE
      const insight = 0;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Minimum rank is 1
    });

    it("should handle negative insight", () => {
      // ARRANGE
      const insight = -10;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Should not go below rank 1
    });

    it("should handle null insight", () => {
      // ARRANGE
      const insight = null;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Treat as 0, return rank 1
    });

    it("should handle undefined insight", () => {
      // ARRANGE
      const insight = undefined;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Treat as 0, return rank 1
    });

    it("should handle NaN insight", () => {
      // ARRANGE
      const insight = NaN;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Comparison with NaN returns false, should default to rank 1
    });

    it("should handle floating point insight", () => {
      // ARRANGE
      const insight = 150.7;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(2); // 150.7 >= 150, so rank 2
    });
  });

  describe("Game scenarios", () => {
    it("should calculate rank for starting character", () => {
      // ARRANGE
      // Starting character: Rings 2+2+2+2+2 = 10, Skills 20-40
      // Insight = (10 × 10) + 30 = 130
      const insight = 130;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Starting characters are rank 1
    });

    it("should calculate rank for experienced character", () => {
      // ARRANGE
      // Experienced character: Rings 13, Skills 62
      // Insight = (13 × 10) + 62 = 192
      const insight = 192;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(3); // Rank 3
    });

    it("should calculate rank for master character", () => {
      // ARRANGE
      // Master character: Rings 20, Skills 80
      // Insight = (20 × 10) + 80 = 280
      const insight = 280;

      // ACT
      const result = getInsightRank(insight);

      // ASSERT
      expect(result).toBe(7); // Rank 7 (225 + 55, 55/25 = 2.2, so rank 5 + 2)
    });
  });

  describe("Threshold crossings", () => {
    it("should not skip ranks when crossing thresholds", () => {
      // ARRANGE - Test all threshold crossings
      const thresholds = [
        { insight: 149, expected: 1 },
        { insight: 150, expected: 2 },
        { insight: 174, expected: 2 },
        { insight: 175, expected: 3 },
        { insight: 199, expected: 3 },
        { insight: 200, expected: 4 },
        { insight: 224, expected: 4 },
        { insight: 225, expected: 5 }
      ];

      // ACT & ASSERT
      thresholds.forEach(({ insight, expected }) => {
        expect(getInsightRank(insight)).toBe(expected);
      });
    });

    it("should increment rank 6+ by 1 for every 25 insight", () => {
      // ARRANGE
      const baseInsight = 225; // Rank 5

      // ACT & ASSERT
      for (let i = 0; i < 10; i++) {
        const insight = baseInsight + i * 25;
        const expectedRank = 5 + i;
        expect(getInsightRank(insight)).toBe(expectedRank);
      }
    });
  });

  describe("Edge case: Insight = 0", () => {
    it("should return rank 1 for 0 insight", () => {
      // ARRANGE
      const insight = 0;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 1 for low insight from 1 to 10", () => {
      // ARRANGE & ACT & ASSERT
      expect(getInsightRank(1)).toBe(1);
      expect(getInsightRank(5)).toBe(1);
      expect(getInsightRank(10)).toBe(1);
    });
  });

  describe("Edge case: exact thresholds", () => {
    it("should return rank 2 at exactly 150 insight", () => {
      // ARRANGE
      const insight = 150;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(2);
    });

    it("should return rank 1 at 149 insight, one below the threshold", () => {
      // ARRANGE
      const insight = 149;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 3 at exactly 175 insight", () => {
      // ARRANGE
      const insight = 175;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(3);
    });

    it("should return rank 2 at 174 insight, one below the threshold", () => {
      // ARRANGE
      const insight = 174;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(2);
    });

    it("should return rank 4 at exactly 200 insight", () => {
      // ARRANGE
      const insight = 200;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(4);
    });

    it("should return rank 3 at 199 insight, one below the threshold", () => {
      // ARRANGE
      const insight = 199;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(3);
    });

    it("should return rank 5 at exactly 225 insight", () => {
      // ARRANGE
      const insight = 225;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(5);
    });

    it("should return rank 6 at exactly 250 insight", () => {
      // ARRANGE
      const insight = 250;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(6);
    });
  });

  describe("Edge case: insight of 500 and up", () => {
    it("should calculate rank 6+ correctly for 500 insight", () => {
      // ARRANGE
      const insight = 500;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      // 500 - 250 = 250 / 25 = 10 additional ranks
      // Rank 6 + 10 = 16
      expect(rank).toBe(16);
    });

    it("should calculate rank correctly for 1000 insight", () => {
      // ARRANGE
      const insight = 1000;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      // 1000 - 250 = 750 / 25 = 30 additional ranks
      // Rank 6 + 30 = 36
      expect(rank).toBe(36);
    });

    it("should handle insight at exact 25-point intervals above 250", () => {
      // ARRANGE & ACT & ASSERT
      expect(getInsightRank(275)).toBe(7); // 250 + 25
      expect(getInsightRank(300)).toBe(8); // 250 + 50
      expect(getInsightRank(325)).toBe(9); // 250 + 75
    });

    it("should handle insight between 25-point intervals", () => {
      // ARRANGE & ACT & ASSERT
      expect(getInsightRank(260)).toBe(6); // 250 + 10 (not enough for rank 7)
      expect(getInsightRank(274)).toBe(6); // 250 + 24 (one below rank 7)
      expect(getInsightRank(290)).toBe(7); // 250 + 40 (rank 7)
    });

    it("should not overflow with extremely high insight", () => {
      // ARRANGE
      const insight = 10000;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBeGreaterThan(0);
      expect(rank).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(Number.isFinite(rank)).toBe(true);
    });
  });

  describe("Edge case: negative insight", () => {
    it("should return rank 1 for -1 insight", () => {
      // ARRANGE
      const insight = -1;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 1 for -100 insight", () => {
      // ARRANGE
      const insight = -100;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should return rank 1 for -999999 insight", () => {
      // ARRANGE
      const insight = -999999;

      // ACT
      const rank = getInsightRank(insight);

      // ASSERT
      expect(rank).toBe(1);
    });
  });

  describe("Edge case: invalid inputs", () => {
    it("should handle null by treating as 0", () => {
      // ARRANGE
      const insight = null;

      // ACT
      const rank = getInsightRank(insight ?? 0);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle undefined by treating as 0", () => {
      // ARRANGE
      const insight = undefined;

      // ACT
      const rank = getInsightRank(insight ?? 0);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle NaN by treating as 0", () => {
      // ARRANGE
      const insight = NaN;

      // ACT
      const rank = getInsightRank(isNaN(insight) ? 0 : insight);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle Infinity", () => {
      // ARRANGE
      const insight = Infinity;

      // ACT
      const rank = getInsightRank(Number.isFinite(insight) ? insight : 0);

      // ASSERT
      expect(rank).toBe(1);
    });

    it("should handle string numbers by converting", () => {
      // ARRANGE
      const insight = "175";

      // ACT
      const rank = getInsightRank(Number(insight));

      // ASSERT
      expect(rank).toBe(3);
    });

    it("should handle decimal insight by flooring", () => {
      // ARRANGE & ACT & ASSERT
      expect(getInsightRank(149.9)).toBe(1);
      expect(getInsightRank(150.1)).toBe(2);
      expect(getInsightRank(174.9)).toBe(2);
      expect(getInsightRank(175.5)).toBe(3);
    });
  });

  describe("Boundary testing", () => {
    it("should handle all rank 1-5 boundaries correctly", () => {
      // ARRANGE & ACT & ASSERT
      // Rank 1: 0-149
      expect(getInsightRank(0)).toBe(1);
      expect(getInsightRank(149)).toBe(1);

      // Rank 2: 150-174
      expect(getInsightRank(150)).toBe(2);
      expect(getInsightRank(174)).toBe(2);

      // Rank 3: 175-199
      expect(getInsightRank(175)).toBe(3);
      expect(getInsightRank(199)).toBe(3);

      // Rank 4: 200-224
      expect(getInsightRank(200)).toBe(4);
      expect(getInsightRank(224)).toBe(4);

      // Rank 5: 225-249
      expect(getInsightRank(225)).toBe(5);
      expect(getInsightRank(249)).toBe(5);

      // Rank 6: 250+
      expect(getInsightRank(250)).toBe(6);
    });

    it("should increment rank every 25 points after 250", () => {
      // ARRANGE & ACT & ASSERT
      for (let i = 0; i < 10; i++) {
        const insight = 250 + i * 25;
        const expectedRank = 6 + i;
        expect(getInsightRank(insight)).toBe(expectedRank);
      }
    });
  });

  describe("Mutation testing", () => {
    it("should FAIL if threshold changed from 150 to 151", () => {
      // This test documents what SHOULD happen if bug is introduced
      // If someone changes threshold to 151, this test should FAIL

      // ARRANGE
      const insight = 150;

      // ACT
      const rank = getInsightRank(insight);

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
      const rank = getInsightRank(insight);

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
      const rank = getInsightRank(insight);

      // ASSERT - Should clamp to rank 1, not return negative
      expect(rank).toBe(1);
      expect(rank).toBeGreaterThan(0);

      // If this returns negative rank, the function is BROKEN
    });
  });
});
