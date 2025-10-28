import { describe, it, expect } from "vitest";
import { calculateXpDataVersion } from "../../../module/services/xp/xp-versioning.js";

/**
 * Create a mock actor with XP-relevant data
 */
function createMockActor(config = {}) {
  const {
    traits = { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
    voidRank = 2,
    skills = [],
    items = []
  } = config;

  return {
    system: {
      traits,
      rings: {
        void: { rank: voidRank }
      }
    },
    items: [...skills, ...items]
  };
}

/**
 * Create a mock skill item
 */
function createMockSkill(config = {}) {
  const {
    id = "skill-" + Math.random().toString(36).substr(2, 9),
    rank = 0,
    freeRanks = 0,
    trainedEmphases = [],
    freeEmphasis = 0
  } = config;

  return {
    id,
    type: "skill",
    system: {
      rank,
      freeRanks,
      trainedEmphases,
      freeEmphasis
    }
  };
}

/**
 * Create a mock purchasable item (advantage/disadvantage/kata/kiho)
 */
function createMockItem(type, config = {}) {
  const { id = type + "-" + Math.random().toString(36).substr(2, 9), cost = 0 } = config;

  return {
    id,
    type,
    system: { cost }
  };
}

describe("calculateXpDataVersion", () => {
  describe("deterministic hashing", () => {
    it("should return same hash for identical actor data", () => {
      // ARRANGE
      const actor1 = createMockActor({
        traits: { sta: 3, wil: 3, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
        voidRank: 3
      });
      const actor2 = createMockActor({
        traits: { sta: 3, wil: 3, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
        voidRank: 3
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThan(0);
    });

    it("should return same hash when called multiple times on same actor", () => {
      // ARRANGE
      const actor = createMockActor();

      // ACT
      const hash1 = calculateXpDataVersion(actor);
      const hash2 = calculateXpDataVersion(actor);
      const hash3 = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it("should return positive integer hash", () => {
      // ARRANGE
      const actor = createMockActor();

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
      expect(Number.isInteger(hash)).toBe(true);
    });
  });

  describe("change detection - traits", () => {
    it("should return different hash when trait value changes", () => {
      // ARRANGE
      const actor1 = createMockActor({
        traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 }
      });
      const actor2 = createMockActor({
        traits: { sta: 3, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 }
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash for each unique trait value", () => {
      // ARRANGE
      const baseTraits = { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 };
      const actor1 = createMockActor({ traits: { ...baseTraits, sta: 2 } });
      const actor2 = createMockActor({ traits: { ...baseTraits, sta: 3 } });
      const actor3 = createMockActor({ traits: { ...baseTraits, sta: 4 } });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);
      const hash3 = calculateXpDataVersion(actor3);

      // ASSERT
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe("change detection - void rank", () => {
    it("should return different hash when void rank changes", () => {
      // ARRANGE
      const actor1 = createMockActor({ voidRank: 2 });
      const actor2 = createMockActor({ voidRank: 3 });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash for each void rank value", () => {
      // ARRANGE
      const actor1 = createMockActor({ voidRank: 1 });
      const actor2 = createMockActor({ voidRank: 2 });
      const actor3 = createMockActor({ voidRank: 3 });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);
      const hash3 = calculateXpDataVersion(actor3);

      // ASSERT
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe("change detection - skills", () => {
    it("should return different hash when skill added", () => {
      // ARRANGE
      const actor1 = createMockActor({ skills: [] });
      const actor2 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when skill rank changes", () => {
      // ARRANGE
      const actor1 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 2 })]
      });
      const actor2 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when free ranks change", () => {
      // ARRANGE
      const actor1 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3, freeRanks: 0 })]
      });
      const actor2 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3, freeRanks: 1 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when emphasis added", () => {
      // ARRANGE
      const actor1 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3, trainedEmphases: [] })]
      });
      const actor2 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3, trainedEmphases: ["Katana"] })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when free emphasis changes", () => {
      // ARRANGE
      const actor1 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3, freeEmphasis: 0 })]
      });
      const actor2 = createMockActor({
        skills: [createMockSkill({ id: "skill-1", rank: 3, freeEmphasis: 1 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("change detection - purchasable items", () => {
    it("should return different hash when advantage added", () => {
      // ARRANGE
      const actor1 = createMockActor({ items: [] });
      const actor2 = createMockActor({
        items: [createMockItem("advantage", { id: "adv-1", cost: 3 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when disadvantage added", () => {
      // ARRANGE
      const actor1 = createMockActor({ items: [] });
      const actor2 = createMockActor({
        items: [createMockItem("disadvantage", { id: "dis-1", cost: -2 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when kata added", () => {
      // ARRANGE
      const actor1 = createMockActor({ items: [] });
      const actor2 = createMockActor({
        items: [createMockItem("kata", { id: "kata-1", cost: 5 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when kiho added", () => {
      // ARRANGE
      const actor1 = createMockActor({ items: [] });
      const actor2 = createMockActor({
        items: [createMockItem("kiho", { id: "kiho-1", cost: 4 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return different hash when item cost changes", () => {
      // ARRANGE
      const actor1 = createMockActor({
        items: [createMockItem("advantage", { id: "adv-1", cost: 3 })]
      });
      const actor2 = createMockActor({
        items: [createMockItem("advantage", { id: "adv-1", cost: 5 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should track multiple items correctly", () => {
      // ARRANGE
      const actor1 = createMockActor({
        items: [
          createMockItem("advantage", { id: "adv-1", cost: 3 }),
          createMockItem("kata", { id: "kata-1", cost: 5 })
        ]
      });
      const actor2 = createMockActor({
        items: [
          createMockItem("advantage", { id: "adv-1", cost: 3 }),
          createMockItem("kata", { id: "kata-1", cost: 5 }),
          createMockItem("kiho", { id: "kiho-1", cost: 4 })
        ]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("edge cases - null/undefined", () => {
    it("should handle null actor gracefully", () => {
      // ARRANGE
      const actor = null;

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it("should handle undefined actor gracefully", () => {
      // ARRANGE
      const actor = undefined;

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it("should handle missing system property", () => {
      // ARRANGE
      const actor = { items: [] };

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle missing items property", () => {
      // ARRANGE
      const actor = {
        system: {
          traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
          rings: { void: { rank: 2 } }
        }
      };

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle missing traits", () => {
      // ARRANGE
      const actor = {
        system: { rings: { void: { rank: 2 } } },
        items: []
      };

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle missing void rank", () => {
      // ARRANGE
      const actor = {
        system: {
          traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 }
        },
        items: []
      };

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });
  });

  describe("edge cases - empty data", () => {
    it("should handle empty actor", () => {
      // ARRANGE
      const actor = { system: {}, items: [] };

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle empty traits object", () => {
      // ARRANGE
      const actor = createMockActor({ traits: {} });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle empty items array", () => {
      // ARRANGE
      const actor = createMockActor({ skills: [], items: [] });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });
  });

  describe("edge cases - skill data", () => {
    it("should handle skill with null rank", () => {
      // ARRANGE
      const actor = createMockActor({
        skills: [{ id: "skill-1", type: "skill", system: { rank: null } }]
      });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle skill with undefined system", () => {
      // ARRANGE
      const actor = createMockActor({
        skills: [{ id: "skill-1", type: "skill" }]
      });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle skill with non-array trainedEmphases", () => {
      // ARRANGE
      const actor = createMockActor({
        skills: [{ id: "skill-1", type: "skill", system: { trainedEmphases: null } }]
      });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });
  });

  describe("edge cases - item data", () => {
    it("should handle item with null cost", () => {
      // ARRANGE
      const actor = createMockActor({
        items: [{ id: "adv-1", type: "advantage", system: { cost: null } }]
      });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should handle item with undefined system", () => {
      // ARRANGE
      const actor = createMockActor({
        items: [{ id: "adv-1", type: "advantage" }]
      });

      // ACT
      const hash = calculateXpDataVersion(actor);

      // ASSERT
      expect(hash).toBeGreaterThan(0);
    });

    it("should filter out non-XP items correctly", () => {
      // ARRANGE
      const actorWithWeapon = createMockActor({
        items: [
          { id: "weapon-1", type: "weapon", system: { cost: 10 } },
          createMockItem("advantage", { id: "adv-1", cost: 3 })
        ]
      });
      const actorWithoutWeapon = createMockActor({
        items: [createMockItem("advantage", { id: "adv-1", cost: 3 })]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actorWithWeapon);
      const hash2 = calculateXpDataVersion(actorWithoutWeapon);

      // ASSERT
      expect(hash1).toBe(hash2);
    });
  });

  describe("complex scenarios", () => {
    it("should detect changes in complex actor with multiple data types", () => {
      // ARRANGE
      const baseActor = createMockActor({
        traits: { sta: 3, wil: 3, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
        voidRank: 3,
        skills: [
          createMockSkill({ id: "skill-1", rank: 3, trainedEmphases: ["Katana"] }),
          createMockSkill({ id: "skill-2", rank: 2 })
        ],
        items: [
          createMockItem("advantage", { id: "adv-1", cost: 3 }),
          createMockItem("kata", { id: "kata-1", cost: 5 })
        ]
      });

      const modifiedActor = createMockActor({
        traits: { sta: 4, wil: 3, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
        voidRank: 3,
        skills: [
          createMockSkill({ id: "skill-1", rank: 3, trainedEmphases: ["Katana"] }),
          createMockSkill({ id: "skill-2", rank: 2 })
        ],
        items: [
          createMockItem("advantage", { id: "adv-1", cost: 3 }),
          createMockItem("kata", { id: "kata-1", cost: 5 })
        ]
      });

      // ACT
      const hash1 = calculateXpDataVersion(baseActor);
      const hash2 = calculateXpDataVersion(modifiedActor);

      // ASSERT
      expect(hash1).not.toBe(hash2);
    });

    it("should return same hash for truly identical complex actors", () => {
      // ARRANGE
      const actor1 = createMockActor({
        traits: { sta: 3, wil: 4, str: 2, per: 3, ref: 4, awa: 3, agi: 4, int: 3 },
        voidRank: 3,
        skills: [
          createMockSkill({
            id: "skill-1",
            rank: 5,
            freeRanks: 1,
            trainedEmphases: ["Katana", "Wakizashi"]
          }),
          createMockSkill({ id: "skill-2", rank: 3 })
        ],
        items: [
          createMockItem("advantage", { id: "adv-1", cost: 3 }),
          createMockItem("disadvantage", { id: "dis-1", cost: -2 }),
          createMockItem("kata", { id: "kata-1", cost: 5 })
        ]
      });

      const actor2 = createMockActor({
        traits: { sta: 3, wil: 4, str: 2, per: 3, ref: 4, awa: 3, agi: 4, int: 3 },
        voidRank: 3,
        skills: [
          createMockSkill({
            id: "skill-1",
            rank: 5,
            freeRanks: 1,
            trainedEmphases: ["Katana", "Wakizashi"]
          }),
          createMockSkill({ id: "skill-2", rank: 3 })
        ],
        items: [
          createMockItem("advantage", { id: "adv-1", cost: 3 }),
          createMockItem("disadvantage", { id: "dis-1", cost: -2 }),
          createMockItem("kata", { id: "kata-1", cost: 5 })
        ]
      });

      // ACT
      const hash1 = calculateXpDataVersion(actor1);
      const hash2 = calculateXpDataVersion(actor2);

      // ASSERT
      expect(hash1).toBe(hash2);
    });
  });
});
