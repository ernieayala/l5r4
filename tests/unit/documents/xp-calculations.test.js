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
import { calculateInsightRank } from "../../../module/documents/actor/calculations/xp-system.js";

describe("calculateInsightRank", () => {
  describe("L5R4 insight rank thresholds", () => {
    it("should return rank 1 for insight 0-149", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(0)).toBe(1);
      expect(calculateInsightRank(75)).toBe(1);
      expect(calculateInsightRank(149)).toBe(1);
    });

    it("should return rank 2 for insight 150-174", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(150)).toBe(2);
      expect(calculateInsightRank(162)).toBe(2);
      expect(calculateInsightRank(174)).toBe(2);
    });

    it("should return rank 3 for insight 175-199", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(175)).toBe(3);
      expect(calculateInsightRank(187)).toBe(3);
      expect(calculateInsightRank(199)).toBe(3);
    });

    it("should return rank 4 for insight 200-224", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(200)).toBe(4);
      expect(calculateInsightRank(212)).toBe(4);
      expect(calculateInsightRank(224)).toBe(4);
    });

    it("should return rank 5 for insight 225-249", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(225)).toBe(5);
      expect(calculateInsightRank(237)).toBe(5);
      expect(calculateInsightRank(249)).toBe(5);
    });

    it("should return rank 6 for insight 250-274", () => {
      // ARRANGE
      const insight = 250;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(6);
    });

    it("should calculate rank 6+ as +25 insight per rank", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(250)).toBe(6); // 225 + 25
      expect(calculateInsightRank(275)).toBe(7); // 225 + 50
      expect(calculateInsightRank(300)).toBe(8); // 225 + 75
      expect(calculateInsightRank(325)).toBe(9); // 225 + 100
      expect(calculateInsightRank(350)).toBe(10); // 225 + 125
    });
  });

  describe("boundary conditions", () => {
    it("should handle exact threshold values", () => {
      // ACT & ASSERT
      expect(calculateInsightRank(149)).toBe(1); // Just before rank 2
      expect(calculateInsightRank(150)).toBe(2); // Exactly rank 2
      expect(calculateInsightRank(174)).toBe(2); // Just before rank 3
      expect(calculateInsightRank(175)).toBe(3); // Exactly rank 3
    });

    it("should handle very high insight values", () => {
      // ARRANGE
      const veryHighInsight = 1000;

      // ACT
      const result = calculateInsightRank(veryHighInsight);

      // ASSERT
      // 1000 - 225 = 775, 775 / 25 = 31, rank = 5 + 31 = 36
      expect(result).toBe(36);
    });
  });

  describe("edge cases", () => {
    it("should handle zero insight", () => {
      // ARRANGE
      const insight = 0;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Minimum rank is 1
    });

    it("should handle negative insight", () => {
      // ARRANGE
      const insight = -10;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Should not go below rank 1
    });

    it("should handle null insight", () => {
      // ARRANGE
      const insight = null;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Treat as 0, return rank 1
    });

    it("should handle undefined insight", () => {
      // ARRANGE
      const insight = undefined;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Treat as 0, return rank 1
    });

    it("should handle NaN insight", () => {
      // ARRANGE
      const insight = NaN;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Comparison with NaN returns false, should default to rank 1
    });

    it("should handle floating point insight", () => {
      // ARRANGE
      const insight = 150.7;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(2); // 150.7 >= 150, so rank 2
    });
  });

  describe("game scenarios", () => {
    it("should calculate rank for starting character", () => {
      // ARRANGE
      // Starting character: Rings 2+2+2+2+2 = 10, Skills typically 20-40
      // Insight = (10 × 10) + 30 = 130
      const insight = 130;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(1); // Starting characters are rank 1
    });

    it("should calculate rank for experienced character", () => {
      // ARRANGE
      // Experienced character: Rings 13, Skills 62
      // Insight = (13 × 10) + 62 = 192
      const insight = 192;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(3); // Rank 3
    });

    it("should calculate rank for master character", () => {
      // ARRANGE
      // Master character: Rings 20, Skills 80
      // Insight = (20 × 10) + 80 = 280
      const insight = 280;

      // ACT
      const result = calculateInsightRank(insight);

      // ASSERT
      expect(result).toBe(7); // Rank 7 (225 + 55, 55/25 = 2.2, so rank 5 + 2)
    });
  });

  describe("regression tests", () => {
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
        expect(calculateInsightRank(insight)).toBe(expected);
      });
    });

    it("should increment rank 6+ by 1 for every 25 insight", () => {
      // ARRANGE
      const baseInsight = 225; // Rank 5

      // ACT & ASSERT
      for (let i = 0; i < 10; i++) {
        const insight = baseInsight + i * 25;
        const expectedRank = 5 + i;
        expect(calculateInsightRank(insight)).toBe(expectedRank);
      }
    });
  });
});
