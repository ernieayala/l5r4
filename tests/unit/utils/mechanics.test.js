/**
 * Unit Tests: mechanics.js
 *
 * Tests core L5R4 game mechanics utilities including effective trait resolution,
 * Ring and School ranks, roll parameters, and weapon skill lookups.
 *
 * Test Priority: Tier 1 (Critical - Core game calculations)
 */

import { describe, it, expect, vi } from "vitest";
import {
  getEffectiveTrait,
  getRollParams,
  getWeaponSkillTrait,
  getWeaponSkillChoices,
  ringRankOf,
  getHighestSchoolRank
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

// game-rules/25_rings_and_traits.md, p.76
describe("ringRankOf", () => {
  const actor = { system: { rings: { fire: 3, void: { rank: 4, value: 2, max: 4 } } } };

  it("should read an Elemental Ring", () => {
    expect(ringRankOf(actor, "fire")).toBe(3);
  });

  // game-rules/66_magic_and_spell_casting.md, p.163
  it("should read the Void Ring's rank, so a Void spell rolls its Ring", () => {
    expect(ringRankOf(actor, "void")).toBe(4);
  });
});

// game-rules/49_improving_your_character.md, p.104
describe("getHighestSchoolRank", () => {
  const character = (...ranks) => ({
    items: [
      { type: "skill", system: {} },
      ...ranks.map(schoolRank => ({ type: "school", system: { schoolRank } }))
    ]
  });

  it("should be the highest rank among the character's Schools", () => {
    expect(getHighestSchoolRank(character(2, 4, 1))).toBe(4);
  });

  it("should be 0 for a character with no School", () => {
    expect(getHighestSchoolRank(character())).toBe(0);
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

describe("getRollParams", () => {
  describe("Basic extraction", () => {
    it("should extract roll and keep values", () => {
      const el = {
        dataset: {
          roll: "5",
          keep: "3"
        }
      };

      const actor = {};
      const result = getRollParams(el, actor);

      expect(result.roll).toBe(5);
      expect(result.keep).toBe(3);
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
      const result = getRollParams(el, actor);

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
      const result = getRollParams(el, actor);

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

      const result = getRollParams(el, actor);
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
      const result = getRollParams(el, actor);
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
      const result = getRollParams(el, actor);
      expect(result.traitBonus).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing dataset values", () => {
      const el = {
        dataset: {}
      };

      const actor = {};
      const result = getRollParams(el, actor);

      expect(result.roll).toBe(0);
      expect(result.keep).toBe(0);
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
      const result = getRollParams(el, actor);

      expect(result.roll).toBe(7);
      expect(result.keep).toBe(4);
    });

    it("should handle invalid numeric strings", () => {
      const el = {
        dataset: {
          roll: "abc",
          keep: "def"
        }
      };

      const actor = {};
      const result = getRollParams(el, actor);

      expect(result.roll).toBe(0);
      expect(result.keep).toBe(0);
    });
  });
});

describe("getWeaponSkillTrait", () => {
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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);
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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(9);
      expect(result.keepBonus).toBe(3);
    });

    it("should add skill keepBonus to skilled attack keepBonus", () => {
      // Skilled: rank 4 + agi 3 = 7 roll, agi 3 keep, plus +0k1 → 7k4
      const actor = buildActorWithSkillBonus(4, 0, 1);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = getWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(7);
      expect(result.keepBonus).toBe(4);
    });

    it("should support negative skill bonuses as penalties", () => {
      // Penalty case from the issue: skilled rank 4 + agi 3 = 7k3, with -1k1 → 6k2
      const actor = buildActorWithSkillBonus(4, -1, -1);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = getWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(6);
      expect(result.keepBonus).toBe(2);
    });

    it("should add skill bonuses to unskilled attack rollBonus too", () => {
      // Unskilled (rank 0): trait 3 keep 3, with +1k0 → 4k3
      const actor = buildActorWithSkillBonus(0, 1, 0);
      const weapon = { system: { associatedSkill: "Kenjutsu", fallbackTrait: "agi" } };

      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

      expect(result.rollBonus).toBe(7);
      expect(result.keepBonus).toBe(3);
    });
  });

  describe("Edge cases", () => {
    it("should handle null weapon", () => {
      const actor = {};
      const result = getWeaponSkillTrait(actor, null);

      expect(result.skillRank).toBe(0);
      expect(result.traitValue).toBe(0);
      expect(result.rollBonus).toBe(0);
      expect(result.keepBonus).toBe(0);
      expect(result.description).toBe("No weapon/actor");
    });

    it("should handle null actor", () => {
      const weapon = {};
      const result = getWeaponSkillTrait(null, weapon);

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
      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);

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

      const result = getWeaponSkillTrait(prepared(actor), weapon);
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

      const result = getWeaponSkillTrait(prepared(actor), weapon);
      expect(result.traitValue).toBe(3);
    });
  });
});

describe("getWeaponSkillChoices", () => {
  it("should offer each Skill by its name", () => {
    expect(getWeaponSkillChoices(["Kenjutsu", "Kyujutsu"], "")).toEqual({
      Kenjutsu: "Kenjutsu",
      Kyujutsu: "Kyujutsu"
    });
  });

  it("should key the Skill an attack matches without case by the stored text", () => {
    expect(getWeaponSkillChoices(["Kenjutsu", "Kyujutsu"], "kenjutsu")).toEqual({
      kenjutsu: "Kenjutsu",
      Kyujutsu: "Kyujutsu"
    });
  });

  it("should keep a stored Skill the owner lacks as its own choice", () => {
    expect(getWeaponSkillChoices(["Kyujutsu"], "Kenjutsu")).toEqual({
      Kyujutsu: "Kyujutsu",
      Kenjutsu: "Kenjutsu"
    });
  });

  it("should keep a stored Skill when the owner has no Skills", () => {
    expect(getWeaponSkillChoices([], "kyujutsu")).toEqual({ kyujutsu: "kyujutsu" });
  });
});
