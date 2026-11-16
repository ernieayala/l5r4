import { describe, expect, it } from "vitest";
import { toTraitKey } from "../../../module/utils/trait-keys.js";

describe("toTraitKey", () => {
  describe("Direct abbreviations", () => {
    it("should accept sta lowercase", () => {
      expect(toTraitKey("sta")).toBe("sta");
    });

    it("should accept sta uppercase", () => {
      expect(toTraitKey("STA")).toBe("sta");
    });

    it("should accept sta mixed case", () => {
      expect(toTraitKey("StA")).toBe("sta");
    });

    it("should accept all valid trait abbreviations", () => {
      const traits = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int", "void"];
      traits.forEach(trait => {
        expect(toTraitKey(trait)).toBe(trait);
      });
    });
  });

  describe("Keys in i18n format", () => {
    it("should parse l5r4.ui.mechanics.traits.sta", () => {
      expect(toTraitKey("l5r4.ui.mechanics.traits.sta")).toBe("sta");
    });

    it("should parse l5r4.ui.mechanics.traits.REF", () => {
      expect(toTraitKey("l5r4.ui.mechanics.traits.REF")).toBe("ref");
    });

    it("should parse void ring i18n key", () => {
      expect(toTraitKey("l5r4.ui.mechanics.rings.void")).toBe("void");
    });

    it("should parse void ring i18n key case insensitive", () => {
      expect(toTraitKey("L5R4.UI.MECHANICS.RINGS.VOID")).toBe("void");
    });
  });

  describe("English full names", () => {
    it("should convert stamina to sta", () => {
      expect(toTraitKey("stamina")).toBe("sta");
    });

    it("should convert willpower to wil", () => {
      expect(toTraitKey("willpower")).toBe("wil");
    });

    it("should convert reflexes to ref", () => {
      expect(toTraitKey("reflexes")).toBe("ref");
    });

    it("should handle case insensitive English names", () => {
      expect(toTraitKey("STAMINA")).toBe("sta");
      expect(toTraitKey("Reflexes")).toBe("ref");
    });

    it("should convert all English trait names", () => {
      const mapping = {
        stamina: "sta",
        willpower: "wil",
        strength: "str",
        perception: "per",
        reflexes: "ref",
        awareness: "awa",
        agility: "agi",
        intelligence: "int",
        void: "void"
      };

      Object.entries(mapping).forEach(([english, abbr]) => {
        expect(toTraitKey(english)).toBe(abbr);
      });
    });
  });

  describe("Edge cases", () => {
    it("should return empty string for null", () => {
      expect(toTraitKey(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(toTraitKey(undefined)).toBe("");
    });

    it("should return empty string for symbol", () => {
      expect(toTraitKey(Symbol("test"))).toBe("");
    });

    it("should return empty string for invalid trait", () => {
      expect(toTraitKey("invalid")).toBe("");
    });

    it("should return empty string for number", () => {
      expect(toTraitKey(123)).toBe("");
    });

    it("should handle whitespace", () => {
      expect(toTraitKey("  sta  ")).toBe("sta");
    });

    it("should return empty string for empty string", () => {
      expect(toTraitKey("")).toBe("");
    });
  });

  describe("Reverse lookup through i18n", () => {
    it("should handle missing game.i18n gracefully", () => {
      // Should not throw when game.i18n is undefined
      expect(() => toTraitKey("test")).not.toThrow();
    });
  });
});
