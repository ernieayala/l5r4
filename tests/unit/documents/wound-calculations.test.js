/**
 * @fileoverview Wound System Calculation Tests (Vitest)
 *
 * Unit tests for pure wound calculation functions from wound-system.js.
 * Tests edge cases, boundaries, and L5R4 wound threshold formulas.
 *
 * Test Philosophy:
 * - Test edge cases, not just happy paths
 * - Test boundary conditions (min/max values)
 * - Test error handling (null, undefined, invalid types)
 * - Verify L5R4 game rule formulas are correct
 *
 * @see module/documents/actor/calculations/wound-system.js
 */

import { describe, it, expect } from "vitest";
import {
  getWoundLevelsForCount,
  calculateWoundPenalties,
  initializeWoundState,
  findCurrentWoundLevel,
  prepareNpcFormulaWounds
} from "../../../module/documents/actor/calculations/wound-system.js";

describe("getWoundLevelsForCount", () => {
  describe("valid inputs", () => {
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

  describe("edge cases", () => {
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

describe("calculateWoundPenalties", () => {
  describe("valid inputs", () => {
    it("should apply penalty modifier to wound levels", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: 5,
        woundLevels: {
          healthy: { penalty: 0 },
          nicked: { penalty: 3 },
          hurt: { penalty: 10 }
        }
      };

      // ACT
      calculateWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.healthy.penaltyEff).toBe(5); // 0 + 5
      expect(sys.woundLevels.nicked.penaltyEff).toBe(8); // 3 + 5
      expect(sys.woundLevels.hurt.penaltyEff).toBe(15); // 10 + 5
    });

    it("should handle zero penalty modifier", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: 0,
        woundLevels: {
          nicked: { penalty: 3 }
        }
      };

      // ACT
      calculateWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(3);
    });

    it("should convert negative effective penalties to absolute values", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: -10,
        woundLevels: {
          nicked: { penalty: 3 }
        }
      };

      // ACT
      calculateWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(7); // |3 + (-10)| = 7
    });
  });

  describe("edge cases", () => {
    it("should handle null woundsPenaltyMod", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: null,
        woundLevels: {
          nicked: { penalty: 3 }
        }
      };

      // ACT
      calculateWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(3);
    });

    it("should handle undefined woundLevels", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: 5,
        woundLevels: undefined
      };

      // ACT & ASSERT
      expect(() => calculateWoundPenalties(sys)).not.toThrow();
    });

    it("should handle null penalty in wound level", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: 5,
        woundLevels: {
          nicked: { penalty: null }
        }
      };

      // ACT
      calculateWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(5);
    });
  });
});

describe("initializeWoundState", () => {
  describe("formula mode", () => {
    it("should set wounds.max from out threshold", () => {
      // ARRANGE
      const sys = {
        woundMode: "formula",
        wounds: {},
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = 0;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.max).toBe(40);
      expect(sys.wounds.value).toBe(40);
    });

    it("should calculate wounds.value from max minus suffered", () => {
      // ARRANGE
      const sys = {
        woundMode: "formula",
        wounds: {},
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = 15;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.max).toBe(40);
      expect(sys.wounds.value).toBe(25); // 40 - 15
    });

    it("should not allow negative wounds.value", () => {
      // ARRANGE
      const sys = {
        woundMode: "formula",
        wounds: {},
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = 50;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.value).toBe(0); // Clamped to 0
    });
  });

  describe("manual mode", () => {
    it("should use user-defined wounds.max in manual mode", () => {
      // ARRANGE
      const sys = {
        woundMode: "manual",
        wounds: { max: 60 },
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = 10;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.max).toBe(60); // User override
      expect(sys.wounds.value).toBe(50); // 60 - 10
    });

    it("should fall back to out threshold if manual max is 0", () => {
      // ARRANGE
      const sys = {
        woundMode: "manual",
        wounds: { max: 0 },
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = 0;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.max).toBe(40); // Fallback to out
    });
  });

  describe("edge cases", () => {
    it("should handle null suffered", () => {
      // ARRANGE
      const sys = {
        woundMode: "formula",
        wounds: {},
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = null;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.value).toBe(40);
    });

    it("should handle undefined woundLevels.out", () => {
      // ARRANGE
      const sys = {
        woundMode: "formula",
        wounds: {},
        woundLevels: {}
      };
      const suffered = 0;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.max).toBe(0);
    });

    it("should create wounds object if missing", () => {
      // ARRANGE
      const sys = {
        woundMode: "formula",
        woundLevels: {
          out: { value: 40 }
        }
      };
      const suffered = 0;

      // ACT
      initializeWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds).toBeDefined();
      expect(sys.wounds.max).toBe(40);
    });
  });
});

describe("findCurrentWoundLevel", () => {
  describe("valid inputs", () => {
    it("should find healthy level when no damage", () => {
      // ARRANGE
      const sys = {
        woundLevels: {
          healthy: { value: 15, current: false },
          nicked: { value: 17, current: false },
          out: { value: 40, current: false }
        }
      };
      const levelsToCheck = ["healthy", "nicked", "out"];
      const sCapped = 0;

      // ACT
      const result = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.healthy);
      expect(sys.woundLevels.healthy.current).toBe(true);
      expect(sys.woundLevels.nicked.current).toBe(false);
    });

    it("should find nicked level when damage in range", () => {
      // ARRANGE
      const sys = {
        woundLevels: {
          healthy: { value: 15, current: false },
          nicked: { value: 17, current: false },
          out: { value: 40, current: false }
        }
      };
      const levelsToCheck = ["healthy", "nicked", "out"];
      const sCapped = 16;

      // ACT
      const result = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.nicked);
      expect(sys.woundLevels.healthy.current).toBe(false);
      expect(sys.woundLevels.nicked.current).toBe(true);
    });

    it("should find out level when damage equals out threshold", () => {
      // ARRANGE
      const sys = {
        woundLevels: {
          healthy: { value: 15, current: false },
          out: { value: 40, current: false }
        }
      };
      const levelsToCheck = ["healthy", "out"];
      const sCapped = 40;

      // ACT
      const result = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.out);
      expect(sys.woundLevels.out.current).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty levelsToCheck", () => {
      // ARRANGE
      const sys = {
        woundLevels: {
          healthy: { value: 15, current: false }
        }
      };
      const levelsToCheck = [];
      const sCapped = 0;

      // ACT
      const result = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.healthy);
    });

    it("should skip missing wound levels", () => {
      // ARRANGE
      const sys = {
        woundLevels: {
          healthy: { value: 15, current: false },
          out: { value: 40, current: false }
        }
      };
      const levelsToCheck = ["healthy", "nonexistent", "out"];
      const sCapped = 20;

      // ACT
      const result = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.out);
    });

    it("should handle negative sCapped", () => {
      // ARRANGE
      const sys = {
        woundLevels: {
          healthy: { value: 15, current: false }
        }
      };
      const levelsToCheck = ["healthy"];
      const sCapped = -10;

      // ACT
      const result = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.healthy);
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

  describe("lethality scaling", () => {
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

  describe("simplified wound levels", () => {
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

  describe("edge cases", () => {
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
