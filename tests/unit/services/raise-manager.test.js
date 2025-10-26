import { describe, it, expect } from "vitest";
import { calculateFreeRaises } from "../../../module/services/dice/resources/raise-manager.js";

describe("raise-manager", () => {
  describe("calculateFreeRaises", () => {
    describe("valid inputs", () => {
      it("should return 0 for actor with no items", () => {
        // ARRANGE
        const actor = {
          items: []
        };

        // ACT
        const result = calculateFreeRaises(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for actor with items without freeRaises", () => {
        const actor = {
          items: [{ system: { name: "Some Item" } }, { system: { description: "Another item" } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(0);
      });

      it("should sum freeRaises from multiple items", () => {
        const actor = {
          items: [
            { system: { freeRaises: 1 } },
            { system: { freeRaises: 2 } },
            { system: { freeRaises: 1 } }
          ]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(4);
      });

      it("should ignore items with zero freeRaises", () => {
        const actor = {
          items: [
            { system: { freeRaises: 2 } },
            { system: { freeRaises: 0 } },
            { system: { freeRaises: 1 } }
          ]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(3);
      });

      it("should ignore items with negative freeRaises", () => {
        const actor = {
          items: [
            { system: { freeRaises: 2 } },
            { system: { freeRaises: -1 } },
            { system: { freeRaises: 1 } }
          ]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(3);
      });

      it("should handle single item with freeRaises", () => {
        const actor = {
          items: [{ system: { freeRaises: 5 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(5);
      });
    });

    describe("edge cases", () => {
      it("should return 0 for null actor", () => {
        expect(calculateFreeRaises(null)).toBe(0);
      });

      it("should return 0 for undefined actor", () => {
        expect(calculateFreeRaises(undefined)).toBe(0);
      });

      it("should return 0 for actor without items property", () => {
        const actor = { system: {} };
        expect(calculateFreeRaises(actor)).toBe(0);
      });

      it("should return 0 for actor with null items", () => {
        const actor = { items: null };
        expect(calculateFreeRaises(actor)).toBe(0);
      });

      it("should return 0 for actor with undefined items", () => {
        const actor = { items: undefined };
        expect(calculateFreeRaises(actor)).toBe(0);
      });

      it("should handle items without system property", () => {
        const actor = {
          items: [{ name: "Item 1" }, { system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(2);
      });

      it("should handle items with null system", () => {
        const actor = {
          items: [{ system: null }, { system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(2);
      });

      it("should handle items with undefined freeRaises", () => {
        const actor = {
          items: [{ system: { freeRaises: undefined } }, { system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(2);
      });

      it("should handle items with null freeRaises", () => {
        const actor = {
          items: [{ system: { freeRaises: null } }, { system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(2);
      });

      it("should handle items with string freeRaises", () => {
        const actor = {
          items: [{ system: { freeRaises: "3" } }, { system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(5);
      });

      it("should handle items with NaN freeRaises", () => {
        const actor = {
          items: [{ system: { freeRaises: NaN } }, { system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor);
        expect(result).toBe(2);
      });

      it("should handle empty items array", () => {
        const actor = { items: [] };
        expect(calculateFreeRaises(actor)).toBe(0);
      });
    });

    describe("options parameter", () => {
      it("should accept options parameter without error", () => {
        const actor = {
          items: [{ system: { freeRaises: 2 } }]
        };

        const result = calculateFreeRaises(actor, { skillName: "kenjutsu" });
        expect(result).toBe(2);
      });
    });
  });
});
