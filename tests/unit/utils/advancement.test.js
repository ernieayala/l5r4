/**
 * Unit Tests: advancement.js
 *
 * Tests rank/points conversion utilities for L5R4 character advancement.
 * Validates conversion between decimal values and rank/points structures.
 *
 * Test Priority: Tier 2 (Important - Character progression system)
 */

import { describe, it, expect } from "vitest";
import {
  rankPointsToValue,
  valueToRankPoints,
  applyRankPointsDelta
} from "../../../module/utils/advancement.js";

describe("rankPointsToValue", () => {
  describe("standard conversions", () => {
    it("should convert rank 3, 0 points to 3.0", () => {
      const result = rankPointsToValue({ rank: 3, points: 0 });
      expect(result).toBe(3.0);
    });

    it("should convert rank 3, 5 points to 3.5", () => {
      const result = rankPointsToValue({ rank: 3, points: 5 });
      expect(result).toBe(3.5);
    });

    it("should convert rank 2, 7 points to 2.7", () => {
      const result = rankPointsToValue({ rank: 2, points: 7 });
      expect(result).toBe(2.7);
    });

    it("should convert rank 0, 0 points to 0.0", () => {
      const result = rankPointsToValue({ rank: 0, points: 0 });
      expect(result).toBe(0.0);
    });

    it("should convert rank 10, 0 points to 10.0", () => {
      const result = rankPointsToValue({ rank: 10, points: 0 });
      expect(result).toBe(10.0);
    });

    it("should convert rank 5, 9 points to 5.9", () => {
      const result = rankPointsToValue({ rank: 5, points: 9 });
      expect(result).toBe(5.9);
    });
  });

  describe("edge cases", () => {
    it("should handle null object", () => {
      const result = rankPointsToValue(null);
      expect(result).toBe(0);
    });

    it("should handle undefined object", () => {
      const result = rankPointsToValue(undefined);
      expect(result).toBe(0);
    });

    it("should handle missing rank property", () => {
      const result = rankPointsToValue({ points: 5 });
      expect(result).toBe(0.5); // 0 rank + 5 points
    });

    it("should handle missing points property", () => {
      const result = rankPointsToValue({ rank: 3 });
      expect(result).toBe(3.0); // 3 rank + 0 points
    });

    it("should handle empty object", () => {
      const result = rankPointsToValue({});
      expect(result).toBe(0);
    });

    it("should coerce string rank to number", () => {
      const result = rankPointsToValue({ rank: "3", points: 5 });
      expect(result).toBe(3.5);
    });

    it("should coerce string points to number", () => {
      const result = rankPointsToValue({ rank: 3, points: "5" });
      expect(result).toBe(3.5);
    });

    it("should handle NaN rank", () => {
      const result = rankPointsToValue({ rank: NaN, points: 5 });
      expect(result).toBe(0.5);
    });

    it("should handle NaN points", () => {
      const result = rankPointsToValue({ rank: 3, points: NaN });
      expect(result).toBe(3.0);
    });

    it("should handle negative rank", () => {
      const result = rankPointsToValue({ rank: -2, points: 5 });
      expect(result).toBe(-1.5); // Negative allowed
    });

    it("should handle negative points", () => {
      const result = rankPointsToValue({ rank: 3, points: -5 });
      expect(result).toBe(2.5); // Negative allowed
    });

    it("should handle points > 9", () => {
      const result = rankPointsToValue({ rank: 3, points: 15 });
      expect(result).toBe(4.5); // No clamping here
    });
  });
});

describe("valueToRankPoints", () => {
  describe("standard conversions", () => {
    it("should convert 3.0 to rank 3, 0 points", () => {
      const result = valueToRankPoints(3.0);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(0);
      expect(result.value).toBe(3.0);
    });

    it("should convert 3.5 to rank 3, 5 points", () => {
      const result = valueToRankPoints(3.5);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(5);
      expect(result.value).toBe(3.5);
    });

    it("should convert 2.7 to rank 2, 7 points", () => {
      const result = valueToRankPoints(2.7);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(7);
      expect(result.value).toBe(2.7);
    });

    it("should convert 0.0 to rank 0, 0 points", () => {
      const result = valueToRankPoints(0.0);
      expect(result.rank).toBe(0);
      expect(result.points).toBe(0);
      expect(result.value).toBe(0.0);
    });

    it("should convert 10.0 to rank 10, 0 points", () => {
      const result = valueToRankPoints(10.0);
      expect(result.rank).toBe(10);
      expect(result.points).toBe(0);
      expect(result.value).toBe(10.0);
    });

    it("should convert 5.9 to rank 5, 9 points", () => {
      const result = valueToRankPoints(5.9);
      expect(result.rank).toBe(5);
      expect(result.points).toBe(9);
      expect(result.value).toBe(5.9);
    });
  });

  describe("rounding behavior", () => {
    it("should round 3.14 to rank 3, 1 point", () => {
      const result = valueToRankPoints(3.14);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(1); // Rounds to nearest
    });

    it("should round 3.16 to rank 3, 2 points", () => {
      const result = valueToRankPoints(3.16);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(2);
    });

    it("should round 3.95 to rank 3, 10 points -> rank 4, 0 points", () => {
      const result = valueToRankPoints(3.95);
      expect(result.rank).toBe(4);
      expect(result.points).toBe(0); // 10 points overflow
    });

    it("should round 3.99 to rank 4, 0 points", () => {
      const result = valueToRankPoints(3.99);
      expect(result.rank).toBe(4);
      expect(result.points).toBe(0);
    });
  });

  describe("bounds enforcement", () => {
    it("should clamp to maxRank (default 10)", () => {
      const result = valueToRankPoints(15.0);
      expect(result.rank).toBe(10);
      expect(result.points).toBe(0);
      expect(result.value).toBe(10);
    });

    it("should clamp to minRank (default 0)", () => {
      const result = valueToRankPoints(-5.0);
      expect(result.rank).toBe(0);
      expect(result.points).toBe(0);
      expect(result.value).toBe(0);
    });

    it("should respect custom minRank", () => {
      const result = valueToRankPoints(1.0, 2, 10);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(0);
      expect(result.value).toBe(2);
    });

    it("should respect custom maxRank", () => {
      const result = valueToRankPoints(10.0, 0, 5);
      expect(result.rank).toBe(5);
      expect(result.points).toBe(0);
      expect(result.value).toBe(5);
    });

    it("should lock points at 0 when at maxRank", () => {
      const result = valueToRankPoints(10.0, 0, 10);
      expect(result.rank).toBe(10);
      expect(result.points).toBe(0);
    });

    it("should handle value between min and max", () => {
      const result = valueToRankPoints(3.5, 2, 8);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(5);
    });
  });

  describe("points overflow handling", () => {
    it("should increment rank when points reach 10", () => {
      // Simulating adding to 2.95 which rounds to 3.0 after overflow
      const result = valueToRankPoints(2.99);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(0);
    });

    it("should not overflow beyond maxRank", () => {
      const result = valueToRankPoints(9.95, 0, 10);
      expect(result.rank).toBe(10);
      expect(result.points).toBe(0); // Capped at max
    });

    it("should handle exact 10 points case", () => {
      // Internal logic: if points >= 10, increment rank
      // This tests the edge case
      const value = 2 + 10 / 10; // 3.0
      const result = valueToRankPoints(value);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      const result = valueToRankPoints(null);
      expect(result.rank).toBe(0);
      expect(result.points).toBe(0);
    });

    it("should handle undefined value", () => {
      const result = valueToRankPoints(undefined);
      expect(result.rank).toBe(0);
      expect(result.points).toBe(0);
    });

    it("should handle NaN value", () => {
      const result = valueToRankPoints(NaN);
      expect(result.rank).toBe(0);
      expect(result.points).toBe(0);
    });

    it("should coerce string value to number", () => {
      const result = valueToRankPoints("3.5");
      expect(result.rank).toBe(3);
      expect(result.points).toBe(5);
    });

    it("should handle Infinity value", () => {
      const result = valueToRankPoints(Infinity);
      expect(result.rank).toBe(10); // Clamped to max
      expect(result.points).toBe(0);
    });

    it("should handle negative Infinity value", () => {
      const result = valueToRankPoints(-Infinity);
      expect(result.rank).toBe(0); // Clamped to min
      expect(result.points).toBe(0);
    });

    it("should handle null minRank", () => {
      const result = valueToRankPoints(5.0, null, 10);
      expect(result.rank).toBe(5);
    });

    it("should handle null maxRank", () => {
      const result = valueToRankPoints(5.0, 0, null);
      expect(result.rank).toBe(5);
    });

    it("should handle minRank > maxRank (edge case)", () => {
      const result = valueToRankPoints(5.0, 10, 0);
      // Behavior may vary, but should not crash
      expect(result).toHaveProperty("rank");
      expect(result).toHaveProperty("points");
    });
  });
});

describe("applyRankPointsDelta", () => {
  describe("positive deltas (increase)", () => {
    it("should add 1.0 to rank 2, 0 points", () => {
      const current = { rank: 2, points: 0 };
      const result = applyRankPointsDelta(current, 1.0);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(0);
    });

    it("should add 0.5 to rank 2, 3 points", () => {
      const current = { rank: 2, points: 3 };
      const result = applyRankPointsDelta(current, 0.5);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(8);
    });

    it("should add 0.1 to rank 3, 9 points (overflow)", () => {
      const current = { rank: 3, points: 9 };
      const result = applyRankPointsDelta(current, 0.1);
      expect(result.rank).toBe(4);
      expect(result.points).toBe(0);
    });

    it("should add 2.5 to rank 1, 0 points", () => {
      const current = { rank: 1, points: 0 };
      const result = applyRankPointsDelta(current, 2.5);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(5);
    });
  });

  describe("negative deltas (decrease)", () => {
    it("should subtract 1.0 from rank 3, 0 points", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, -1.0);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(0);
    });

    it("should subtract 0.5 from rank 2, 7 points", () => {
      const current = { rank: 2, points: 7 };
      const result = applyRankPointsDelta(current, -0.5);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(2);
    });

    it("should subtract 0.3 from rank 2, 2 points (underflow)", () => {
      const current = { rank: 2, points: 2 };
      const result = applyRankPointsDelta(current, -0.3);
      expect(result.rank).toBe(1);
      expect(result.points).toBe(9);
    });

    it("should subtract 5.0 from rank 3, 0 points (clamp to min)", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, -5.0);
      expect(result.rank).toBe(0); // Clamped to minRank
      expect(result.points).toBe(0);
    });
  });

  describe("bounds enforcement", () => {
    it("should not exceed maxRank", () => {
      const current = { rank: 9, points: 0 };
      const result = applyRankPointsDelta(current, 5.0, 0, 10);
      expect(result.rank).toBe(10);
      expect(result.points).toBe(0);
    });

    it("should not go below minRank", () => {
      const current = { rank: 1, points: 0 };
      const result = applyRankPointsDelta(current, -5.0, 0, 10);
      expect(result.rank).toBe(0);
      expect(result.points).toBe(0);
    });

    it("should respect custom minRank", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, -5.0, 2, 10);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(0);
    });

    it("should respect custom maxRank", () => {
      const current = { rank: 4, points: 0 };
      const result = applyRankPointsDelta(current, 5.0, 0, 5);
      expect(result.rank).toBe(5);
      expect(result.points).toBe(0);
    });
  });

  describe("zero delta", () => {
    it("should return same value for delta 0", () => {
      const current = { rank: 3, points: 5 };
      const result = applyRankPointsDelta(current, 0);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("should handle null current object", () => {
      const result = applyRankPointsDelta(null, 1.0);
      expect(result.rank).toBe(1);
      expect(result.points).toBe(0);
    });

    it("should handle undefined current object", () => {
      const result = applyRankPointsDelta(undefined, 1.0);
      expect(result.rank).toBe(1);
      expect(result.points).toBe(0);
    });

    it("should handle null delta", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, null);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(0);
    });

    it("should handle undefined delta", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, undefined);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(0);
    });

    it("should coerce string delta to number", () => {
      const current = { rank: 2, points: 0 };
      const result = applyRankPointsDelta(current, "1.5");
      expect(result.rank).toBe(3);
      expect(result.points).toBe(5);
    });

    it("should handle NaN delta", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, NaN);
      expect(result.rank).toBe(3); // No change
      expect(result.points).toBe(0);
    });

    it("should handle Infinity delta", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, Infinity);
      expect(result.rank).toBe(10); // Clamped to max
      expect(result.points).toBe(0);
    });

    it("should handle negative Infinity delta", () => {
      const current = { rank: 3, points: 0 };
      const result = applyRankPointsDelta(current, -Infinity);
      expect(result.rank).toBe(0); // Clamped to min
      expect(result.points).toBe(0);
    });

    it("should handle fractional delta with precision", () => {
      const current = { rank: 1, points: 1 };
      const result = applyRankPointsDelta(current, 0.1);
      expect(result.rank).toBe(1);
      expect(result.points).toBe(2);
    });

    it("should handle large positive delta", () => {
      const current = { rank: 1, points: 0 };
      const result = applyRankPointsDelta(current, 100.0);
      expect(result.rank).toBe(10); // Clamped
      expect(result.points).toBe(0);
    });

    it("should handle large negative delta", () => {
      const current = { rank: 5, points: 0 };
      const result = applyRankPointsDelta(current, -100.0);
      expect(result.rank).toBe(0); // Clamped
      expect(result.points).toBe(0);
    });
  });

  describe("typical UI increment/decrement", () => {
    it("should handle +1 button click", () => {
      const current = { rank: 2, points: 3 };
      const result = applyRankPointsDelta(current, 1);
      expect(result.rank).toBe(3);
      expect(result.points).toBe(3);
    });

    it("should handle -1 button click", () => {
      const current = { rank: 2, points: 3 };
      const result = applyRankPointsDelta(current, -1);
      expect(result.rank).toBe(1);
      expect(result.points).toBe(3);
    });

    it("should handle +0.1 button click", () => {
      const current = { rank: 2, points: 3 };
      const result = applyRankPointsDelta(current, 0.1);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(4);
    });

    it("should handle -0.1 button click", () => {
      const current = { rank: 2, points: 3 };
      const result = applyRankPointsDelta(current, -0.1);
      expect(result.rank).toBe(2);
      expect(result.points).toBe(2);
    });
  });
});
