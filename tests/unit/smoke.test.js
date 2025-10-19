/**
 * @fileoverview Smoke test to verify Vitest is configured correctly
 * 
 * Basic sanity checks to ensure the test framework is working.
 * If this passes, Vitest is set up correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  createMockActorData,
  createMockItemData,
  isInRange,
  getValidRingValues
} from '../fixtures/test-helpers.js';

describe('Vitest Setup Smoke Test', () => {
  describe('basic assertions', () => {
    it('should perform basic equality checks', () => {
      expect(1 + 1).toBe(2);
      expect('test').toBe('test');
      expect(true).toBe(true);
    });

    it('should perform deep equality checks', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      expect(obj1).toEqual(obj2);
    });

    it('should perform truthiness checks', () => {
      expect(true).toBeTruthy();
      expect(false).toBeFalsy();
      expect(null).toBeNull();
      expect(undefined).toBeUndefined();
    });

    it('should perform numeric comparisons', () => {
      expect(10).toBeGreaterThan(5);
      expect(5).toBeLessThan(10);
      expect(5).toBeGreaterThanOrEqual(5);
      expect(5).toBeLessThanOrEqual(5);
    });
  });

  describe('test helpers', () => {
    it('should create mock actor data', () => {
      // ARRANGE & ACT
      const mockActor = createMockActorData();

      // ASSERT
      expect(mockActor).toBeDefined();
      expect(mockActor.name).toBe('Test Character');
      expect(mockActor.type).toBe('character');
      expect(mockActor.system.rings.earth.value).toBe(2);
    });

    it('should create mock actor data with overrides', () => {
      // ARRANGE
      const overrides = {
        rings: {
          earth: { value: 5 }
        }
      };

      // ACT
      const mockActor = createMockActorData(overrides);

      // ASSERT
      expect(mockActor.system.rings.earth.value).toBe(5);
    });

    it('should create mock item data', () => {
      // ARRANGE & ACT
      const weapon = createMockItemData('weapon');

      // ASSERT
      expect(weapon).toBeDefined();
      expect(weapon.type).toBe('weapon');
      expect(weapon.system.damage).toBeDefined();
    });

    it('should check if value is in range', () => {
      // ARRANGE & ACT & ASSERT
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });

    it('should provide valid ring values', () => {
      // ARRANGE & ACT
      const validValues = getValidRingValues();

      // ASSERT
      expect(validValues).toHaveLength(10);
      expect(validValues).toContain(1);
      expect(validValues).toContain(10);
    });
  });

  describe('array operations', () => {
    it('should check array length', () => {
      const arr = [1, 2, 3];
      expect(arr).toHaveLength(3);
    });

    it('should check array contains item', () => {
      const arr = ['earth', 'air', 'fire', 'water', 'void'];
      expect(arr).toContain('earth');
      expect(arr).toContain('void');
    });
  });

  describe('object operations', () => {
    it('should check object has property', () => {
      const obj = { name: 'Test', value: 5 };
      expect(obj).toHaveProperty('name');
      expect(obj).toHaveProperty('value');
    });

    it('should match object structure', () => {
      const obj = { name: 'Test', value: 5, extra: 'data' };
      expect(obj).toMatchObject({ name: 'Test', value: 5 });
    });
  });

  describe('error handling', () => {
    it('should catch thrown errors', () => {
      const throwError = () => {
        throw new Error('Test error');
      };

      expect(throwError).toThrow();
      expect(throwError).toThrow('Test error');
      expect(throwError).toThrow(Error);
    });
  });
});
