/**
 * @fileoverview Unit tests for stance system helper functions
 * Tests pure logic for stance detection, Defense skill lookup, and effect status extraction
 *
 * Test Philosophy:
 * - Focus on edge cases and error paths (not just happy paths)
 * - Test behavior, not implementation
 * - Verify null safety and type coercion
 * - Ensure tests fail when code breaks (mutation testing mindset)
 *
 * @see module:services/stance/core/helpers
 */

import { describe, it, expect } from "vitest";
import {
  getEffectStatusIds,
  getActiveStances,
  getDefenseSkillRank,
  STANCE_IDS
} from "../../../module/services/stance/core/helpers.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Creates a mock ActiveEffect with v13 statuses Set
 * @param {string[]} statusIds - Status IDs to include
 * @param {boolean} disabled - Whether effect is disabled
 * @returns {Object} Mock effect
 */
function createV13Effect(statusIds, disabled = false) {
  return {
    statuses: new Set(statusIds),
    disabled,
    getFlag: () => null // No legacy flag
  };
}

/**
 * Creates a mock ActiveEffect with legacy core.statusId flag
 * @param {string} statusId - Single status ID
 * @param {boolean} disabled - Whether effect is disabled
 * @returns {Object} Mock effect
 */
function createLegacyEffect(statusId, disabled = false) {
  return {
    statuses: new Set(), // Empty in legacy
    disabled,
    getFlag: (scope, key) => {
      if (scope === "core" && key === "statusId") {
        return statusId;
      }
      return null;
    }
  };
}

/**
 * Creates a mock Actor with effects collection
 * @param {Array} effects - Array of effect objects
 * @returns {Object} Mock actor
 */
function createMockActorWithEffects(effects) {
  return {
    effects: effects
  };
}

/**
 * Creates a mock Actor with items collection
 * @param {Array} items - Array of item objects
 * @returns {Object} Mock actor
 */
function createMockActorWithItems(items) {
  return {
    items: items
  };
}

/**
 * Creates a mock skill item
 * @param {string} name - Skill name
 * @param {number} rank - Skill rank
 * @returns {Object} Mock skill item
 */
function createSkillItem(name, rank) {
  return {
    type: "skill",
    name: name,
    system: {
      rank: rank
    }
  };
}

// ============================================================================
// STANCE_IDS CONSTANT
// ============================================================================

describe("STANCE_IDS", () => {
  it("should contain all five L5R4 combat stances", () => {
    expect(STANCE_IDS.size).toBe(5);
    expect(STANCE_IDS.has("attackStance")).toBe(true);
    expect(STANCE_IDS.has("fullAttackStance")).toBe(true);
    expect(STANCE_IDS.has("defenseStance")).toBe(true);
    expect(STANCE_IDS.has("fullDefenseStance")).toBe(true);
    expect(STANCE_IDS.has("centerStance")).toBe(true);
  });

  it("should not contain non-stance status IDs", () => {
    expect(STANCE_IDS.has("prone")).toBe(false);
    expect(STANCE_IDS.has("stunned")).toBe(false);
    expect(STANCE_IDS.has("mounted")).toBe(false);
  });
});

// ============================================================================
// getEffectStatusIds()
// ============================================================================

describe("getEffectStatusIds", () => {
  describe("v13+ statuses Set", () => {
    it("should extract single status from v13 effect", () => {
      // ARRANGE
      const effect = createV13Effect(["fullAttackStance"]);

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });

    it("should extract multiple statuses from v13 effect", () => {
      // ARRANGE
      const effect = createV13Effect(["fullAttackStance", "prone"]);

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["fullAttackStance", "prone"]);
    });

    it("should return empty array when statuses Set is empty", () => {
      // ARRANGE
      const effect = createV13Effect([]);

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe("legacy core.statusId flag", () => {
    it("should extract status from legacy effect", () => {
      // ARRANGE
      const effect = createLegacyEffect("defenseStance");

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["defenseStance"]);
    });

    it("should return empty array when legacy flag is null", () => {
      // ARRANGE
      const effect = {
        statuses: new Set(),
        getFlag: () => null
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should return empty array when legacy flag is undefined", () => {
      // ARRANGE
      const effect = {
        statuses: new Set(),
        getFlag: () => undefined
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should return empty array when legacy flag is empty string", () => {
      // ARRANGE
      const effect = {
        statuses: new Set(),
        getFlag: () => ""
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe("dual compatibility (v13 + legacy)", () => {
    it("should extract from both v13 and legacy when both present", () => {
      // ARRANGE - Effect with both modern and legacy status
      const effect = {
        statuses: new Set(["fullAttackStance"]),
        getFlag: (scope, key) => {
          if (scope === "core" && key === "statusId") {
            return "defenseStance";
          }
          return null;
        }
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toContain("fullAttackStance");
      expect(result).toContain("defenseStance");
      expect(result.length).toBe(2);
    });
  });

  describe("null safety", () => {
    it("should return empty array for null effect", () => {
      // ACT
      const result = getEffectStatusIds(null);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should return empty array for undefined effect", () => {
      // ACT
      const result = getEffectStatusIds(undefined);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should handle effect with null statuses property", () => {
      // ARRANGE
      const effect = {
        statuses: null,
        getFlag: () => null
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should handle effect with undefined statuses property", () => {
      // ARRANGE
      const effect = {
        statuses: undefined,
        getFlag: () => null
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should handle effect missing getFlag method", () => {
      // ARRANGE
      const effect = {
        statuses: new Set(["fullAttackStance"])
        // No getFlag method
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });
  });

  describe("filter falsy values", () => {
    it("should filter out null values from result", () => {
      // ARRANGE - Effect that might return null
      const effect = {
        statuses: new Set([null, "fullAttackStance"]),
        getFlag: () => null
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });

    it("should filter out undefined values from result", () => {
      // ARRANGE
      const effect = {
        statuses: new Set([undefined, "defenseStance"]),
        getFlag: () => undefined
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["defenseStance"]);
    });

    it("should filter out empty strings from result", () => {
      // ARRANGE
      const effect = {
        statuses: new Set(["", "centerStance"]),
        getFlag: () => ""
      };

      // ACT
      const result = getEffectStatusIds(effect);

      // ASSERT
      expect(result).toEqual(["centerStance"]);
    });
  });
});

// ============================================================================
// getActiveStances()
// ============================================================================

describe("getActiveStances", () => {
  describe("valid stance detection", () => {
    it("should detect single active stance", () => {
      // ARRANGE
      const effect = createV13Effect(["fullAttackStance"]);
      const actor = createMockActorWithEffects([effect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });

    it("should detect multiple active stances", () => {
      // ARRANGE
      const effect1 = createV13Effect(["fullAttackStance"]);
      const effect2 = createV13Effect(["defenseStance"]);
      const actor = createMockActorWithEffects([effect1, effect2]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toContain("fullAttackStance");
      expect(result).toContain("defenseStance");
      expect(result.length).toBe(2);
    });

    it("should detect all five stance types", () => {
      // ARRANGE
      const effects = [
        createV13Effect(["attackStance"]),
        createV13Effect(["fullAttackStance"]),
        createV13Effect(["defenseStance"]),
        createV13Effect(["fullDefenseStance"]),
        createV13Effect(["centerStance"])
      ];
      const actor = createMockActorWithEffects(effects);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toContain("attackStance");
      expect(result).toContain("fullAttackStance");
      expect(result).toContain("defenseStance");
      expect(result).toContain("fullDefenseStance");
      expect(result).toContain("centerStance");
      expect(result.length).toBe(5);
    });
  });

  describe("filtering non-stance effects", () => {
    it("should filter out non-stance status effects", () => {
      // ARRANGE
      const stanceEffect = createV13Effect(["fullAttackStance"]);
      const proneEffect = createV13Effect(["prone"]);
      const stunnedEffect = createV13Effect(["stunned"]);
      const actor = createMockActorWithEffects([stanceEffect, proneEffect, stunnedEffect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });

    it("should return only stance IDs from mixed effect", () => {
      // ARRANGE - Effect with both stance and non-stance statuses
      const effect = createV13Effect(["fullAttackStance", "prone", "stunned"]);
      const actor = createMockActorWithEffects([effect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });
  });

  describe("disabled effects", () => {
    it("should skip disabled stance effects", () => {
      // ARRANGE
      const activeEffect = createV13Effect(["fullAttackStance"], false);
      const disabledEffect = createV13Effect(["defenseStance"], true);
      const actor = createMockActorWithEffects([activeEffect, disabledEffect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual(["fullAttackStance"]);
    });

    it("should return empty array when all stance effects disabled", () => {
      // ARRANGE
      const effect1 = createV13Effect(["fullAttackStance"], true);
      const effect2 = createV13Effect(["defenseStance"], true);
      const actor = createMockActorWithEffects([effect1, effect2]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe("legacy compatibility", () => {
    it("should detect legacy stance effects", () => {
      // ARRANGE
      const legacyEffect = createLegacyEffect("fullDefenseStance");
      const actor = createMockActorWithEffects([legacyEffect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual(["fullDefenseStance"]);
    });

    it("should detect both v13 and legacy stance effects", () => {
      // ARRANGE
      const v13Effect = createV13Effect(["fullAttackStance"]);
      const legacyEffect = createLegacyEffect("defenseStance");
      const actor = createMockActorWithEffects([v13Effect, legacyEffect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toContain("fullAttackStance");
      expect(result).toContain("defenseStance");
      expect(result.length).toBe(2);
    });
  });

  describe("empty and null cases", () => {
    it("should return empty array when actor has no effects", () => {
      // ARRANGE
      const actor = createMockActorWithEffects([]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should return empty array when actor has only non-stance effects", () => {
      // ARRANGE
      const effect1 = createV13Effect(["prone"]);
      const effect2 = createV13Effect(["stunned"]);
      const actor = createMockActorWithEffects([effect1, effect2]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should return empty array when effects have no status IDs", () => {
      // ARRANGE
      const effect = createV13Effect([]);
      const actor = createMockActorWithEffects([effect]);

      // ACT
      const result = getActiveStances(actor);

      // ASSERT
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// getDefenseSkillRank()
// ============================================================================

describe("getDefenseSkillRank", () => {
  describe("valid Defense skill", () => {
    it("should return Defense skill rank when present", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Defense", 3);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(3);
    });

    it("should return rank 0 for untrained Defense skill", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Defense", 0);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return high rank Defense skill", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Defense", 10);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(10);
    });
  });

  describe("case insensitivity", () => {
    it("should match 'defense' (lowercase)", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("defense", 4);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(4);
    });

    it("should match 'DEFENSE' (uppercase)", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("DEFENSE", 5);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(5);
    });

    it("should match 'Defense' (mixed case)", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Defense", 3);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(3);
    });

    it("should match 'DeFenSe' (random case)", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("DeFenSe", 2);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(2);
    });
  });

  describe("partial name matching", () => {
    it("should match 'Defense Skill'", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Defense Skill", 3);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(3);
    });

    it("should match 'Basic Defense'", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Basic Defense", 2);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(2);
    });

    it("should match 'Advanced Defense Techniques'", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Advanced Defense Techniques", 7);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(7);
    });
  });

  describe("filtering non-skill items", () => {
    it("should ignore non-skill items with 'defense' in name", () => {
      // ARRANGE
      const weapon = {
        type: "weapon",
        name: "Defense Katana",
        system: { rank: 5 }
      };
      const actor = createMockActorWithItems([weapon]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return Defense skill rank when mixed with other items", () => {
      // ARRANGE
      const weapon = { type: "weapon", name: "Katana", system: {} };
      const armor = { type: "armor", name: "Light Armor", system: {} };
      const defenseSkill = createSkillItem("Defense", 4);
      const otherSkill = createSkillItem("Kenjutsu", 5);
      const actor = createMockActorWithItems([weapon, armor, defenseSkill, otherSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(4);
    });
  });

  describe("first match behavior", () => {
    it("should return first Defense skill when multiple present", () => {
      // ARRANGE - Multiple Defense skills (edge case, shouldn't happen)
      const defense1 = createSkillItem("Defense", 3);
      const defense2 = createSkillItem("Defense Skill", 5);
      const actor = createMockActorWithItems([defense1, defense2]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(3); // First match
    });
  });

  describe("type coercion", () => {
    it("should coerce string rank to number", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: "5" } // String instead of number
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(5);
      expect(typeof result).toBe("number");
    });

    it("should handle numeric string with whitespace", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: " 3 " }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(3);
    });

    it("should return 0 for non-numeric string rank", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: "invalid" }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should handle negative rank (edge case)", () => {
      // ARRANGE
      const defenseSkill = createSkillItem("Defense", -5);
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(-5); // toInt preserves negative
    });

    it("should handle float rank by truncating", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: 3.7 }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(3); // toInt truncates
    });
  });

  describe("null and undefined handling", () => {
    it("should return 0 when actor has no Defense skill", () => {
      // ARRANGE
      const otherSkill = createSkillItem("Kenjutsu", 5);
      const actor = createMockActorWithItems([otherSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when actor has no items", () => {
      // ARRANGE
      const actor = createMockActorWithItems([]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when skill has null rank", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: null }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when skill has undefined rank", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: undefined }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when skill.system is null", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: null
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when skill.system is undefined", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense"
        // No system property
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when skill.name is null", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: null,
        system: { rank: 5 }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 when skill.name is undefined", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        // No name property
        system: { rank: 5 }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });
  });

  describe("special numeric values", () => {
    it("should return 0 for NaN rank", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: NaN }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 for Infinity rank", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: Infinity }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return 0 for -Infinity rank", () => {
      // ARRANGE
      const defenseSkill = {
        type: "skill",
        name: "Defense",
        system: { rank: -Infinity }
      };
      const actor = createMockActorWithItems([defenseSkill]);

      // ACT
      const result = getDefenseSkillRank(actor);

      // ASSERT
      expect(result).toBe(0);
    });
  });
});
