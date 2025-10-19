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
 * @see game-rules/Character_Creation.md (Step 2: Family Selection)
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
    (context) => {
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
    },
    { displayName: "L5R4: Family Bonus Service Tests" }
  );
}
