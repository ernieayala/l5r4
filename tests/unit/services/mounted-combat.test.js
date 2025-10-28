import { describe, it, expect } from "vitest";
import {
  isMounted,
  getHorsemanshipRank,
  getMountedStatus,
  getMountedAttackBonus
} from "../../../module/services/mounted-combat.js";

/**
 * Mounted Combat Service Unit Tests
 *
 * Tests pure functions that determine mounted combat status and bonuses
 * per L5R4 core rules.
 *
 * Testing Strategy:
 * - Test both modern (v10+) and legacy status effect detection
 * - Test multi-language skill name support (English, French, German)
 * - Test type coercion for skill ranks
 * - Test null/undefined/empty edge cases extensively
 * - Test all combat bonus scenarios
 * - Test behavior, not implementation
 *
 * Critical Test Areas:
 * 1. Backward compatibility - v10+ statuses and legacy flags
 * 2. Type coercion - Skill ranks may be strings, null, or undefined
 * 3. Multi-language - English, French, German skill names with case insensitivity
 * 4. Null safety - All functions handle null/undefined actors gracefully
 * 5. Return structure consistency - Objects always have expected shape
 */

describe("Mounted Combat Service", () => {
  describe("isMounted", () => {
    describe("valid inputs - modern v10+ status detection", () => {
      it("should return true for actor with mounted status in statuses Set", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: false,
              statuses: new Set(["mounted"])
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(true);
      });

      it("should return false for actor without mounted status", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: false,
              statuses: new Set(["prone"])
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should return true when mounted status exists among multiple effects", () => {
        // ARRANGE
        const actor = {
          effects: [
            { disabled: false, statuses: new Set(["prone"]) },
            { disabled: false, statuses: new Set(["mounted"]) },
            { disabled: false, statuses: new Set(["stunned"]) }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(true);
      });
    });

    describe("valid inputs - legacy statusId flag detection", () => {
      it("should return true for actor with legacy mounted statusId flag", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: false,
              statuses: new Set(),
              getFlag: (namespace, key) => {
                if (namespace === "core" && key === "statusId") {
                  return "mounted";
                }
                return null;
              }
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(true);
      });

      it("should return false for actor with legacy non-mounted statusId", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: false,
              statuses: new Set(),
              getFlag: (namespace, key) => {
                if (namespace === "core" && key === "statusId") {
                  return "prone";
                }
                return null;
              }
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });
    });

    describe("disabled effects", () => {
      it("should ignore disabled mounted effects", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: true,
              statuses: new Set(["mounted"])
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should detect enabled mounted effect when disabled effects also exist", () => {
        // ARRANGE
        const actor = {
          effects: [
            { disabled: true, statuses: new Set(["mounted"]) },
            { disabled: false, statuses: new Set(["mounted"]) }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(true);
      });
    });

    describe("edge cases - null and undefined handling", () => {
      it("should return false for null actor", () => {
        // ARRANGE
        const actor = null;

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should return false for undefined actor", () => {
        // ARRANGE
        const actor = undefined;

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should return false for actor without effects property", () => {
        // ARRANGE
        const actor = {};

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should return false for actor with null effects", () => {
        // ARRANGE
        const actor = { effects: null };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should return false for actor with empty effects array", () => {
        // ARRANGE
        const actor = { effects: [] };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should handle effect without getFlag method gracefully", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: false,
              statuses: new Set()
              // No getFlag method
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });

      it("should handle effect with null statuses property", () => {
        // ARRANGE
        const actor = {
          effects: [
            {
              disabled: false,
              statuses: null
            }
          ]
        };

        // ACT
        const result = isMounted(actor);

        // ASSERT
        expect(result).toBe(false);
      });
    });
  });

  describe("getHorsemanshipRank", () => {
    describe("valid inputs - English skill name", () => {
      it("should return rank for actor with Horsemanship skill", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: 5 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(5);
      });

      it("should be case insensitive for skill name", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "HORSEMANSHIP",
              system: { rank: 3 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(3);
      });

      it('should match partial skill names containing "horsemanship"', () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Basic Horsemanship",
              system: { rank: 2 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(2);
      });
    });

    describe("valid inputs - multi-language support", () => {
      it('should return rank for French "Équitation" skill', () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Équitation",
              system: { rank: 4 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(4);
      });

      it('should return rank for German "Reiten" skill', () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Reiten",
              system: { rank: 6 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(6);
      });

      it("should be case insensitive for French skill name", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "ÉQUITATION",
              system: { rank: 3 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(3);
      });
    });

    describe("type coercion - rank values", () => {
      it("should convert string rank to number", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: "5" }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(5);
        expect(typeof result).toBe("number");
      });

      it("should return 0 for null rank", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: null }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for undefined rank", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: undefined }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for NaN rank", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: NaN }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 when system property is missing", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship"
              // No system property
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });
    });

    describe("edge cases - null and undefined handling", () => {
      it("should return 0 for null actor", () => {
        // ARRANGE
        const actor = null;

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for undefined actor", () => {
        // ARRANGE
        const actor = undefined;

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for actor without items property", () => {
        // ARRANGE
        const actor = {};

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for actor with null items", () => {
        // ARRANGE
        const actor = { items: null };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 for actor with empty items array", () => {
        // ARRANGE
        const actor = { items: [] };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should return 0 when skill not found", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Archery",
              system: { rank: 5 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });

      it("should ignore items with null name", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: null,
              system: { rank: 5 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(0);
      });
    });

    describe("item filtering", () => {
      it("should ignore non-skill items", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "weapon",
              name: "Horsemanship Sword",
              system: { rank: 10 }
            },
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: 3 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(3);
      });

      it("should return first matching skill rank when multiple exist", () => {
        // ARRANGE
        const actor = {
          items: [
            {
              type: "skill",
              name: "Horsemanship",
              system: { rank: 5 }
            },
            {
              type: "skill",
              name: "Équitation",
              system: { rank: 7 }
            }
          ]
        };

        // ACT
        const result = getHorsemanshipRank(actor);

        // ASSERT
        expect(result).toBe(5);
      });
    });
  });

  describe("getMountedStatus", () => {
    describe("valid inputs - combined status", () => {
      it("should return mounted status and horsemanship rank for mounted actor with skill", () => {
        // ARRANGE
        const actor = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }],
          items: [{ type: "skill", name: "Horsemanship", system: { rank: 5 } }]
        };

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toEqual({
          isMounted: true,
          horsemanshipRank: 5
        });
      });

      it("should return correct structure for unmounted actor without skill", () => {
        // ARRANGE
        const actor = {
          effects: [],
          items: []
        };

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toEqual({
          isMounted: false,
          horsemanshipRank: 0
        });
      });

      it("should return correct structure for mounted actor without horsemanship", () => {
        // ARRANGE
        const actor = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }],
          items: [{ type: "skill", name: "Archery", system: { rank: 3 } }]
        };

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toEqual({
          isMounted: true,
          horsemanshipRank: 0
        });
      });

      it("should return correct structure for unmounted actor with horsemanship", () => {
        // ARRANGE
        const actor = {
          effects: [],
          items: [{ type: "skill", name: "Horsemanship", system: { rank: 3 } }]
        };

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toEqual({
          isMounted: false,
          horsemanshipRank: 3
        });
      });
    });

    describe("edge cases - null handling", () => {
      it("should handle null actor gracefully", () => {
        // ARRANGE
        const actor = null;

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toEqual({
          isMounted: false,
          horsemanshipRank: 0
        });
      });

      it("should handle undefined actor gracefully", () => {
        // ARRANGE
        const actor = undefined;

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toEqual({
          isMounted: false,
          horsemanshipRank: 0
        });
      });
    });

    describe("return structure consistency", () => {
      it("should always return object with isMounted and horsemanshipRank properties", () => {
        // ARRANGE
        const actor = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }],
          items: [{ type: "skill", name: "Horsemanship", system: { rank: 4 } }]
        };

        // ACT
        const result = getMountedStatus(actor);

        // ASSERT
        expect(result).toHaveProperty("isMounted");
        expect(result).toHaveProperty("horsemanshipRank");
        expect(typeof result.isMounted).toBe("boolean");
        expect(typeof result.horsemanshipRank).toBe("number");
      });
    });
  });

  describe("getMountedAttackBonus", () => {
    describe("bonus scenarios - mounted vs unmounted", () => {
      it("should return +1k0 for mounted attacker vs unmounted target", () => {
        // ARRANGE
        const attacker = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };
        const target = {
          effects: []
        };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 1, keep: 0 });
      });
    });

    describe("no bonus scenarios", () => {
      it("should return 0k0 for mounted attacker vs mounted target", () => {
        // ARRANGE
        const attacker = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };
        const target = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for unmounted attacker vs unmounted target", () => {
        // ARRANGE
        const attacker = { effects: [] };
        const target = { effects: [] };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for unmounted attacker vs mounted target", () => {
        // ARRANGE
        const attacker = { effects: [] };
        const target = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for mounted attacker with null target", () => {
        // ARRANGE
        const attacker = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };
        const target = null;

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for unmounted attacker with null target", () => {
        // ARRANGE
        const attacker = { effects: [] };
        const target = null;

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for mounted attacker with undefined target", () => {
        // ARRANGE
        const attacker = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };
        const target = undefined;

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });
    });

    describe("edge cases - null attacker", () => {
      it("should return 0k0 for null attacker with unmounted target", () => {
        // ARRANGE
        const attacker = null;
        const target = { effects: [] };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for null attacker with mounted target", () => {
        // ARRANGE
        const attacker = null;
        const target = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for null attacker with null target", () => {
        // ARRANGE
        const attacker = null;
        const target = null;

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });

      it("should return 0k0 for undefined attacker with undefined target", () => {
        // ARRANGE
        const attacker = undefined;
        const target = undefined;

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toEqual({ roll: 0, keep: 0 });
      });
    });

    describe("return structure consistency", () => {
      it("should always return object with roll and keep properties", () => {
        // ARRANGE
        const attacker = {
          effects: [{ disabled: false, statuses: new Set(["mounted"]) }]
        };
        const target = { effects: [] };

        // ACT
        const result = getMountedAttackBonus(attacker, target);

        // ASSERT
        expect(result).toHaveProperty("roll");
        expect(result).toHaveProperty("keep");
        expect(typeof result.roll).toBe("number");
        expect(typeof result.keep).toBe("number");
      });

      it("should return consistent structure for all scenarios", () => {
        // ARRANGE - Test multiple scenarios
        const scenarios = [
          { attacker: null, target: null },
          { attacker: { effects: [] }, target: { effects: [] } },
          {
            attacker: { effects: [{ disabled: false, statuses: new Set(["mounted"]) }] },
            target: { effects: [] }
          }
        ];

        // ACT & ASSERT
        scenarios.forEach(({ attacker, target }) => {
          const result = getMountedAttackBonus(attacker, target);
          expect(result).toHaveProperty("roll");
          expect(result).toHaveProperty("keep");
          expect(typeof result.roll).toBe("number");
          expect(typeof result.keep).toBe("number");
        });
      });
    });
  });
});
