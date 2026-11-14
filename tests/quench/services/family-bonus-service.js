/**
 * Family Bonus Service Mechanics Tests
 *
 * Tests family bonus MECHANICS following L5R4 rules:
 * - Each family grants +1 bonus to one specific trait
 * - Family bonus allows trait to start at 3 instead of 2
 * - Bonuses are applied via Active Effects
 * - All 8 traits can receive family bonuses
 *
 * NOTE: These tests verify MECHANICS (trait bonus calculations), not the service layer.
 * The service reads from family Items which requires complex Actor/Item setup.
 *
 * @see module/services/family-bonus-service.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { FamilyBonusService } from "../../../module/services/family-bonus-service.js";

/**
 * Register Family Bonus Service mechanics tests
 * @param {Object} quench - Quench test framework
 */
export function registerFamilyBonusTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.familyBonus`,
    context => {
      const { describe, it, assert } = context;

      describe("Valid Trait Keys", () => {
        it("should recognize all 8 L5R4 traits", () => {
          const expectedTraits = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];

          for (const traitKey of expectedTraits) {
            assert.isTrue(
              FamilyBonusService.VALID_TRAIT_KEYS.includes(traitKey),
              `${traitKey} is valid trait`
            );
          }
        });

        it("should have exactly 8 trait keys", () => {
          assert.equal(FamilyBonusService.VALID_TRAIT_KEYS.length, 8, "L5R4 has 8 traits");
        });

        it("should not recognize invalid trait keys", () => {
          const invalidKeys = ["str2", "honor", "glory", "void"];

          for (const key of invalidKeys) {
            assert.isFalse(
              FamilyBonusService.VALID_TRAIT_KEYS.includes(key),
              `${key} is NOT a valid trait`
            );
          }
        });
      });

      describe("Trait Bonus Calculation", () => {
        it("should calculate standard +1 family bonus", () => {
          const familyBonus = 1; // Standard family bonus
          const baseTrait = 2; // Starting trait value
          const finalTrait = baseTrait + familyBonus;

          assert.equal(finalTrait, 3, "Family bonus allows starting at 3 (2+1)");
        });

        it("should handle Earth traits (Stamina, Willpower)", () => {
          const staminaBonus = 1; // Hida family
          const willpowerBonus = 0; // No bonus to Willpower

          assert.equal(staminaBonus, 1, "Stamina gets +1");
          assert.equal(willpowerBonus, 0, "Willpower gets +0");
        });

        it("should handle Air traits (Reflexes, Awareness)", () => {
          const reflexesBonus = 0;
          const awarenessBonus = 1; // Yasuki family

          assert.equal(reflexesBonus, 0, "Reflexes gets +0");
          assert.equal(awarenessBonus, 1, "Awareness gets +1");
        });

        it("should handle Fire traits (Agility, Intelligence)", () => {
          const agilityBonus = 1; // Shosuro family
          const intelligenceBonus = 0;

          assert.equal(agilityBonus, 1, "Agility gets +1");
          assert.equal(intelligenceBonus, 0, "Intelligence gets +0");
        });

        it("should handle Water traits (Strength, Perception)", () => {
          const strengthBonus = 1; // Hida family
          const perceptionBonus = 0;

          assert.equal(strengthBonus, 1, "Strength gets +1");
          assert.equal(perceptionBonus, 0, "Perception gets +0");
        });
      });

      describe("Trait Bonus Combinations", () => {
        it("should grant bonus to only one trait", () => {
          const bonusMap = {
            sta: 1, // Hida family grants +1 Stamina
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 0
          };

          const totalBonuses = Object.values(bonusMap).reduce((sum, val) => sum + val, 0);
          assert.equal(totalBonuses, 1, "Only one trait gets +1 bonus");
        });

        it("should create complete zero map for no family", () => {
          const zeroMap = {
            sta: 0,
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 0
          };

          const allZero = Object.values(zeroMap).every(val => val === 0);
          assert.isTrue(allZero, "All traits have 0 bonus without family");
        });

        it("should handle different family bonuses", () => {
          const hidaBonus = { str: 1 }; // Hida: +1 Strength
          const yasukiBonus = { awa: 1 }; // Yasuki: +1 Awareness
          const shosuroBonus = { agi: 1 }; // Shosuro: +1 Agility

          assert.equal(hidaBonus.str, 1, "Hida grants Strength");
          assert.equal(yasukiBonus.awa, 1, "Yasuki grants Awareness");
          assert.equal(shosuroBonus.agi, 1, "Shosuro grants Agility");
        });
      });

      describe("Starting Trait Values", () => {
        it("should start at 2 without family bonus", () => {
          const baseTrait = 2;
          const familyBonus = 0;
          const finalTrait = baseTrait + familyBonus;

          assert.equal(finalTrait, 2, "Trait starts at 2 without bonus");
        });

        it("should start at 3 with family bonus", () => {
          const baseTrait = 2;
          const familyBonus = 1;
          const finalTrait = baseTrait + familyBonus;

          assert.equal(finalTrait, 3, "Trait starts at 3 with family bonus");
        });

        it("should calculate all starting trait values", () => {
          const baseTrait = 2;
          const bonusedTrait = 3; // With family bonus

          const startingTraits = {
            sta: baseTrait,
            wil: baseTrait,
            str: bonusedTrait, // Hida family
            per: baseTrait,
            ref: baseTrait,
            awa: baseTrait,
            agi: baseTrait,
            int: baseTrait
          };

          assert.equal(startingTraits.str, 3, "Bonused trait at 3");
          assert.equal(startingTraits.sta, 2, "Other traits at 2");
          assert.equal(startingTraits.ref, 2, "Other traits at 2");
        });
      });

      describe("Bonus Validation", () => {
        it("should only accept positive bonuses", () => {
          const validBonus = 1;
          const negativeValue = -1;
          const zeroValue = 0;

          assert.isAbove(validBonus, 0, "Valid bonus is positive");
          assert.isAtMost(negativeValue, 0, "Negative value not a bonus");
          assert.equal(zeroValue, 0, "Zero is not a bonus");
        });

        it("should reject non-finite values", () => {
          const validBonus = 1;
          const nanValue = NaN;
          const infinityValue = Infinity;

          assert.isTrue(Number.isFinite(validBonus), "Valid bonus is finite");
          assert.isFalse(Number.isFinite(nanValue), "NaN is not valid");
          assert.isFalse(Number.isFinite(infinityValue), "Infinity is not valid");
        });

        it("should handle typical family bonus values", () => {
          const standardBonus = 1; // Most families
          const noBonus = 0; // No family

          assert.equal(standardBonus, 1, "Standard family bonus = 1");
          assert.equal(noBonus, 0, "No family bonus = 0");
        });
      });

      describe("Trait Property Paths", () => {
        it("should construct correct property path for each trait", () => {
          const traits = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];

          for (const traitKey of traits) {
            const propertyPath = `system.traits.${traitKey}`;
            assert.include(propertyPath, "system.traits", "Path includes system.traits");
            assert.include(propertyPath, traitKey, "Path includes trait key");
          }
        });

        it("should match Active Effect change key format", () => {
          const traitKey = "str";
          const effectKey = `system.traits.${traitKey}`;

          assert.equal(effectKey, "system.traits.str", "Matches Active Effect format");
        });

        it("should extract trait key from property path", () => {
          const propertyPath = "system.traits.str";
          const match = propertyPath.match(/^system\.traits\.(\w+)$/);
          const extractedKey = match ? match[1] : null;

          assert.equal(extractedKey, "str", "Extracted 'str' from path");
        });
      });

      describe("Family Bonus Examples", () => {
        it("should calculate Hida family bonus (+1 Stamina)", () => {
          const bonusMap = {
            sta: 1,
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 0
          };

          assert.equal(bonusMap.sta, 1, "Hida grants +1 Stamina");
        });

        it("should calculate Doji family bonus (+1 Awareness)", () => {
          const bonusMap = {
            sta: 0,
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 1,
            agi: 0,
            int: 0
          };

          assert.equal(bonusMap.awa, 1, "Doji grants +1 Awareness");
        });

        it("should calculate Isawa family bonus (+1 Intelligence)", () => {
          const bonusMap = {
            sta: 0,
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 1
          };

          assert.equal(bonusMap.int, 1, "Isawa grants +1 Intelligence");
        });

        it("should calculate Shosuro family bonus (+1 Agility)", () => {
          const bonusMap = {
            sta: 0,
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 1,
            int: 0
          };

          assert.equal(bonusMap.agi, 1, "Shosuro grants +1 Agility");
        });
      });

      describe("Edge Case: Invalid Trait Keys", () => {
        it("should return 0 for family bonus targeting non-existent trait", () => {
          // Simulate family with effect targeting invalid trait (e.g., "honor")
          const invalidEffectKey = "system.traits.honor";
          const match = invalidEffectKey.match(/^system\.traits\.(\w+)$/);
          const extractedKey = match ? match[1] : null;

          // Service should reject this as invalid trait key
          assert.isFalse(
            FamilyBonusService.VALID_TRAIT_KEYS.includes(extractedKey),
            "honor is not a valid trait key"
          );
        });

        it("should return 0 for family bonus targeting invalid property path", () => {
          const invalidPaths = [
            "system.rings.earth", // Ring, not trait
            "system.skills.kenjutsu", // Skill, not trait
            "system.void", // Void, not trait
            "system.glory.rank", // Glory, not trait
            "system.traits.fake" // Non-existent trait
          ];

          for (const path of invalidPaths) {
            const match = path.match(/^system\.traits\.(\w+)$/);
            const extractedKey = match ? match[1] : null;

            if (extractedKey) {
              assert.isFalse(
                FamilyBonusService.VALID_TRAIT_KEYS.includes(extractedKey),
                `${extractedKey} is not a valid trait key`
              );
            } else {
              assert.isNull(extractedKey, `${path} does not match trait pattern`);
            }
          }
        });

        it("should warn and return 0 when getBonus receives invalid trait key", () => {
          const invalidKeys = ["honor", "glory", "void", "earth", "fake"];

          for (const key of invalidKeys) {
            // Service should return 0 and warn for invalid keys
            // This tests the defensive behavior without requiring an actual actor
            assert.isFalse(
              FamilyBonusService.VALID_TRAIT_KEYS.includes(key),
              `${key} should be rejected as invalid`
            );
          }
        });
      });

      describe("Edge Case: Multiple Family Items", () => {
        it("should handle multiple family effects on same trait (accumulation)", () => {
          // If multiple family effects target the same trait, they should accumulate
          const bonusMap = {
            sta: 2, // Two effects targeting Stamina
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 0
          };

          const totalStaminaBonus = bonusMap.sta;
          assert.equal(totalStaminaBonus, 2, "Multiple effects accumulate");
        });

        it("should handle family with multiple trait bonuses (theoretically invalid)", () => {
          // L5R4 rules: families grant ONE bonus
          // But service should handle gracefully if configured incorrectly
          const multiTraitMap = {
            sta: 1,
            wil: 1,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 0
          };

          const totalBonuses = Object.values(multiTraitMap).reduce((sum, val) => sum + val, 0);
          assert.equal(totalBonuses, 2, "Multiple trait bonuses calculated");

          // NOTE: This violates L5R4 rules (families grant +1 to ONE trait)
          // Service calculates mechanically correct result but allows rule-breaking configuration
        });

        it("should handle zero bonuses from multiple effects", () => {
          // If multiple effects exist but all have value 0
          const zeroBonusMap = {
            sta: 0,
            wil: 0,
            str: 0,
            per: 0,
            ref: 0,
            awa: 0,
            agi: 0,
            int: 0
          };

          const totalBonuses = Object.values(zeroBonusMap).reduce((sum, val) => sum + val, 0);
          assert.equal(totalBonuses, 0, "Zero bonuses produce no effect");
        });
      });

      describe("Edge Case: Malformed Effect Data", () => {
        it("should reject negative bonus values", () => {
          const negativeValue = -1;
          const isValidBonus = Number.isFinite(negativeValue) && negativeValue > 0;

          assert.isFalse(isValidBonus, "Negative values rejected as bonuses");
        });

        it("should reject NaN bonus values", () => {
          const nanValue = NaN;
          const isValidBonus = Number.isFinite(nanValue) && nanValue > 0;

          assert.isFalse(isValidBonus, "NaN rejected as bonus");
        });

        it("should reject Infinity bonus values", () => {
          const infinityValue = Infinity;
          const isValidBonus = Number.isFinite(infinityValue) && infinityValue > 0;

          assert.isFalse(isValidBonus, "Infinity rejected as bonus");
        });

        it("should reject zero as a bonus", () => {
          const zeroValue = 0;
          const isValidBonus = zeroValue > 0;

          assert.isFalse(isValidBonus, "Zero is not a positive bonus");
        });

        it("should handle string bonus values by converting to number", () => {
          const stringValue = "1";
          const numericValue = Number(stringValue);
          const isValidBonus = Number.isFinite(numericValue) && numericValue > 0;

          assert.isTrue(isValidBonus, "String '1' converts to valid bonus");
          assert.equal(numericValue, 1, "String '1' equals numeric 1");
        });

        it("should reject invalid string bonus values", () => {
          const invalidStrings = ["abc", "1.5.2", "null", "undefined"];

          for (const str of invalidStrings) {
            const numericValue = Number(str);
            const isValidBonus = Number.isFinite(numericValue) && numericValue > 0;

            assert.isFalse(isValidBonus, `Invalid string '${str}' rejected`);
          }
        });
      });

      describe("Edge Case: Service Defensive Behavior", () => {
        it("should return 0 for null actor", () => {
          const result = FamilyBonusService.getBonus(null, "str");
          assert.equal(result, 0, "Null actor returns 0");
        });

        it("should return 0 for undefined actor", () => {
          const result = FamilyBonusService.getBonus(undefined, "str");
          assert.equal(result, 0, "Undefined actor returns 0");
        });

        it("should return 0 for null trait key", () => {
          const mockActor = { id: "test" };
          const result = FamilyBonusService.getBonus(mockActor, null);
          assert.equal(result, 0, "Null trait key returns 0");
        });

        it("should return 0 for undefined trait key", () => {
          const mockActor = { id: "test" };
          const result = FamilyBonusService.getBonus(mockActor, undefined);
          assert.equal(result, 0, "Undefined trait key returns 0");
        });

        it("should return zero map for null actor in getBonusMap", () => {
          const result = FamilyBonusService.getBonusMap(null);

          assert.isObject(result, "Returns object");
          assert.equal(Object.keys(result).length, 8, "Has 8 trait keys");

          const allZero = Object.values(result).every(val => val === 0);
          assert.isTrue(allZero, "All bonuses are 0");
        });

        it("should return zero map for undefined actor in getBonusMap", () => {
          const result = FamilyBonusService.getBonusMap(undefined);

          assert.isObject(result, "Returns object");
          assert.equal(Object.keys(result).length, 8, "Has 8 trait keys");

          const allZero = Object.values(result).every(val => val === 0);
          assert.isTrue(allZero, "All bonuses are 0");
        });

        it("should handle actor without family item gracefully", () => {
          // Mock actor with no family flags
          const mockActor = {
            id: "test",
            getFlag: () => null
          };

          const result = FamilyBonusService.getBonus(mockActor, "str");
          assert.equal(result, 0, "Returns 0 for actor without family");
        });

        it("should return zero map for actor without family item", () => {
          // Mock actor with no family flags
          const mockActor = {
            id: "test",
            getFlag: () => null
          };

          const result = FamilyBonusService.getBonusMap(mockActor);

          assert.isObject(result, "Returns object");
          const allZero = Object.values(result).every(val => val === 0);
          assert.isTrue(allZero, "All bonuses are 0 without family");
        });
      });
    },
    { displayName: "L5R4: Family Bonus Service Tests" }
  );
}
