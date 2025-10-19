/**
 * Unit Tests: xp-calculations.js
 * 
 * Tests L5R4 XP cost calculations for trait advancement and creation bonus tracking.
 * Validates cost formulas, free effective ranks, and family/school bonus detection.
 * 
 * Test Priority: Tier 1 (Critical - Character advancement system)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateXpStepCostForTrait,
  getCreationFreeBonus,
  getCreationFreeBonusVoid
} from '../../../module/utils/xp-calculations.js';

describe('calculateXpStepCostForTrait', () => {
  describe('standard trait costs', () => {
    it('should cost 4 × rank for rank 1', () => {
      const cost = calculateXpStepCostForTrait(1, 0, 0);
      expect(cost).toBe(4); // 4 × 1
    });

    it('should cost 4 × rank for rank 3', () => {
      const cost = calculateXpStepCostForTrait(3, 0, 0);
      expect(cost).toBe(12); // 4 × 3
    });

    it('should cost 4 × rank for rank 5', () => {
      const cost = calculateXpStepCostForTrait(5, 0, 0);
      expect(cost).toBe(20); // 4 × 5
    });

    it('should cost 4 × rank for rank 10', () => {
      const cost = calculateXpStepCostForTrait(10, 0, 0);
      expect(cost).toBe(40); // 4 × 10
    });
  });

  describe('free effective ranks', () => {
    it('should reduce cost by free effective ranks', () => {
      // Rank 3 with +1 free effective rank
      // Cost = 4 × (3 + 1) = 16, but represents advancing to rank 3
      const cost = calculateXpStepCostForTrait(3, -1, 0);
      expect(cost).toBe(8); // 4 × (3 - 1) = 8
    });

    it('should handle family bonus (+1 free rank)', () => {
      // Family grants +1 Stamina, so rank 3 costs as rank 2
      const cost = calculateXpStepCostForTrait(3, -1, 0);
      expect(cost).toBe(8); // 4 × 2
    });

    it('should handle multiple free ranks', () => {
      const cost = calculateXpStepCostForTrait(5, -2, 0);
      expect(cost).toBe(12); // 4 × 3
    });

    it('should handle positive free effective ranks', () => {
      // Positive would increase cost (unusual but possible)
      const cost = calculateXpStepCostForTrait(3, 1, 0);
      expect(cost).toBe(16); // 4 × 4
    });
  });

  describe('discounts', () => {
    it('should apply negative discount', () => {
      const cost = calculateXpStepCostForTrait(3, 0, -4);
      expect(cost).toBe(8); // 12 - 4
    });

    it('should apply positive discount (penalty)', () => {
      const cost = calculateXpStepCostForTrait(3, 0, 4);
      expect(cost).toBe(16); // 12 + 4
    });

    it('should combine free ranks and discount', () => {
      const cost = calculateXpStepCostForTrait(3, -1, -2);
      expect(cost).toBe(6); // 4 × 2 - 2 = 6
    });
  });

  describe('minimum cost enforcement', () => {
    it('should never return negative cost', () => {
      const cost = calculateXpStepCostForTrait(1, 0, -10);
      expect(cost).toBe(0); // Min 0
    });

    it('should return 0 for heavy discount', () => {
      const cost = calculateXpStepCostForTrait(2, -1, -4);
      expect(cost).toBe(0); // 4 × 1 - 4 = 0
    });

    it('should return 0 for rank 0', () => {
      const cost = calculateXpStepCostForTrait(0, 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null rank', () => {
      const cost = calculateXpStepCostForTrait(null, 0, 0);
      expect(cost).toBe(0);
    });

    it('should handle undefined rank', () => {
      const cost = calculateXpStepCostForTrait(undefined, 0, 0);
      expect(cost).toBe(0);
    });

    it('should handle null free effective', () => {
      const cost = calculateXpStepCostForTrait(3, null, 0);
      expect(cost).toBe(12); // Treats null as 0
    });

    it('should handle undefined free effective', () => {
      const cost = calculateXpStepCostForTrait(3, undefined, 0);
      expect(cost).toBe(12); // Treats undefined as 0
    });

    it('should handle null discount', () => {
      const cost = calculateXpStepCostForTrait(3, 0, null);
      expect(cost).toBe(12); // Treats null as 0
    });

    it('should handle undefined discount', () => {
      const cost = calculateXpStepCostForTrait(3, 0, undefined);
      expect(cost).toBe(12); // Treats undefined as 0
    });

    it('should coerce string rank to number', () => {
      const cost = calculateXpStepCostForTrait("4", 0, 0);
      expect(cost).toBe(16);
    });

    it('should handle NaN rank', () => {
      const cost = calculateXpStepCostForTrait(NaN, 0, 0);
      expect(cost).toBe(0);
    });

    it('should handle negative rank', () => {
      const cost = calculateXpStepCostForTrait(-2, 0, 0);
      expect(cost).toBe(0); // Min 0 (negative × 4 would be negative)
    });

    it('should handle Infinity rank', () => {
      const cost = calculateXpStepCostForTrait(Infinity, 0, 0);
      expect(cost).toBe(Infinity); // 4 × Infinity
    });

    it('should handle fractional rank', () => {
      const cost = calculateXpStepCostForTrait(2.5, 0, 0);
      expect(cost).toBe(10); // 4 × 2.5
    });
  });
});

describe('getCreationFreeBonus', () => {
  beforeEach(() => {
    // Mock CONST.ACTIVE_EFFECT_MODES
    global.CONST = {
      ACTIVE_EFFECT_MODES: {
        ADD: 2
      }
    };

    // Mock globalThis.fromUuidSync
    global.fromUuidSync = vi.fn(() => null);
  });

  describe('Active Effects approach', () => {
    it('should detect trait bonus from Active Effect', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2, // ADD
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(1);
    });

    it('should sum multiple bonuses from different items', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            type: 'school',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(2);
    });

    it('should ignore non-transfer effects', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: false,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0); // transfer=false not counted
    });

    it('should ignore effects with wrong mode', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 1, // MULTIPLY, not ADD
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0); // Wrong mode
    });

    it('should only count matching trait key', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1
                  },
                  {
                    key: 'system.traits.wil',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(1); // Only sta counted
    });

    it('should handle fractional bonuses', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.agi',
                    mode: 2,
                    value: 0.5
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'agi');
      expect(bonus).toBe(0.5);
    });
  });

  describe('legacy approach', () => {
    it('should detect trait bonus from legacy system.trait property', () => {
      const actor = {
        items: [
          {
            type: 'family',
            system: {
              trait: 'sta',
              bonus: 1
            },
            effects: [] // No Active Effects
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(1);
    });

    it('should prefer Active Effects over legacy', () => {
      const actor = {
        items: [
          {
            type: 'family',
            system: {
              trait: 'sta',
              bonus: 2 // Legacy
            },
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1 // Active Effect
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(1); // Uses Active Effect, ignores legacy
    });

    it('should be case insensitive for legacy trait key', () => {
      const actor = {
        items: [
          {
            type: 'family',
            system: {
              trait: 'STA',
              bonus: 1
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(1);
    });

    it('should ignore legacy with non-finite bonus', () => {
      const actor = {
        items: [
          {
            type: 'family',
            system: {
              trait: 'sta',
              bonus: NaN
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0);
    });
  });

  describe('UUID-flagged items', () => {
    it('should resolve family item from UUID flag', () => {
      const familyItem = {
        type: 'family',
        uuid: 'Item.abc123',
        effects: [
          {
            transfer: true,
            changes: [
              {
                key: 'system.traits.ref',
                mode: 2,
                value: 1
              }
            ]
          }
        ]
      };

      global.fromUuidSync = vi.fn(() => familyItem);

      const actor = {
        items: [],
        getFlag: vi.fn((sys, key) => {
          if (key === 'familyItemUuid') return 'Item.abc123';
          return null;
        })
      };

      const bonus = getCreationFreeBonus(actor, 'ref');
      expect(bonus).toBe(1);
      expect(global.fromUuidSync).toHaveBeenCalledWith('Item.abc123');
    });

    it('should not double-count items in both flags and items array', () => {
      const familyItem = {
        type: 'family',
        uuid: 'Item.abc123',
        id: 'abc123',
        effects: [
          {
            transfer: true,
            changes: [
              {
                key: 'system.traits.sta',
                mode: 2,
                value: 1
              }
            ]
          }
        ]
      };

      global.fromUuidSync = vi.fn(() => familyItem);

      const actor = {
        items: [familyItem], // Same item in array
        getFlag: vi.fn((sys, key) => {
          if (key === 'familyItemUuid') return 'Item.abc123';
          return null;
        })
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(1); // Should only count once
    });
  });

  describe('edge cases', () => {
    it('should return 0 for null actor', () => {
      const bonus = getCreationFreeBonus(null, 'sta');
      expect(bonus).toBe(0);
    });

    it('should return 0 for undefined actor', () => {
      const bonus = getCreationFreeBonus(undefined, 'sta');
      expect(bonus).toBe(0);
    });

    it('should return 0 for actor without items', () => {
      const actor = {
        getFlag: () => null
      };
      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0);
    });

    it('should return 0 for empty items array', () => {
      const actor = {
        items: [],
        getFlag: () => null
      };
      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0);
    });

    it('should return 0 for no matching trait', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.wil',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0); // No sta bonus
    });

    it('should ignore non-family/school items', () => {
      const actor = {
        items: [
          {
            type: 'weapon',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0); // Only family/school count
    });

    it('should handle missing globalThis.fromUuidSync', () => {
      delete global.fromUuidSync;

      const actor = {
        items: [],
        getFlag: () => 'Item.abc123'
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0); // No error, just returns 0
    });

    it('should handle getFlag returning falsy', () => {
      const actor = {
        items: [],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0);
    });

    it('should handle errors gracefully', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: null // Will cause error when iterating
          }
        ],
        getFlag: () => null
      };

      // Should not throw, returns 0
      const bonus = getCreationFreeBonus(actor, 'sta');
      expect(bonus).toBe(0);
    });
  });
});

describe('getCreationFreeBonusVoid', () => {
  beforeEach(() => {
    global.CONST = {
      ACTIVE_EFFECT_MODES: {
        ADD: 2
      }
    };
    global.fromUuidSync = vi.fn(() => null);
  });

  describe('void ring bonuses', () => {
    it('should detect void ring bonus from system.rings.void.rank', () => {
      const actor = {
        items: [
          {
            type: 'school',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.rings.void.rank',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });

    it('should detect void ring bonus from system.rings.void.value', () => {
      const actor = {
        items: [
          {
            type: 'school',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.rings.void.value',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });

    it('should sum bonuses from rank and value keys', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.rings.void.rank',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            type: 'school',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.rings.void.value',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(2);
    });

    it('should use legacy system.trait=void approach', () => {
      const actor = {
        items: [
          {
            type: 'family',
            system: {
              trait: 'void',
              bonus: 1
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });

    it('should be case insensitive for legacy void', () => {
      const actor = {
        items: [
          {
            type: 'family',
            system: {
              trait: 'VOID',
              bonus: 1
            },
            effects: []
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for null actor', () => {
      const bonus = getCreationFreeBonusVoid(null);
      expect(bonus).toBe(0);
    });

    it('should return 0 for undefined actor', () => {
      const bonus = getCreationFreeBonusVoid(undefined);
      expect(bonus).toBe(0);
    });

    it('should return 0 for actor without items', () => {
      const actor = {
        getFlag: () => null
      };
      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(0);
    });

    it('should return 0 for no void bonuses', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: [
              {
                transfer: true,
                changes: [
                  {
                    key: 'system.traits.sta',
                    mode: 2,
                    value: 1
                  }
                ]
              }
            ]
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(0);
    });

    it('should handle errors gracefully', () => {
      const actor = {
        items: [
          {
            type: 'family',
            effects: null
          }
        ],
        getFlag: () => null
      };

      const bonus = getCreationFreeBonusVoid(actor);
      expect(bonus).toBe(0);
    });
  });
});
