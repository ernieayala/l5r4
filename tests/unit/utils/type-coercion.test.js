/**
 * @fileoverview Unit tests for type-coercion utilities
 *
 * Tests defensive type coercion functions that handle user input,
 * DOM data, and system properties safely with fallbacks.
 */

import { describe, it, expect } from "vitest";
import { toInt, clamp } from "../../../module/utils/type-coercion.js";

describe("toInt", () => {
  describe("valid numeric inputs", () => {
    it("should convert integer to itself", () => {
      // ARRANGE
      const input = 42;

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });

    it("should convert positive numeric string to integer", () => {
      // ARRANGE
      const input = "42";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });

    it("should convert negative numeric string to integer", () => {
      // ARRANGE
      const input = "-15";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(-15);
    });

    it("should convert zero to zero", () => {
      // ARRANGE
      const input = 0;

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should convert string zero to zero", () => {
      // ARRANGE
      const input = "0";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(0);
    });
  });

  describe("whitespace handling", () => {
    it("should trim leading whitespace from string", () => {
      // ARRANGE
      const input = "  42";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });

    it("should trim trailing whitespace from string", () => {
      // ARRANGE
      const input = "42  ";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });

    it("should trim both leading and trailing whitespace", () => {
      // ARRANGE
      const input = "  42  ";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });
  });

  describe("floating point handling", () => {
    it("should truncate floating point number to integer", () => {
      // ARRANGE
      const input = 42.7;

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });

    it("should truncate floating point string to integer", () => {
      // ARRANGE
      const input = "42.7";

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(42);
    });
  });

  describe("edge cases with fallback", () => {
    it("should return fallback for null", () => {
      // ARRANGE
      const input = null;
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for undefined", () => {
      // ARRANGE
      const input = undefined;
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for empty string", () => {
      // ARRANGE
      const input = "";
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for whitespace-only string", () => {
      // ARRANGE
      const input = "   ";
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for non-numeric string", () => {
      // ARRANGE
      const input = "abc";
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for NaN", () => {
      // ARRANGE
      const input = NaN;
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for symbol", () => {
      // ARRANGE
      const input = Symbol("test");
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return fallback for object", () => {
      // ARRANGE
      const input = { value: 42 };
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should coerce single-element array to integer", () => {
      // ARRANGE
      const input = [42];
      const fallback = 0;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      // JavaScript coerces [42] → "42" → 42
      expect(result).toBe(42);
    });
  });

  describe("custom fallback values", () => {
    it("should use custom fallback when provided", () => {
      // ARRANGE
      const input = null;
      const fallback = 99;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(99);
    });

    it("should use custom negative fallback", () => {
      // ARRANGE
      const input = "invalid";
      const fallback = -1;

      // ACT
      const result = toInt(input, fallback);

      // ASSERT
      expect(result).toBe(-1);
    });

    it("should default to 0 when fallback not provided", () => {
      // ARRANGE
      const input = null;

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(0);
    });
  });

  describe("special numeric values", () => {
    it("should handle Infinity as fallback", () => {
      // ARRANGE
      const input = Infinity;

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should handle -Infinity as fallback", () => {
      // ARRANGE
      const input = -Infinity;

      // ACT
      const result = toInt(input);

      // ASSERT
      expect(result).toBe(0);
    });
  });
});

describe("clamp", () => {
  describe("value within range", () => {
    it("should return value when within range", () => {
      // ARRANGE
      const value = 5;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(5);
    });

    it("should return min when value equals min", () => {
      // ARRANGE
      const value = 1;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(1);
    });

    it("should return max when value equals max", () => {
      // ARRANGE
      const value = 10;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(10);
    });
  });

  describe("value outside range", () => {
    it("should clamp to min when value below min", () => {
      // ARRANGE
      const value = -5;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(1);
    });

    it("should clamp to max when value above max", () => {
      // ARRANGE
      const value = 15;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(10);
    });

    it("should clamp to 0 when value is 0 and range is 1-10", () => {
      // ARRANGE
      const value = 0;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(1);
    });
  });

  describe("string coercion", () => {
    it("should coerce string values to numbers", () => {
      // ARRANGE
      const value = "5";
      const min = "1";
      const max = "10";

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(5);
    });

    it("should handle mixed string and number inputs", () => {
      // ARRANGE
      const value = "5";
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(5);
    });
  });

  describe("negative ranges", () => {
    it("should handle negative ranges", () => {
      // ARRANGE
      const value = -5;
      const min = -10;
      const max = -1;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(-5);
    });

    it("should clamp to negative min", () => {
      // ARRANGE
      const value = -15;
      const min = -10;
      const max = -1;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(-10);
    });

    it("should clamp to negative max", () => {
      // ARRANGE
      const value = 5;
      const min = -10;
      const max = -1;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(-1);
    });
  });

  describe("floating point values", () => {
    it("should handle floating point value", () => {
      // ARRANGE
      const value = 5.7;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(5.7);
    });

    it("should handle floating point bounds", () => {
      // ARRANGE
      const value = 5.5;
      const min = 1.1;
      const max = 9.9;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(5.5);
    });
  });

  describe("edge cases with invalid inputs", () => {
    it("should clamp null (coerced to 0) to min when min > 0", () => {
      // ARRANGE
      const value = null;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      // Number(null) = 0, which is below min of 1, so clamped to 1
      expect(result).toBe(1);
    });

    it("should return 0 when value is undefined", () => {
      // ARRANGE
      const value = undefined;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when value is NaN", () => {
      // ARRANGE
      const value = NaN;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when min is NaN", () => {
      // ARRANGE
      const value = 5;
      const min = NaN;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when max is NaN", () => {
      // ARRANGE
      const value = 5;
      const min = 1;
      const max = NaN;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when all inputs are NaN", () => {
      // ARRANGE
      const value = NaN;
      const min = NaN;
      const max = NaN;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 for non-numeric string value", () => {
      // ARRANGE
      const value = "abc";
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });
  });

  describe("special numeric values", () => {
    it("should clamp Infinity to max", () => {
      // ARRANGE
      const value = Infinity;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(10);
    });

    it("should clamp -Infinity to min", () => {
      // ARRANGE
      const value = -Infinity;
      const min = 1;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(1);
    });
  });

  describe("zero-based ranges", () => {
    it("should handle 0 as minimum", () => {
      // ARRANGE
      const value = 5;
      const min = 0;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(5);
    });

    it("should clamp negative value to 0 minimum", () => {
      // ARRANGE
      const value = -5;
      const min = 0;
      const max = 10;

      // ACT
      const result = clamp(value, min, max);

      // ASSERT
      expect(result).toBe(0);
    });
  });
});
