import { describe, it, expect } from "vitest";
import { getMaxRaises, clampRaises } from "../../../module/utils/raises-validator.js";

describe("raises-validator", () => {
  describe("getMaxRaises", () => {
    describe("valid inputs", () => {
      it("should return void ring value for valid ring", () => {
        expect(getMaxRaises(3)).toBe(3);
        expect(getMaxRaises(5)).toBe(5);
        expect(getMaxRaises(10)).toBe(10);
      });

      it("should handle minimum void ring", () => {
        expect(getMaxRaises(1)).toBe(1);
      });

      it("should handle maximum void ring", () => {
        expect(getMaxRaises(10)).toBe(10);
      });
    });

    describe("edge cases", () => {
      it("should return 0 for null", () => {
        expect(getMaxRaises(null)).toBe(0);
      });

      it("should return 0 for undefined", () => {
        expect(getMaxRaises(undefined)).toBe(0);
      });

      it("should return 0 for negative values", () => {
        expect(getMaxRaises(-1)).toBe(0);
        expect(getMaxRaises(-5)).toBe(0);
      });

      it("should return 0 for zero", () => {
        expect(getMaxRaises(0)).toBe(0);
      });

      it("should convert string numbers", () => {
        expect(getMaxRaises("5")).toBe(5);
      });

      it("should return 0 for invalid strings", () => {
        expect(getMaxRaises("invalid")).toBe(0);
      });

      it("should return 0 for NaN", () => {
        expect(getMaxRaises(NaN)).toBe(0);
      });
    });
  });

  describe("clampRaises", () => {
    describe("valid clamping", () => {
      it("should return raises when within limit", () => {
        expect(clampRaises(2, 5)).toBe(2);
        expect(clampRaises(3, 10)).toBe(3);
      });

      it("should clamp to max when exceeds", () => {
        expect(clampRaises(7, 5)).toBe(5);
        expect(clampRaises(15, 10)).toBe(10);
      });

      it("should return 0 when negative", () => {
        expect(clampRaises(-1, 5)).toBe(0);
        expect(clampRaises(-10, 5)).toBe(0);
      });

      it("should handle zero raises", () => {
        expect(clampRaises(0, 5)).toBe(0);
      });

      it("should handle zero max", () => {
        expect(clampRaises(3, 0)).toBe(0);
      });
    });

    describe("edge cases", () => {
      it("should handle null raises", () => {
        expect(clampRaises(null, 5)).toBe(0);
      });

      it("should handle undefined raises", () => {
        expect(clampRaises(undefined, 5)).toBe(0);
      });

      it("should handle null max", () => {
        expect(clampRaises(3, null)).toBe(0);
      });

      it("should handle undefined max", () => {
        expect(clampRaises(3, undefined)).toBe(0);
      });

      it("should handle both null", () => {
        expect(clampRaises(null, null)).toBe(0);
      });

      it("should convert string numbers", () => {
        expect(clampRaises("3", "5")).toBe(3);
        expect(clampRaises("7", "5")).toBe(5);
      });

      it("should handle NaN", () => {
        expect(clampRaises(NaN, 5)).toBe(0);
        expect(clampRaises(3, NaN)).toBe(0);
      });

      it("should handle negative max", () => {
        expect(clampRaises(3, -1)).toBe(0);
      });
    });
  });
});
