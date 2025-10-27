/**
 * Unit Tests for Ten Dice Rule Implementation
 *
 * Tests the TenDiceRule function which enforces L5R4's core dice cap mechanic:
 * - Maximum 10 rolled dice
 * - Maximum 10 kept dice
 * - Excess dice convert to flat bonuses using specific ratios
 *
 * Test Coverage:
 * - Official game rule examples
 * - Edge cases (minimum values, boundaries, exact caps)
 * - Invalid inputs (negative, zero, kept > rolled)
 * - Both fast path (both >= 10) and slow path conversions
 * - Little Truths exception (optional house rule)
 *
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TenDiceRule } from "../../../module/services/dice/core/ten-dice-rule.js";

describe("TenDiceRule", () => {
  // Mock game.settings for testing Little Truths exception
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

  describe("Official Game Rule Examples", () => {
    it("should convert 12k4 to 10k5 (2 extra rolled = 1 extra kept)", () => {
      // ARRANGE
      const diceRoll = 12;
      const diceKeep = 4;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(5);
      expect(result.bonus).toBe(0);
    });

    it("should convert 13k9 to 10k10+2 (2 extra rolled = 1 kept, 1 odd rolled = +2)", () => {
      // ARRANGE
      const diceRoll = 13;
      const diceKeep = 9;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(2);
    });

    it("should convert 10k12 to 10k10+4 (2 extra kept = +4)", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 12;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(4);
    });

    it("should convert 14k12 to 10k10+12 (4 extra rolled = +8, 2 extra kept = +4)", () => {
      // ARRANGE
      const diceRoll = 14;
      const diceKeep = 12;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(12);
    });
  });

  describe("Fast Path - Both at or above cap", () => {
    it("should use fast path when both rolled and kept >= 10", () => {
      // ARRANGE
      const diceRoll = 15;
      const diceKeep = 12;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // Fast path: excessRolled=5, excessKept=2
      // bonus = 5*2 + 2*2 = 10 + 4 = 14
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(14);
    });

    it("should use fast path when exactly 10k10", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 10;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(0);
    });

    it("should preserve existing bonus in fast path", () => {
      // ARRANGE
      const diceRoll = 11;
      const diceKeep = 11;
      const bonus = 5;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // excessRolled=1, excessKept=1 → +4 total, plus original +5 = +9
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(9);
    });
  });

  describe("Slow Path - Excess rolled dice conversion", () => {
    it("should convert 2 excess rolled to 1 kept", () => {
      // ARRANGE
      const diceRoll = 12;
      const diceKeep = 3;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(4);
      expect(result.bonus).toBe(0);
    });

    it("should convert 4 excess rolled to 2 kept", () => {
      // ARRANGE
      const diceRoll = 14;
      const diceKeep = 5;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(7);
      expect(result.bonus).toBe(0);
    });

    it("should handle odd leftover rolled die as +2 when kept=10", () => {
      // ARRANGE
      const diceRoll = 11;
      const diceKeep = 10;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // 1 excess rolled, kept already at 10, so +2 bonus
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(2);
    });

    it("should convert excess rolled and then cap excess kept", () => {
      // ARRANGE
      const diceRoll = 16;
      const diceKeep = 8;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // 6 excess rolled → +3 kept → 8+3=11 kept
      // 11 kept → 1 excess kept → +2 bonus
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(2);
    });
  });

  describe("Slow Path - Excess kept dice conversion", () => {
    it("should convert each excess kept to +2", () => {
      // ARRANGE
      const diceRoll = 8;
      const diceKeep = 13;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // 3 excess kept → +6 bonus
      expect(result.diceRoll).toBe(8);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(6);
    });

    it("should handle exactly 11 kept dice", () => {
      // ARRANGE
      const diceRoll = 9;
      const diceKeep = 11;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // 1 excess kept → +2 bonus
      expect(result.diceRoll).toBe(9);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(2);
    });
  });

  describe("Edge Cases - Minimum Values", () => {
    it("should enforce minimum 1k1 when dice are zero", () => {
      // ARRANGE
      const diceRoll = 0;
      const diceKeep = 0;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(1);
      expect(result.diceKeep).toBe(1);
      expect(result.bonus).toBe(0);
    });

    it("should enforce minimum 1k1 when dice are negative", () => {
      // ARRANGE
      const diceRoll = -5;
      const diceKeep = -2;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(1);
      expect(result.diceKeep).toBe(1);
      expect(result.bonus).toBe(0);
    });

    it("should cap kept to rolled when kept > rolled", () => {
      // ARRANGE
      const diceRoll = 5;
      const diceKeep = 8;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(5);
      expect(result.diceKeep).toBe(5);
      expect(result.bonus).toBe(0);
    });
  });

  describe("Bonus Preservation", () => {
    it("should preserve starting bonus when no conversion needed", () => {
      // ARRANGE
      const diceRoll = 5;
      const diceKeep = 3;
      const bonus = 10;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(5);
      expect(result.diceKeep).toBe(3);
      expect(result.bonus).toBe(10);
    });

    it("should add conversion bonuses to starting bonus", () => {
      // ARRANGE
      const diceRoll = 13;
      const diceKeep = 9;
      const bonus = 5;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // Same as 13k9 example but with +5 starting bonus
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(7); // 5 starting + 2 from conversion
    });

    it("should handle negative starting bonus", () => {
      // ARRANGE
      const diceRoll = 8;
      const diceKeep = 5;
      const bonus = -3;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(8);
      expect(result.diceKeep).toBe(5);
      expect(result.bonus).toBe(-3);
    });
  });

  describe("Boundary Values", () => {
    it("should not modify 9k9 (under cap)", () => {
      // ARRANGE
      const diceRoll = 9;
      const diceKeep = 9;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(9);
      expect(result.diceKeep).toBe(9);
      expect(result.bonus).toBe(0);
    });

    it("should handle 11k9 (rolled exceeds by 1)", () => {
      // ARRANGE
      const diceRoll = 11;
      const diceKeep = 9;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // 1 excess rolled → can't convert (needs 2), stays at 10k9
      // Actually, the implementation should NOT convert 1 leftover
      // unless kept is already at 10
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(9);
      expect(result.bonus).toBe(0);
    });

    it("should handle 10k11 (kept exceeds by 1)", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 11;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(2);
    });
  });

  describe("Little Truths Exception (House Rule)", () => {
    it("should add +2 bonus when LtException enabled and kept < 10", () => {
      // ARRANGE
      mockGame.settings.get.mockReturnValue(true); // Enable Little Truths
      const diceRoll = 7;
      const diceKeep = 5;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(7);
      expect(result.diceKeep).toBe(5);
      expect(result.bonus).toBe(2); // Little Truths bonus
    });

    it("should NOT add Little Truths bonus when kept = 10", () => {
      // ARRANGE
      mockGame.settings.get.mockReturnValue(true);
      const diceRoll = 10;
      const diceKeep = 10;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(0); // No Little Truths bonus at cap
    });

    it("should NOT add Little Truths bonus when disabled", () => {
      // ARRANGE
      mockGame.settings.get.mockReturnValue(false); // Disabled
      const diceRoll = 7;
      const diceKeep = 5;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(7);
      expect(result.diceKeep).toBe(5);
      expect(result.bonus).toBe(0);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle 20k15 (large excess on both)", () => {
      // ARRANGE
      const diceRoll = 20;
      const diceKeep = 15;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // Fast path: excessRolled=10, excessKept=5
      // bonus = 10*2 + 5*2 = 20 + 10 = 30
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(10);
      expect(result.bonus).toBe(30);
    });

    it("should handle 17k6 (rolled exceeds, converts to kept, then caps kept)", () => {
      // ARRANGE
      const diceRoll = 17;
      const diceKeep = 6;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      // 7 excess rolled → +3 kept (1 leftover), 6+3=9 kept
      // 9 kept < 10, so no kept conversion
      // 1 leftover rolled, but kept < 10, so no bonus
      expect(result.diceRoll).toBe(10);
      expect(result.diceKeep).toBe(9);
      expect(result.bonus).toBe(0);
    });

    it("should handle 1k1 (minimum valid roll)", () => {
      // ARRANGE
      const diceRoll = 1;
      const diceKeep = 1;
      const bonus = 0;

      // ACT
      const result = TenDiceRule(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result.diceRoll).toBe(1);
      expect(result.diceKeep).toBe(1);
      expect(result.bonus).toBe(0);
    });
  });
});
