import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateEffectiveTN,
  evaluateTN,
  buildTNLabel,
  replaceFailureWithMissed
} from "../../../module/services/dice/core/tn-calculator.js";

describe("tn-calculator", () => {
  describe("calculateEffectiveTN", () => {
    describe("basic TN calculation", () => {
      it("should return baseTN when no modifiers", () => {
        const result = calculateEffectiveTN(15, 0, 0, 0, false);
        expect(result).toBe(15);
      });

      it("should add 5 per raise to baseTN", () => {
        const result = calculateEffectiveTN(15, 2, 0, 0, false);
        expect(result).toBe(25); // 15 + (2 * 5)
      });

      it("should not subtract free raises from baseTN (purely informational)", () => {
        const result = calculateEffectiveTN(20, 0, 2, 0, false);
        expect(result).toBe(20); // Free raises don't affect TN
      });

      it("should handle both raises and free raises", () => {
        const result = calculateEffectiveTN(20, 3, 1, 0, false);
        expect(result).toBe(35); // 20 + (3 * 5) = 35 (free raises don't affect TN)
      });

      it("should add wound penalty when applyWoundPenalty is true", () => {
        const result = calculateEffectiveTN(15, 0, 0, 10, true);
        expect(result).toBe(25); // 15 + 10
      });

      it("should not add wound penalty when applyWoundPenalty is false", () => {
        const result = calculateEffectiveTN(15, 0, 0, 10, false);
        expect(result).toBe(15);
      });

      it("should combine raises, free raises, and wound penalty", () => {
        const result = calculateEffectiveTN(15, 2, 1, 5, true);
        expect(result).toBe(30); // 15 + (2*5) + 5 = 30 (free raises don't affect TN)
      });
    });

    describe("TN floor at 0", () => {
      it("should return baseTN even with high free raises (they don't affect TN)", () => {
        const result = calculateEffectiveTN(10, 0, 3, 0, false);
        expect(result).toBe(10); // Free raises don't affect TN
      });

      it("should return baseTN even when free raises equal baseTN", () => {
        const result = calculateEffectiveTN(10, 0, 2, 0, false);
        expect(result).toBe(10); // Free raises don't affect TN
      });

      it("should return 0 for negative baseTN", () => {
        const result = calculateEffectiveTN(-5, 0, 0, 0, false);
        expect(result).toBe(0);
      });

      it("should calculate TN correctly with raises (free raises don't affect it)", () => {
        const result = calculateEffectiveTN(10, 1, 4, 0, false);
        expect(result).toBe(15); // 10 + (1*5) = 15 (free raises don't affect TN)
      });
    });

    describe("type coercion", () => {
      it("should handle string numbers", () => {
        const result = calculateEffectiveTN("15", "2", "1", "5", true);
        expect(result).toBe(30); // 15 + (2*5) + 5 = 30 (free raises don't affect TN)
      });

      it("should treat null as 0", () => {
        const result = calculateEffectiveTN(null, null, null, null, false);
        expect(result).toBe(0);
      });

      it("should treat undefined as 0", () => {
        const result = calculateEffectiveTN(undefined, undefined, undefined, undefined, false);
        expect(result).toBe(0);
      });

      it("should handle NaN inputs", () => {
        const result = calculateEffectiveTN(NaN, NaN, NaN, NaN, false);
        expect(result).toBe(0);
      });

      it("should handle mixed valid and invalid inputs", () => {
        const result = calculateEffectiveTN(15, NaN, 0, null, false);
        expect(result).toBe(15);
      });
    });

    describe("edge cases", () => {
      it("should handle very high raises", () => {
        const result = calculateEffectiveTN(15, 10, 0, 0, false);
        expect(result).toBe(65); // 15 + (10 * 5)
      });

      it("should handle very high free raises (they don't affect TN)", () => {
        const result = calculateEffectiveTN(100, 0, 10, 0, false);
        expect(result).toBe(100); // Free raises don't affect TN
      });

      it("should handle zero wound penalty with flag true", () => {
        const result = calculateEffectiveTN(15, 0, 0, 0, true);
        expect(result).toBe(15);
      });

      it("should ignore negative wound penalties", () => {
        const result = calculateEffectiveTN(15, 0, 0, -5, true);
        expect(result).toBe(15); // Negative wound penalty is treated as 0
      });

      it("should handle zero baseTN", () => {
        const result = calculateEffectiveTN(0, 2, 0, 0, false);
        expect(result).toBe(10); // 0 + (2 * 5)
      });
    });
  });

  describe("evaluateTN", () => {
    // Mock localization
    beforeEach(() => {
      vi.mock("../../../module/utils/localization.js", () => ({
        T: key => {
          if (key === "l5r4.ui.mechanics.rolls.success") {
            return "Success";
          }
          if (key === "l5r4.ui.mechanics.rolls.failure") {
            return "Failure";
          }
          return key;
        }
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("success evaluation", () => {
      it("should return success when roll equals TN", () => {
        const result = evaluateTN(20, 20, 2, 1);
        expect(result).toEqual({
          effective: 20,
          raises: 2,
          freeRaises: 1,
          outcome: "Success"
        });
      });

      it("should return success when roll exceeds TN", () => {
        const result = evaluateTN(25, 20, 1, 0);
        expect(result).toEqual({
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Success"
        });
      });

      it("should return failure when roll is below TN", () => {
        const result = evaluateTN(19, 20, 2, 1);
        expect(result).toEqual({
          effective: 20,
          raises: 2,
          freeRaises: 1,
          outcome: "Failure"
        });
      });
    });

    describe("return structure", () => {
      it("should include all fields in result", () => {
        const result = evaluateTN(25, 20, 3, 2);
        expect(result).toHaveProperty("effective");
        expect(result).toHaveProperty("raises");
        expect(result).toHaveProperty("freeRaises");
        expect(result).toHaveProperty("outcome");
      });

      it("should default freeRaises to 0 if not provided", () => {
        const result = evaluateTN(25, 20, 2);
        expect(result.freeRaises).toBe(0);
      });

      it("should default raises to 0 if falsy", () => {
        const result = evaluateTN(25, 20, 0, 1);
        expect(result.raises).toBe(0);
      });
    });

    describe("invalid inputs", () => {
      it("should return null for zero TN", () => {
        const result = evaluateTN(20, 0, 1, 0);
        expect(result).toBeNull();
      });

      it("should return null for negative TN", () => {
        const result = evaluateTN(20, -5, 1, 0);
        expect(result).toBeNull();
      });

      it("should handle zero roll total", () => {
        const result = evaluateTN(0, 20, 1, 0);
        expect(result).toEqual({
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Failure"
        });
      });

      it("should handle null roll total as 0", () => {
        const result = evaluateTN(null, 20, 1, 0);
        expect(result).toEqual({
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Failure"
        });
      });
    });

    describe("type coercion", () => {
      it("should coerce effectiveTN and rollTotal but not raises/freeRaises", () => {
        const result = evaluateTN("25", "20", "2", "1");
        expect(result).toEqual({
          effective: 20, // Coerced to number
          raises: "2", // Passed through as string
          freeRaises: "1", // Passed through as string
          outcome: "Success"
        });
      });

      it("should treat NaN effectiveTN as invalid", () => {
        const result = evaluateTN(20, NaN, 1, 0);
        expect(result).toBeNull();
      });
    });
  });

  describe("buildTNLabel", () => {
    describe("basic label construction", () => {
      it("should build label with TN only", () => {
        const result = buildTNLabel(20, 0, 0, "Raises", "Free");
        expect(result).toBe(" [TN 20]");
      });

      it("should build label with TN and raises", () => {
        const result = buildTNLabel(25, 2, 0, "Raises", "Free");
        expect(result).toBe(" [TN 25 (Raises: 2)]");
      });

      it("should build label with TN and free raises", () => {
        const result = buildTNLabel(15, 0, 3, "Raises", "Free");
        expect(result).toBe(" [TN 15 (Free: 3)]");
      });

      it("should build label with TN, raises, and free raises", () => {
        const result = buildTNLabel(30, 2, 1, "Raises", "Free Raises");
        expect(result).toBe(" [TN 30 (Raises: 2, Free Raises: 1)]");
      });

      it('should use default "Free" if freeRaisesLabel not provided', () => {
        const result = buildTNLabel(15, 0, 2, "Raises");
        expect(result).toBe(" [TN 15 (Free: 2)]");
      });
    });

    describe("empty string cases", () => {
      it("should return empty string for zero TN", () => {
        const result = buildTNLabel(0, 2, 1, "Raises", "Free");
        expect(result).toBe("");
      });

      it("should return empty string for negative TN", () => {
        const result = buildTNLabel(-5, 2, 1, "Raises", "Free");
        expect(result).toBe("");
      });
    });

    describe("edge cases", () => {
      it("should handle very high TN", () => {
        const result = buildTNLabel(100, 5, 2, "Raises", "Free");
        expect(result).toBe(" [TN 100 (Raises: 5, Free: 2)]");
      });

      it("should handle localized labels", () => {
        const result = buildTNLabel(20, 2, 1, "Subidas", "Gratis");
        expect(result).toBe(" [TN 20 (Subidas: 2, Gratis: 1)]");
      });

      it("should handle single digit values", () => {
        const result = buildTNLabel(5, 1, 1, "R", "F");
        expect(result).toBe(" [TN 5 (R: 1, F: 1)]");
      });
    });
  });

  describe("replaceFailureWithMissed", () => {
    beforeEach(() => {
      vi.mock("../../../module/utils/localization.js", () => ({
        T: key => {
          if (key === "l5r4.ui.mechanics.rolls.success") {
            return "Success";
          }
          if (key === "l5r4.ui.mechanics.rolls.failure") {
            return "Failure";
          }
          if (key === "l5r4.ui.mechanics.rolls.missed") {
            return "Missed";
          }
          return key;
        }
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("attack rolls", () => {
      it('should replace "Failure" with "Missed" for attack rolls', () => {
        const tnResult = {
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Failure"
        };

        const result = replaceFailureWithMissed(tnResult, "attack");
        expect(result.outcome).toBe("Missed");
      });

      it('should preserve "Success" for successful attack rolls', () => {
        const tnResult = {
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Success"
        };

        const result = replaceFailureWithMissed(tnResult, "attack");
        expect(result.outcome).toBe("Success");
      });

      it("should preserve other fields when replacing outcome", () => {
        const tnResult = {
          effective: 25,
          raises: 2,
          freeRaises: 1,
          outcome: "Failure"
        };

        const result = replaceFailureWithMissed(tnResult, "attack");
        expect(result).toEqual({
          effective: 25,
          raises: 2,
          freeRaises: 1,
          outcome: "Missed"
        });
      });
    });

    describe("non-attack rolls", () => {
      it("should not modify outcome for skill rolls", () => {
        const tnResult = {
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Failure"
        };

        const result = replaceFailureWithMissed(tnResult, "skill");
        expect(result.outcome).toBe("Failure");
      });

      it("should not modify outcome for trait rolls", () => {
        const tnResult = {
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Failure"
        };

        const result = replaceFailureWithMissed(tnResult, "trait");
        expect(result.outcome).toBe("Failure");
      });

      it("should not modify outcome for null rollType", () => {
        const tnResult = {
          effective: 20,
          raises: 1,
          freeRaises: 0,
          outcome: "Failure"
        };

        const result = replaceFailureWithMissed(tnResult, null);
        expect(result.outcome).toBe("Failure");
      });
    });

    describe("null handling", () => {
      it("should return null for null tnResult", () => {
        const result = replaceFailureWithMissed(null, "attack");
        expect(result).toBeNull();
      });

      it("should return null for undefined tnResult", () => {
        const result = replaceFailureWithMissed(undefined, "attack");
        expect(result).toBeNull();
      });
    });
  });
});
