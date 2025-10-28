import { describe, it, expect } from "vitest";
import { buildFormula } from "../../../module/services/dice/core/formula-builder.js";

describe("buildFormula", () => {
  describe("standard rolls", () => {
    it("should build basic formula with zero bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10+0");
    });

    it("should build formula with positive bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 5;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10+5");
    });

    it("should build formula with negative bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = -5;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10-5");
    });

    it("should build formula with large negative bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = -10;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10-10");
    });
  });

  describe("emphasis modifier", () => {
    it("should add r1 modifier when emphasis is true", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;
      const options = { emphasis: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10r1k3x10+0");
    });

    it("should add r1 modifier with positive bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 5;
      const options = { emphasis: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10r1k3x10+5");
    });

    it("should add r1 modifier with negative bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = -2;
      const options = { emphasis: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10r1k3x10-2");
    });

    it("should not add r1 when emphasis is false", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;
      const options = { emphasis: false };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10k3x10+0");
    });
  });

  describe("unskilled modifier", () => {
    it("should omit x10 when unskilled is true", () => {
      // ARRANGE
      const diceRoll = 3;
      const diceKeep = 3;
      const bonus = 0;
      const options = { unskilled: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("3d10k3+0");
    });

    it("should omit x10 with positive bonus", () => {
      // ARRANGE
      const diceRoll = 3;
      const diceKeep = 3;
      const bonus = 2;
      const options = { unskilled: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("3d10k3+2");
    });

    it("should omit x10 with negative bonus", () => {
      // ARRANGE
      const diceRoll = 3;
      const diceKeep = 3;
      const bonus = -2;
      const options = { unskilled: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("3d10k3-2");
    });

    it("should include x10 when unskilled is false", () => {
      // ARRANGE
      const diceRoll = 3;
      const diceKeep = 3;
      const bonus = 0;
      const options = { unskilled: false };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("3d10k3x10+0");
    });
  });

  describe("combined modifiers", () => {
    it("should handle both emphasis and positive bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 5;
      const options = { emphasis: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10r1k3x10+5");
    });

    it("should handle unskilled with positive bonus", () => {
      // ARRANGE
      const diceRoll = 3;
      const diceKeep = 3;
      const bonus = 2;
      const options = { unskilled: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("3d10k3+2");
    });

    it("should handle emphasis and unskilled together (edge case)", () => {
      // ARRANGE
      // Note: This is mechanically invalid (can't have skilled emphasis + unskilled)
      // but we test it to verify formula construction doesn't break
      const diceRoll = 5;
      const diceKeep = 3;
      const bonus = 0;
      const options = { emphasis: true, unskilled: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("5d10r1k3+0");
    });
  });

  describe("minimum dice values", () => {
    it("should handle minimum dice (1k1)", () => {
      // ARRANGE
      const diceRoll = 1;
      const diceKeep = 1;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("1d10k1x10+0");
    });

    it("should handle 1k1 with bonus", () => {
      // ARRANGE
      const diceRoll = 1;
      const diceKeep = 1;
      const bonus = 3;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("1d10k1x10+3");
    });

    it("should handle 1k1 unskilled", () => {
      // ARRANGE
      const diceRoll = 1;
      const diceKeep = 1;
      const bonus = 0;
      const options = { unskilled: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("1d10k1+0");
    });
  });

  describe("maximum dice values (after Ten Dice Rule)", () => {
    it("should handle maximum dice (10k10)", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 10;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("10d10k10x10+0");
    });

    it("should handle 10k10 with bonus from Ten Dice Rule", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 10;
      const bonus = 6;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("10d10k10x10+6");
    });

    it("should handle 10k10 with large bonus", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 10;
      const bonus = 20;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("10d10k10x10+20");
    });
  });

  describe("edge cases - zero values", () => {
    it("should handle zero dice roll", () => {
      // ARRANGE
      const diceRoll = 0;
      const diceKeep = 0;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      // Note: This is mechanically invalid, but formula builder should still produce output
      expect(result).toBe("0d10k0x10+0");
    });

    it("should handle zero dice with positive bonus", () => {
      // ARRANGE
      const diceRoll = 0;
      const diceKeep = 0;
      const bonus = 5;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("0d10k0x10+5");
    });
  });

  describe("edge cases - asymmetric roll/keep", () => {
    it("should handle more rolled than kept (normal case)", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10+0");
    });

    it("should handle equal rolled and kept (all dice kept)", () => {
      // ARRANGE
      const diceRoll = 5;
      const diceKeep = 5;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("5d10k5x10+0");
    });
  });

  describe("edge cases - bonus values", () => {
    it("should handle very large positive bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 100;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10+100");
    });

    it("should handle very large negative bonus", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = -50;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10-50");
    });
  });

  describe("edge cases - options parameter", () => {
    it("should handle undefined options (default values)", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;
      const options = undefined;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10k3x10+0");
    });

    it("should handle empty options object", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;
      const options = {};

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10k3x10+0");
    });

    it("should handle null options", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = 0;
      const options = null;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("7d10k3x10+0");
    });
  });

  describe("real-world usage scenarios", () => {
    it("should build formula for typical beginner skill roll (3k2)", () => {
      // ARRANGE
      const diceRoll = 3;
      const diceKeep = 2;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("3d10k2x10+0");
    });

    it("should build formula for skilled character (7k4+2)", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 4;
      const bonus = 2;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k4x10+2");
    });

    it("should build formula for master-level roll (10k7)", () => {
      // ARRANGE
      const diceRoll = 10;
      const diceKeep = 7;
      const bonus = 0;

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("10d10k7x10+0");
    });

    it("should build formula for emphasized skilled roll", () => {
      // ARRANGE
      const diceRoll = 8;
      const diceKeep = 4;
      const bonus = 1;
      const options = { emphasis: true };

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus, options);

      // ASSERT
      expect(result).toBe("8d10r1k4x10+1");
    });

    it("should build formula for penalized roll (wound penalties)", () => {
      // ARRANGE
      const diceRoll = 7;
      const diceKeep = 3;
      const bonus = -15; // Severe wound penalty

      // ACT
      const result = buildFormula(diceRoll, diceKeep, bonus);

      // ASSERT
      expect(result).toBe("7d10k3x10-15");
    });
  });
});
