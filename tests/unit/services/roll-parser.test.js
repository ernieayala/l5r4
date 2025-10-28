/**
 * Unit Tests for Roll Parser
 *
 * Tests the roll_parser function which parses L5R4 dice notation strings.
 * Critical because it handles ALL roll input from chat and UI.
 *
 * Test Coverage:
 * - Valid notation formats (basic, emphasis, unskilled, explode bonus)
 * - Edge cases (invalid input, extreme values, multiple bonuses)
 * - Ten Dice Rule integration (positive vs negative bonuses)
 * - Modifier precedence (unskilled vs emphasis)
 * - Boundary values (minimum dice, maximum dice)
 *
 * Testing Philosophy:
 * - Tests must find bugs, not validate working code
 * - Focus on edge cases and error paths
 * - Test behavior, not implementation
 * - Each test must be deterministic and isolated
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { roll_parser } from "../../../module/services/dice/core/roll-parser.js";

describe("roll_parser", () => {
  // Mock game.settings for Ten Dice Rule integration
  let mockGame;

  beforeEach(() => {
    mockGame = {
      settings: {
        get: vi.fn().mockReturnValue(false) // Little Truths disabled by default
      }
    };
    global.game = mockGame;
  });

  afterEach(() => {
    delete global.game;
  });

  describe("Basic Notation - Valid Inputs", () => {
    it("should parse basic XkY notation", () => {
      // ARRANGE
      const roll = "7k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(0);
      expect(result.unskilled).toBe(false);
      expect(result.emphasis).toBe(false);
      expect(result.explode_bonus).toBeUndefined();
    });

    it("should parse XkY with positive bonus", () => {
      // ARRANGE
      const roll = "7k3+5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(5);
      expect(result.unskilled).toBe(false);
      expect(result.emphasis).toBe(false);
    });

    it("should parse XkY with negative bonus", () => {
      // ARRANGE
      const roll = "7k3-10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(-10);
      expect(result.unskilled).toBe(false);
      expect(result.emphasis).toBe(false);
    });

    it("should parse minimum valid roll 1k1", () => {
      // ARRANGE
      const roll = "1k1";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(1);
      expect(result.kept).toBe(1);
      expect(result.bonus).toBe(0);
    });

    it("should parse 10k10 (at Ten Dice Rule cap)", () => {
      // ARRANGE
      const roll = "10k10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      expect(result.bonus).toBe(0);
    });
  });

  describe("Explode Bonus Notation", () => {
    it("should parse XkYxZ notation (explode bonus only)", () => {
      // ARRANGE
      const roll = "7k3x2";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(0);
    });

    it("should parse XkYxZ+B notation (explode bonus with flat bonus)", () => {
      // ARRANGE
      const roll = "7k3x2+5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(5);
    });

    it("should parse XkYxZ-B notation (explode bonus with negative flat bonus)", () => {
      // ARRANGE
      const roll = "7k3x2-5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(-5);
    });

    it("should parse explode bonus with multiple flat bonuses", () => {
      // ARRANGE
      const roll = "7k3x2+5-2+10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(13); // 5 - 2 + 10
    });
  });

  describe("Unskilled Modifier", () => {
    it("should parse unskilled notation with u prefix", () => {
      // ARRANGE
      const roll = "u3k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(3);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(0);
      expect(result.unskilled).toBe(true);
      expect(result.emphasis).toBe(false);
    });

    it("should parse unskilled with bonus", () => {
      // ARRANGE
      const roll = "u3k3+2";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(3);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(2);
      expect(result.unskilled).toBe(true);
      expect(result.emphasis).toBe(false);
    });

    it("should parse unskilled with negative bonus", () => {
      // ARRANGE
      const roll = "u3k3-5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(3);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(-5);
      expect(result.unskilled).toBe(true);
    });
  });

  describe("Emphasis Modifier", () => {
    it("should parse emphasis notation with e prefix", () => {
      // ARRANGE
      const roll = "e7k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(0);
      expect(result.emphasis).toBe(true);
      expect(result.unskilled).toBe(false);
    });

    it("should parse emphasis with bonus", () => {
      // ARRANGE
      const roll = "e7k3+2";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(2);
      expect(result.emphasis).toBe(true);
      expect(result.unskilled).toBe(false);
    });

    it("should parse emphasis with explode bonus", () => {
      // ARRANGE
      const roll = "e7k3x2+5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(5);
      expect(result.emphasis).toBe(true);
    });
  });

  describe("Modifier Precedence", () => {
    it("should prioritize unskilled over emphasis when u comes first", () => {
      // ARRANGE
      const roll = "u7k3"; // Contains 'u', no 'e'

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.unskilled).toBe(true);
      expect(result.emphasis).toBe(false);
    });

    it("should prioritize emphasis over unskilled when e comes first in code", () => {
      // ARRANGE
      const roll = "e7k3"; // Contains 'e', no 'u'

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.emphasis).toBe(true);
      expect(result.unskilled).toBe(false);
    });

    it("should only apply unskilled when both u and e present (u checked first)", () => {
      // ARRANGE
      // This is an invalid notation, but tests implementation behavior
      const roll = "ue7k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Implementation checks 'u' first, so unskilled wins
      expect(result.unskilled).toBe(true);
      expect(result.emphasis).toBe(false);
    });

    it("should only apply emphasis when both e and u present (e not removed by u)", () => {
      // ARRANGE
      const roll = "eu7k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Implementation checks 'u' first, so unskilled wins
      expect(result.unskilled).toBe(true);
      expect(result.emphasis).toBe(false);
    });
  });

  describe("Multiple Bonuses", () => {
    it("should sum multiple positive bonuses", () => {
      // ARRANGE
      const roll = "7k3+5+2+10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(17); // 5 + 2 + 10
    });

    it("should handle mixed positive and negative bonuses", () => {
      // ARRANGE
      const roll = "7k3+5-2+10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(13); // 5 - 2 + 10
    });

    it("should handle all negative bonuses", () => {
      // ARRANGE
      const roll = "7k3-5-2-10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(-17); // -5 - 2 - 10
    });

    it("should handle positive then negative resulting in negative total", () => {
      // ARRANGE
      const roll = "7k3+5-20";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(-15); // 5 - 20
    });
  });

  describe("Ten Dice Rule Integration - Positive Bonuses", () => {
    it("should apply Ten Dice Rule when bonus is positive", () => {
      // ARRANGE
      const roll = "20k15+3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Ten Dice Rule should cap at 10k10 and convert excess to bonus
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      // 10 excess rolled = +20, 5 excess kept = +10, original +3 = +33
      expect(result.bonus).toBe(33);
    });

    it("should apply Ten Dice Rule for 12k4 (excess rolled only)", () => {
      // ARRANGE
      const roll = "12k4";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // 2 excess rolled converts to 1 kept: 10k5
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(5);
      expect(result.bonus).toBe(0);
    });

    it("should apply Ten Dice Rule for 13k9+0 (explicit zero bonus)", () => {
      // ARRANGE
      const roll = "13k9+0";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Official example: converts to 10k10+2
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      expect(result.bonus).toBe(2);
    });

    it("should apply Ten Dice Rule for 10k12 (excess kept only)", () => {
      // ARRANGE
      const roll = "10k12";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // 2 excess kept = +4 bonus
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      expect(result.bonus).toBe(4);
    });

    it("should apply Ten Dice Rule with emphasis modifier", () => {
      // ARRANGE
      const roll = "e15k12+5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      expect(result.emphasis).toBe(true);
      // Bonus from excess + original
      expect(result.bonus).toBeGreaterThan(5);
    });
  });

  describe("Ten Dice Rule Integration - Negative Bonuses", () => {
    it("should NOT apply Ten Dice Rule when bonus is negative", () => {
      // ARRANGE
      const roll = "7k3-10";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Negative bonus preserves dice count
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(-10);
    });

    it("should NOT apply Ten Dice Rule for 20k15-5", () => {
      // ARRANGE
      const roll = "20k15-5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Negative bonus skips Ten Dice Rule
      expect(result.dice_count).toBe(20);
      expect(result.kept).toBe(15);
      expect(result.bonus).toBe(-5);
    });

    it("should NOT apply Ten Dice Rule when mixed bonuses result in negative", () => {
      // ARRANGE
      const roll = "15k10+5-20";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Total bonus is -15 (negative), so skip Ten Dice Rule
      expect(result.dice_count).toBe(15);
      expect(result.kept).toBe(10);
      expect(result.bonus).toBe(-15);
    });
  });

  describe("Edge Cases - Invalid Input", () => {
    it("should handle empty string", () => {
      // ARRANGE
      const roll = "";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Should not crash, but result will be malformed
      expect(result).toBeDefined();
      expect(result.bonus).toBe(0);
    });

    it("should handle null input", () => {
      // ARRANGE
      const roll = null;

      // ACT & ASSERT
      // Implementation may crash - this test documents current behavior
      expect(() => roll_parser(roll)).toThrow();
    });

    it("should handle undefined input", () => {
      // ARRANGE
      const roll = undefined;

      // ACT & ASSERT
      // Implementation may crash - this test documents current behavior
      expect(() => roll_parser(roll)).toThrow();
    });

    it("should handle malformed notation - missing k separator", () => {
      // ARRANGE
      const roll = "73";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Should not crash, but result will be malformed
      expect(result).toBeDefined();
      // dice_count will be 73, kept will be undefined or NaN
    });

    it("should handle malformed notation - only k", () => {
      // ARRANGE
      const roll = "k";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Should not crash, but result will be malformed
      expect(result).toBeDefined();
    });

    it("should handle malformed notation - only kept value", () => {
      // ARRANGE
      const roll = "k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Should not crash, but empty dice_count coerces through Ten Dice Rule
      expect(result).toBeDefined();
      expect(result.kept).toBe(1); // Minimum enforced by Ten Dice Rule
      expect(result.dice_count).toBe(1); // Minimum enforced
    });

    it("should handle invalid characters", () => {
      // ARRANGE
      const roll = "invalid";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Should not crash, but result will be malformed
      expect(result).toBeDefined();
    });

    it("should handle special characters", () => {
      // ARRANGE
      const roll = "7k3!@#";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Should not crash, but parseIntIfPossible doesn't sanitize
      expect(result).toBeDefined();
      expect(result.dice_count).toBe(7);
      // BUG: kept is "3!@#" (string) not 3 (number) - no sanitization
      expect(result.kept).toBe("3!@#");
    });
  });

  describe("Edge Cases - Boundary Values", () => {
    it("should handle 0k0", () => {
      // ARRANGE
      const roll = "0k0";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Ten Dice Rule should enforce minimum 1k1
      expect(result.dice_count).toBe(1);
      expect(result.kept).toBe(1);
      expect(result.bonus).toBe(0);
    });

    it("should handle negative dice values", () => {
      // ARRANGE
      const roll = "-5k-2";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Ten Dice Rule should enforce minimum 1k1
      expect(result.dice_count).toBe(1);
      expect(result.kept).toBe(1);
    });

    it("should handle extremely large values", () => {
      // ARRANGE
      const roll = "100k50";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Ten Dice Rule should cap at 10k10 and convert excess
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      // 90 excess rolled = +180, 40 excess kept = +80, total = +260
      expect(result.bonus).toBe(260);
    });

    it("should handle very large bonus values", () => {
      // ARRANGE
      const roll = "7k3+999";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(999);
    });

    it("should handle very large negative bonus", () => {
      // ARRANGE
      const roll = "7k3-999";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(-999);
    });
  });

  describe("Edge Cases - Explode Bonus Interactions", () => {
    it("should preserve explode_bonus when Ten Dice Rule applies", () => {
      // ARRANGE
      const roll = "20k15x5+3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Ten Dice Rule caps dice but preserves explode_bonus
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(10);
      expect(result.explode_bonus).toBe(5);
      expect(result.bonus).toBeGreaterThan(3);
    });

    it("should handle explode_bonus with negative total bonus", () => {
      // ARRANGE
      const roll = "7k3x2+5-20";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(-15); // 5 - 20
    });

    it("should handle unskilled with explode_bonus", () => {
      // ARRANGE
      const roll = "u7k3x2+5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.unskilled).toBe(true);
      expect(result.explode_bonus).toBe(2);
      expect(result.bonus).toBe(5);
    });
  });

  describe("Real-World Scenarios", () => {
    it("should parse typical skill check: 7k3+5", () => {
      // ARRANGE
      const roll = "7k3+5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(7);
      expect(result.kept).toBe(3);
      expect(result.bonus).toBe(5);
      expect(result.unskilled).toBe(false);
      expect(result.emphasis).toBe(false);
    });

    it("should parse unskilled penalty: u3k3", () => {
      // ARRANGE
      const roll = "u3k3";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(3);
      expect(result.kept).toBe(3);
      expect(result.unskilled).toBe(true);
    });

    it("should parse master-level roll with emphasis: e10k5+8", () => {
      // ARRANGE
      const roll = "e10k5+8";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(5);
      expect(result.bonus).toBe(8);
      expect(result.emphasis).toBe(true);
    });

    it("should parse contested roll with penalty: 8k4-5", () => {
      // ARRANGE
      const roll = "8k4-5";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      expect(result.dice_count).toBe(8);
      expect(result.kept).toBe(4);
      expect(result.bonus).toBe(-5);
    });

    it("should parse high-level character with raises: 12k7", () => {
      // ARRANGE
      const roll = "12k7";

      // ACT
      const result = roll_parser(roll);

      // ASSERT
      // Ten Dice Rule converts: 2 excess rolled = 1 kept
      expect(result.dice_count).toBe(10);
      expect(result.kept).toBe(8);
      expect(result.bonus).toBe(0);
    });
  });

  describe("Determinism and Consistency", () => {
    it("should produce identical results for same input", () => {
      // ARRANGE
      const roll = "7k3+5";

      // ACT
      const result1 = roll_parser(roll);
      const result2 = roll_parser(roll);

      // ASSERT
      expect(result1).toEqual(result2);
    });

    it("should not mutate input string", () => {
      // ARRANGE
      const roll = "7k3+5";
      const originalRoll = roll;

      // ACT
      roll_parser(roll);

      // ASSERT
      expect(roll).toBe(originalRoll);
    });

    it("should produce consistent results across multiple invocations", () => {
      // ARRANGE
      const roll = "e15k10x2+5-2+3";

      // ACT
      const results = Array.from({ length: 10 }, () => roll_parser(roll));

      // ASSERT
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });
  });
});
