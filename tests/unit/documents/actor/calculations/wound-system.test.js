/**
 * @fileoverview Wound System Calculation Tests (Vitest)
 *
 * Unit tests for pure wound calculation functions from wound-system.js.
 * Tests edge cases, boundaries, and L5R4 wound threshold formulas.
 *
 * Test Philosophy:
 * - Test edge cases as well as typical inputs
 * - Test boundary conditions (min/max values)
 * - Test error handling (null, undefined, invalid types)
 * - Verify L5R4 game rule formulas are correct
 *
 * @see module/documents/actor/calculations/wound-system.js
 */

import { describe, it, expect } from "vitest";
import {
  prepareWoundPenalties,
  prepareWoundState,
  prepareCurrentWoundLevel
} from "../../../../../module/documents/actor/calculations/wound-system.js";

describe("prepareWoundPenalties", () => {
  describe("Valid inputs", () => {
    // game-rules/33_wounds.md, p.82
    // #32
    it("should apply penalty modifier to wound levels past Healthy", () => {
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
      prepareWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.healthy.penaltyEff).toBe(0); // Healthy carries no penalty
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
      prepareWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(3);
    });

    it("should clamp negative effective penalties to zero", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: -10,
        woundLevels: {
          nicked: { penalty: 3 }
        }
      };

      // ACT
      prepareWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(0); // max(0, 3 + (-10)) = 0
    });

    it("should show zero penalty for Healthy level with negative modifier", () => {
      // ARRANGE - Regression test for issue where Healthy shows penalty value
      const sys = {
        woundsPenaltyMod: -3,
        woundLevels: {
          healthy: { penalty: 0 },
          nicked: { penalty: 3 }
        }
      };

      // ACT
      prepareWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.healthy.penaltyEff).toBe(0); // max(0, 0 + (-3)) = 0
      expect(sys.woundLevels.nicked.penaltyEff).toBe(0); // max(0, 3 + (-3)) = 0
    });
  });

  describe("Edge cases", () => {
    it("should handle null woundsPenaltyMod", () => {
      // ARRANGE
      const sys = {
        woundsPenaltyMod: null,
        woundLevels: {
          nicked: { penalty: 3 }
        }
      };

      // ACT
      prepareWoundPenalties(sys);

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
      expect(() => prepareWoundPenalties(sys)).not.toThrow();
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
      prepareWoundPenalties(sys);

      // ASSERT
      expect(sys.woundLevels.nicked.penaltyEff).toBe(5);
    });
  });
});

describe("prepareWoundState", () => {
  describe("Formula mode", () => {
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
      prepareWoundState(sys, suffered);

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
      prepareWoundState(sys, suffered);

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
      prepareWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.value).toBe(0); // Clamped to 0
    });
  });

  describe("Manual mode", () => {
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
      prepareWoundState(sys, suffered);

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
      prepareWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds.max).toBe(40); // Fallback to out
    });
  });

  describe("Edge cases", () => {
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
      prepareWoundState(sys, suffered);

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
      prepareWoundState(sys, suffered);

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
      prepareWoundState(sys, suffered);

      // ASSERT
      expect(sys.wounds).toBeDefined();
      expect(sys.wounds.max).toBe(40);
    });
  });
});

describe("prepareCurrentWoundLevel", () => {
  describe("Valid inputs", () => {
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
      const result = prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);

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
      const result = prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);

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
      const result = prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.out);
      expect(sys.woundLevels.out.current).toBe(true);
    });
  });

  describe("Edge cases", () => {
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
      const result = prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);

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
      const result = prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);

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
      const result = prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);

      // ASSERT
      expect(result).toBe(sys.woundLevels.healthy);
    });
  });
});
