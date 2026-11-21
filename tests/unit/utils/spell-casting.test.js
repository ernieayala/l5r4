import { describe, expect, it } from "vitest";
import {
  getAffinityDeficiencyModifier,
  getCastingSchoolRank
} from "../../../module/utils/spell-casting.js";

// game-rules/29_types_of_rolls.md, p.80
// game-rules/49_improving_your_character.md, p.104-105
// game-rules/66_magic_and_spell_casting.md, p.163
describe("getCastingSchoolRank", () => {
  const caster = schools => ({
    system: { insightRank: 4 },
    items: schools.map(system => ({ type: "school", system }))
  });

  it("should use the shugenja School's Rank when a character has more than one School", () => {
    const actor = caster([
      { shugenja: false, schoolRank: 3 },
      { shugenja: true, schoolRank: 1 }
    ]);
    expect(getCastingSchoolRank(actor)).toBe(1);
  });

  it("should use the Insight Rank otherwise, the School Rank of a single School", () => {
    expect(getCastingSchoolRank(caster([{ shugenja: false, schoolRank: 4 }]))).toBe(4);
    expect(getCastingSchoolRank(caster([]))).toBe(4);
  });
});

describe("getAffinityDeficiencyModifier", () => {
  describe("Affinity bonuses", () => {
    it("should return +1 for affinity match", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              affinity: "fire"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "fire");
      expect(result).toBe(1);
    });

    it("should be case insensitive for affinity", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              affinity: "FIRE"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "fire");
      expect(result).toBe(1);
    });

    it("should return 0 for non-matching affinity", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              affinity: "water"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "fire");
      expect(result).toBe(0);
    });
  });

  describe("Deficiency penalties", () => {
    it("should return -1 for deficiency match", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              deficiency: "air"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "air");
      expect(result).toBe(-1);
    });

    it("should be case insensitive for deficiency", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              deficiency: "AIR"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "air");
      expect(result).toBe(-1);
    });
  });

  describe("Conflict handling", () => {
    it("should return 0 for affinity/deficiency conflict", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              affinity: "earth",
              deficiency: "earth"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "earth");
      expect(result).toBe(0); // Conflict = no auto-select
    });

    it("should return 0 for multiple techniques with conflicting modifiers", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: true,
              affinity: "void"
            }
          },
          {
            type: "technique",
            system: {
              shugenja: true,
              deficiency: "void"
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "void");
      expect(result).toBe(0); // Conflict across techniques
    });
  });

  describe("Edge cases", () => {
    it("should return 0 for null actor", () => {
      const result = getAffinityDeficiencyModifier(null, "fire");
      expect(result).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      const result = getAffinityDeficiencyModifier(undefined, "fire");
      expect(result).toBe(0);
    });

    it("should return 0 for null ringKey", () => {
      const actor = { items: [] };
      const result = getAffinityDeficiencyModifier(actor, null);
      expect(result).toBe(0);
    });

    it("should return 0 for empty ringKey", () => {
      const actor = { items: [] };
      const result = getAffinityDeficiencyModifier(actor, "");
      expect(result).toBe(0);
    });

    it("should return 0 for no shugenja techniques", () => {
      const actor = {
        items: [
          {
            type: "technique",
            system: {
              shugenja: false
            }
          }
        ]
      };

      const result = getAffinityDeficiencyModifier(actor, "fire");
      expect(result).toBe(0);
    });

    it("should return 0 for actor without items", () => {
      const actor = {};
      const result = getAffinityDeficiencyModifier(actor, "fire");
      expect(result).toBe(0);
    });

    it("should handle items.contents array", () => {
      const actor = {
        items: {
          contents: [
            {
              type: "technique",
              system: {
                shugenja: true,
                affinity: "water"
              }
            }
          ]
        }
      };

      const result = getAffinityDeficiencyModifier(actor, "water");
      expect(result).toBe(1);
    });
  });
});
