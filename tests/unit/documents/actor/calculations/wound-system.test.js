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
import { WOUND_LEVEL_ORDER } from "../../../../../module/config/game-mechanics.js";
import {
  getWoundThreshold,
  prepareWoundPenalties,
  prepareWoundState,
  prepareCurrentWoundLevel
} from "../../../../../module/documents/actor/calculations/wound-system.js";

/** Each rank's threshold in WOUND_LEVEL_ORDER, built on the one before it as preparation builds them. */
function thresholdsOf({ earth, mult, add = 0 }) {
  let prev = 0;
  return WOUND_LEVEL_ORDER.map(key => (prev = getWoundThreshold(key, { earth, mult, add, prev })));
}

// game-rules/33_wounds.md, p.82
// game-rules/34_ambush_falling_drowning.md, p.84
describe("getWoundThreshold", () => {
  it("should give Healthy Earth × 5 and each later rank Earth × 2 more, the default multiplier", () => {
    // Earth 2: Healthy holds 10, then 4 per rank through Out
    expect(thresholdsOf({ earth: 2, mult: 2 })).toEqual([10, 14, 18, 22, 26, 30, 34, 38]);
    // Earth 3: Healthy holds 15, then 6 per rank
    expect(thresholdsOf({ earth: 3, mult: 2 })).toEqual([15, 21, 27, 33, 39, 45, 51, 57]);
  });

  it("should keep Healthy at Earth × 5 whatever multiplier the campaign chooses", () => {
    for (const mult of [2, 3, 4, 5]) {
      expect(getWoundThreshold("healthy", { earth: 3, mult, add: 0, prev: 0 })).toBe(15);
    }
    // Earth 3 at × 4: 12 per rank after Healthy
    expect(thresholdsOf({ earth: 3, mult: 4 })).toEqual([15, 27, 39, 51, 63, 75, 87, 99]);
  });

  it("should add the flat Wounds modifier to each rank", () => {
    // Earth 2, × 2, +1: Healthy 11, then each rank 4 + 1 more than the one before
    expect(thresholdsOf({ earth: 2, mult: 2, add: 1 })).toEqual([11, 16, 21, 26, 31, 36, 41, 46]);
  });
});

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
