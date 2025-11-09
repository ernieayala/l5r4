/**
 * Unit Tests: xp-calculations.js
 *
 * Tests L5R4 XP cost calculations for trait advancement and creation bonus tracking.
 * Validates cost formulas, free effective ranks, and family/school bonus detection.
 *
 * Test Priority: Tier 1 (Critical - Character advancement system)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateXpStepCostForTrait,
  calculateVoidStepCost,
  calculateSkillStepCost,
  calculateEmphasisCost,
  getCreationFreeBonus,
  getCreationFreeBonusVoid
} from "../../../module/utils/xp-calculations.js";

describe("calculateXpStepCostForTrait", () => {
  describe("standard trait costs", () => {
    it("should cost 4 × rank for rank 1", () => {
      const cost = calculateXpStepCostForTrait(1, 0, 0);
      expect(cost).toBe(4); // 4 × 1
    });

    it("should cost 4 × rank for rank 3", () => {
      const cost = calculateXpStepCostForTrait(3, 0, 0);
      expect(cost).toBe(12); // 4 × 3
    });

    it("should cost 4 × rank for rank 5", () => {
      const cost = calculateXpStepCostForTrait(5, 0, 0);
      expect(cost).toBe(20); // 4 × 5
    });

    it("should cost 4 × rank for rank 10", () => {
      const cost = calculateXpStepCostForTrait(10, 0, 0);
      expect(cost).toBe(40); // 4 × 10
    });
  });

  describe("free effective ranks", () => {
    it("should reduce cost by free effective ranks", () => {
      // Rank 3 with +1 free effective rank
      // Cost = 4 × (3 + 1) = 16, but represents advancing to rank 3
      const cost = calculateXpStepCostForTrait(3, -1, 0);
      expect(cost).toBe(8); // 4 × (3 - 1) = 8
    });

    it("should handle family bonus (+1 free rank)", () => {
      // Family grants +1 Stamina, so rank 3 costs as rank 2
      const cost = calculateXpStepCostForTrait(3, -1, 0);
      expect(cost).toBe(8); // 4 × 2
    });

    it("should handle multiple free ranks", () => {
      const cost = calculateXpStepCostForTrait(5, -2, 0);
      expect(cost).toBe(12); // 4 × 3
    });

    it("should handle positive free effective ranks", () => {
      // Positive would increase cost (unusual but possible)
      const cost = calculateXpStepCostForTrait(3, 1, 0);
      expect(cost).toBe(16); // 4 × 4
    });
  });

  describe("discounts", () => {
    it("should apply negative discount", () => {
      const cost = calculateXpStepCostForTrait(3, 0, -4);
      expect(cost).toBe(8); // 12 - 4
    });

    it("should apply positive discount (penalty)", () => {
      const cost = calculateXpStepCostForTrait(3, 0, 4);
      expect(cost).toBe(16); // 12 + 4
    });

    it("should combine free ranks and discount", () => {
      const cost = calculateXpStepCostForTrait(3, -1, -2);
      expect(cost).toBe(6); // 4 × 2 - 2 = 6
    });
  });

  describe("minimum cost enforcement", () => {
    it("should never return negative cost", () => {
      const cost = calculateXpStepCostForTrait(1, 0, -10);
      expect(cost).toBe(0); // Min 0
    });

    it("should return 0 for heavy discount", () => {
      const cost = calculateXpStepCostForTrait(2, -1, -4);
      expect(cost).toBe(0); // 4 × 1 - 4 = 0
    });

    it("should return 0 for rank 0", () => {
      const cost = calculateXpStepCostForTrait(0, 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle null rank", () => {
      const cost = calculateXpStepCostForTrait(null, 0, 0);
      expect(cost).toBe(0);
    });

    it("should handle undefined rank", () => {
      const cost = calculateXpStepCostForTrait(undefined, 0, 0);
      expect(cost).toBe(0);
    });

    it("should handle null free effective", () => {
      const cost = calculateXpStepCostForTrait(3, null, 0);
      expect(cost).toBe(12); // Treats null as 0
    });

    it("should handle undefined free effective", () => {
      const cost = calculateXpStepCostForTrait(3, undefined, 0);
      expect(cost).toBe(12); // Treats undefined as 0
    });

    it("should handle null discount", () => {
      const cost = calculateXpStepCostForTrait(3, 0, null);
      expect(cost).toBe(12); // Treats null as 0
    });

    it("should handle undefined discount", () => {
      const cost = calculateXpStepCostForTrait(3, 0, undefined);
      expect(cost).toBe(12); // Treats undefined as 0
    });

    it("should coerce string rank to number", () => {
      const cost = calculateXpStepCostForTrait("4", 0, 0);
      expect(cost).toBe(16);
    });

    it("should handle NaN rank", () => {
      const cost = calculateXpStepCostForTrait(NaN, 0, 0);
      expect(cost).toBe(0);
    });

    it("should handle negative rank", () => {
      const cost = calculateXpStepCostForTrait(-2, 0, 0);
      expect(cost).toBe(0); // Min 0 (negative × 4 would be negative)
    });

    it("should handle Infinity rank", () => {
      const cost = calculateXpStepCostForTrait(Infinity, 0, 0);
      expect(cost).toBe(Infinity); // 4 × Infinity
    });

    it("should handle fractional rank", () => {
      const cost = calculateXpStepCostForTrait(2.5, 0, 0);
      expect(cost).toBe(10); // 4 × 2.5
    });
  });
});

describe("calculateVoidStepCost", () => {
  describe("standard void costs", () => {
    it("should cost 6 × rank for rank 1", () => {
      const cost = calculateVoidStepCost(1, 0);
      expect(cost).toBe(6); // 6 × 1
    });

    it("should cost 6 × rank for rank 3", () => {
      const cost = calculateVoidStepCost(3, 0);
      expect(cost).toBe(18); // 6 × 3
    });

    it("should cost 6 × rank for rank 5", () => {
      const cost = calculateVoidStepCost(5, 0);
      expect(cost).toBe(30); // 6 × 5
    });

    it("should cost 6 × rank for rank 10", () => {
      const cost = calculateVoidStepCost(10, 0);
      expect(cost).toBe(60); // 6 × 10
    });

    it("should cost more than regular traits", () => {
      const voidCost = calculateVoidStepCost(3, 0);
      const traitCost = calculateXpStepCostForTrait(3, 0, 0);
      expect(voidCost).toBeGreaterThan(traitCost); // 18 > 12
    });
  });

  describe("discounts", () => {
    it("should apply negative discount", () => {
      const cost = calculateVoidStepCost(3, -6);
      expect(cost).toBe(12); // 18 - 6
    });

    it("should apply positive discount (penalty)", () => {
      const cost = calculateVoidStepCost(3, 6);
      expect(cost).toBe(24); // 18 + 6
    });

    it("should allow heavy discounts", () => {
      const cost = calculateVoidStepCost(2, -6);
      expect(cost).toBe(6); // 12 - 6
    });
  });

  describe("minimum cost enforcement", () => {
    it("should never return negative cost", () => {
      const cost = calculateVoidStepCost(1, -10);
      expect(cost).toBe(0); // Min 0
    });

    it("should return 0 for excessive discount", () => {
      const cost = calculateVoidStepCost(2, -20);
      expect(cost).toBe(0); // 12 - 20 = 0 (clamped)
    });

    it("should return 0 for rank 0", () => {
      const cost = calculateVoidStepCost(0, 0);
      expect(cost).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle null rank", () => {
      const cost = calculateVoidStepCost(null, 0);
      expect(cost).toBe(0);
    });

    it("should handle undefined rank", () => {
      const cost = calculateVoidStepCost(undefined, 0);
      expect(cost).toBe(0);
    });

    it("should handle null discount", () => {
      const cost = calculateVoidStepCost(3, null);
      expect(cost).toBe(18); // Treats null as 0
    });

    it("should handle undefined discount", () => {
      const cost = calculateVoidStepCost(3, undefined);
      expect(cost).toBe(18); // Treats undefined as 0
    });

    it("should coerce string rank to number", () => {
      const cost = calculateVoidStepCost("4", 0);
      expect(cost).toBe(24); // 6 × 4
    });

    it("should handle NaN rank", () => {
      const cost = calculateVoidStepCost(NaN, 0);
      expect(cost).toBe(0);
    });

    it("should handle negative rank", () => {
      const cost = calculateVoidStepCost(-2, 0);
      expect(cost).toBe(0); // Min 0 (negative × 6 would be negative)
    });

    it("should handle Infinity rank", () => {
      const cost = calculateVoidStepCost(Infinity, 0);
      expect(cost).toBe(Infinity); // 6 × Infinity
    });

    it("should handle fractional rank", () => {
      const cost = calculateVoidStepCost(2.5, 0);
      expect(cost).toBe(15); // 6 × 2.5
    });
  });

  describe("real-world scenarios", () => {
    it("should calculate beginner void advancement (2→3)", () => {
      const cost = calculateVoidStepCost(3, 0);
      expect(cost).toBe(18);
    });

    it("should calculate advanced void advancement (5→6)", () => {
      const cost = calculateVoidStepCost(6, 0);
      expect(cost).toBe(36);
    });

    it("should calculate master void advancement (9→10)", () => {
      const cost = calculateVoidStepCost(10, 0);
      expect(cost).toBe(60);
    });

    it("should calculate void with clan discount", () => {
      // Some clans might have -3 void discount
      const cost = calculateVoidStepCost(3, -3);
      expect(cost).toBe(15); // 18 - 3
    });
  });
});

describe("calculateSkillStepCost", () => {
  describe("standard skill costs", () => {
    it("should cost equal to rank for rank 1", () => {
      const cost = calculateSkillStepCost(1);
      expect(cost).toBe(1);
    });

    it("should cost equal to rank for rank 3", () => {
      const cost = calculateSkillStepCost(3);
      expect(cost).toBe(3);
    });

    it("should cost equal to rank for rank 5", () => {
      const cost = calculateSkillStepCost(5);
      expect(cost).toBe(5);
    });

    it("should cost equal to rank for rank 10", () => {
      const cost = calculateSkillStepCost(10);
      expect(cost).toBe(10);
    });

    it("should have linear cost progression", () => {
      const cost1 = calculateSkillStepCost(1);
      const cost2 = calculateSkillStepCost(2);
      const cost3 = calculateSkillStepCost(3);
      expect(cost2 - cost1).toBe(1);
      expect(cost3 - cost2).toBe(1);
    });

    it("should cost less than trait advancement", () => {
      const skillCost = calculateSkillStepCost(3);
      const traitCost = calculateXpStepCostForTrait(3, 0, 0);
      expect(skillCost).toBeLessThan(traitCost); // 3 < 12
    });
  });

  describe("minimum cost enforcement", () => {
    it("should return 0 for rank 0", () => {
      const cost = calculateSkillStepCost(0);
      expect(cost).toBe(0);
    });

    it("should return 0 for negative rank", () => {
      const cost = calculateSkillStepCost(-5);
      expect(cost).toBe(0); // Min 0
    });
  });

  describe("edge cases", () => {
    it("should handle null rank", () => {
      const cost = calculateSkillStepCost(null);
      expect(cost).toBe(0);
    });

    it("should handle undefined rank", () => {
      const cost = calculateSkillStepCost(undefined);
      expect(cost).toBe(0);
    });

    it("should coerce string rank to number", () => {
      const cost = calculateSkillStepCost("7");
      expect(cost).toBe(7);
    });

    it("should handle NaN rank", () => {
      const cost = calculateSkillStepCost(NaN);
      expect(cost).toBe(0);
    });

    it("should handle Infinity rank", () => {
      const cost = calculateSkillStepCost(Infinity);
      expect(cost).toBe(Infinity);
    });

    it("should handle fractional rank", () => {
      const cost = calculateSkillStepCost(3.5);
      expect(cost).toBe(3.5);
    });

    it("should handle very large ranks", () => {
      const cost = calculateSkillStepCost(100);
      expect(cost).toBe(100);
    });
  });

  describe("real-world scenarios", () => {
    it("should calculate learning new skill (0→1)", () => {
      const cost = calculateSkillStepCost(1);
      expect(cost).toBe(1);
    });

    it("should calculate early skill advancement (2→3)", () => {
      const cost = calculateSkillStepCost(3);
      expect(cost).toBe(3);
    });

    it("should calculate mid-tier skill advancement (5→6)", () => {
      const cost = calculateSkillStepCost(6);
      expect(cost).toBe(6);
    });

    it("should calculate master skill advancement (9→10)", () => {
      const cost = calculateSkillStepCost(10);
      expect(cost).toBe(10);
    });
  });
});

describe("calculateEmphasisCost", () => {
  describe("standard emphasis cost", () => {
    it("should always return 2", () => {
      const cost = calculateEmphasisCost();
      expect(cost).toBe(2);
    });

    it("should be constant regardless of skill rank", () => {
      // Emphasis cost doesn't depend on skill rank
      const cost1 = calculateEmphasisCost();
      const cost2 = calculateEmphasisCost();
      expect(cost1).toBe(cost2);
      expect(cost1).toBe(2);
    });

    it("should cost less than skill rank advancement", () => {
      const emphasisCost = calculateEmphasisCost();
      const skillCost = calculateSkillStepCost(3);
      expect(emphasisCost).toBeLessThan(skillCost); // 2 < 3
    });
  });

  describe("multiple emphasis purchases", () => {
    it("should cost same for first emphasis", () => {
      const cost = calculateEmphasisCost();
      expect(cost).toBe(2);
    });

    it("should cost same for second emphasis", () => {
      const cost = calculateEmphasisCost();
      expect(cost).toBe(2);
    });

    it("should have constant cost for any number of emphases", () => {
      const costs = Array.from({ length: 10 }, () => calculateEmphasisCost());
      expect(costs.every(c => c === 2)).toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("should calculate emphasis for Kenjutsu (Katana)", () => {
      const cost = calculateEmphasisCost();
      expect(cost).toBe(2);
    });

    it("should calculate emphasis for Courtier (Manipulation)", () => {
      const cost = calculateEmphasisCost();
      expect(cost).toBe(2);
    });

    it("should calculate total cost for 3 emphases", () => {
      const totalCost = calculateEmphasisCost() * 3;
      expect(totalCost).toBe(6);
    });
  });
});

describe("getCreationFreeBonus", () => {
  beforeEach(() => {
    // Mock CONST.ACTIVE_EFFECT_MODES
    global.CONST = {
      ACTIVE_EFFECT_MODES: {
        ADD: 2
      }
    };

    // Mock globalThis.fromUuidSync
    global.fromUuidSync = vi.fn(() => null);
  });

  describe("Active Effects approach", () => {
    it("should detect trait bonus from Active Effect", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2, // ADD
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(1);
    });

    it("should sum multiple bonuses from different items", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            type: "school",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(2);
    });

    it("should ignore non-transfer effects", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: false,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0); // transfer=false not counted
    });

    it("should ignore effects with wrong mode", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 1, // MULTIPLY, not ADD
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0); // Wrong mode
    });

    it("should only count matching trait key", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1
                  },
                  {
                    key: "system.traits.wil",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(1); // Only sta counted
    });

    it("should handle fractional bonuses", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.agi",
                    mode: 2,
                    value: 0.5
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "agi");
      expect(bonus).toBe(0.5);
    });
  });

  describe("legacy approach", () => {
    it("should detect trait bonus from legacy system.trait property", () => {
      const actor = {
        items: [
          {
            type: "family",
            system: {
              trait: "sta",
              bonus: 1
            },
            effects: [] // No Active Effects
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(1);
    });

    it("should prefer Active Effects over legacy", () => {
      const actor = {
        items: [
          {
            type: "family",
            system: {
              trait: "sta",
              bonus: 2 // Legacy
            },
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1 // Active Effect
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(1); // Uses Active Effect, ignores legacy
    });

    it("should be case insensitive for legacy trait key", () => {
      const actor = {
        items: [
          {
            type: "family",
            system: {
              trait: "STA",
              bonus: 1
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(1);
    });

    it("should ignore legacy with non-finite bonus", () => {
      const actor = {
        items: [
          {
            type: "family",
            system: {
              trait: "sta",
              bonus: NaN
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0);
    });
  });

  describe("UUID-flagged items", () => {
    it("should resolve family item from UUID flag", () => {
      const familyItem = {
        type: "family",
        uuid: "Item.abc123",
        effects: [
          {
            transfer: true,
            changes: [
              {
                key: "system.traits.ref",
                mode: 2,
                value: 1
              }
            ]
          }
        ]
      };

      global.fromUuidSync = vi.fn(() => familyItem);

      const actor = {
        items: [],
        getFlag: vi.fn((sys, key) => {
          if (key === "familyItemUuid") {
            return "Item.abc123";
          }
          return null;
        })
      };

      const bonus = getCreationFreeBonus(actor, "ref");
      expect(bonus).toBe(1);
      expect(global.fromUuidSync).toHaveBeenCalledWith("Item.abc123");
    });

    it("should not double-count items in both flags and items array", () => {
      const familyItem = {
        type: "family",
        uuid: "Item.abc123",
        id: "abc123",
        effects: [
          {
            transfer: true,
            changes: [
              {
                key: "system.traits.sta",
                mode: 2,
                value: 1
              }
            ]
          }
        ]
      };

      global.fromUuidSync = vi.fn(() => familyItem);

      const actor = {
        items: [familyItem], // Same item in array
        getFlag: vi.fn((sys, key) => {
          if (key === "familyItemUuid") {
            return "Item.abc123";
          }
          return null;
        })
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(1); // Should only count once
    });
  });

  describe("edge cases", () => {
    it("should return 0 for null actor", () => {
      const bonus = getCreationFreeBonus(null, "sta");
      expect(bonus).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      const bonus = getCreationFreeBonus(undefined, "sta");
      expect(bonus).toBe(0);
    });

    it("should return 0 for actor without items", () => {
      const actor = {
        getFlag: () => null
      };
      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0);
    });

    it("should return 0 for empty items array", () => {
      const actor = {
        items: [],
        getFlag: () => null
      };
      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0);
    });

    it("should return 0 for no matching trait", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.wil",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0); // No sta bonus
    });

    it("should ignore non-family/school items", () => {
      const actor = {
        items: [
          {
            type: "weapon",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0); // Only family/school count
    });

    it("should handle missing globalThis.fromUuidSync", () => {
      delete global.fromUuidSync;

      const actor = {
        items: [],
        getFlag: () => "Item.abc123"
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0); // No error, just returns 0
    });

    it("should handle getFlag returning falsy", () => {
      const actor = {
        items: [],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0);
    });

    it("should handle errors gracefully", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: null // Will cause error when iterating
          }
        ],
        getFlag: () => null
      };

      // Should not throw, returns 0
      const bonus = getCreationFreeBonus(actor, "sta");
      expect(bonus).toBe(0);
    });
  });
});

describe("getCreationFreeBonusVoid", () => {
  beforeEach(() => {
    global.CONST = {
      ACTIVE_EFFECT_MODES: {
        ADD: 2
      }
    };
    global.fromUuidSync = vi.fn(() => null);
  });

  describe("void ring bonuses", () => {
    it("should detect void ring bonus from system.rings.void.rank", () => {
      const actor = {
        items: [
          {
            type: "school",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.rings.void.rank",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });

    it("should detect void ring bonus from system.rings.void.value", () => {
      const actor = {
        items: [
          {
            type: "school",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.rings.void.value",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });

    it("should sum bonuses from rank and value keys", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.rings.void.rank",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            type: "school",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.rings.void.value",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(2);
    });

    it("should use legacy system.trait=void approach", () => {
      const actor = {
        items: [
          {
            type: "family",
            system: {
              trait: "void",
              bonus: 1
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });

    it("should be case insensitive for legacy void", () => {
      const actor = {
        items: [
          {
            type: "family",
            system: {
              trait: "VOID",
              bonus: 1
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for null actor", () => {
      const bonus = getCreationFreeBonusVoid(null);
      expect(bonus).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      const bonus = getCreationFreeBonusVoid(undefined);
      expect(bonus).toBe(0);
    });

    it("should return 0 for actor without items", () => {
      const actor = {
        getFlag: () => null
      };
      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(0);
    });

    it("should return 0 for no void bonuses", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: "system.traits.sta",
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(0);
    });

    it("should handle errors gracefully", () => {
      const actor = {
        items: [
          {
            type: "family",
            effects: null
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(0);
    });
  });
});
