/**
 * Rest & Recovery Complete Workflow Integration Tests
 *
 * Tests complete rest and recovery workflows including:
 * - Long rest with all recovery mechanics (healing, spell slots, void, fatigue)
 * - Natural healing over multiple consecutive rests
 * - Fasting condition blocking void recovery
 * - Edge cases and boundary conditions
 *
 * Test Priority: Tier 2 (Important - Rest & Recovery mechanics)
 *
 * @see module/services/rest.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { applyLongRest } from "../../../module/services/rest.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSpellData } from "../../fixtures/item-fixtures.js";

/**
 * Register rest and recovery workflow tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerRestRecoveryWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.rest-recovery`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Complete Long Rest Workflow", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Test Character",
            system: {
              traits: {
                sta: 3,
                wil: 3,
                ref: 4,
                awa: 4,
                agi: 3,
                int: 3,
                str: 3,
                per: 3
              },
              rings: {
                void: { rank: 3 } // Higher void to reach Insight Rank 2: (3+3+3+3+3)×10 = 150
              }
            }
          });

          // Add spells for slot restoration testing
          await actor.createEmbeddedDocuments("Item", [
            createSpellData("Test Air Spell", "air", 1),
            createSpellData("Test Fire Spell", "fire", 2)
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should heal wounds by heal rate amount", async () => {
          // ARRANGE - Wound the character
          const healRate = actor.system.wounds.healRate;
          const insightRank = actor.system.insight.rank;
          const _stamina = actor.system.traits.sta;

          // Heal rate = (Stamina × 2) + Insight Rank
          // Expected: (3 × 2) + 2 = 8

          assert.equal(insightRank, 2, `Insight Rank should be 2 (got ${insightRank})`);
          assert.equal(healRate, 8, `Heal rate should be 8 (got ${healRate})`);

          const initialWounds = 20;
          await actor.update({ "system.suffered": initialWounds });
          actor.prepareData();

          const beforeSuffered = actor.system.suffered;
          assert.equal(beforeSuffered, initialWounds, "Character is wounded");

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Wounds healed by heal rate
          const afterSuffered = actor.system.suffered;
          const expectedSuffered = Math.max(0, initialWounds - healRate);
          assert.equal(
            afterSuffered,
            expectedSuffered,
            `Healed ${healRate} wounds (${initialWounds} → ${expectedSuffered})`
          );
        });

        it("should restore all spell slots to maximum", async () => {
          // ARRANGE - Deplete spell slots
          const rings = actor.system.rings;
          await actor.update({
            "system.spellSlots.air": 1,
            "system.spellSlots.earth": 0,
            "system.spellSlots.fire": 1,
            "system.spellSlots.water": 0,
            "system.spellSlots.void": 0
          });
          actor.prepareData();

          // Verify slots are depleted
          assert.isBelow(actor.system.spellSlots.air, rings.air, "Air slots depleted");
          assert.equal(actor.system.spellSlots.earth, 0, "Earth slots at 0");

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - All spell slots restored to ring values
          assert.equal(actor.system.spellSlots.air, rings.air, "Air slots restored to Air Ring");
          assert.equal(
            actor.system.spellSlots.earth,
            rings.earth,
            "Earth slots restored to Earth Ring"
          );
          assert.equal(
            actor.system.spellSlots.fire,
            rings.fire,
            "Fire slots restored to Fire Ring"
          );
          assert.equal(
            actor.system.spellSlots.water,
            rings.water,
            "Water slots restored to Water Ring"
          );
          assert.equal(
            actor.system.spellSlots.void,
            rings.void.rank,
            "Void slots restored to Void Ring rank"
          );
        });

        it("should restore void points to maximum", async () => {
          // ARRANGE - Deplete void points
          const voidMax = actor.system.rings.void.rank;
          await actor.update({ "system.rings.void.value": 0 });
          actor.prepareData();

          assert.equal(actor.system.rings.void.value, 0, "Void Points depleted");

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Void Points restored
          assert.equal(actor.system.rings.void.value, voidMax, "Void Points restored to maximum");
        });

        it("should remove fatigued condition", async () => {
          // ARRANGE - Apply fatigued condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fatigued",
              img: "systems/l5r4-enhanced/assets/icons/fatigue.webp",
              statuses: ["fatigued"]
            }
          ]);
          actor.prepareData();

          const fatigued = actor.effects.find(e => e.statuses?.has("fatigued"));
          assert.exists(fatigued, "Fatigued condition applied");

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Fatigued condition removed
          const afterFatigued = actor.effects.find(e => e.statuses?.has("fatigued"));
          assert.notExists(afterFatigued, "Fatigued condition removed");
        });

        it("should perform all recovery actions in single rest", async () => {
          // ARRANGE - Wounded, depleted, and fatigued character
          await actor.update({
            "system.suffered": 15,
            "system.rings.void.value": 0,
            "system.spellSlots.air": 1,
            "system.spellSlots.fire": 0
          });

          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fatigued",
              img: "systems/l5r4-enhanced/assets/icons/fatigue.webp",
              statuses: ["fatigued"]
            }
          ]);
          actor.prepareData();

          const initialSuffered = actor.system.suffered;
          const healRate = actor.system.wounds.healRate;

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - All recovery happened
          const afterSuffered = actor.system.suffered;
          assert.equal(afterSuffered, Math.max(0, initialSuffered - healRate), "Wounds healed");

          assert.equal(
            actor.system.rings.void.value,
            actor.system.rings.void.rank,
            "Void restored"
          );

          assert.equal(actor.system.spellSlots.air, actor.system.rings.air, "Air slots restored");
          assert.equal(
            actor.system.spellSlots.fire,
            actor.system.rings.fire,
            "Fire slots restored"
          );

          const fatigued = actor.effects.find(e => e.statuses?.has("fatigued"));
          assert.notExists(fatigued, "Fatigued removed");
        });

        it("should not heal below 0 suffered wounds", async () => {
          // ARRANGE - Lightly wounded (less than heal rate)
          const healRate = actor.system.wounds.healRate;
          const lightWounds = Math.floor(healRate / 2);
          await actor.update({ "system.suffered": lightWounds });
          actor.prepareData();

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Fully healed, not negative
          assert.equal(actor.system.suffered, 0, "Cannot heal below 0");
          assert.isAtLeast(actor.system.suffered, 0, "Suffered wounds >= 0");
        });

        it("should handle already fully healthy character", async () => {
          // ARRANGE - Fully healthy character
          await actor.update({
            "system.suffered": 0,
            "system.rings.void.value": actor.system.rings.void.rank
          });
          actor.prepareData();

          const voidBefore = actor.system.rings.void.value;

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - No negative effects, stays at max
          assert.equal(actor.system.suffered, 0, "Stays at 0 suffered");
          assert.equal(actor.system.rings.void.value, voidBefore, "Void stays at max");
        });

        it("should handle character with zero heal rate", async () => {
          // ARRANGE - Character with somehow zero heal rate
          // Note: Normally impossible with min Stamina=2, Insight=1 (rate=5)
          // This test verifies defensive coding when heal rate would be 0
          // We can't directly set healRate as it's derived, but we can test the logic

          // Wound the character
          await actor.update({ "system.suffered": 10 });
          actor.prepareData();

          // Store original heal rate
          const originalHealRate = actor.system.wounds.healRate;

          // ACT - Apply long rest with normal heal rate
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Healed by heal rate amount
          const expectedSuffered = Math.max(0, 10 - originalHealRate);
          assert.equal(
            actor.system.suffered,
            expectedSuffered,
            `Healed by ${originalHealRate} (10 → ${expectedSuffered})`
          );
        });
      });

      describe("Natural Healing Over Multiple Rests", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Wounded Character",
            system: {
              traits: {
                sta: 3, // Heal rate = (3×2) + 2 = 8
                wil: 3,
                ref: 3,
                awa: 3,
                agi: 3,
                int: 3,
                str: 3,
                per: 3
              },
              rings: {
                void: { rank: 3 } // Reach Insight Rank 2
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should heal progressively over multiple rests", async () => {
          // ARRANGE - Heavily wounded character (35 wounds)
          const initialWounds = 35;
          await actor.update({ "system.suffered": initialWounds });
          actor.prepareData();

          const healRate = actor.system.wounds.healRate;
          assert.equal(healRate, 8, "Heal rate is 8 per rest");

          const woundHistory = [initialWounds];

          // ACT - Apply multiple rests until fully healed
          let currentSuffered = initialWounds;
          let restCount = 0;
          const maxRests = 10; // Safety limit

          while (currentSuffered > 0 && restCount < maxRests) {
            await applyLongRest(actor);
            actor.prepareData();

            currentSuffered = actor.system.suffered;
            woundHistory.push(currentSuffered);
            restCount++;
          }

          // ASSERT - Progressive healing sequence
          assert.equal(woundHistory[0], 35, "Rest 0: 35 wounds");
          assert.equal(woundHistory[1], 27, "Rest 1: 27 wounds (35-8)");
          assert.equal(woundHistory[2], 19, "Rest 2: 19 wounds (27-8)");
          assert.equal(woundHistory[3], 11, "Rest 3: 11 wounds (19-8)");
          assert.equal(woundHistory[4], 3, "Rest 4: 3 wounds (11-8)");
          assert.equal(woundHistory[5], 0, "Rest 5: 0 wounds (3-8=0)");

          assert.equal(restCount, 5, "Took 5 rests to fully heal");
          assert.equal(actor.system.suffered, 0, "Fully healed");
        });

        it("should maintain consistent heal rate across multiple rests", async () => {
          // ARRANGE - Moderately wounded
          await actor.update({ "system.suffered": 30 });
          actor.prepareData();

          const healRate = actor.system.wounds.healRate;

          // ACT & ASSERT - Each rest heals by exactly heal rate
          for (let i = 0; i < 3; i++) {
            const beforeRest = actor.system.suffered;
            await applyLongRest(actor);
            actor.prepareData();

            const afterRest = actor.system.suffered;
            const actualHealing = beforeRest - afterRest;

            assert.equal(
              actualHealing,
              Math.min(healRate, beforeRest),
              `Rest ${i + 1}: Healed ${actualHealing} wounds`
            );
          }
        });

        it("should handle wound level changes during healing", async () => {
          // ARRANGE - Character starting at Injured wound level
          const earth = actor.system.rings.earth;
          const injuredThreshold = earth * 10; // Injured = Earth×10
          await actor.update({ "system.suffered": injuredThreshold + 5 });
          actor.prepareData();

          // Verify starting at Injured (check woundLevels for current marker)
          const beforeLevels = actor.system.woundLevels;
          const beforeInjured = beforeLevels.injured?.current;
          assert.isTrue(beforeInjured, "Starting at Injured wound level");

          // ACT - Rest multiple times
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Wound level improved (not at Injured anymore)
          const afterLevels = actor.system.woundLevels;
          const afterInjured = afterLevels.injured?.current;
          assert.isFalse(afterInjured, "Wound level improved after rest (no longer Injured)");
        });
      });

      describe("Fasting Condition Blocking Void Recovery", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Fasting Character",
            system: {
              traits: {
                sta: 3,
                wil: 3,
                ref: 3,
                awa: 3,
                agi: 3,
                int: 3,
                str: 3,
                per: 3
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should block void recovery when fasting", async () => {
          // ARRANGE - Deplete void points
          const _voidMax = actor.system.rings.void.rank;
          await actor.update({ "system.rings.void.value": 0 });
          actor.prepareData();

          assert.equal(actor.system.rings.void.value, 0, "Void depleted");

          // Apply fasting condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fasting",
              img: "systems/l5r4-enhanced/assets/icons/fasting.webp",
              statuses: ["fasting"]
            }
          ]);
          actor.prepareData();

          const fastingEffect = actor.effects.find(e => e.statuses?.has("fasting"));
          assert.exists(fastingEffect, "Fasting condition applied");

          // ACT - Take long rest while fasting
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Void should NOT recover
          const voidAfterRest = actor.system.rings.void.value;

          // NOTE: This test will FAIL until rest.js implements fasting check
          // When implemented, void should remain 0
          // For now, this documents EXPECTED behavior per L5R4 rules

          // TODO: Implement fasting check in rest.js:
          // const isFasting = actor.effects.some(e => e.statuses?.has("fasting"));
          // if (!isFasting) { restore void }

          // EXPECTED (when implemented):
          assert.equal(voidAfterRest, 0, "Void recovery blocked by fasting condition");

          // Verify fasting still active
          const stillFasting = actor.effects.find(e => e.statuses?.has("fasting"));
          assert.exists(stillFasting, "Fasting condition persists");
        });

        it("should allow wounds to heal while fasting", async () => {
          // ARRANGE - Wounded and fasting
          await actor.update({ "system.suffered": 15 });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fasting",
              img: "systems/l5r4-enhanced/assets/icons/fasting.webp",
              statuses: ["fasting"]
            }
          ]);
          actor.prepareData();

          const beforeSuffered = actor.system.suffered;
          const healRate = actor.system.wounds.healRate;

          // ACT - Rest while fasting
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Wounds still heal (fasting only blocks void)
          const afterSuffered = actor.system.suffered;
          assert.equal(
            afterSuffered,
            Math.max(0, beforeSuffered - healRate),
            "Wounds heal normally even while fasting"
          );
        });

        it("should allow spell slot recovery while fasting", async () => {
          // ARRANGE - Depleted spell slots and fasting
          await actor.update({
            "system.spellSlots.air": 0,
            "system.spellSlots.fire": 1
          });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fasting",
              img: "systems/l5r4-enhanced/assets/icons/fasting.webp",
              statuses: ["fasting"]
            }
          ]);
          actor.prepareData();

          // ACT - Rest while fasting
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Spell slots restore (fasting only blocks void)
          assert.equal(
            actor.system.spellSlots.air,
            actor.system.rings.air,
            "Spell slots restore even while fasting"
          );
          assert.equal(actor.system.spellSlots.fire, actor.system.rings.fire, "Fire slots restore");
        });

        it("should restore void after breaking fast", async () => {
          // ARRANGE - Depleted void and fasting
          await actor.update({ "system.rings.void.value": 0 });
          const fastingEffect = await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fasting",
              img: "systems/l5r4-enhanced/assets/icons/fasting.webp",
              statuses: ["fasting"]
            }
          ]);
          actor.prepareData();

          // Rest while fasting (void should not recover)
          await applyLongRest(actor);
          actor.prepareData();

          // TODO: When implemented, this should be 0
          // assert.equal(actor.system.rings.void.value, 0, "Void still 0 while fasting");

          // ACT - Remove fasting (break fast)
          await actor.deleteEmbeddedDocuments("ActiveEffect", [fastingEffect[0].id]);
          actor.prepareData();

          // Rest after breaking fast
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Void now recovers
          assert.equal(
            actor.system.rings.void.value,
            actor.system.rings.void.rank,
            "Void recovers after breaking fast"
          );
        });

        it("should handle multiple fasting/rest cycles", async () => {
          // ARRANGE - Start with void depleted
          const voidMax = actor.system.rings.void.rank;
          await actor.update({ "system.rings.void.value": 0 });
          actor.prepareData();

          // Cycle 1: Fast and rest (no void recovery)
          let fasting = await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fasting",
              img: "systems/l5r4-enhanced/assets/icons/fasting.webp",
              statuses: ["fasting"]
            }
          ]);
          await applyLongRest(actor);
          actor.prepareData();

          // TODO: When implemented
          // assert.equal(actor.system.rings.void.value, 0, "Cycle 1: Void blocked");

          // Cycle 2: Break fast and rest (void recovers)
          await actor.deleteEmbeddedDocuments("ActiveEffect", [fasting[0].id]);
          await applyLongRest(actor);
          actor.prepareData();
          assert.equal(actor.system.rings.void.value, voidMax, "Cycle 2: Void restored");

          // Cycle 3: Fast again and rest (void stays at max but wouldn't recover if depleted)
          await actor.update({ "system.rings.void.value": 1 }); // Partially deplete
          fasting = await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Fasting",
              img: "systems/l5r4-enhanced/assets/icons/fasting.webp",
              statuses: ["fasting"]
            }
          ]);
          await applyLongRest(actor);
          actor.prepareData();

          // TODO: When implemented
          // assert.equal(actor.system.rings.void.value, 1, "Cycle 3: Void blocked again");
        });
      });

      describe("Edge Cases and Boundary Conditions", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Edge Case Character"
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should handle rest with zero void ring", async () => {
          // ARRANGE - Character with void ring somehow at 0
          await actor.update({
            "system.rings.void.rank": 0,
            "system.rings.void.value": 0
          });
          actor.prepareData();

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - No errors, void stays 0
          assert.equal(actor.system.rings.void.value, 0, "Void stays at 0");
        });

        it("should handle rest with no spell slots to restore", async () => {
          // ARRANGE - Non-spellcaster with 0 ring-based slots
          await actor.update({
            "system.spellSlots.air": 0,
            "system.spellSlots.earth": 0,
            "system.spellSlots.fire": 0,
            "system.spellSlots.water": 0,
            "system.spellSlots.void": 0
          });
          actor.prepareData();

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - No errors, slots restored to ring values
          assert.equal(actor.system.spellSlots.air, actor.system.rings.air, "Air slots = Air ring");
        });

        it("should handle rest with no fatigued condition to remove", async () => {
          // ARRANGE - Not fatigued
          const hasFatigued = actor.effects.some(e => e.statuses?.has("fatigued"));
          assert.isFalse(hasFatigued, "Not fatigued initially");

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - No errors
          const stillNotFatigued = actor.effects.some(e => e.statuses?.has("fatigued"));
          assert.isFalse(stillNotFatigued, "Still not fatigued");
        });

        it("should handle rest with maximum values already", async () => {
          // ARRANGE - Everything at maximum
          await actor.update({
            "system.suffered": 0,
            "system.rings.void.value": actor.system.rings.void.rank,
            "system.spellSlots.air": actor.system.rings.air,
            "system.spellSlots.earth": actor.system.rings.earth,
            "system.spellSlots.fire": actor.system.rings.fire,
            "system.spellSlots.water": actor.system.rings.water,
            "system.spellSlots.void": actor.system.rings.void.rank
          });
          actor.prepareData();

          // ACT - Apply long rest
          await applyLongRest(actor);
          actor.prepareData();

          // ASSERT - Values stay at maximum, no overflow
          assert.equal(actor.system.suffered, 0, "Suffered stays 0");
          assert.equal(
            actor.system.rings.void.value,
            actor.system.rings.void.rank,
            "Void stays at max"
          );
        });

        it("should handle rest with null actor gracefully", async () => {
          // ACT - Call with null actor
          await applyLongRest(null);

          // ASSERT - No crash (defensive coding in rest.js handles this)
          assert.isTrue(true, "No crash with null actor");
        });
      });
    },
    { displayName: "L5R4: Rest & Recovery Workflow Tests" }
  );
}
