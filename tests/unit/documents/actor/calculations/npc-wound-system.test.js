import { describe, expect, it } from "vitest";
import {
  getWoundLevelsForCount,
  prepareNpcFormulaWounds,
  prepareNpcManualWounds
} from "../../../../../module/documents/actor/calculations/npc-wound-system.js";

// game-rules/99_creatures.md, p.318
describe("prepareNpcManualWounds", () => {
  const ORDER = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];

  it("should keep a creature's printed thresholds; an unused level never pushes the next one up", () => {
    // Ugulu no Oni: 32: +5; 64: +10; 96: +15; 124: Dead, its middle levels unused
    // game-rules/99_creatures.md, p.329
    const level = (value, penalty, active) => ({ value, penalty, active });
    const sys = {
      woundLevels: {},
      manualWoundLevels: {
        healthy: level(31, 0, true),
        nicked: level(63, 5, true),
        grazed: level(95, 10, true),
        hurt: level(123, 15, true),
        injured: level(0, 0, false),
        crippled: level(0, 0, false),
        down: level(0, 0, false),
        out: level(124, 0, true)
      }
    };
    prepareNpcManualWounds(sys, ORDER);
    expect(sys.woundLevels.out.value).toBe(124);
    expect(sys.woundLevels.hurt.value).toBe(123);
  });

  it("should still raise an active level that does not exceed the one before it", () => {
    const sys = {
      woundLevels: {},
      manualWoundLevels: Object.fromEntries(
        ORDER.map(key => [key, { value: 10, penalty: 0, active: ["healthy", "out"].includes(key) }])
      )
    };
    prepareNpcManualWounds(sys, ORDER);
    expect(sys.woundLevels.out.value).toBe(11);
  });
});

describe("getWoundLevelsForCount", () => {
  describe("Valid inputs", () => {
    it("should return 2 levels for count 1", () => {
      // ARRANGE
      const count = 1;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toEqual(["healthy", "out"]);
      expect(result).toHaveLength(2);
    });

    it("should return 3 levels for count 2", () => {
      // ARRANGE
      const count = 2;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toEqual(["healthy", "nicked", "out"]);
      expect(result).toHaveLength(3);
    });

    it("should return 8 levels for count 8", () => {
      // ARRANGE
      const count = 8;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toHaveLength(8);
      expect(result[0]).toBe("healthy");
      expect(result[result.length - 1]).toBe("out");
    });

    it('should ensure "out" is always last level', () => {
      // ACT & ASSERT
      for (let count = 1; count <= 8; count++) {
        const result = getWoundLevelsForCount(count);
        expect(result[result.length - 1]).toBe("out");
      }
    });
  });

  describe("Edge cases", () => {
    it("should clamp count below 1 to 1", () => {
      // ARRANGE
      const count = 0;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toEqual(["healthy", "out"]);
    });

    it("should clamp count above 8 to 8", () => {
      // ARRANGE
      const count = 10;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toHaveLength(8);
    });

    it("should handle negative count", () => {
      // ARRANGE
      const count = -5;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toEqual(["healthy", "out"]);
    });

    it("should handle null", () => {
      // ARRANGE
      const count = null;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toHaveLength(3); // Default to 3
    });

    it("should handle undefined", () => {
      // ARRANGE
      const count = undefined;

      // ACT
      const result = getWoundLevelsForCount(count);

      // ASSERT
      expect(result).toHaveLength(3); // Default to 3
    });
  });
});

describe("prepareNpcFormulaWounds", () => {
  describe("L5R4 wound calculations", () => {
    it("should calculate healthy as Earth × 5", () => {
      // ARRANGE
      const sys = {
        rings: { earth: 3 },
        woundsMultiplier: 2,
        woundsMod: 0,
        nrWoundLvls: 8,
        woundLevels: {}
      };
      const order = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      expect(sys.woundLevels.healthy.value).toBe(15); // 3 × 5
    });

    it("should calculate other levels as cumulative Earth × multiplier", () => {
      // ARRANGE
      const sys = {
        rings: { earth: 3 },
        woundsMultiplier: 2,
        woundsMod: 0,
        nrWoundLvls: 8,
        woundLevels: {}
      };
      const order = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      // Healthy: 15 (3 × 5)
      // Nicked: 15 + (3 × 2) = 21
      // Grazed: 21 + (3 × 2) = 27
      // Hurt: 27 + (3 × 2) = 33
      expect(sys.woundLevels.healthy.value).toBe(15);
      expect(sys.woundLevels.nicked.value).toBe(21);
      expect(sys.woundLevels.grazed.value).toBe(27);
      expect(sys.woundLevels.hurt.value).toBe(33);
    });

    it("should apply wounds modifier to all levels", () => {
      // ARRANGE
      const sys = {
        rings: { earth: 3 },
        woundsMultiplier: 2,
        woundsMod: 5,
        nrWoundLvls: 8,
        woundLevels: {}
      };
      const order = ["healthy", "nicked", "out"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      // Healthy: (3 × 5) + 5 = 20
      // Nicked: 20 + (3 × 2) + 5 = 31
      expect(sys.woundLevels.healthy.value).toBe(20);
      expect(sys.woundLevels.nicked.value).toBe(31);
    });
  });

  describe("Lethality scaling", () => {
    it("should support Earth × 3 multiplier for less lethal games", () => {
      // ARRANGE
      const sys = {
        rings: { earth: 3 },
        woundsMultiplier: 3,
        woundsMod: 0,
        nrWoundLvls: 8,
        woundLevels: {}
      };
      const order = ["healthy", "nicked", "grazed"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      // Nicked: 15 + (3 × 3) = 24
      // Grazed: 24 + (3 × 3) = 33
      expect(sys.woundLevels.nicked.value).toBe(24);
      expect(sys.woundLevels.grazed.value).toBe(33);
    });
  });

  describe("Simplified wound levels", () => {
    it("should support 3-level wound tracking", () => {
      // ARRANGE
      const sys = {
        rings: { earth: 3 },
        woundsMultiplier: 2,
        woundsMod: 0,
        nrWoundLvls: 3,
        woundLevels: {}
      };
      const order = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      expect(sys.woundLevels.healthy.isActive).toBe(true);
      expect(sys.woundLevels.nicked.isActive).toBe(true);
      expect(sys.woundLevels.out.isActive).toBe(true);
      expect(sys.woundLevels.grazed.isActive).toBe(false);
      expect(sys.woundLevels.hurt.isActive).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle null earth ring", () => {
      // ARRANGE
      const sys = {
        rings: { earth: null },
        woundsMultiplier: 2,
        woundsMod: 0,
        nrWoundLvls: 3,
        woundLevels: {}
      };
      const order = ["healthy", "out"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      expect(sys.woundLevels.healthy.value).toBe(0);
    });

    it("should default multiplier to 2 if missing", () => {
      // ARRANGE
      const sys = {
        rings: { earth: 3 },
        woundsMultiplier: null,
        woundsMod: 0,
        nrWoundLvls: 3,
        woundLevels: {}
      };
      const order = ["healthy", "nicked"];

      // ACT
      prepareNpcFormulaWounds(sys, order);

      // ASSERT
      expect(sys.woundLevels.nicked.value).toBe(21); // 15 + (3 × 2)
    });
  });
});
