/**
 * @fileoverview Unit tests for stance effect template creators
 * Tests effect structure, required properties, and creator lookup mapping
 *
 * Test Philosophy:
 * - Focus on edge cases and error paths (not just happy paths)
 * - Test behavior, not implementation
 * - Verify all required properties exist with correct types
 * - Ensure tests fail when code breaks (mutation testing mindset)
 *
 * @see module:services/stance/core/effect-templates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createFullAttackEffect,
  createDefenseStanceEffect,
  createFullDefenseStanceEffect,
  createAttackStanceEffect,
  createCenterStanceEffect,
  getStanceEffectCreator
} from "../../../module/services/stance/core/effect-templates.js";

// ============================================================================
// MOCKING
// ============================================================================

// Mock the localization function
vi.mock("../../../module/utils/localization.js", () => ({
  T: vi.fn(key => `LOCALIZED:${key}`)
}));

// Mock constants
vi.mock("../../../module/config/constants.js", () => ({
  SYS_ID: "l5r4-enhanced"
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates common effect structure properties
 * @param {Object} effect - Effect object to validate
 * @param {string} expectedStanceType - Expected stanceType value
 * @param {string[]} expectedStatuses - Expected statuses array
 */
function validateEffectStructure(effect, expectedStanceType, expectedStatuses) {
  // Core properties
  expect(effect).toHaveProperty("name");
  expect(effect).toHaveProperty("icon");
  expect(effect).toHaveProperty("statuses");
  expect(effect).toHaveProperty("flags");

  // Type validation
  expect(typeof effect.name).toBe("string");
  expect(typeof effect.icon).toBe("string");
  expect(Array.isArray(effect.statuses)).toBe(true);
  expect(typeof effect.flags).toBe("object");

  // Flags structure
  expect(effect.flags).toHaveProperty("l5r4-enhanced");
  expect(effect.flags["l5r4-enhanced"]).toHaveProperty("stanceType");
  expect(effect.flags["l5r4-enhanced"]).toHaveProperty("description");

  // Values
  expect(effect.flags["l5r4-enhanced"].stanceType).toBe(expectedStanceType);
  expect(effect.statuses).toEqual(expectedStatuses);

  // Icon path validation
  expect(effect.icon).toContain("systems/l5r4-enhanced/assets/icons/");
  expect(effect.icon).toMatch(/\.webp$/);

  // Description validation
  expect(typeof effect.flags["l5r4-enhanced"].description).toBe("string");
  expect(effect.flags["l5r4-enhanced"].description.length).toBeGreaterThan(0);
}

// ============================================================================
// FULL ATTACK STANCE
// ============================================================================

describe("createFullAttackEffect", () => {
  describe("effect structure", () => {
    it("should return object with all required properties", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      validateEffectStructure(effect, "fullAttack", ["fullAttackStance"]);
    });

    it("should have localized name", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      expect(effect.name).toBe("LOCALIZED:l5r4.ui.mechanics.stances.fullAttack");
    });

    it("should have correct icon path", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      expect(effect.icon).toBe("systems/l5r4-enhanced/assets/icons/full-attack-stance.webp");
    });

    it("should have single status ID in array", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      expect(effect.statuses).toHaveLength(1);
      expect(effect.statuses[0]).toBe("fullAttackStance");
    });
  });

  describe("attack bonus", () => {
    it("should have attackBonus property", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"]).toHaveProperty("attackBonus");
    });

    it("should have correct bonus values (+2k1)", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      const bonus = effect.flags["l5r4-enhanced"].attackBonus;
      expect(bonus).toEqual({ roll: 2, keep: 1 });
    });

    it("should have numeric roll and keep values", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      const bonus = effect.flags["l5r4-enhanced"].attackBonus;
      expect(typeof bonus.roll).toBe("number");
      expect(typeof bonus.keep).toBe("number");
    });

    it("should have positive bonus values", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      const bonus = effect.flags["l5r4-enhanced"].attackBonus;
      expect(bonus.roll).toBeGreaterThan(0);
      expect(bonus.keep).toBeGreaterThan(0);
    });
  });

  describe("description", () => {
    it("should mention attack bonus", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description).toContain("2k1");
    });

    it("should mention armor TN penalty", () => {
      // ARRANGE & ACT
      const effect = createFullAttackEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description).toContain("-10");
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("armor tn");
    });
  });

  describe("immutability", () => {
    it("should return new object on each call", () => {
      // ARRANGE & ACT
      const effect1 = createFullAttackEffect();
      const effect2 = createFullAttackEffect();

      // ASSERT
      expect(effect1).not.toBe(effect2);
      expect(effect1).toEqual(effect2);
    });

    it("should not share references between calls", () => {
      // ARRANGE
      const effect1 = createFullAttackEffect();
      const effect2 = createFullAttackEffect();

      // ACT
      effect1.flags["l5r4-enhanced"].attackBonus.roll = 999;

      // ASSERT
      expect(effect2.flags["l5r4-enhanced"].attackBonus.roll).toBe(2);
    });
  });
});

// ============================================================================
// DEFENSE STANCE
// ============================================================================

describe("createDefenseStanceEffect", () => {
  describe("effect structure", () => {
    it("should return object with all required properties", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      validateEffectStructure(effect, "defense", ["defenseStance"]);
    });

    it("should have localized name", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.name).toBe("LOCALIZED:l5r4.ui.mechanics.stances.defense");
    });

    it("should have correct icon path", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.icon).toBe("systems/l5r4-enhanced/assets/icons/defence-stance.webp");
    });

    it("should have single status ID in array", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.statuses).toHaveLength(1);
      expect(effect.statuses[0]).toBe("defenseStance");
    });
  });

  describe("mechanical properties", () => {
    it("should NOT have attackBonus property", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
    });
  });

  describe("description", () => {
    it("should mention Air Ring", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("air ring");
    });

    it("should mention Defense Skill", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("defense skill");
    });

    it("should mention cannot attack restriction", () => {
      // ARRANGE & ACT
      const effect = createDefenseStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("cannot attack");
    });
  });

  describe("immutability", () => {
    it("should return new object on each call", () => {
      // ARRANGE & ACT
      const effect1 = createDefenseStanceEffect();
      const effect2 = createDefenseStanceEffect();

      // ASSERT
      expect(effect1).not.toBe(effect2);
      expect(effect1).toEqual(effect2);
    });
  });
});

// ============================================================================
// FULL DEFENSE STANCE
// ============================================================================

describe("createFullDefenseStanceEffect", () => {
  describe("effect structure", () => {
    it("should return object with all required properties", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      validateEffectStructure(effect, "fullDefense", ["fullDefenseStance"]);
    });

    it("should have localized name", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      expect(effect.name).toBe("LOCALIZED:l5r4.ui.mechanics.stances.fullDefense");
    });

    it("should have correct icon path", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      expect(effect.icon).toBe("systems/l5r4-enhanced/assets/icons/full-defense-stance.webp");
    });

    it("should have single status ID in array", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      expect(effect.statuses).toHaveLength(1);
      expect(effect.statuses[0]).toBe("fullDefenseStance");
    });
  });

  describe("mechanical properties", () => {
    it("should NOT have attackBonus property", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
    });
  });

  describe("description", () => {
    it("should mention Defense/Reflexes roll", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      const desc = effect.flags["l5r4-enhanced"].description.toLowerCase();
      expect(desc).toContain("defense");
      expect(desc).toContain("reflexes");
    });

    it("should mention Free Actions restriction", () => {
      // ARRANGE & ACT
      const effect = createFullDefenseStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("free actions");
    });
  });

  describe("immutability", () => {
    it("should return new object on each call", () => {
      // ARRANGE & ACT
      const effect1 = createFullDefenseStanceEffect();
      const effect2 = createFullDefenseStanceEffect();

      // ASSERT
      expect(effect1).not.toBe(effect2);
      expect(effect1).toEqual(effect2);
    });
  });
});

// ============================================================================
// ATTACK STANCE
// ============================================================================

describe("createAttackStanceEffect", () => {
  describe("effect structure", () => {
    it("should return object with all required properties", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      validateEffectStructure(effect, "attack", ["attackStance"]);
    });

    it("should have localized name", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      expect(effect.name).toBe("LOCALIZED:l5r4.ui.mechanics.stances.attack");
    });

    it("should have correct icon path", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      expect(effect.icon).toBe("systems/l5r4-enhanced/assets/icons/attack-stance.webp");
    });

    it("should have single status ID in array", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      expect(effect.statuses).toHaveLength(1);
      expect(effect.statuses[0]).toBe("attackStance");
    });
  });

  describe("mechanical properties", () => {
    it("should NOT have attackBonus property", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
    });
  });

  describe("description", () => {
    it("should mention standard combat stance", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      const desc = effect.flags["l5r4-enhanced"].description.toLowerCase();
      expect(desc).toContain("standard");
      expect(desc).toContain("combat");
    });

    it("should mention no restrictions", () => {
      // ARRANGE & ACT
      const effect = createAttackStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("no restrictions");
    });
  });

  describe("immutability", () => {
    it("should return new object on each call", () => {
      // ARRANGE & ACT
      const effect1 = createAttackStanceEffect();
      const effect2 = createAttackStanceEffect();

      // ASSERT
      expect(effect1).not.toBe(effect2);
      expect(effect1).toEqual(effect2);
    });
  });
});

// ============================================================================
// CENTER STANCE
// ============================================================================

describe("createCenterStanceEffect", () => {
  describe("effect structure", () => {
    it("should return object with all required properties", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      validateEffectStructure(effect, "center", ["centerStance"]);
    });

    it("should have localized name", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      expect(effect.name).toBe("LOCALIZED:l5r4.ui.mechanics.stances.center");
    });

    it("should have correct icon path", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      expect(effect.icon).toBe("systems/l5r4-enhanced/assets/icons/centered-stance.webp");
    });

    it("should have single status ID in array", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      expect(effect.statuses).toHaveLength(1);
      expect(effect.statuses[0]).toBe("centerStance");
    });
  });

  describe("mechanical properties", () => {
    it("should NOT have attackBonus property", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
    });
  });

  describe("description", () => {
    it("should mention focused preparation", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      const desc = effect.flags["l5r4-enhanced"].description.toLowerCase();
      expect(desc).toContain("focused");
      expect(desc).toContain("preparation");
    });

    it("should mention next round", () => {
      // ARRANGE & ACT
      const effect = createCenterStanceEffect();

      // ASSERT
      expect(effect.flags["l5r4-enhanced"].description.toLowerCase()).toContain("next round");
    });
  });

  describe("immutability", () => {
    it("should return new object on each call", () => {
      // ARRANGE & ACT
      const effect1 = createCenterStanceEffect();
      const effect2 = createCenterStanceEffect();

      // ASSERT
      expect(effect1).not.toBe(effect2);
      expect(effect1).toEqual(effect2);
    });
  });
});

// ============================================================================
// STANCE EFFECT CREATOR LOOKUP
// ============================================================================

describe("getStanceEffectCreator", () => {
  describe("valid stance IDs", () => {
    it("should return createAttackStanceEffect for attackStance", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("attackStance");

      // ASSERT
      expect(creator).toBe(createAttackStanceEffect);
    });

    it("should return createFullAttackEffect for fullAttackStance", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("fullAttackStance");

      // ASSERT
      expect(creator).toBe(createFullAttackEffect);
    });

    it("should return createDefenseStanceEffect for defenseStance", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("defenseStance");

      // ASSERT
      expect(creator).toBe(createDefenseStanceEffect);
    });

    it("should return createFullDefenseStanceEffect for fullDefenseStance", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("fullDefenseStance");

      // ASSERT
      expect(creator).toBe(createFullDefenseStanceEffect);
    });

    it("should return createCenterStanceEffect for centerStance", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("centerStance");

      // ASSERT
      expect(creator).toBe(createCenterStanceEffect);
    });

    it("should return functions that create valid effects", () => {
      // ARRANGE
      const stanceIds = [
        "attackStance",
        "fullAttackStance",
        "defenseStance",
        "fullDefenseStance",
        "centerStance"
      ];

      // ACT & ASSERT
      stanceIds.forEach(stanceId => {
        const creator = getStanceEffectCreator(stanceId);
        expect(typeof creator).toBe("function");

        const effect = creator();
        expect(effect).toHaveProperty("name");
        expect(effect).toHaveProperty("icon");
        expect(effect).toHaveProperty("statuses");
        expect(effect).toHaveProperty("flags");
      });
    });
  });

  describe("invalid stance IDs", () => {
    it("should return null for invalid stance ID", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("invalidStance");

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should return null for empty string", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("");

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should return null for null", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator(null);

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should return null for undefined", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator(undefined);

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should return null for numeric input", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator(123);

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should return null for object input", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator({ stance: "attack" });

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should handle array input via type coercion", () => {
      // ARRANGE & ACT
      // JavaScript converts ["attackStance"] to string "attackStance" in bracket notation
      const creator = getStanceEffectCreator(["attackStance"]);

      // ASSERT
      // This actually works due to type coercion - array becomes string
      expect(creator).toBe(createAttackStanceEffect);
    });
  });

  describe("case sensitivity", () => {
    it("should be case-sensitive (uppercase should fail)", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("ATTACKSTANCE");

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should be case-sensitive (mixed case should fail)", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("AttackStance");

      // ASSERT
      expect(creator).toBeNull();
    });
  });

  describe("whitespace handling", () => {
    it("should not trim whitespace (leading space should fail)", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator(" attackStance");

      // ASSERT
      expect(creator).toBeNull();
    });

    it("should not trim whitespace (trailing space should fail)", () => {
      // ARRANGE & ACT
      const creator = getStanceEffectCreator("attackStance ");

      // ASSERT
      expect(creator).toBeNull();
    });
  });

  describe("all stances coverage", () => {
    it("should have creators for all five stances", () => {
      // ARRANGE
      const expectedStances = [
        "attackStance",
        "fullAttackStance",
        "defenseStance",
        "fullDefenseStance",
        "centerStance"
      ];

      // ACT & ASSERT
      expectedStances.forEach(stanceId => {
        const creator = getStanceEffectCreator(stanceId);
        expect(creator).not.toBeNull();
        expect(typeof creator).toBe("function");
      });
    });
  });
});

// ============================================================================
// CROSS-FUNCTION CONSISTENCY
// ============================================================================

describe("cross-function consistency", () => {
  describe("status ID uniqueness", () => {
    it("should have unique status IDs across all stances", () => {
      // ARRANGE
      const effects = [
        createAttackStanceEffect(),
        createFullAttackEffect(),
        createDefenseStanceEffect(),
        createFullDefenseStanceEffect(),
        createCenterStanceEffect()
      ];

      // ACT
      const allStatusIds = effects.flatMap(effect => effect.statuses);
      const uniqueStatusIds = new Set(allStatusIds);

      // ASSERT
      expect(uniqueStatusIds.size).toBe(allStatusIds.length);
    });
  });

  describe("stance type uniqueness", () => {
    it("should have unique stanceType values across all stances", () => {
      // ARRANGE
      const effects = [
        createAttackStanceEffect(),
        createFullAttackEffect(),
        createDefenseStanceEffect(),
        createFullDefenseStanceEffect(),
        createCenterStanceEffect()
      ];

      // ACT
      const allStanceTypes = effects.map(effect => effect.flags["l5r4-enhanced"].stanceType);
      const uniqueStanceTypes = new Set(allStanceTypes);

      // ASSERT
      expect(uniqueStanceTypes.size).toBe(allStanceTypes.length);
    });
  });

  describe("icon path uniqueness", () => {
    it("should have unique icon paths across all stances", () => {
      // ARRANGE
      const effects = [
        createAttackStanceEffect(),
        createFullAttackEffect(),
        createDefenseStanceEffect(),
        createFullDefenseStanceEffect(),
        createCenterStanceEffect()
      ];

      // ACT
      const allIcons = effects.map(effect => effect.icon);
      const uniqueIcons = new Set(allIcons);

      // ASSERT
      expect(uniqueIcons.size).toBe(allIcons.length);
    });
  });

  describe("localization key uniqueness", () => {
    it("should have unique localization keys across all stances", () => {
      // ARRANGE
      const effects = [
        createAttackStanceEffect(),
        createFullAttackEffect(),
        createDefenseStanceEffect(),
        createFullDefenseStanceEffect(),
        createCenterStanceEffect()
      ];

      // ACT
      const allNames = effects.map(effect => effect.name);
      const uniqueNames = new Set(allNames);

      // ASSERT
      expect(uniqueNames.size).toBe(allNames.length);
    });
  });

  describe("attackBonus exclusivity", () => {
    it("should only Full Attack have attackBonus property", () => {
      // ARRANGE
      const fullAttack = createFullAttackEffect();
      const defense = createDefenseStanceEffect();
      const fullDefense = createFullDefenseStanceEffect();
      const attack = createAttackStanceEffect();
      const center = createCenterStanceEffect();

      // ASSERT
      expect(fullAttack.flags["l5r4-enhanced"]).toHaveProperty("attackBonus");
      expect(defense.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
      expect(fullDefense.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
      expect(attack.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
      expect(center.flags["l5r4-enhanced"]).not.toHaveProperty("attackBonus");
    });
  });
});
