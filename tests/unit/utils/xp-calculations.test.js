/**
 * Unit Tests: xp-calculations.js
 *
 * Family and School creation bonuses, from TraitAdjust rules or the legacy trait/bonus fields. The XP arithmetic is
 * tested in xp-ledger.test.js.
 *
 * Test Priority: Tier 1 (Critical - Character advancement system)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCreationFreeBonus,
  getCreationFreeBonusSources
} from "../../../module/utils/xp-calculations.js";

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

    // #172: a Trait moves by whole ranks, so a fractional bonus rounds down, as the engine applies it
    it("should round a fractional bonus down", () => {
      const actor = { items: [ruleItem("family", "agi", 1.5)], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "agi")).toBe(1);
    });

    // #156, Ernie's ruling: the creation bonus belongs to the School a character starts in
    // game-rules/48_character_creation_expanded.md, p.102
    // game-rules/49_improving_your_character.md, p.105
    it("should give no creation bonus for a second School", () => {
      const second = ruleItem("school", "agi", 1, {
        flags: { "l5r4-enhanced": { secondSchool: true } }
      });
      const actor = { items: [ruleItem("school", "agi"), second], getFlag: () => null };
      expect(getCreationFreeBonus(actor, "agi")).toBe(1);
    });

    it("should read a Void Ring bonus with the key void", () => {
      const actor = {
        items: [ruleItem("family", "void"), ruleItem("school", "void")],
        getFlag: () => null
      };
      expect(getCreationFreeBonus(actor, "void")).toBe(2);
    });
  });

  describe("Legacy approach", () => {
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

  describe("Edge cases", () => {
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

  it("should report a TraitAdjust rule bonus as rules, not legacy", () => {
    const actor = { items: [ruleItem("family", "str")], getFlag: () => null };
    expect(getCreationFreeBonusSources(actor, "str")).toEqual({ rules: 1, legacy: 0 });
  });

  it("should report the legacy trait and bonus fields as legacy, not rules", () => {
    const actor = { items: [legacyItem("family", "str")], getFlag: () => null };
    expect(getCreationFreeBonusSources(actor, "str")).toEqual({ rules: 0, legacy: 1 });
  });

  it("should keep the two sources apart when the Family and School use different forms", () => {
    const actor = {
      items: [ruleItem("family", "str"), legacyItem("school", "str")],
      getFlag: () => null
    };
    expect(getCreationFreeBonusSources(actor, "str")).toEqual({ rules: 1, legacy: 1 });
    expect(getCreationFreeBonus(actor, "str")).toBe(2);
  });

  it("should return zero for both sources when an item cannot be read", () => {
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
