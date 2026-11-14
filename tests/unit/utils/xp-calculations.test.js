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
  getCreationFreeBonusSources,
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

    it("should handle large ranks", () => {
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

/** A Family or School item whose Trait bonus is a TraitAdjust rule, as the rule engine reads it. */
const ruleItem = (type, trait, value = 1, extra = {}) => ({
  type,
  system: { rules: [{ key: "TraitAdjust", trait, value }] },
  ...extra
});

/** A Family or School item with only the legacy trait/bonus fields. */
const legacyItem = (type, trait, bonus = 1) => ({ type, system: { trait, bonus, rules: [] } });

describe("getCreationFreeBonus", () => {
  beforeEach(() => {
    global.fromUuidSync = vi.fn(() => null);
  });

  describe("TraitAdjust rules", () => {
    it("should detect a trait bonus from a TraitAdjust rule", () => {
      const actor = { items: [ruleItem("family", "sta")], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(1);
    });

    it("should sum bonuses from the Family and the School", () => {
      const actor = {
        items: [ruleItem("family", "sta"), ruleItem("school", "sta")],
        getFlag: () => null
      };
      expect(getCreationFreeBonus(actor, "sta")).toBe(2);
    });

    it("should only count the matching trait", () => {
      const family = {
        type: "family",
        system: {
          rules: [
            { key: "TraitAdjust", trait: "sta", value: 1 },
            { key: "TraitAdjust", trait: "wil", value: 1 }
          ]
        }
      };
      expect(getCreationFreeBonus({ items: [family], getFlag: () => null }, "sta")).toBe(1);
    });

    it("should ignore other rule keys", () => {
      const family = {
        type: "family",
        system: { rules: [{ key: "RollModifier", trait: "sta", value: 1 }] }
      };
      expect(getCreationFreeBonus({ items: [family], getFlag: () => null }, "sta")).toBe(0);
    });

    it("should ignore a formula value, which only the rule engine resolves", () => {
      const actor = { items: [ruleItem("family", "sta", "@rings.air")], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(0);
    });

    it("should handle fractional bonuses", () => {
      const actor = { items: [ruleItem("family", "agi", 0.5)], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "agi")).toBe(0.5);
    });
  });

  describe("legacy approach", () => {
    it("should detect trait bonus from legacy system.trait property", () => {
      const actor = { items: [legacyItem("family", "sta")], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(1);
    });

    it("should prefer a TraitAdjust rule over legacy", () => {
      const family = {
        type: "family",
        system: { trait: "sta", bonus: 2, rules: [{ key: "TraitAdjust", trait: "sta", value: 1 }] }
      };
      expect(getCreationFreeBonus({ items: [family], getFlag: () => null }, "sta")).toBe(1);
    });

    it("should be case insensitive for legacy trait key", () => {
      const actor = { items: [legacyItem("family", "STA")], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(1);
    });

    it("should ignore legacy with non-finite bonus", () => {
      const actor = { items: [legacyItem("family", "sta", NaN)], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(0);
    });
  });

  describe("UUID-flagged items", () => {
    it("should resolve family item from UUID flag", () => {
      const familyItem = ruleItem("family", "ref", 1, { uuid: "Item.abc123" });
      global.fromUuidSync = vi.fn(() => familyItem);
      const actor = {
        items: [],
        getFlag: vi.fn((sys, key) => (key === "familyItemUuid" ? "Item.abc123" : null))
      };

      expect(getCreationFreeBonus(actor, "ref")).toBe(1);
      expect(global.fromUuidSync).toHaveBeenCalledWith("Item.abc123");
    });

    it("should not double-count items in both flags and items array", () => {
      const familyItem = ruleItem("family", "sta", 1, { uuid: "Item.abc123", id: "abc123" });
      global.fromUuidSync = vi.fn(() => familyItem);
      const actor = {
        items: [familyItem],
        getFlag: vi.fn((sys, key) => (key === "familyItemUuid" ? "Item.abc123" : null))
      };

      expect(getCreationFreeBonus(actor, "sta")).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for null actor", () => {
      expect(getCreationFreeBonus(null, "sta")).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      expect(getCreationFreeBonus(undefined, "sta")).toBe(0);
    });

    it("should return 0 for actor without items", () => {
      expect(getCreationFreeBonus({ getFlag: () => null }, "sta")).toBe(0);
    });

    it("should return 0 for empty items array", () => {
      expect(getCreationFreeBonus({ items: [], getFlag: () => null }, "sta")).toBe(0);
    });

    it("should return 0 for no matching trait", () => {
      const actor = { items: [ruleItem("family", "wil")], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(0);
    });

    it("should ignore non-family/school items", () => {
      const actor = { items: [ruleItem("weapon", "sta")], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "sta")).toBe(0);
    });

    it("should handle missing globalThis.fromUuidSync", () => {
      delete global.fromUuidSync;
      expect(getCreationFreeBonus({ items: [], getFlag: () => "Item.abc123" }, "sta")).toBe(0);
    });

    it("should handle errors gracefully", () => {
      const unreadable = {
        type: "family",
        get system() {
          throw new Error("unreadable");
        }
      };
      expect(getCreationFreeBonus({ items: [unreadable], getFlag: () => null }, "sta")).toBe(0);
    });
  });
});

describe("getCreationFreeBonusSources", () => {
  beforeEach(() => {
    global.fromUuidSync = vi.fn(() => null);
  });

  it("reports a TraitAdjust rule bonus as rules, not legacy", () => {
    const actor = { items: [ruleItem("family", "str")], getFlag: () => null };
    expect(getCreationFreeBonusSources(actor, "str")).toEqual({ rules: 1, legacy: 0 });
  });

  it("reports the legacy trait and bonus fields as legacy, not rules", () => {
    const actor = { items: [legacyItem("family", "str")], getFlag: () => null };
    expect(getCreationFreeBonusSources(actor, "str")).toEqual({ rules: 0, legacy: 1 });
  });

  it("keeps the two sources apart when the Family and School use different forms", () => {
    const actor = {
      items: [ruleItem("family", "str"), legacyItem("school", "str")],
      getFlag: () => null
    };
    expect(getCreationFreeBonusSources(actor, "str")).toEqual({ rules: 1, legacy: 1 });
    expect(getCreationFreeBonus(actor, "str")).toBe(2);
  });

  it("returns zero for both sources when an item cannot be read", () => {
    const unreadable = {
      type: "family",
      get system() {
        throw new Error("unreadable");
      }
    };
    expect(
      getCreationFreeBonusSources({ items: [unreadable], getFlag: () => null }, "str")
    ).toEqual({
      rules: 0,
      legacy: 0
    });
  });
});

describe("getCreationFreeBonusVoid", () => {
  beforeEach(() => {
    global.fromUuidSync = vi.fn(() => null);
  });

  describe("void ring bonuses", () => {
    it("should detect a Void bonus from a TraitAdjust rule", () => {
      const actor = { items: [ruleItem("school", "void")], getFlag: () => null };
      expect(getCreationFreeBonusVoid(actor)).toBe(1);
    });

    it("should sum Void bonuses from the Family and the School", () => {
      const actor = {
        items: [ruleItem("family", "void"), ruleItem("school", "void")],
        getFlag: () => null
      };
      expect(getCreationFreeBonusVoid(actor)).toBe(2);
    });

    it("should use legacy system.trait=void approach", () => {
      const actor = { items: [legacyItem("family", "void")], getFlag: () => null };
      expect(getCreationFreeBonusVoid(actor)).toBe(1);
    });

    it("should be case insensitive for legacy void", () => {
      const actor = { items: [legacyItem("family", "VOID")], getFlag: () => null };
      expect(getCreationFreeBonusVoid(actor)).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for null actor", () => {
      expect(getCreationFreeBonusVoid(null)).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      expect(getCreationFreeBonusVoid(undefined)).toBe(0);
    });

    it("should return 0 for actor without items", () => {
      expect(getCreationFreeBonusVoid({ getFlag: () => null })).toBe(0);
    });

    it("should return 0 for no void bonuses", () => {
      const actor = { items: [ruleItem("family", "sta")], getFlag: () => null };
      expect(getCreationFreeBonusVoid(actor)).toBe(0);
    });
  });
});
