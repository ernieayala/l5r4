/**
 * @fileoverview Actor test fixtures
 * Provides reusable actor creation functions for tests
 */

/**
 * Create a basic PC actor with default values
 * @param {Object} overrides - Optional property overrides
 * @returns {Promise<Actor>} Created actor
 */
export async function createTestPC(overrides = {}) {
  const defaultData = {
    name: "Test Character",
    type: "pc",
    system: {
      rings: {
        earth: 2,
        air: 2,
        fire: 2,
        water: 2,
        void: { rank: 2, value: 2 }
      },
      traits: {
        sta: 2,
        wil: 2,
        str: 2,
        per: 2,
        ref: 2,
        awa: 2,
        agi: 2,
        int: 2
      },
      honor: { rank: 2, points: 0 },
      glory: { rank: 1, points: 0 },
      status: { rank: 1, points: 0 },
      insight: { rank: 1, points: 0 },
      xp: 0
    }
  };

  // Deep merge overrides
  const actorData = foundry.utils.mergeObject(defaultData, overrides);
  return await Actor.create(actorData);
}

/**
 * Create a high-ranking samurai PC
 * @param {Object} overrides - Optional property overrides
 * @returns {Promise<Actor>} Created actor
 */
export async function createHighRankPC(overrides = {}) {
  const baseData = {
    name: "Elite Samurai",
    type: "pc",
    system: {
      rings: {
        earth: 5,
        air: 4,
        fire: 4,
        water: 4,
        void: { rank: 5, value: 5 }
      },
      traits: {
        sta: 6,
        wil: 7,
        str: 5,
        per: 5,
        ref: 5,
        awa: 5,
        agi: 6,
        int: 5
      },
      insight: { rank: 5, points: 250 },
      xp: 200
    }
  };

  return await createTestPC(foundry.utils.mergeObject(baseData, overrides));
}

/**
 * Create a wounded PC
 * @param {number} wounds - Current wound total (suffered damage)
 * @param {Object} overrides - Optional property overrides
 * @returns {Promise<Actor>} Created actor
 */
export async function createWoundedPC(wounds, overrides = {}) {
  const baseData = {
    system: {
      rings: { earth: 3 },
      suffered: wounds // Use 'suffered' not 'wounds.value' - suffered triggers wound penalty calculation
    }
  };

  return await createTestPC(foundry.utils.mergeObject(baseData, overrides));
}

/**
 * Create a basic NPC actor
 * @param {Object} overrides - Optional property overrides
 * @returns {Promise<Actor>} Created actor
 */
export async function createTestNPC(overrides = {}) {
  const defaultData = {
    name: "Test NPC",
    type: "npc",
    system: {
      rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 0 } },
      traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
      nrWoundLvls: 3,
      attack1: { roll: 3, keep: 2, type: "" },
      damage1: { roll: 2, keep: 2, type: "" },
      fear: { rank: 0 }
    }
  };

  const actorData = foundry.utils.mergeObject(defaultData, overrides);
  return await Actor.create(actorData);
}

/**
 * Create a fearsome NPC (with Fear rating)
 * @param {number} fearRank - Fear rank
 * @param {Object} overrides - Optional property overrides
 * @returns {Promise<Actor>} Created actor
 */
export async function createFearsomeNPC(fearRank, overrides = {}) {
  const baseData = {
    name: "Fearsome Creature",
    system: {
      fear: { rank: fearRank },
      rings: { earth: 4 }
    }
  };

  return await createTestNPC(foundry.utils.mergeObject(baseData, overrides));
}

/**
 * Create a PC with specific skills
 * @param {Array<Object>} skills - Skill definitions
 * @param {Object} overrides - Optional actor overrides
 * @returns {Promise<Actor>} Created actor with skills
 */
export async function createPCWithSkills(skills, overrides = {}) {
  const actor = await createTestPC(overrides);

  if (skills && skills.length > 0) {
    await actor.createEmbeddedDocuments("Item", skills);
  }

  return actor;
}

/**
 * Create a shugenja PC (spell caster)
 * @param {Object} overrides - Optional property overrides
 * @returns {Promise<Actor>} Created actor
 */
export async function createShugenja(overrides = {}) {
  const baseData = {
    name: "Test Shugenja",
    system: {
      // Set traits to calculate rings (Ring = min(trait1, trait2))
      // Air Ring = min(ref, awa), Earth = min(sta, wil)
      // Fire Ring = min(agi, int), Water = min(str, per)
      traits: {
        sta: 3,
        wil: 3, // Earth = 3
        ref: 4,
        awa: 4, // Air = 4
        agi: 4,
        int: 4, // Fire = 4
        str: 3,
        per: 3 // Water = 3
      },
      rings: {
        void: { rank: 3, value: 3 }
      },
      spellSlots: {
        earth: 3,
        air: 4,
        fire: 4,
        water: 3,
        void: 3
      }
    }
  };

  return await createTestPC(foundry.utils.mergeObject(baseData, overrides));
}
