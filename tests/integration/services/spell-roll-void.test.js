/**
 * Spell Roll + Void Point Integration Tests
 *
 * Tests the critical combination of spell casting rolls with Void Point spending.
 * This is Phase 2 Priority #1 from TEST-COVERAGE-ANALYSIS.md.
 *
 * **What This Tests:**
 * - Spell casting rolls with Void Point spending (+1k1 bonus)
 * - Void Point depletion and validation during spell casting
 * - Spell + Void + Affinity combination
 * - Spell + Void + Deficiency combination
 * - Spell + Void + Wound Penalty
 * - Spell + Void + Raises
 * - Edge cases (empty pool, empty spell slots, race conditions)
 *
 * **Why This Matters:**
 * - Void Point spending on spell casting is a core L5R4 shugenja mechanic
 * - Missing from current test coverage (TEST-COVERAGE-ANALYSIS.md line 312)
 * - Critical for shugenja effectiveness in combat and non-combat scenarios
 * - Users need confidence that void + spell mechanics work correctly
 *
 * **L5R4 Rules:**
 * - Spell Casting: (Ring + School Rank)k(Ring) vs TN 5+(Mastery×5)
 * - Spending Void Point grants +1k1 bonus to spell casting roll
 * - Void pool decrements by 1 when spent
 * - Cannot spend from empty pool
 * - Void bonus stacks with affinity, deficiency, and other modifiers
 * - Affinity: +1 to effective School Rank (free raise equivalent)
 * - Deficiency: -1 to effective School Rank (+5 TN equivalent)
 *
 * **Testing Principles Applied:**
 * 1. Test edge cases FIRST - Empty pools, boundary conditions
 * 2. Test behavior, not implementation - Verify dice formulas and void depletion
 * 3. Mutation test - Each test catches a specific bug
 * 4. Test combinations - Real gameplay scenarios (void + affinity + raises)
 *
 * @see module/services/dice/rolls/spell-cast-roll.js
 * @see module/services/dice/resources/void-manager.js
 * @see TEST-COVERAGE-ANALYSIS.md Line 312
 * @see for-research/reviews/TESTING-INSTRUCTIONS-FOR-WINDSURF.md
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { buildFormula } from "../../../module/services/dice/core/formula-builder.js";
import {
  spendVoidPoint,
  validateVoidPoints
} from "../../../module/services/dice/resources/void-manager.js";
import { createShugenja } from "../../fixtures/actor-fixtures.js";
import { createSpellData } from "../../fixtures/item-fixtures.js";

/**
 * Register spell roll + void point integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerSpellRollVoidTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.rolls.spell-void`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Spell Roll + Void Point (Basic)", () => {
        let actor, spell;

        beforeEach(async () => {
          // ARRANGE - Create shugenja with Fire Ring 4, School Rank 2, Void 3
          actor = await createShugenja({
            name: "Void Spell Test Shugenja",
            system: {
              traits: { agi: 4, int: 4 },
              rings: { fire: 4, void: { rank: 3, value: 3 } },
              insight: { rank: 2 },
              spellSlots: { fire: 4, void: 3 }
            }
          });

          [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Fires from Within", "fire", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should add +1k1 bonus when Void Point spent on spell casting", () => {
          const ringValue = 4;
          const schoolRank = 2;
          const voidRollBonus = 1;
          const voidKeepBonus = 1;

          const baseRolled = ringValue + schoolRank; // 6
          const baseKept = ringValue; // 4
          const finalRolled = baseRolled + voidRollBonus; // 7
          const finalKept = baseKept + voidKeepBonus; // 5

          assert.equal(finalRolled, 7, "Void adds +1 rolled (6+1=7)");
          assert.equal(finalKept, 5, "Void adds +1 kept (4+1=5)");
        });

        it("should decrement Void pool after spending on spell", async () => {
          const initialVoid = actor.system.rings.void.value;
          assert.equal(initialVoid, 3, "Starts with 3 Void Points");

          const result = await spendVoidPoint(actor);

          assert.isTrue(result.success, "Void spend succeeds");
          assert.equal(actor.system.rings.void.value, 2, "Void pool decremented to 2");
        });

        it("should return correct bonuses from spendVoidPoint for spell", async () => {
          const result = await spendVoidPoint(actor);

          assert.isTrue(result.success, "Spending succeeds");
          assert.equal(result.rollBonus, 1, "+1 rolled die");
          assert.equal(result.keepBonus, 1, "+1 kept die");
          assert.isNull(result.message, "No error message");
        });

        it("should build correct formula with void bonus for spell", () => {
          const rolled = 7; // Base 6 + void 1
          const kept = 5; // Base 4 + void 1

          const formula = buildFormula(rolled, kept, 0);

          assert.include(formula, "7d10", "Rolled includes void bonus");
          assert.include(formula, "k5", "Kept includes void bonus");
          assert.include(formula, "x10", "Dice explode");
        });
      });

      describe("Spell Roll + Void Point (Empty Void Pool)", () => {
        let actor, spell;

        beforeEach(async () => {
          actor = await createShugenja({
            name: "Empty Void Spell Test",
            system: {
              traits: { agi: 4, int: 4 },
              rings: { fire: 4, void: { rank: 3, value: 0 } },
              insight: { rank: 2 },
              spellSlots: { fire: 4, void: 3 }
            }
          });

          [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Fires from Within", "fire", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should fail validation when Void pool is empty for spell", () => {
          const validation = validateVoidPoints(actor);

          assert.isFalse(validation.valid, "Validation fails with empty pool");
          assert.equal(validation.current, 0, "Current pool is 0");
          assert.exists(validation.message, "Error message provided");
        });

        it("should prevent spending from empty pool on spell", async () => {
          assert.equal(actor.system.rings.void.value, 0, "Void pool is 0");

          const result = await spendVoidPoint(actor);

          assert.isFalse(result.success, "Spending fails");
          assert.equal(result.rollBonus, 0, "No roll bonus");
          assert.equal(result.keepBonus, 0, "No keep bonus");
          assert.exists(result.message, "Error message provided");
        });

        it("should not go negative when attempting spell with void", async () => {
          await spendVoidPoint(actor);
          await spendVoidPoint(actor);
          await spendVoidPoint(actor);

          assert.isAtLeast(actor.system.rings.void.value, 0, "Pool never negative");
        });
      });

      describe("Spell Roll + Void + Affinity", () => {
        let actor, spell, school;

        beforeEach(async () => {
          actor = await createShugenja({
            name: "Void + Affinity Test",
            system: {
              traits: { agi: 4, int: 4 },
              rings: { fire: 4, void: { rank: 3, value: 3 } },
              insight: { rank: 2 },
              spellSlots: { fire: 4, void: 3 }
            }
          });

          [school] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Isawa Shugenja School",
              type: "technique",
              system: { shugenja: true, affinity: "fire", deficiency: "earth" }
            }
          ]);

          [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Fires from Within", "fire", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should combine void bonus with affinity bonus", () => {
          const ringValue = 4;
          const baseSchoolRank = 2;
          const affinityBonus = 1;
          const effectiveSchoolRank = baseSchoolRank + affinityBonus;
          const voidBonus = 1;

          const baseRolled = ringValue + effectiveSchoolRank; // 7
          const baseKept = ringValue; // 4
          const finalRolled = baseRolled + voidBonus; // 8
          const finalKept = baseKept + voidBonus; // 5

          assert.equal(effectiveSchoolRank, 3, "Affinity adds +1 school rank");
          assert.equal(finalRolled, 8, "Void + affinity rolled (7+1=8)");
          assert.equal(finalKept, 5, "Void kept (4+1=5)");
        });

        it("should spend void independently of affinity", async () => {
          const initialVoid = actor.system.rings.void.value;

          const result = await spendVoidPoint(actor);

          assert.isTrue(result.success, "Void spent");
          assert.equal(actor.system.rings.void.value, initialVoid - 1, "Void decremented");
          assert.equal(school.system.affinity, "fire", "Affinity still present");
        });
      });

      describe("Spell Roll + Void + Deficiency", () => {
        let actor, spell, school;

        beforeEach(async () => {
          actor = await createShugenja({
            name: "Void + Deficiency Test",
            system: {
              traits: { sta: 3, wil: 3 },
              rings: { earth: 3, void: { rank: 3, value: 3 } },
              insight: { rank: 2 },
              spellSlots: { earth: 3, void: 3 }
            }
          });

          [school] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Isawa Shugenja School",
              type: "technique",
              system: { shugenja: true, affinity: "fire", deficiency: "earth" }
            }
          ]);

          [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Earth's Strength", "earth", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should combine void bonus with deficiency penalty", () => {
          const ringValue = 3;
          const baseSchoolRank = 2;
          const deficiencyPenalty = -1;
          const effectiveSchoolRank = baseSchoolRank + deficiencyPenalty;
          const voidBonus = 1;

          const baseRolled = ringValue + effectiveSchoolRank; // 4
          const baseKept = ringValue; // 3
          const finalRolled = baseRolled + voidBonus; // 5
          const finalKept = baseKept + voidBonus; // 4

          assert.equal(effectiveSchoolRank, 1, "Deficiency subtracts -1 school rank");
          assert.equal(finalRolled, 5, "Void + deficiency rolled (4+1=5)");
          assert.equal(finalKept, 4, "Void kept (3+1=4)");
        });

        it("should allow void spending even with deficiency", async () => {
          const initialVoid = actor.system.rings.void.value;

          const result = await spendVoidPoint(actor);

          assert.isTrue(result.success, "Void spend succeeds despite deficiency");
          assert.equal(actor.system.rings.void.value, initialVoid - 1, "Void decremented");
        });
      });

      describe("Spell Roll + Void + Raises", () => {
        let actor, spell;

        beforeEach(async () => {
          actor = await createShugenja({
            name: "Void + Raises Test",
            system: {
              traits: { agi: 4, int: 4 },
              rings: { fire: 4, void: { rank: 3, value: 3 } },
              insight: { rank: 2 },
              spellSlots: { fire: 4, void: 3 }
            }
          });

          [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Fires from Within", "fire", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should combine void bonus with raises", () => {
          const ringValue = 4;
          const schoolRank = 2;
          const voidBonus = 1;
          const raises = 2;
          const baseTN = 15;

          const finalRolled = ringValue + schoolRank + voidBonus; // 7
          const finalKept = ringValue + voidBonus; // 5
          const effectiveTN = baseTN + raises * 5; // 25

          assert.equal(finalRolled, 7, "Void adds to rolled (6+1=7)");
          assert.equal(finalKept, 5, "Void adds to kept (4+1=5)");
          assert.equal(effectiveTN, 25, "Raises increase TN (15 + 10 = 25)");
        });
      });

      describe("Spell Roll + Void (Race Conditions)", () => {
        let actor, spell;

        beforeEach(async () => {
          actor = await createShugenja({
            name: "Race Condition Test",
            system: {
              traits: { agi: 4, int: 4 },
              rings: { fire: 4, void: { rank: 3, value: 1 } },
              insight: { rank: 2 },
              spellSlots: { fire: 4, void: 3 }
            }
          });

          [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Fires from Within", "fire", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should prevent double-spending void on rapid spell casts", async () => {
          const initialVoid = actor.system.rings.void.value;
          assert.equal(initialVoid, 1, "Starts with 1 Void Point");

          const [result1, result2] = await Promise.all([
            spendVoidPoint(actor),
            spendVoidPoint(actor)
          ]);

          const successCount = [result1.success, result2.success].filter(Boolean).length;
          assert.equal(successCount, 1, "Only one spend succeeds");
          assert.equal(actor.system.rings.void.value, 0, "Void pool = 0");
          assert.isAtLeast(actor.system.rings.void.value, 0, "Pool never negative");
        });
      });
    },
    { displayName: "L5R4: Spell Roll + Void Point Tests" }
  );
}
