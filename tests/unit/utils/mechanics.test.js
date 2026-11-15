/**
 * Unit Tests: mechanics.js
 *
 * Tests core L5R4 game mechanics utilities including trait normalization,
 * wound penalties, effective trait resolution, and weapon skill lookups.
 *
 * Test Priority: Tier 1 (Critical - Core game calculations)
 */

import { describe, it, expect, vi } from "vitest";
import {
  normalizeTraitKey,
  getEffectiveTrait,
  extractRollParams,
  getAffinityDeficiencyModifier,
  resolveWeaponSkillTrait,
  ringRank,
  castingSchoolRank,
  highestSchoolRank
} from "../../../module/utils/mechanics.js";

/**
 * A mock actor with what preparation gives every actor: the `system.bonuses` maps, an empty rule bag, and roll
 * options.
 * @param {object} actor
 * @returns {object}
 */
const prepared = actor => ({
  ruleBag: {},
  rollOptions: new Set(),
  ...actor,
  system: {
    ...actor.system,
    bonuses: { skill: {}, trait: {}, ring: {}, ...actor.system?.bonuses }
  }
});

describe("normalizeTraitKey", () => {
  describe("Direct abbreviations", () => {
    it("should accept sta lowercase", () => {
      expect(normalizeTraitKey("sta")).toBe("sta");
    });

    it("should accept sta uppercase", () => {
      expect(normalizeTraitKey("STA")).toBe("sta");
    });

    it("should accept sta mixed case", () => {
      expect(normalizeTraitKey("StA")).toBe("sta");
    });

    it("should accept all valid trait abbreviations", () => {
      const traits = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int", "void"];
      traits.forEach(trait => {
        expect(normalizeTraitKey(trait)).toBe(trait);
      });
    });
  });

  describe("Keys in i18n format", () => {
    it("should parse l5r4.ui.mechanics.traits.sta", () => {
      expect(normalizeTraitKey("l5r4.ui.mechanics.traits.sta")).toBe("sta");
    });

    it("should parse l5r4.ui.mechanics.traits.REF", () => {
      expect(normalizeTraitKey("l5r4.ui.mechanics.traits.REF")).toBe("ref");
    });

    it("should parse void ring i18n key", () => {
      expect(normalizeTraitKey("l5r4.ui.mechanics.rings.void")).toBe("void");
    });

    it("should parse void ring i18n key case insensitive", () => {
      expect(normalizeTraitKey("L5R4.UI.MECHANICS.RINGS.VOID")).toBe("void");
    });
  });

  describe("English full names", () => {
    it("should convert stamina to sta", () => {
      expect(normalizeTraitKey("stamina")).toBe("sta");
    });

    it("should convert willpower to wil", () => {
      expect(normalizeTraitKey("willpower")).toBe("wil");
    });

    it("should convert reflexes to ref", () => {
      expect(normalizeTraitKey("reflexes")).toBe("ref");
    });

    it("should handle case insensitive English names", () => {
      expect(normalizeTraitKey("STAMINA")).toBe("sta");
      expect(normalizeTraitKey("Reflexes")).toBe("ref");
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
        expect(normalizeTraitKey(english)).toBe(abbr);
      });
    });
  });

  describe("Edge cases", () => {
    it("should return empty string for null", () => {
      expect(normalizeTraitKey(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(normalizeTraitKey(undefined)).toBe("");
    });

    it("should return empty string for symbol", () => {
      expect(normalizeTraitKey(Symbol("test"))).toBe("");
    });

    it("should return empty string for invalid trait", () => {
      expect(normalizeTraitKey("invalid")).toBe("");
    });

    it("should return empty string for number", () => {
      expect(normalizeTraitKey(123)).toBe("");
    });

    it("should handle whitespace", () => {
      expect(normalizeTraitKey("  sta  ")).toBe("sta");
    });

    it("should return empty string for empty string", () => {
      expect(normalizeTraitKey("")).toBe("");
    });
  });

  describe("Reverse lookup through i18n", () => {
    it("should handle missing game.i18n gracefully", () => {
      // Should not throw when game.i18n is undefined
      expect(() => normalizeTraitKey("test")).not.toThrow();
    });
  });
});

// game-rules/25_rings_and_traits.md, p.76
describe("ringRank", () => {
  const actor = { system: { rings: { fire: 3, void: { rank: 4, value: 2, max: 4 } } } };

  it("should read an Elemental Ring", () => {
    expect(ringRank(actor, "fire")).toBe(3);
  });

  // game-rules/66_magic_and_spell_casting.md, p.163
  it("should read the Void Ring's rank, so a Void spell rolls its Ring", () => {
    expect(ringRank(actor, "void")).toBe(4);
  });
});

// game-rules/49_improving_your_character.md, p.104
describe("highestSchoolRank", () => {
  const character = (...ranks) => ({
    items: [
      { type: "skill", system: {} },
      ...ranks.map(schoolRank => ({ type: "school", system: { schoolRank } }))
    ]
  });

  it("should be the highest rank among the character's Schools", () => {
    expect(highestSchoolRank(character(2, 4, 1))).toBe(4);
  });

  it("should be 0 for a character with no School", () => {
    expect(highestSchoolRank(character())).toBe(0);
  });
});

// game-rules/29_types_of_rolls.md, p.80
// game-rules/49_improving_your_character.md, p.104-105
// game-rules/66_magic_and_spell_casting.md, p.163
describe("castingSchoolRank", () => {
  const caster = schools => ({
    system: { insightRank: 4 },
    items: schools.map(system => ({ type: "school", system }))
  });

  it("should use the shugenja School's Rank when a character has more than one School", () => {
    const actor = caster([
      { shugenja: false, schoolRank: 3 },
      { shugenja: true, schoolRank: 1 }
    ]);
    expect(castingSchoolRank(actor)).toBe(1);
  });

  it("should use the Insight Rank otherwise, the School Rank of a single School", () => {
    expect(castingSchoolRank(caster([{ shugenja: false, schoolRank: 4 }]))).toBe(4);
    expect(castingSchoolRank(caster([]))).toBe(4);
  });
});

describe("getEffectiveTrait", () => {
  describe("Void Ring special case", () => {
    // #7
    it("should read void from rings.void.rank, for a Skill rolled with the Void Ring", () => {
      const actor = {
        system: {
          rings: {
            void: {
              rank: 3
            }
          }
        }
      };

      const result = getEffectiveTrait(actor, "void");
      expect(result).toBe(3);
    });

    it("should return 0 for missing void ring", () => {
      const actor = {
        system: {
          rings: {}
        }
      };

      const result = getEffectiveTrait(actor, "void");
      expect(result).toBe(0);
    });
  });

  describe("Derived effective traits", () => {
    it("should prefer _derived.traitsEff over base traits", () => {
      const actor = {
        system: {
          traits: {
            sta: 4
          },
          _derived: {
            traitsEff: {
              sta: 2 // Reduced by wound penalties
            }
          }
        }
      };

      const result = getEffectiveTrait(actor, "sta");
      expect(result).toBe(2); // Should use effective, not base
    });

    it("should fall back to base trait if no derived", () => {
      const actor = {
        system: {
          traits: {
            ref: 5
          }
        }
      };

      const result = getEffectiveTrait(actor, "ref");
      expect(result).toBe(5);
    });

    it("should return 0 if trait not found", () => {
      const actor = {
        system: {
          traits: {}
        }
      };

      const result = getEffectiveTrait(actor, "agi");
      expect(result).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle null actor", () => {
      const result = getEffectiveTrait(null, "sta");
      expect(result).toBe(0);
    });

    it("should handle undefined actor", () => {
      const result = getEffectiveTrait(undefined, "sta");
      expect(result).toBe(0);
    });

    it("should handle actor without system", () => {
      const actor = {};
      const result = getEffectiveTrait(actor, "sta");
      expect(result).toBe(0);
    });

    it("should coerce string trait values", () => {
      const actor = {
        system: {
          traits: {
            sta: "5"
          }
        }
      };

      const result = getEffectiveTrait(actor, "sta");
      expect(result).toBe(5);
    });
  });
});

describe("extractRollParams", () => {
  describe("Basic extraction", () => {
    it("should extract roll and keep values", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3"
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);

      expect(result.diceRoll).toBe(5);
      expect(result.diceKeep).toBe(3);
    });

    it("should extract label and description", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3",
          label: "Kenjutsu",
          description: "Katana attack"
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);

      expect(result.label).toBe("Kenjutsu");
      expect(result.description).toBe("Katana attack");
    });

    it("should return empty strings for missing label/description", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3"
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);

      expect(result.label).toBe("");
      expect(result.description).toBe("");
    });
  });

  describe("Trait bonus extraction", () => {
    it("should extract trait bonus when trait specified", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3",
          trait: "agi"
        }
      };

      const actor = {
        system: {
          traits: {
            agi: 4
          }
        }
      };

      const result = extractRollParams(el, actor);
      expect(result.traitBonus).toBe(4);
    });

    it("should return 0 trait bonus when no trait attribute", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3"
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);
      expect(result.traitBonus).toBe(0);
    });

    it("should handle empty trait string", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3",
          trait: ""
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);
      expect(result.traitBonus).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing dataset values", () => {
      const el = {
        dataset: {}
      };

      const actor = {};
      const result = extractRollParams(el, actor);

      expect(result.diceRoll).toBe(0);
      expect(result.diceKeep).toBe(0);
      expect(result.traitBonus).toBe(0);
    });

    it("should coerce string numbers", () => {
      const el = {
        dataset: {
          roll: "7",
          keep: "4"
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);

      expect(result.diceRoll).toBe(7);
      expect(result.diceKeep).toBe(4);
    });

    it("should handle invalid numeric strings", () => {
      const el = {
        dataset: {
          roll: "abc",
          keep: "def"
        }
      };

      const actor = {};
      const result = extractRollParams(el, actor);

      expect(result.diceRoll).toBe(0);
      expect(result.diceKeep).toBe(0);
    });
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

describe("resolveWeaponSkillTrait", () => {
  describe("Skilled weapon use", () => {
    it("should resolve skill + trait for skilled attack", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(cb => {
            const skill = {
              type: "skill",
              name: "Kenjutsu",
              system: {
                rank: 4,
                trait: "agi"
              }
            };
            return cb(skill) ? skill : undefined;
          })
        }
      };

      const weapon = {
        system: {
          associatedSkill: "Kenjutsu",
          fallbackTrait: "agi"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.skillRank).toBe(4);
      expect(result.traitValue).toBe(3);
      expect(result.rollBonus).toBe(7); // 4 + 3
      expect(result.keepBonus).toBe(3); // Trait only
    });

    it("should be case insensitive for skill name match", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(cb => {
            const skill = {
              type: "skill",
              name: "kenjutsu",
              system: {
                rank: 2,
                trait: "agi"
              }
            };
            return cb(skill) ? skill : undefined;
          })
        }
      };

      const weapon = {
        system: {
          associatedSkill: "KENJUTSU"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);
      expect(result.skillRank).toBe(2);
    });
  });

  describe("Unskilled weapon use", () => {
    it("should use trait roll for rank 0 skill", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(cb => {
            const skill = {
              type: "skill",
              name: "Kenjutsu",
              system: {
                rank: 0,
                trait: "agi"
              }
            };
            return cb(skill) ? skill : undefined;
          })
        }
      };

      const weapon = {
        system: {
          associatedSkill: "Kenjutsu"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.skillRank).toBe(0);
      expect(result.traitValue).toBe(3);
      expect(result.rollBonus).toBe(3); // Trait only (unskilled)
      expect(result.keepBonus).toBe(3); // Trait only
      expect(result.description).toContain("[Unskilled]");
    });

    it("should use fallback trait when no skill found", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(() => undefined)
        }
      };

      const weapon = {
        system: {
          associatedSkill: "NonexistentSkill",
          fallbackTrait: "agi"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.skillRank).toBe(0);
      expect(result.traitValue).toBe(3);
      expect(result.rollBonus).toBe(3); // Unskilled trait roll
      expect(result.keepBonus).toBe(3);
      expect(result.description).toContain("[Unskilled]");
    });

    it("should default to agi if no fallback specified", () => {
      const actor = {
        system: {
          traits: {
            agi: 4
          }
        },
        items: {
          find: vi.fn(() => undefined)
        }
      };

      const weapon = {
        system: {
          associatedSkill: "NonexistentSkill"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.traitValue).toBe(4);
      expect(result.description).toContain("AGI");
    });
  });

  // #34
  // Skill bonuses (Active Effect values in system.bonuses) reach the displayed weapon attack formula.
  describe("Skill bonuses that reach the weapon attack", () => {
    const buildActorWithSkillBonus = (kenjutsuRank, bonusRoll, bonusKeep) => ({
      system: {
        traits: { agi: 3 },
        bonuses: {
          skill: {
            kenjutsu: { roll: bonusRoll, keep: bonusKeep, total: 0 }
          }
        }
      },
      items: {
        find: vi.fn(cb => {
          const skill = {
            type: "skill",
            name: "Kenjutsu",
            system: { rank: kenjutsuRank, trait: "agi" }
          };
          return cb(skill) ? skill : undefined;
        })
      }
    });

    it("should add skill rollBonus to skilled attack rollBonus", () => {
      // Skilled: rank 4 + agi 3 = 7, plus +2k0 from skill bonus → 9k3
      const actor = buildActorWithSkillBonus(4, 2, 0);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(9);
      expect(result.keepBonus).toBe(3);
    });

    it("should add skill keepBonus to skilled attack keepBonus", () => {
      // Skilled: rank 4 + agi 3 = 7 roll, agi 3 keep, plus +0k1 → 7k4
      const actor = buildActorWithSkillBonus(4, 0, 1);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(7);
      expect(result.keepBonus).toBe(4);
    });

    it("should support negative skill bonuses as penalties", () => {
      // Penalty case from the issue: skilled rank 4 + agi 3 = 7k3, with -1k1 → 6k2
      const actor = buildActorWithSkillBonus(4, -1, -1);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(6);
      expect(result.keepBonus).toBe(2);
    });

    it("should add skill bonuses to unskilled attack rollBonus too", () => {
      // Unskilled (rank 0): trait 3 keep 3, with +1k0 → 4k3
      const actor = buildActorWithSkillBonus(0, 1, 0);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.skillRank).toBe(0);
      expect(result.rollBonus).toBe(4);
      expect(result.keepBonus).toBe(3);
      expect(result.description).toContain("[Unskilled]");
    });

    it("should add nothing when the skill has no bonus", () => {
      const actor = {
        system: { traits: { agi: 3 } },
        items: {
          find: vi.fn(cb => {
            const skill = {
              type: "skill",
              name: "Kenjutsu",
              system: { rank: 4, trait: "agi" }
            };
            return cb(skill) ? skill : undefined;
          })
        }
      };
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(7);
      expect(result.keepBonus).toBe(3);
    });
  });

  describe("Edge cases", () => {
    it("should handle null weapon", () => {
      const actor = {};
      const result = resolveWeaponSkillTrait(actor, null);

      expect(result.skillRank).toBe(0);
      expect(result.traitValue).toBe(0);
      expect(result.rollBonus).toBe(0);
      expect(result.keepBonus).toBe(0);
      expect(result.description).toBe("No weapon/actor");
    });

    it("should handle null actor", () => {
      const weapon = {};
      const result = resolveWeaponSkillTrait(null, weapon);

      expect(result.description).toBe("No weapon/actor");
    });

    it("should handle weapon without system", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(() => undefined)
        }
      };

      const weapon = {};
      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      // Should use default fallback (agi)
      expect(result.traitValue).toBe(3);
    });

    it("should handle actor without items.find", () => {
      const actor = {
        system: {
          traits: {
            str: 5
          }
        }
      };

      const weapon = {
        system: {
          associatedSkill: "SomeSkill",
          fallbackTrait: "str"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);

      // Should fall back to trait roll
      expect(result.traitValue).toBe(5);
      expect(result.description).toContain("STR");
    });

    it("should handle empty associatedSkill", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(() => undefined)
        }
      };

      const weapon = {
        system: {
          associatedSkill: "",
          fallbackTrait: "agi"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);
      expect(result.traitValue).toBe(3);
    });

    it("should handle whitespace-only associatedSkill", () => {
      const actor = {
        system: {
          traits: {
            agi: 3
          }
        },
        items: {
          find: vi.fn(() => undefined)
        }
      };

      const weapon = {
        system: {
          associatedSkill: "   ",
          fallbackTrait: "agi"
        }
      };

      const result = resolveWeaponSkillTrait(prepared(actor), weapon);
      expect(result.traitValue).toBe(3);
    });
  });
});
