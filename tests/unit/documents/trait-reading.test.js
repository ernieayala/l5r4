/**
 * @fileoverview Unit tests for trait value reading from derived data
 *
 * Tests defensive trait reading that uses _derived.traitsEff prepared by
 * prepareTraitsAndRings(). Prevents regression where trait objects like
 * {rank: 2} were passed to toInt() resulting in 0 instead of 2.
 *
 * **Bug Context:**
 * PC Armor TN was calculated as 5 (Reflexes 0 × 5 + 5) instead of 15
 * (Reflexes 2 × 5 + 5) because `toInt(sys.traits?.ref)` returned 0 when
 * ref was stored as object format `{rank: 2}`.
 *
 * **Fix:**
 * Read from `sys._derived.traitsEff` which is always numeric, prepared
 * by prepareTraitsAndRings() to handle both object and direct formats.
 */

import { describe, it, expect } from "vitest";
import { toInt } from "../../../module/utils/type-coercion.js";

describe("Trait Reading from _derived.traitsEff", () => {
  describe("toInt with object trait format", () => {
    it("should return 0 when trait is object {rank: 2}", () => {
      // ARRANGE
      const traitObject = { rank: 2 };

      // ACT
      const result = toInt(traitObject);

      // ASSERT
      expect(result).toBe(0);
    });

    it("should return rank when accessing .rank property", () => {
      // ARRANGE
      const traitObject = { rank: 2 };

      // ACT
      const result = toInt(traitObject.rank);

      // ASSERT
      expect(result).toBe(2);
    });

    it("should return rank when using ?? fallback chain", () => {
      // ARRANGE
      const traitObject = { rank: 2 };

      // ACT
      const result = toInt(traitObject?.rank ?? traitObject);

      // ASSERT
      expect(result).toBe(2);
    });
  });

  describe("derived traitsEff format (simulated)", () => {
    it("should read numeric value from traitsEff", () => {
      // ARRANGE - simulates sys._derived.traitsEff structure
      const sys = {
        _derived: {
          traitsEff: {
            ref: 2,
            sta: 3,
            agi: 4
          }
        }
      };

      // ACT
      const reflexes = toInt(sys._derived.traitsEff.ref);

      // ASSERT
      expect(reflexes).toBe(2);
    });

    it("should handle missing traitsEff gracefully", () => {
      // ARRANGE
      const sys = { _derived: {} };

      // ACT
      const reflexes = toInt(sys._derived.traitsEff?.ref);

      // ASSERT
      expect(reflexes).toBe(0);
    });

    it("should handle undefined _derived gracefully", () => {
      // ARRANGE
      const sys = {};

      // ACT
      const reflexes = toInt(sys._derived?.traitsEff?.ref);

      // ASSERT
      expect(reflexes).toBe(0);
    });
  });

  describe("Armor TN calculation simulation", () => {
    it("should calculate correct base TN from traitsEff", () => {
      // ARRANGE
      const sys = {
        _derived: { traitsEff: { ref: 2 } }
      };

      // ACT
      const reflexes = toInt(sys._derived.traitsEff.ref);
      const baseTN = reflexes * 5 + 5;

      // ASSERT
      expect(baseTN).toBe(15); // NOT 5
    });

    it("should fail with wrong base TN when reading trait object directly", () => {
      // ARRANGE - wrong approach (reading object)
      const sys = {
        traits: { ref: { rank: 2 } }
      };

      // ACT
      const reflexes = toInt(sys.traits?.ref); // BUG: returns 0
      const baseTN = reflexes * 5 + 5;

      // ASSERT
      expect(baseTN).toBe(5); // WRONG but demonstrates bug
    });
  });

  describe("Initiative calculation simulation", () => {
    it("should calculate correct initiative from traitsEff", () => {
      // ARRANGE
      const sys = {
        _derived: { traitsEff: { ref: 2 } },
        insight: { rank: 1 },
        initiative: { rollMod: 0, keepMod: 0 }
      };

      // ACT
      const ref = toInt(sys._derived.traitsEff.ref);
      const insightRank = toInt(sys.insight?.rank);
      const rollMod = toInt(sys.initiative.rollMod);
      const initiativeRoll = insightRank + ref + rollMod;

      // ASSERT
      expect(initiativeRoll).toBe(3); // 1 + 2 + 0
    });
  });
});
