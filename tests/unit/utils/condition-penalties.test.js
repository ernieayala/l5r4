/**
 * Unit Tests: condition-penalties.js
 *
 * Tests L5R4 condition penalty extraction from actor system data.
 * Validates roll penalties, TN penalties, and restriction detection.
 *
 * Test Priority: Tier 1 (Critical - Combat condition effects)
 */

import { describe, it, expect } from "vitest";
import {
  getConditionRollPenalties,
  getConditionTNPenalty,
  getConditionRestrictions,
  hasActiveConditions
} from "../../../module/utils/condition-penalties.js";

describe("getConditionRollPenalties", () => {
  describe("attack rolls - melee", () => {
    it("should return melee penalties for melee attack", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: -1, keep: -1 },
              ranged: { roll: -3, keep: -3 },
              defense: { roll: -1, keep: -1 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(-1);
      expect(penalties.keep).toBe(-1);
    });

    it("should handle 0 penalties", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: 0, keep: 0 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should coerce string penalties to numbers", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: "-2", keep: "-1" }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(-2);
      expect(penalties.keep).toBe(-1);
    });

    it("should handle dazed penalty (-3k0)", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: -3, keep: 0 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(-3);
      expect(penalties.keep).toBe(0);
    });
  });

  describe("attack rolls - ranged", () => {
    it("should return ranged penalties for ranged attack", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: -1, keep: -1 },
              ranged: { roll: -3, keep: -3 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "ranged");
      expect(penalties.roll).toBe(-3);
      expect(penalties.keep).toBe(-3);
    });

    it("should handle blinded ranged penalty (-3k3)", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              ranged: { roll: -3, keep: -3 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "ranged");
      expect(penalties.roll).toBe(-3);
      expect(penalties.keep).toBe(-3);
    });
  });

  describe("defense rolls", () => {
    it("should return defense penalties", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              defense: { roll: -1, keep: -1 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "defense");
      expect(penalties.roll).toBe(-1);
      expect(penalties.keep).toBe(-1);
    });

    it("should ignore attackType for defense rolls", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              defense: { roll: -2, keep: -2 }
            }
          }
        }
      };

      // attackType should be ignored for defense
      const penalties = getConditionRollPenalties(actor, "defense", "ranged");
      expect(penalties.roll).toBe(-2);
      expect(penalties.keep).toBe(-2);
    });
  });

  describe("general skill rolls", () => {
    it("should use most severe penalty for general rolls", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: -3, keep: 0 }, // Dazed
              ranged: { roll: -3, keep: -3 }, // Blinded
              defense: { roll: -1, keep: -1 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, null, "melee");
      expect(penalties.roll).toBe(-3); // Most negative roll penalty
      expect(penalties.keep).toBe(-3); // Most negative keep penalty
    });

    it("should return {0, 0} for no penalties", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: 0, keep: 0 },
              ranged: { roll: 0, keep: 0 },
              defense: { roll: 0, keep: 0 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, null);
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should handle mixed penalties (negative roll, zero keep)", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: -2, keep: 0 },
              ranged: { roll: 0, keep: 0 },
              defense: { roll: 0, keep: 0 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, null);
      expect(penalties.roll).toBe(-2);
      expect(penalties.keep).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should return {0, 0} for null actor", () => {
      const penalties = getConditionRollPenalties(null);
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should return {0, 0} for undefined actor", () => {
      const penalties = getConditionRollPenalties(undefined);
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should return {0, 0} for actor without system", () => {
      const actor = {};
      const penalties = getConditionRollPenalties(actor);
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should return {0, 0} for actor without _conditionEffects", () => {
      const actor = {
        system: {}
      };
      const penalties = getConditionRollPenalties(actor);
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should return {0, 0} for missing rollPenalties", () => {
      const actor = {
        system: {
          _conditionEffects: {}
        }
      };
      const penalties = getConditionRollPenalties(actor);
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should return {0, 0} for missing specific penalty type", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              defense: { roll: -1, keep: -1 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should handle null penalty values", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: null, keep: null }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should handle undefined penalty values", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: undefined, keep: undefined }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "melee");
      expect(penalties.roll).toBe(0);
      expect(penalties.keep).toBe(0);
    });

    it("should default to melee for invalid attackType", () => {
      const actor = {
        system: {
          _conditionEffects: {
            rollPenalties: {
              melee: { roll: -1, keep: -1 },
              ranged: { roll: -3, keep: -3 }
            }
          }
        }
      };

      const penalties = getConditionRollPenalties(actor, "attack", "invalid");
      expect(penalties.roll).toBe(-1); // Defaults to melee
      expect(penalties.keep).toBe(-1);
    });
  });
});

describe("getConditionTNPenalty", () => {
  describe("TN penalties", () => {
    it("should return TN penalty from _conditionEffects", () => {
      const actor = {
        system: {
          _conditionEffects: {
            tnPenalty: 5
          }
        }
      };

      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(5);
    });

    it("should return 0 for no TN penalty", () => {
      const actor = {
        system: {
          _conditionEffects: {
            tnPenalty: 0
          }
        }
      };

      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(0);
    });

    it("should handle fatigued penalty stacking", () => {
      const actor = {
        system: {
          _conditionEffects: {
            tnPenalty: 15 // 3 days fatigued (5 per day)
          }
        }
      };

      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(15);
    });

    it("should coerce string penalty to number", () => {
      const actor = {
        system: {
          _conditionEffects: {
            tnPenalty: "10"
          }
        }
      };

      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for null actor", () => {
      const penalty = getConditionTNPenalty(null);
      expect(penalty).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      const penalty = getConditionTNPenalty(undefined);
      expect(penalty).toBe(0);
    });

    it("should return 0 for actor without system", () => {
      const actor = {};
      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(0);
    });

    it("should return 0 for actor without _conditionEffects", () => {
      const actor = {
        system: {}
      };
      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(0);
    });

    it("should return 0 for missing tnPenalty", () => {
      const actor = {
        system: {
          _conditionEffects: {}
        }
      };
      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(0);
    });

    it("should return 0 for null tnPenalty", () => {
      const actor = {
        system: {
          _conditionEffects: {
            tnPenalty: null
          }
        }
      };
      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(0);
    });

    it("should return 0 for undefined tnPenalty", () => {
      const actor = {
        system: {
          _conditionEffects: {
            tnPenalty: undefined
          }
        }
      };
      const penalty = getConditionTNPenalty(actor);
      expect(penalty).toBe(0);
    });
  });
});

describe("getConditionRestrictions", () => {
  describe("restriction arrays", () => {
    it("should return restrictions array", () => {
      const actor = {
        system: {
          _conditionEffects: {
            restrictions: ["l5r4.conditions.stunned.restrictions"]
          }
        }
      };

      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual(["l5r4.conditions.stunned.restrictions"]);
    });

    it("should return multiple restrictions", () => {
      const actor = {
        system: {
          _conditionEffects: {
            restrictions: [
              "l5r4.conditions.entangled.restrictions",
              "l5r4.conditions.prone.restrictions"
            ]
          }
        }
      };

      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toHaveLength(2);
      expect(restrictions).toContain("l5r4.conditions.entangled.restrictions");
      expect(restrictions).toContain("l5r4.conditions.prone.restrictions");
    });

    it("should return empty array for no restrictions", () => {
      const actor = {
        system: {
          _conditionEffects: {
            restrictions: []
          }
        }
      };

      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should return empty array for null actor", () => {
      const restrictions = getConditionRestrictions(null);
      expect(restrictions).toEqual([]);
    });

    it("should return empty array for undefined actor", () => {
      const restrictions = getConditionRestrictions(undefined);
      expect(restrictions).toEqual([]);
    });

    it("should return empty array for actor without system", () => {
      const actor = {};
      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual([]);
    });

    it("should return empty array for actor without _conditionEffects", () => {
      const actor = {
        system: {}
      };
      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual([]);
    });

    it("should return empty array for missing restrictions", () => {
      const actor = {
        system: {
          _conditionEffects: {}
        }
      };
      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual([]);
    });

    it("should return empty array for null restrictions", () => {
      const actor = {
        system: {
          _conditionEffects: {
            restrictions: null
          }
        }
      };
      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual([]);
    });

    it("should return empty array for undefined restrictions", () => {
      const actor = {
        system: {
          _conditionEffects: {
            restrictions: undefined
          }
        }
      };
      const restrictions = getConditionRestrictions(actor);
      expect(restrictions).toEqual([]);
    });
  });
});

describe("hasActiveConditions", () => {
  describe("active condition detection", () => {
    it("should return true for active conditions", () => {
      const actor = {
        system: {
          _conditionEffects: {
            active: ["blinded", "dazed"]
          }
        }
      };

      const result = hasActiveConditions(actor);
      expect(result).toBe(true);
    });

    it("should return true for single active condition", () => {
      const actor = {
        system: {
          _conditionEffects: {
            active: ["stunned"]
          }
        }
      };

      const result = hasActiveConditions(actor);
      expect(result).toBe(true);
    });

    it("should return false for no active conditions", () => {
      const actor = {
        system: {
          _conditionEffects: {
            active: []
          }
        }
      };

      const result = hasActiveConditions(actor);
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should return false for null actor", () => {
      const result = hasActiveConditions(null);
      expect(result).toBe(false);
    });

    it("should return false for undefined actor", () => {
      const result = hasActiveConditions(undefined);
      expect(result).toBe(false);
    });

    it("should return false for actor without system", () => {
      const actor = {};
      const result = hasActiveConditions(actor);
      expect(result).toBe(false);
    });

    it("should return false for actor without _conditionEffects", () => {
      const actor = {
        system: {}
      };
      const result = hasActiveConditions(actor);
      expect(result).toBe(false);
    });

    it("should return false for missing active array", () => {
      const actor = {
        system: {
          _conditionEffects: {}
        }
      };
      const result = hasActiveConditions(actor);
      expect(result).toBe(false);
    });

    it("should return false for null active", () => {
      const actor = {
        system: {
          _conditionEffects: {
            active: null
          }
        }
      };
      const result = hasActiveConditions(actor);
      expect(result).toBe(false);
    });

    it("should return false for undefined active", () => {
      const actor = {
        system: {
          _conditionEffects: {
            active: undefined
          }
        }
      };
      const result = hasActiveConditions(actor);
      expect(result).toBe(false);
    });
  });
});
