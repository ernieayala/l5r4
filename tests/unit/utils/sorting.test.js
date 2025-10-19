/**
 * Unit Tests: sorting.js
 * 
 * Tests sort preference management and multi-column sorting utilities.
 * Validates user preference storage/retrieval and locale-aware sorting.
 * 
 * Test Priority: Tier 2 (Important - UI sorting functionality)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSortPref,
  setSortPref,
  sortWithPref
} from '../../../module/utils/sorting.js';

describe('getSortPref', () => {
  beforeEach(() => {
    global.game = {
      user: {
        flags: {
          'l5r4-enhanced': {
            sortByActor: {}
          }
        }
      }
    };
  });

  describe('stored preferences', () => {
    it('should retrieve stored preference', () => {
      global.game.user.flags['l5r4-enhanced'].sortByActor = {
        'actor123': {
          'skills': { key: 'rank', dir: 'desc' }
        }
      };

      const pref = getSortPref('actor123', 'skills', ['name', 'rank'], 'name');
      expect(pref.key).toBe('rank');
      expect(pref.dir).toBe('desc');
    });

    it('should handle multiple actors and scopes', () => {
      global.game.user.flags['l5r4-enhanced'].sortByActor = {
        'actor1': {
          'skills': { key: 'rank', dir: 'desc' }
        },
        'actor2': {
          'skills': { key: 'name', dir: 'asc' }
        }
      };

      const pref1 = getSortPref('actor1', 'skills', ['name', 'rank'], 'name');
      const pref2 = getSortPref('actor2', 'skills', ['name', 'rank'], 'name');

      expect(pref1.key).toBe('rank');
      expect(pref2.key).toBe('name');
    });
  });

  describe('default values and validation', () => {
    it('should return default key when no preference stored', () => {
      const pref = getSortPref('actor123', 'skills', ['name', 'rank'], 'name');
      expect(pref.key).toBe('name');
      expect(pref.dir).toBe('asc');
    });

    it('should reject invalid key and use default', () => {
      global.game.user.flags['l5r4-enhanced'].sortByActor = {
        'actor123': {
          'skills': { key: 'invalid', dir: 'asc' }
        }
      };

      const pref = getSortPref('actor123', 'skills', ['name', 'rank'], 'name');
      expect(pref.key).toBe('name');
    });

    it('should default direction to asc', () => {
      global.game.user.flags['l5r4-enhanced'].sortByActor = {
        'actor123': {
          'skills': { key: 'rank' }
        }
      };

      const pref = getSortPref('actor123', 'skills', ['name', 'rank'], 'name');
      expect(pref.dir).toBe('asc');
    });
  });

  describe('edge cases', () => {
    it('should handle missing game.user', () => {
      global.game = {};

      const pref = getSortPref('actor123', 'skills', ['name', 'rank'], 'name');
      expect(pref.key).toBe('name');
      expect(pref.dir).toBe('asc');
    });

    it('should handle missing flags', () => {
      global.game = {
        user: {}
      };

      const pref = getSortPref('actor123', 'skills', ['name', 'rank'], 'name');
      expect(pref.key).toBe('name');
      expect(pref.dir).toBe('asc');
    });
  });
});

describe('setSortPref', () => {
  beforeEach(() => {
    global.game = {
      user: {
        getFlag: vi.fn(async () => ({})),
        setFlag: vi.fn(async () => {})
      }
    };
  });

  describe('setting and toggle behavior', () => {
    it('should set preference with ascending direction', async () => {
      await setSortPref('actor123', 'skills', 'rank');

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        'l5r4-enhanced',
        'sortByActor',
        expect.objectContaining({
          'actor123': expect.objectContaining({
            'skills': { key: 'rank', dir: 'asc' }
          })
        })
      );
    });

    it('should toggle from asc to desc on second click', async () => {
      global.game.user.getFlag = vi.fn(async () => ({
        'actor123': {
          'skills': { key: 'rank', dir: 'asc' }
        }
      }));

      await setSortPref('actor123', 'skills', 'rank');

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        'l5r4-enhanced',
        'sortByActor',
        expect.objectContaining({
          'actor123': {
            'skills': { key: 'rank', dir: 'desc' }
          }
        })
      );
    });

    it('should reset to asc when changing key', async () => {
      global.game.user.getFlag = vi.fn(async () => ({
        'actor123': {
          'skills': { key: 'rank', dir: 'desc' }
        }
      }));

      await setSortPref('actor123', 'skills', 'name');

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        'l5r4-enhanced',
        'sortByActor',
        expect.objectContaining({
          'actor123': {
            'skills': { key: 'name', dir: 'asc' }
          }
        })
      );
    });

    it('should preserve other actors and scopes', async () => {
      global.game.user.getFlag = vi.fn(async () => ({
        'other-actor': {
          'skills': { key: 'name', dir: 'desc' }
        }
      }));

      await setSortPref('actor123', 'skills', 'rank');

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        'l5r4-enhanced',
        'sortByActor',
        expect.objectContaining({
          'other-actor': {
            'skills': { key: 'name', dir: 'desc' }
          },
          'actor123': {
            'skills': { key: 'rank', dir: 'asc' }
          }
        })
      );
    });
  });
});

describe('sortWithPref', () => {
  describe('basic sorting', () => {
    it('should sort by name ascending', () => {
      const items = [
        { name: 'Charlie' },
        { name: 'Alice' },
        { name: 'Bob' }
      ];

      const columns = {
        name: (i) => i.name
      };

      const pref = { key: 'name', dir: 'asc' };

      const result = sortWithPref(items, columns, pref);

      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('should sort by name descending', () => {
      const items = [
        { name: 'Alice' },
        { name: 'Charlie' },
        { name: 'Bob' }
      ];

      const columns = {
        name: (i) => i.name
      };

      const pref = { key: 'name', dir: 'desc' };

      const result = sortWithPref(items, columns, pref);

      expect(result[0].name).toBe('Charlie');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Alice');
    });

    it('should sort by numeric value', () => {
      const items = [
        { rank: 3 },
        { rank: 1 },
        { rank: 2 }
      ];

      const columns = {
        rank: (i) => i.rank
      };

      const pref = { key: 'rank', dir: 'asc' };

      const result = sortWithPref(items, columns, pref);

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
    });
  });

  describe('tiebreaker sorting', () => {
    it('should use secondary column for tiebreaks', () => {
      const items = [
        { rank: 2, name: 'Charlie' },
        { rank: 2, name: 'Alice' },
        { rank: 2, name: 'Bob' }
      ];

      const columns = {
        rank: (i) => i.rank,
        name: (i) => i.name
      };

      const pref = { key: 'rank', dir: 'asc' };

      const result = sortWithPref(items, columns, pref);

      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('should apply direction only to primary column', () => {
      const items = [
        { rank: 1, name: 'Charlie' },
        { rank: 3, name: 'Alice' },
        { rank: 2, name: 'Bob' }
      ];

      const columns = {
        rank: (i) => i.rank,
        name: (i) => i.name
      };

      const pref = { key: 'rank', dir: 'desc' };

      const result = sortWithPref(items, columns, pref);

      expect(result[0].rank).toBe(3);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const items = [];
      const columns = { name: (i) => i.name };
      const pref = { key: 'name', dir: 'asc' };

      const result = sortWithPref(items, columns, pref);

      expect(result).toEqual([]);
    });

    it('should handle null values in numeric comparison', () => {
      const items = [
        { rank: 3 },
        { rank: null },
        { rank: 1 }
      ];

      const columns = {
        rank: (i) => i.rank
      };

      const pref = { key: 'rank', dir: 'asc' };

      const result = sortWithPref(items, columns, pref);

      expect(result[0].rank).toBeNull();
      expect(result[1].rank).toBe(1);
      expect(result[2].rank).toBe(3);
    });

    it('should mutate original array', () => {
      const items = [
        { name: 'Charlie' },
        { name: 'Alice' }
      ];

      const columns = { name: (i) => i.name };
      const pref = { key: 'name', dir: 'asc' };

      const result = sortWithPref(items, columns, pref);

      expect(result).toBe(items);
      expect(items[0].name).toBe('Alice');
    });
  });
});
