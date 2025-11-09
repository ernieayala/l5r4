import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatXpEntries } from "../../../module/services/xp/xp-formatter.js";

/**
 * XP Formatter Unit Tests
 *
 * Tests the formatXpEntries function which transforms raw XP history entries
 * into human-readable, localized display strings.
 *
 * Testing Strategy:
 * - Test all entry types (trait, void, skill, emphasis, advantage, disadvantage, kata, kiho, spell)
 * - Test progression formatting (fromValue → toValue)
 * - Test legacy entry fallback logic
 * - Test delta formatting with signs
 * - Test sorting (timestamp and user preference)
 * - Test edge cases: null, undefined, missing properties
 * - Test behavior, not implementation
 */

// Mock Foundry's game.i18n.localize()
global.game = {
  i18n: {
    localize: vi.fn(key => {
      const translations = {
        "l5r4.character.experience.breakdown.traits": "Traits",
        "l5r4.character.experience.breakdown.void": "Void Ring",
        "l5r4.character.experience.breakdown.skills": "Skills",
        "l5r4.character.experience.breakdown.spells": "Spells",
        "l5r4.character.experience.breakdown.manualAdjustments": "Manual Adjustments",
        "l5r4.ui.sheets.advantage": "Advantage",
        "l5r4.ui.sheets.disadvantage": "Disadvantage",
        "l5r4.ui.sheets.kata": "Kata",
        "l5r4.ui.sheets.kiho": "Kiho",
        "l5r4.ui.mechanics.rings.void": "Void",
        "l5r4.character.experience.fallbackLabels.traitIncrease": "Trait Increased",
        "l5r4.character.experience.fallbackLabels.voidIncrease": "Void Increased",
        "l5r4.character.experience.fallbackLabels.skillCreated": "Skill Created",
        "l5r4.character.experience.fallbackLabels.skillIncreased": "Skill Increased"
      };
      return translations[key] || key;
    }),
    lang: "en"
  }
};

// Mock sorting utilities
vi.mock("../../../module/utils/sorting.js", () => ({
  getSortPref: vi.fn((actorId, scope, allowedKeys, defaultKey) => ({
    key: defaultKey,
    dir: "asc"
  })),
  sortWithPref: vi.fn((list, columns, pref) => {
    // Simple mock: just return the list as-is for most tests
    // Individual tests can override this behavior
    return list;
  })
}));

import { getSortPref, sortWithPref } from "../../../module/utils/sorting.js";

/**
 * Helper: Create a mock XP entry
 */
function createXpEntry(config = {}) {
  return {
    id: config.id || "entry-" + Math.random().toString(36).substr(2, 9),
    delta: config.delta ?? 0,
    ts: config.ts || Date.now(),
    type: config.type || null,
    note: config.note || null,
    ...config
  };
}

describe("formatXpEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trait entries", () => {
    it("should format trait progression with fromValue and toValue", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "trait",
          traitLabel: "Reflexes",
          fromValue: 2,
          toValue: 3,
          delta: 12
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("Traits");
      expect(result[0].note).toBe("Reflexes 2→3");
      expect(result[0].deltaFormatted).toBe("+12");
      expect(result[0].delta).toBe(12);
    });

    it("should format trait progression without fromValue (new trait)", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "trait",
          traitLabel: "Stamina",
          toValue: 3,
          delta: 12
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Stamina 3");
    });

    it("should handle trait with fromValue of 0", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "trait",
          traitLabel: "Agility",
          fromValue: 0,
          toValue: 1,
          delta: 4
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Agility 0→1");
    });

    it("should handle trait with missing traitLabel", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "trait",
          toValue: 3,
          delta: 12,
          note: "Fallback note"
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Fallback note");
    });
  });

  describe("void entries", () => {
    it("should format void progression with fromValue and toValue", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "void",
          fromValue: 2,
          toValue: 3,
          delta: 18
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Void Ring");
      expect(result[0].note).toBe("Void 2→3");
      expect(result[0].deltaFormatted).toBe("+18");
    });

    it("should format void progression without fromValue (new void)", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "void",
          toValue: 2,
          delta: 12
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Void 2");
    });

    it("should handle void with fromValue of 0", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "void",
          fromValue: 0,
          toValue: 1,
          delta: 6
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Void 0→1");
    });
  });

  describe("skill entries", () => {
    it("should format skill progression with fromValue and toValue", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "skill",
          skillName: "Kenjutsu",
          fromValue: 2,
          toValue: 3,
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Skills");
      expect(result[0].note).toBe("Kenjutsu 2→3");
      expect(result[0].deltaFormatted).toBe("+3");
    });

    it("should format skill progression without fromValue (new skill)", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "skill",
          skillName: "Iaijutsu",
          toValue: 1,
          delta: 1
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Iaijutsu 1");
    });

    it("should preserve emphasis note when emphasis flag is true", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "skill",
          skillName: "Kenjutsu",
          emphasis: true,
          note: "Kenjutsu Emphasis: Katana",
          delta: 2
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Kenjutsu Emphasis: Katana");
    });

    it('should preserve note when note contains "Emphasis:"', () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "skill",
          skillName: "Iaijutsu",
          note: "Iaijutsu Emphasis: Focus",
          toValue: 3,
          delta: 2
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Iaijutsu Emphasis: Focus");
    });

    it("should handle skill with missing skillName", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "skill",
          toValue: 3,
          delta: 3,
          note: "Fallback skill note"
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Fallback skill note");
    });
  });

  describe("purchasable items", () => {
    it("should format advantage entry with itemName", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "advantage",
          itemName: "Social Position",
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Advantage");
      expect(result[0].note).toBe("Social Position");
      expect(result[0].deltaFormatted).toBe("+3");
    });

    it("should format disadvantage entry with itemName", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "disadvantage",
          itemName: "Bad Eyesight",
          delta: -2
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Disadvantage");
      expect(result[0].note).toBe("Bad Eyesight");
      expect(result[0].deltaFormatted).toBe("-2");
    });

    it("should format kata entry with itemName", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "kata",
          itemName: "Striking as Water",
          delta: 5
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Kata");
      expect(result[0].note).toBe("Striking as Water");
    });

    it("should format kiho entry with itemName", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "kiho",
          itemName: "Ride the Water Dragon",
          delta: 4
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Kiho");
      expect(result[0].note).toBe("Ride the Water Dragon");
    });

    it("should format spell entry with itemName", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "spell",
          itemName: "Katana of Fire",
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Spells");
      expect(result[0].note).toBe("Katana of Fire");
    });

    it("should use note field as fallback when itemName is missing", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "advantage",
          note: "Legacy Advantage Name",
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Legacy Advantage Name");
    });

    it("should use fallback label when both itemName and note are missing", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "advantage",
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("Advantage");
    });
  });

  describe("legacy entry fallback logic", () => {
    it("should handle legacy trait change entry", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          note: "l5r4.character.experience.traitChange",
          delta: 12
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Traits");
      expect(result[0].note).toBe("Trait Increased");
    });

    it("should handle legacy void change entry", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          note: "l5r4.character.experience.voidChange",
          delta: 18
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Void Ring");
      expect(result[0].note).toBe("Void Increased");
    });

    it("should handle legacy skill create entry", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          note: "l5r4.character.experience.skillCreate",
          delta: 1
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Skills");
      expect(result[0].note).toBe("Skill Created");
    });

    it("should handle legacy skill change entry", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          note: "l5r4.character.experience.skillChange",
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Skills");
      expect(result[0].note).toBe("Skill Increased");
    });

    it("should use type field as-is when no other patterns match", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "CustomType",
          note: "Custom entry",
          delta: 5
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("CustomType");
      expect(result[0].note).toBe("Custom entry");
    });

    it("should default to manual adjustments when no type or pattern matches", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          note: "Random note",
          delta: 10
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].type).toBe("Manual Adjustments");
      expect(result[0].note).toBe("Random note");
    });
  });

  describe("delta formatting", () => {
    it("should format positive delta with plus sign", () => {
      // ARRANGE
      const entries = [
        createXpEntry({ type: "trait", traitLabel: "Reflexes", toValue: 3, delta: 12 })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("+12");
      expect(result[0].delta).toBe(12);
    });

    it("should format negative delta with minus sign", () => {
      // ARRANGE
      const entries = [createXpEntry({ type: "disadvantage", itemName: "Bad Eyes", delta: -3 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("-3");
      expect(result[0].delta).toBe(-3);
    });

    it("should format zero delta without sign", () => {
      // ARRANGE
      const entries = [createXpEntry({ type: "advantage", itemName: "Free", delta: 0 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("+0");
    });

    it("should handle large positive delta", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 999 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("+999");
    });

    it("should handle large negative delta", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: -500 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("-500");
    });

    it("should handle floating point delta", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 12.5 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("+12.5");
    });

    it("should handle null delta as 0", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: null })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("+0");
      expect(result[0].delta).toBe(null);
    });

    it("should handle undefined delta as 0", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: undefined })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("0");
      expect(result[0].delta).toBe(undefined);
    });

    it("should handle NaN delta gracefully", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: NaN })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("NaN");
    });

    it("should handle Infinity delta", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: Infinity })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].deltaFormatted).toBe("Infinity");
    });
  });

  describe("timestamp sorting", () => {
    it("should sort entries by timestamp in ascending order by default", () => {
      // ARRANGE
      const entries = [
        createXpEntry({ id: "entry-3", ts: 3000 }),
        createXpEntry({ id: "entry-1", ts: 1000 }),
        createXpEntry({ id: "entry-2", ts: 2000 })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].id).toBe("entry-1");
      expect(result[1].id).toBe("entry-2");
      expect(result[2].id).toBe("entry-3");
    });

    it("should handle entries with missing timestamps", () => {
      // ARRANGE
      const entries = [
        createXpEntry({ id: "entry-2", ts: 2000 }),
        createXpEntry({ id: "entry-missing", ts: undefined }),
        createXpEntry({ id: "entry-1", ts: 1000 })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].id).toBe("entry-missing");
      expect(result[1].id).toBe("entry-1");
      expect(result[2].id).toBe("entry-2");
    });

    it("should handle entries with null timestamps", () => {
      // ARRANGE
      const entries = [
        createXpEntry({ id: "entry-2", ts: 2000 }),
        createXpEntry({ id: "entry-null", ts: null }),
        createXpEntry({ id: "entry-1", ts: 1000 })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].id).toBe("entry-null");
      expect(result[1].id).toBe("entry-1");
      expect(result[2].id).toBe("entry-2");
    });

    it("should maintain order for entries with equal timestamps", () => {
      // ARRANGE
      const entries = [
        createXpEntry({ id: "entry-1", ts: 1000 }),
        createXpEntry({ id: "entry-2", ts: 1000 }),
        createXpEntry({ id: "entry-3", ts: 1000 })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].id).toBe("entry-1");
      expect(result[1].id).toBe("entry-2");
      expect(result[2].id).toBe("entry-3");
    });
  });

  describe("user preference sorting", () => {
    it("should call getSortPref when sort option is enabled with actorId", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];
      const options = { sort: true, actorId: "actor-123" };

      // ACT
      formatXpEntries(entries, options);

      // ASSERT
      expect(getSortPref).toHaveBeenCalledWith(
        "actor-123",
        "xp-purchases",
        ["note", "cost", "type"],
        "note"
      );
    });

    it("should call sortWithPref when sort option is enabled", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];
      const options = { sort: true, actorId: "actor-123" };

      // ACT
      formatXpEntries(entries, options);

      // ASSERT
      expect(sortWithPref).toHaveBeenCalled();
    });

    it("should use custom scope when provided", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];
      const options = { sort: true, actorId: "actor-123", scope: "custom-scope" };

      // ACT
      formatXpEntries(entries, options);

      // ASSERT
      expect(getSortPref).toHaveBeenCalledWith(
        "actor-123",
        "custom-scope",
        ["note", "cost", "type"],
        "note"
      );
    });

    it("should use override sortPref when provided", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];
      const customPref = { key: "cost", dir: "desc" };
      const options = { sort: true, actorId: "actor-123", sortPref: customPref };

      // ACT
      formatXpEntries(entries, options);

      // ASSERT
      expect(getSortPref).not.toHaveBeenCalled();
      expect(sortWithPref).toHaveBeenCalledWith(expect.any(Array), expect.any(Object), customPref);
    });

    it("should not call sort utilities when sort is false", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];
      const options = { sort: false, actorId: "actor-123" };

      // ACT
      formatXpEntries(entries, options);

      // ASSERT
      expect(getSortPref).not.toHaveBeenCalled();
      expect(sortWithPref).not.toHaveBeenCalled();
    });

    it("should not call sort utilities when actorId is missing", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];
      const options = { sort: true };

      // ACT
      formatXpEntries(entries, options);

      // ASSERT
      expect(getSortPref).not.toHaveBeenCalled();
      expect(sortWithPref).not.toHaveBeenCalled();
    });

    it("should fall back to timestamp sorting when sort enabled but no actorId", () => {
      // ARRANGE
      const entries = [
        createXpEntry({ id: "entry-2", ts: 2000 }),
        createXpEntry({ id: "entry-1", ts: 1000 })
      ];
      const options = { sort: true };

      // ACT
      const result = formatXpEntries(entries, options);

      // ASSERT
      expect(result[0].id).toBe("entry-1");
      expect(result[1].id).toBe("entry-2");
    });
  });

  describe("edge cases - empty and null inputs", () => {
    it("should handle empty array", () => {
      // ARRANGE
      const entries = [];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should handle entry with all properties null", () => {
      // ARRANGE
      const entries = [
        {
          id: "entry-1",
          type: null,
          note: null,
          delta: null,
          ts: null
        }
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result).toHaveLength(1);
      expect(result[0].note).toBe("");
      expect(result[0].type).toBe("Manual Adjustments");
      expect(result[0].deltaFormatted).toBe("+0");
    });

    it("should handle entry with all properties undefined", () => {
      // ARRANGE
      const entries = [
        {
          id: "entry-1"
        }
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result).toHaveLength(1);
      expect(result[0].note).toBe("");
      expect(result[0].type).toBe("Manual Adjustments");
    });

    it("should handle null options parameter", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];

      // ACT
      const result = formatXpEntries(entries, null);

      // ASSERT
      expect(result).toHaveLength(1);
    });

    it("should handle undefined options parameter", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result).toHaveLength(1);
    });

    it("should handle empty options object", () => {
      // ARRANGE
      const entries = [createXpEntry({ delta: 10 })];

      // ACT
      const result = formatXpEntries(entries, {});

      // ASSERT
      expect(result).toHaveLength(1);
    });
  });

  describe("edge cases - malformed entries", () => {
    it("should handle trait entry with undefined toValue", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "trait",
          traitLabel: "Reflexes",
          fromValue: 2,
          delta: 12
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("");
    });

    it("should handle void entry with undefined toValue", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "void",
          fromValue: 2,
          delta: 18
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("");
    });

    it("should handle skill entry with undefined toValue", () => {
      // ARRANGE
      const entries = [
        createXpEntry({
          type: "skill",
          skillName: "Kenjutsu",
          fromValue: 2,
          delta: 3
        })
      ];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("");
    });

    it("should handle entry with empty string note", () => {
      // ARRANGE
      const entries = [createXpEntry({ note: "", delta: 5 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("");
    });

    it("should handle entry with whitespace-only note", () => {
      // ARRANGE
      const entries = [createXpEntry({ note: "   ", delta: 5 })];

      // ACT
      const result = formatXpEntries(entries);

      // ASSERT
      expect(result[0].note).toBe("   ");
    });
  });
});
