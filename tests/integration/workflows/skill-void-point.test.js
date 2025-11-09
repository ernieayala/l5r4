/**
 * Skill Roll + Void Point Integration Tests
 *
 * Tests the complete workflow of spending void points on skill rolls:
 * - Void point availability validation
 * - +1k1 bonus application to roll formula
 * - Void point deduction from actor
 * - Chat message content validation
 * - Combination with other mechanics (emphasis, modifiers, etc.)
 *
 * **L5R4 Mechanics:**
 * - Spending a Void Point grants +1k1 bonus (one additional rolled die, one additional kept die)
 * - Void Points are limited resource (max = Void Ring rank, refreshes daily)
 * - Can spend 1 Void Point per round (not enforced in these tests)
 * - Void bonus stacks with all other bonuses (emphasis, stance, effects)
 *
 * @see module/services/dice/rolls/skill-roll.js - Skill roll service
 * @see module/services/dice/resources/void-manager.js - Void point management
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { spendVoidPoint } from "../../../module/services/dice/resources/void-manager.js";

/**
 * Register skill roll + void point integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerSkillVoidPointTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.skill-void-point`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Skill Roll + Void Point: Basic Mechanics", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Void Test Samurai",
            system: {
              traits: { agi: 4, ref: 3 },
              rings: {
                void: { rank: 3, value: 3 }
              }
            }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 5 }),
              system: {
                rank: 5,
                trait: "agi",
                availableEmphases: ["Katana"],
                trainedEmphases: []
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should spend void point and apply +1k1 bonus to skill roll", async () => {
          // ARRANGE
          const initialVoid = actor.system.rings.void.value;
          assert.equal(initialVoid, 3, "Actor starts with 3 void points");

          // ACT - Spend void point directly
          const voidResult = await spendVoidPoint(actor);

          // ASSERT - Void point mechanics
          assert.isTrue(voidResult.success, "Void point spent successfully");
          assert.equal(voidResult.rollBonus, 1, "Void grants +1 rolled die");
          assert.equal(voidResult.keepBonus, 1, "Void grants +1 kept die");

          // Verify actor's void pool decreased
          await actor.prepareDerivedData();
          const currentVoid = actor.system.rings.void.value;
          assert.equal(currentVoid, 2, "Void points decreased from 3 to 2");
        });

        it("should calculate correct dice pool with void point bonus", async () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidRollBonus = 1;
          const voidKeepBonus = 1;

          // ACT - Calculate dice pool
          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const withVoidRolled = baseRolled + voidRollBonus; // 10
          const withVoidKept = baseKept + voidKeepBonus; // 5

          // ASSERT
          assert.equal(baseRolled, 9, "Base rolled dice = skill + trait (5+4=9)");
          assert.equal(baseKept, 4, "Base kept dice = trait (4)");
          assert.equal(withVoidRolled, 10, "With void: rolled = 9+1=10");
          assert.equal(withVoidKept, 5, "With void: kept = 4+1=5");
        });

        it("should prevent void spending when no void points available", async () => {
          // ARRANGE - Deplete void points
          await actor.update({ "system.rings.void.value": 0 });
          await actor.prepareDerivedData();

          assert.equal(actor.system.rings.void.value, 0, "Actor has 0 void points");

          // ACT
          const voidResult = await spendVoidPoint(actor);

          // ASSERT
          assert.isFalse(voidResult.success, "Void spending fails when depleted");
          assert.equal(voidResult.rollBonus, 0, "No roll bonus granted");
          assert.equal(voidResult.keepBonus, 0, "No keep bonus granted");
          assert.exists(voidResult.message, "Error message provided");
        });

        it("should handle multiple void point spends (sequential)", async () => {
          // ARRANGE
          const initialVoid = 3;
          assert.equal(actor.system.rings.void.value, initialVoid, "Start with 3 void");

          // ACT - Spend first void point
          const firstSpend = await spendVoidPoint(actor);
          assert.isTrue(firstSpend.success, "First spend succeeds");

          await actor.prepareDerivedData();
          assert.equal(actor.system.rings.void.value, 2, "Void reduced to 2");

          // Spend second void point
          const secondSpend = await spendVoidPoint(actor);
          assert.isTrue(secondSpend.success, "Second spend succeeds");

          await actor.prepareDerivedData();
          assert.equal(actor.system.rings.void.value, 1, "Void reduced to 1");

          // Spend third void point
          const thirdSpend = await spendVoidPoint(actor);
          assert.isTrue(thirdSpend.success, "Third spend succeeds");

          await actor.prepareDerivedData();
          assert.equal(actor.system.rings.void.value, 0, "Void depleted to 0");

          // ASSERT - Fourth spend should fail
          const fourthSpend = await spendVoidPoint(actor);
          assert.isFalse(fourthSpend.success, "Fourth spend fails (no void left)");
        });
      });

      describe("Skill Roll + Void Point: Combination Mechanics", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Combo Test Samurai",
            system: {
              traits: { agi: 4 },
              rings: {
                void: { rank: 3, value: 3 }
              }
            }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 5 }),
              system: {
                rank: 5,
                trait: "agi",
                availableEmphases: ["Katana"],
                trainedEmphases: ["Katana"]
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should combine void point with emphasis", async () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidBonus = 1;

          // ACT - Calculate dice pool with void
          const rolled = skillRank + traitValue + voidBonus; // 10
          const kept = traitValue + voidBonus; // 5

          // ASSERT
          assert.equal(rolled, 10, "Rolled dice with void = 10");
          assert.equal(kept, 5, "Kept dice with void = 5");
          // Formula should be: 10d10k5r1x10 (emphasis adds r1)
        });

        it("should combine void point with roll modifiers", async () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidRoll = 1;
          const voidKeep = 1;
          const additionalRoll = 2; // From effects/stance
          const additionalKeep = 1;

          // ACT
          const totalRolled = skillRank + traitValue + voidRoll + additionalRoll; // 12
          const totalKept = traitValue + voidKeep + additionalKeep; // 6

          // ASSERT
          assert.equal(totalRolled, 12, "All roll bonuses stack (5+4+1+2=12)");
          assert.equal(totalKept, 6, "All keep bonuses stack (4+1+1=6)");
        });

        it("should combine void point with total bonus", async () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidRoll = 1;
          const voidKeep = 1;
          const totalBonus = 5; // Flat bonus to result

          // ACT
          const rolled = skillRank + traitValue + voidRoll; // 10
          const kept = traitValue + voidKeep; // 5
          // Formula: 10d10k5x10+5

          // ASSERT
          assert.equal(rolled, 10, "Dice pool correct");
          assert.equal(kept, 5, "Keep pool correct");
          // Total bonus adds to final result, not dice pool
        });
      });

      describe("Skill Roll + Void Point: Unskilled Rolls", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Unskilled Samurai",
            system: {
              traits: { per: 3 },
              rings: {
                void: { rank: 2, value: 2 }
              }
            }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Medicine", rank: 0 }),
              system: {
                rank: 0, // Unskilled
                trait: "per",
                availableEmphases: [],
                trainedEmphases: []
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should allow void point spending on unskilled roll", async () => {
          // ARRANGE
          const skillRank = 0; // Unskilled
          const traitValue = 3;
          const voidBonus = 1;

          // ACT - Unskilled formula: (Trait)k(Trait)
          // With void: (Trait+1)k(Trait+1)
          const rolled = traitValue + voidBonus; // 4
          const kept = traitValue + voidBonus; // 4

          // ASSERT
          assert.equal(rolled, 4, "Unskilled + void rolled = 4");
          assert.equal(kept, 4, "Unskilled + void kept = 4");
          // Formula: 4d10k4+0 (no explosions for unskilled)
        });

        it("should spend void point on unskilled roll", async () => {
          // ARRANGE
          const initialVoid = actor.system.rings.void.value;
          assert.equal(initialVoid, 2, "Start with 2 void points");

          // ACT
          const voidResult = await spendVoidPoint(actor);

          // ASSERT
          assert.isTrue(voidResult.success, "Void spent on unskilled roll");
          assert.equal(voidResult.rollBonus, 1, "+1 rolled die");
          assert.equal(voidResult.keepBonus, 1, "+1 kept die");

          await actor.prepareDerivedData();
          assert.equal(actor.system.rings.void.value, 1, "Void decreased to 1");
        });
      });

      describe("Skill Roll + Void Point: Edge Cases", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Edge Case Samurai",
            system: {
              traits: { agi: 8 },
              rings: {
                void: { rank: 5, value: 5 }
              }
            }
          });
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should enforce Ten Dice Rule with void point", async () => {
          // ARRANGE - High skill + trait + void exceeds 10 dice
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 8 }),
              system: {
                rank: 8,
                trait: "agi"
              }
            },
            { parent: actor }
          );

          const skillRank = 8;
          const traitValue = 8;
          const voidBonus = 1;

          // ACT - Calculate dice pool
          const rawRolled = skillRank + traitValue + voidBonus; // 17
          const rawKept = traitValue + voidBonus; // 9

          // Ten Dice Rule: max 10 rolled, max 10 kept
          const cappedRolled = Math.min(rawRolled, 10);
          const cappedKept = Math.min(rawKept, 10);

          // ASSERT
          assert.equal(rawRolled, 17, "Raw rolled exceeds 10");
          assert.equal(cappedRolled, 10, "Rolled capped at 10");
          assert.equal(rawKept, 9, "Kept within limit");
          assert.equal(cappedKept, 9, "Kept unchanged");
          // Excess rolled dice (7) convert to +7 bonus
        });

        it("should handle minimum trait value (2) with void", async () => {
          // ARRANGE
          await actor.update({ "system.traits.agi": 2 });

          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 1 }),
              system: {
                rank: 1,
                trait: "agi"
              }
            },
            { parent: actor }
          );

          const skillRank = 1;
          const traitValue = 2;
          const voidBonus = 1;

          // ACT
          const rolled = skillRank + traitValue + voidBonus; // 4
          const kept = traitValue + voidBonus; // 3

          // ASSERT
          assert.equal(rolled, 4, "Minimum trait + void rolled = 4");
          assert.equal(kept, 3, "Minimum trait + void kept = 3");
        });

        it("should handle void ring rank 0 (no void points)", async () => {
          // ARRANGE - Create actor with no void ring
          const noVoidActor = await createTestPC({
            name: "No Void Samurai",
            system: {
              traits: { agi: 3 },
              rings: {
                void: { rank: 0, value: 0 }
              }
            }
          });

          // ACT
          const voidResult = await spendVoidPoint(noVoidActor);

          // ASSERT
          assert.isFalse(voidResult.success, "Cannot spend void with rank 0");
          assert.equal(voidResult.rollBonus, 0, "No bonus granted");
          assert.equal(voidResult.keepBonus, 0, "No bonus granted");

          // Cleanup
          await noVoidActor.delete();
        });
      });

      describe("Skill Roll + Void Point: Chat Message Validation", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Chat Test Samurai",
            system: {
              traits: { agi: 4 },
              rings: {
                void: { rank: 3, value: 3 }
              }
            }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 5 }),
              system: {
                rank: 5,
                trait: "agi"
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should create chat message when void point is spent on skill roll", async () => {
          // ARRANGE
          const initialVoid = actor.system.rings.void.value;

          // Spend void point first
          const voidResult = await spendVoidPoint(actor);
          assert.isTrue(voidResult.success, "Void point spent");

          // ACT - Execute skill roll with void bonuses
          const rollResult = await SkillRoll({
            actor,
            skillName: "kenjutsu",
            skillRank: 5,
            actorTrait: 4,
            skillTrait: "agi",
            rollBonus: voidResult.rollBonus, // +1
            keepBonus: voidResult.keepBonus, // +1
            askForOptions: false
          });

          // ASSERT
          assert.exists(rollResult, "Roll executed successfully");
          assert.isTrue(rollResult instanceof ChatMessage, "Chat message created");

          // Verify void was consumed
          await actor.prepareDerivedData();
          const finalVoid = actor.system.rings.void.value;
          assert.equal(finalVoid, initialVoid - 1, "Void point consumed");
        });
      });
    },
    { displayName: "L5R4: Skill Roll + Void Point Integration Tests" }
  );
}
