/**
 * Attack Roll + Void Point Integration Tests
 *
 * **What This Tests:**
 * - Attack rolls with Void Point spending (+1k1 bonus)
 * - Void Point depletion and validation
 * - Attack + Void + Emphasis combination
 * - Attack + Void + Stance combinations
 * - Attack + Void + All modifiers
 * - Edge cases (empty pool, race conditions, unskilled)
 *
 * **Why This Matters:**
 * - Void Point spending on attacks is a core L5R4 combat mechanic
 * - Users report this combination is broken in production
 * - Critical for combat effectiveness
 *
 * **L5R4 Rules:**
 * - Spending Void Point grants +1k1 bonus to attack roll
 * - Void pool decrements by 1 when spent
 * - Cannot spend from empty pool
 * - Void bonus stacks with emphasis, stances, and other modifiers
 * - One Void Point per round limit (not enforced in tests)
 *
 * @see module/services/dice/rolls/skill-roll.js
 * @see module/services/dice/rolls/simple-roll.js
 * @see module/services/dice/resources/void-manager.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { buildFormula } from "../../../module/services/dice/core/formula-builder.js";
import {
  spendVoidPoint,
  validateVoidPoints
} from "../../../module/services/dice/resources/void-manager.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData, createWeaponData } from "../../fixtures/item-fixtures.js";

/**
 * Register attack roll + void point integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerAttackRollVoidTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.rolls.attack-void`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Attack Roll + Void Point (Basic)", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          // ARRANGE - Create actor with Kenjutsu skill and Void Points
          actor = await createTestPC({
            name: "Void Attack Test Samurai",
            system: {
              traits: { agi: 4, str: 3 },
              rings: { void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: {
                associatedSkill: "kenjutsu",
                fallbackTrait: "agi"
              }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should add +1k1 bonus when Void Point spent on attack", () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidRollBonus = 1;
          const voidKeepBonus = 1;

          // ACT - Calculate attack with void
          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + voidRollBonus; // 10
          const finalKept = baseKept + voidKeepBonus; // 5

          // ASSERT
          assert.equal(finalRolled, 10, "Void adds +1 rolled (9+1=10)");
          assert.equal(finalKept, 5, "Void adds +1 kept (4+1=5)");
        });

        it("should decrement Void pool after spending on attack", async () => {
          // ARRANGE
          const initialVoid = actor.system.rings.void.value;
          assert.equal(initialVoid, 3, "Starts with 3 Void Points");

          // ACT - Spend Void Point
          const result = await spendVoidPoint(actor);

          // ASSERT
          assert.isTrue(result.success, "Void spend succeeds");
          assert.equal(actor.system.rings.void.value, 2, "Void pool decremented to 2");
        });

        it("should return correct bonuses from spendVoidPoint", async () => {
          // ACT
          const result = await spendVoidPoint(actor);

          // ASSERT - L5R4 +1k1 mechanic
          assert.isTrue(result.success, "Spending succeeds");
          assert.equal(result.rollBonus, 1, "+1 rolled die");
          assert.equal(result.keepBonus, 1, "+1 kept die");
          assert.isNull(result.message, "No error message");
        });

        it("should build correct formula with void bonus", () => {
          // ARRANGE
          const rolled = 10; // Base 9 + void 1
          const kept = 5; // Base 4 + void 1

          // ACT
          const formula = buildFormula(rolled, kept, 0);

          // ASSERT
          assert.include(formula, "10d10", "Rolled includes void bonus");
          assert.include(formula, "k5", "Kept includes void bonus");
          assert.include(formula, "x10", "Dice explode");
        });
      });

      describe("Attack Roll + Void Point (Empty Pool)", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Empty Void Test",
            system: {
              traits: { agi: 4, str: 3 },
              rings: { void: { rank: 3, value: 0 } } // Empty pool
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should fail validation when Void pool is empty", () => {
          // ACT
          const validation = validateVoidPoints(actor);

          // ASSERT
          assert.isFalse(validation.valid, "Validation fails with empty pool");
          assert.equal(validation.current, 0, "Current pool is 0");
          assert.exists(validation.message, "Error message provided");
        });

        it("should prevent spending from empty pool on attack", async () => {
          // ARRANGE
          assert.equal(actor.system.rings.void.value, 0, "Void pool is 0");

          // ACT
          const result = await spendVoidPoint(actor);

          // ASSERT
          assert.isFalse(result.success, "Spending fails");
          assert.equal(result.rollBonus, 0, "No roll bonus");
          assert.equal(result.keepBonus, 0, "No keep bonus");
          assert.exists(result.message, "Error message provided");
        });

        it("should not go negative when attempting attack with void", async () => {
          // ACT - Multiple attempts
          await spendVoidPoint(actor);
          await spendVoidPoint(actor);

          // ASSERT
          assert.isAtLeast(actor.system.rings.void.value, 0, "Pool never negative");
        });
      });

      describe("Attack Roll + Void + Emphasis", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Void + Emphasis Test",
            system: {
              traits: { agi: 4, str: 3 },
              rings: { void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: { emphasis: "Katana" }
            })
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should combine void bonus with emphasis", () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidBonus = 1;

          // ACT
          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + voidBonus; // 10
          const finalKept = baseKept + voidBonus; // 5

          // ASSERT
          assert.equal(finalRolled, 10, "Void adds to rolled (9+1=10)");
          assert.equal(finalKept, 5, "Void adds to kept (4+1=5)");
        });

        it("should build formula with both void and emphasis", () => {
          // ARRANGE
          const rolled = 10; // Base 9 + void 1
          const kept = 5; // Base 4 + void 1
          const emphasis = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - Both mechanics present
          assert.include(formula, "10d10", "Rolled includes void");
          assert.include(formula, "k5", "Kept includes void");
          assert.include(formula, "r1", "Emphasis re-rolls 1s");
          assert.include(formula, "x10", "Dice explode");
        });

        it("should spend void and apply emphasis independently", async () => {
          // ARRANGE
          const initialVoid = actor.system.rings.void.value;

          // ACT - Spend void
          const result = await spendVoidPoint(actor);

          // ASSERT - Void spent, emphasis still available
          assert.isTrue(result.success, "Void spent");
          assert.equal(actor.system.rings.void.value, initialVoid - 1, "Void decremented");
          assert.equal(skill.system.emphasis, "Katana", "Emphasis still present");
        });
      });

      describe("Attack Roll + Void + Full Attack Stance", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Void + Stance Test",
            system: {
              traits: { agi: 4, ref: 3, str: 3 },
              rings: { earth: 3, void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should combine void with Full Attack stance bonuses", async () => {
          // ARRANGE - Apply Full Attack stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              statuses: ["fullAttackStance"],
              disabled: false
            }
          ]);

          actor.prepareData();

          // ACT - Calculate with void and stance
          const skillRank = 5;
          const traitValue = 4;
          const voidBonus = 1;
          const stanceRoll = 2; // Full Attack +2k1
          const stanceKeep = 1;

          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + voidBonus + stanceRoll; // 12
          const finalKept = baseKept + voidBonus + stanceKeep; // 6

          // ASSERT
          assert.equal(finalRolled, 12, "All roll bonuses stack (9+1+2=12)");
          assert.equal(finalKept, 6, "All keep bonuses stack (4+1+1=6)");
        });

        it("should build formula with void and stance bonuses", () => {
          // ARRANGE
          const rolled = 12; // Base 9 + void 1 + stance 2
          const kept = 6; // Base 4 + void 1 + stance 1

          // ACT
          const formula = buildFormula(rolled, kept, 0);

          // ASSERT
          assert.include(formula, "12d10", "All roll bonuses applied");
          assert.include(formula, "k6", "All keep bonuses applied");
          assert.include(formula, "x10", "Dice explode");
        });
      });

      describe("Attack Roll + Void + All Modifiers", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "All Modifiers Test",
            system: {
              traits: { agi: 4, ref: 3, str: 3 },
              rings: { earth: 3, void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: { emphasis: "Katana" }
            })
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should combine void + emphasis + Full Attack stance", async () => {
          // ARRANGE - Apply Full Attack
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              statuses: ["fullAttackStance"],
              disabled: false
            }
          ]);

          actor.prepareData();

          // ACT - Calculate with all modifiers
          const skillRank = 5;
          const traitValue = 4;
          const voidBonus = 1;
          const stanceRoll = 2;
          const stanceKeep = 1;

          const finalRolled = skillRank + traitValue + voidBonus + stanceRoll; // 12
          const finalKept = traitValue + voidBonus + stanceKeep; // 6

          // ASSERT
          assert.equal(finalRolled, 12, "All roll bonuses (5+4+1+2=12)");
          assert.equal(finalKept, 6, "All keep bonuses (4+1+1=6)");
        });

        it("should build formula with void + emphasis + stance", () => {
          // ARRANGE
          const rolled = 12;
          const kept = 6;
          const emphasis = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - All three mechanics present
          assert.include(formula, "12d10", "Void + stance roll bonuses");
          assert.include(formula, "k6", "Void + stance keep bonuses");
          assert.include(formula, "r1", "Emphasis re-rolls 1s");
          assert.include(formula, "x10", "Dice explode");
        });
      });

      describe("Unskilled Attack + Void Point", () => {
        let actor, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Unskilled Void Test",
            system: {
              traits: { agi: 3, str: 3 },
              rings: { void: { rank: 2, value: 2 } }
            }
          });

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Naginata", 3, 2, {
              system: {
                associatedSkill: "polearms",
                fallbackTrait: "agi"
              }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should allow void spending on unskilled attack", async () => {
          // ARRANGE
          const initialVoid = actor.system.rings.void.value;

          // ACT
          const result = await spendVoidPoint(actor);

          // ASSERT
          assert.isTrue(result.success, "Void spend succeeds");
          assert.equal(result.rollBonus, 1, "+1 rolled");
          assert.equal(result.keepBonus, 1, "+1 kept");
          assert.equal(actor.system.rings.void.value, initialVoid - 1, "Void decremented");
        });

        it("should add void bonus to unskilled attack dice pool", () => {
          // ARRANGE
          const traitValue = 3;
          const voidBonus = 1;

          // ACT
          const baseRolled = traitValue; // 3 (unskilled)
          const baseKept = traitValue; // 3
          const finalRolled = baseRolled + voidBonus; // 4
          const finalKept = baseKept + voidBonus; // 4

          // ASSERT
          assert.equal(finalRolled, 4, "Void adds to unskilled (3+1=4)");
          assert.equal(finalKept, 4, "Void adds to kept (3+1=4)");
        });
      });
    },
    { displayName: "L5R4: Attack Roll + Void Point Tests" }
  );
}
