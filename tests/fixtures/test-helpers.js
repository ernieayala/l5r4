/**
 * @fileoverview Shared test helpers and utilities for unit tests
 * 
 * Provides common test utilities, fixtures, and helper functions
 * used across multiple test files.
 */

/**
 * Creates a mock actor data structure for testing
 * @param {Object} overrides - Properties to override in the default structure
 * @returns {Object} Mock actor data
 */
export function createMockActorData(overrides = {}) {
  return {
    name: 'Test Character',
    type: 'character',
    system: {
      rings: {
        earth: { value: 2 },
        air: { value: 2 },
        fire: { value: 2 },
        water: { value: 2 },
        void: { value: 2 }
      },
      traits: {
        stamina: { value: 2 },
        willpower: { value: 2 },
        reflexes: { value: 2 },
        awareness: { value: 2 },
        agility: { value: 2 },
        intelligence: { value: 2 },
        strength: { value: 2 },
        perception: { value: 2 }
      },
      wounds: {
        current: 0,
        healthy: 10,
        nicked: 14,
        grazed: 18,
        hurt: 22,
        injured: 26,
        crippled: 30,
        down: 34,
        out: 38
      },
      ...overrides
    }
  };
}

/**
 * Creates a mock item data structure for testing
 * @param {string} type - Item type (weapon, armor, skill, etc.)
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock item data
 */
export function createMockItemData(type, overrides = {}) {
  const baseData = {
    name: `Test ${type}`,
    type,
    system: {}
  };

  if (type === 'weapon') {
    baseData.system = {
      damage: { roll: '3k2', bonus: 0 },
      skill: 'kenjutsu',
      ...overrides.system
    };
  } else if (type === 'armor') {
    baseData.system = {
      tnBonus: 5,
      reduction: 3,
      ...overrides.system
    };
  } else if (type === 'skill') {
    baseData.system = {
      rank: 1,
      trait: 'agility',
      ...overrides.system
    };
  }

  return {
    ...baseData,
    ...overrides
  };
}

/**
 * Asserts that a value is within a range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean} True if within range
 */
export function isInRange(value, min, max) {
  return value >= min && value <= max;
}

/**
 * Creates test data for Ring values (1-10)
 * @returns {number[]} Array of valid Ring values
 */
export function getValidRingValues() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

/**
 * Creates test data for invalid Ring values
 * @returns {Array} Array of invalid values (including edge cases)
 */
export function getInvalidRingValues() {
  return [
    0,
    -1,
    11,
    100,
    null,
    undefined,
    NaN,
    Infinity,
    -Infinity,
    '',
    '5',
    {},
    []
  ];
}

/**
 * Creates test data for edge case numbers
 * @returns {Array} Array of edge case numbers
 */
export function getEdgeCaseNumbers() {
  return [
    0,
    -0,
    -1,
    -100,
    0.5,
    -0.5,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Infinity,
    -Infinity,
    NaN
  ];
}

/**
 * Creates test data for null/undefined variants
 * @returns {Array} Array of nullish values
 */
export function getNullishValues() {
  return [null, undefined];
}

/**
 * Creates test data for falsy values
 * @returns {Array} Array of falsy values
 */
export function getFalsyValues() {
  return [false, 0, -0, '', null, undefined, NaN];
}

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up multiple actors
 * @param {Array<Actor>} actors - Actors to delete
 * @returns {Promise<void>}
 */
export async function cleanupActors(actors) {
  for (const actor of actors) {
    if (actor) await actor.delete();
  }
}

/**
 * Clean up multiple items
 * @param {Array<Item>} items - Items to delete
 * @returns {Promise<void>}
 */
export async function cleanupItems(items) {
  for (const item of items) {
    if (item) await item.delete();
  }
}

/**
 * Get the most recent chat message
 * @returns {ChatMessage|null}
 */
export function getLastChatMessage() {
  return game.messages.contents[game.messages.contents.length - 1];
}

/**
 * Clear all chat messages (use carefully in tests)
 * @returns {Promise<void>}
 */
export async function clearChatMessages() {
  const messages = game.messages.contents;
  for (const msg of messages) {
    await msg.delete();
  }
}

/**
 * Assert roll formula contains expected dice
 * @param {Roll} roll - Roll object to check
 * @param {number} rolled - Expected rolled dice count
 * @param {number} kept - Expected kept dice count
 */
export function assertRollFormula(roll, rolled, kept) {
  const formula = roll.formula.toLowerCase();
  // Basic check - formula should contain "Xk" pattern
  const pattern = new RegExp(`${rolled}k${kept}`, 'i');
  if (!pattern.test(formula)) {
    throw new Error(`Expected formula to contain ${rolled}k${kept}, got: ${formula}`);
  }
}

/**
 * Create a test actor and ensure cleanup
 * @param {Function} testFn - Test function to run with actor
 * @param {Object} actorData - Actor creation data
 * @returns {Promise<void>}
 */
export async function withTestActor(testFn, actorData = {}) {
  let actor;
  try {
    actor = await Actor.create({
      name: 'Test Actor',
      type: 'pc',
      ...actorData
    });
    await testFn(actor);
  } finally {
    if (actor) await actor.delete();
  }
}

/**
 * Run test with automatic cleanup
 * @param {Function} testFn - Async test function
 * @returns {Promise<void>}
 */
export async function withCleanup(testFn) {
  const toCleanup = [];
  
  const cleanup = (doc) => {
    toCleanup.push(doc);
    return doc;
  };
  
  try {
    await testFn(cleanup);
  } finally {
    for (const doc of toCleanup.reverse()) {
      if (doc && doc.delete) await doc.delete();
    }
  }
}
