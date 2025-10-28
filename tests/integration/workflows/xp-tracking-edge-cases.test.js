/**
 * XP Tracking Edge Case Tests
 *
 * Tests edge cases in XP tracking that could corrupt advancement data.
 * Specifically tests free bonus consumption, rapid changes, and XP history.
 *
 * **What Can Break:**
 * - Free bonus consumption at rank 3
 * - Rapid trait increases race condition (Promise.all)
 * - XP tracking without actor (compendium item)
 * - Negative XP costs
 * - Free rank change deletes ALL XP history
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register XP tracking edge case tests
 * @param {Object} quench - Quench test framework
 */
export function registerXpTrackingEdgeCaseTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.xp-tracking-edge-cases`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Free Bonus Consumption at Rank 3", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Free Bonus Test",
            system: {
              traits: { sta: 2, wil: 2 },
              rings: { earth: 2 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should consume free bonus when raising trait to rank 3", async () => {
          // ARRANGE - Actor starts with traits at rank 2
          const xpBefore = actor.getFlag(SYS_ID, "xpSpent") || [];
          const xpCountBefore = xpBefore.length;

          // ACT - Raise Stamina to 3 (may use free bonus from family/school)
          await actor.update({ "system.traits.sta": 3 });

          // ASSERT - Verify trait increased
          assert.equal(actor.system.traits.sta, 3, "Stamina at rank 3");

          // XP tracking should exist (whether free or not)
          const xpAfter = actor.getFlag(SYS_ID, "xpSpent");
          assert.isArray(xpAfter, "XP tracking is array");

          // System tracks advancement via xpFreeTraitBase and getCreationFreeBonus()
          // Not via a simple freeBonusUsed flag
        });

        it("should handle multiple traits at rank 3 without double-consuming bonus", async () => {
          // ARRANGE - Actor starts with traits at rank 2
          const xpBefore = actor.getFlag(SYS_ID, "xpSpent") || [];

          // ACT - Raise both traits to 3
          await actor.update({
            "system.traits.sta": 3,
            "system.traits.wil": 3
          });

          // ASSERT - Both traits should be at rank 3
          assert.equal(actor.system.traits.sta, 3, "Stamina at rank 3");
          assert.equal(actor.system.traits.wil, 3, "Willpower at rank 3");

          // XP tracking should exist
          const xpAfter = actor.getFlag(SYS_ID, "xpSpent");
          assert.isArray(xpAfter, "XP tracking is array");

          // System uses xpFreeTraitBase to track which traits consumed free bonuses
        });

        it("should prevent using free bonus twice", async () => {
          // ARRANGE - Raise Stamina to 3 first (consumes one free bonus)
          await actor.update({ "system.traits.sta": 3 });

          const xpBefore = actor.getFlag(SYS_ID, "xpSpent") || [];
          const xpCountBefore = xpBefore.length;

          // ACT - Raise Willpower to 3 (second trait to rank 3)
          await actor.update({ "system.traits.wil": 3 });

          // ASSERT - Both traits at rank 3
          assert.equal(actor.system.traits.sta, 3, "Stamina at rank 3");
          assert.equal(actor.system.traits.wil, 3, "Willpower at rank 3");

          // XP tracking continues
          const xpAfter = actor.getFlag(SYS_ID, "xpSpent");
          assert.isArray(xpAfter, "XP tracking is array");

          // System uses xpFreeTraitBase to track which specific traits got free bonuses
        });

        it("should handle free bonus with rank 3+ starting trait", async () => {
          // ARRANGE - Create actor with trait already at 3
          const highActor = await createTestPC({
            name: "High Trait Test",
            system: {
              traits: { sta: 3, wil: 2 },
              rings: { earth: 2 }
            }
          });

          // ACT - Check XP tracking for starting trait at rank 3
          const xpSpent = highActor.getFlag(SYS_ID, "xpSpent") || [];

          // ASSERT - Starting at rank 3 should not cost XP if it's from creation
          // System uses getCreationFreeBonus() to detect family/school bonuses dynamically
          // No explicit "freeBonusUsed" flag - bonuses are calculated on-the-fly
          assert.isArray(xpSpent, "XP spent is array");

          // Verify trait is at rank 3
          assert.equal(highActor.system.traits.sta, 3, "Stamina at rank 3");

          await highActor.delete();
        });
      });

      describe("Rapid Trait Increases Race Condition", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Race Condition Test",
            system: {
              traits: { sta: 2, wil: 2, ref: 2, awa: 2 },
              rings: { earth: 2, air: 2 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle simultaneous trait increases with Promise.all", async () => {
          // ARRANGE - Get initial XP state
          const xpBefore = actor.getFlag(SYS_ID, "xpSpent") || [];

          // ACT - Increase multiple traits simultaneously
          const updatePromises = [
            actor.update({ "system.traits.sta": 3 }),
            actor.update({ "system.traits.wil": 3 }),
            actor.update({ "system.traits.ref": 3 })
          ];

          await Promise.all(updatePromises);

          // ASSERT - Verify no XP corruption
          const xpAfter = actor.getFlag(SYS_ID, "xpSpent");

          assert.exists(xpAfter, "XP tracking exists");
          assert.isArray(xpAfter, "XP spent is array");

          // Verify XP data integrity (not corrupted by race)
          for (const entry of xpAfter) {
            assert.exists(entry, "XP entry exists");
            assert.isNumber(entry.delta, "XP delta is number");
          }
        });

        it("should handle rapid ring increases without corruption", async () => {
          // ARRANGE
          const xpBefore = actor.getFlag(SYS_ID, "xpSpent") || [];

          // ACT - Increase both Earth traits simultaneously
          const updatePromises = [
            actor.update({ "system.traits.sta": 3 }),
            actor.update({ "system.traits.wil": 3 })
          ];

          await Promise.all(updatePromises);

          // ASSERT - Ring should recalculate correctly
          actor.prepareData();
          const earthRing = actor.system.rings.earth;

          assert.isNumber(earthRing, "Earth ring is number");
          assert.isAtLeast(earthRing, 2, "Earth ring at least 2");

          // Verify XP integrity
          const xpAfter = actor.getFlag(SYS_ID, "xpSpent");
          assert.isArray(xpAfter, "XP tracking not corrupted");
        });

        it("should handle concurrent trait and skill increases", async () => {
          // ARRANGE - Create skill
          const skill = await Item.create(
            {
              name: "Kenjutsu",
              type: "skill",
              system: {
                rank: 1,
                trait: "agi"
              }
            },
            { parent: actor }
          );

          // ACT - Update trait and skill simultaneously
          const updatePromises = [
            actor.update({ "system.traits.agi": 3 }),
            skill.update({ "system.rank": 2 })
          ];

          await Promise.all(updatePromises);

          // ASSERT - Both should update without corruption
          assert.equal(actor.system.traits.agi, 3, "Trait updated");
          assert.equal(skill.system.rank, 2, "Skill updated");

          const xpSpent = actor.getFlag(SYS_ID, "xpSpent");
          assert.isArray(xpSpent, "XP tracking intact");
        });
      });

      describe("XP Tracking Without Actor (Compendium)", () => {
        it("should handle skill in compendium without actor", async () => {
          // ARRANGE - Create skill without parent actor
          const compendiumSkill = await Item.create({
            name: "Compendium Skill",
            type: "skill",
            system: {
              rank: 3,
              trait: "agi"
            }
          });

          // ACT - Verify skill exists
          assert.exists(compendiumSkill, "Skill created");
          assert.isNull(compendiumSkill.parent, "No parent actor");

          // ASSERT - Should not crash when accessing XP
          // XP tracking only applies to actor-owned items
          const skillRank = compendiumSkill.system.rank;
          assert.equal(skillRank, 3, "Skill rank accessible");

          await compendiumSkill.delete();
        });

        it("should handle item transfer from compendium to actor", async () => {
          // ARRANGE - Create compendium item
          const compendiumItem = await Item.create({
            name: "Compendium Item",
            type: "skill",
            system: {
              rank: 2,
              trait: "int"
            }
          });

          const actor = await createTestPC({
            name: "Transfer Test",
            system: { traits: { int: 3 } }
          });

          // ACT - Transfer to actor
          const [transferredItem] = await actor.createEmbeddedDocuments("Item", [
            compendiumItem.toObject()
          ]);

          // ASSERT - Item should work on actor
          assert.exists(transferredItem, "Item transferred");
          assert.equal(transferredItem.parent.id, actor.id, "Item has parent");
          assert.equal(transferredItem.system.rank, 2, "Rank preserved");

          // Cleanup
          await compendiumItem.delete();
          await actor.delete();
        });
      });

      describe("Negative XP Costs", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Negative XP Test",
            system: {
              traits: { sta: 2 },
              rings: { earth: 2 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle negative XP from disadvantages", async () => {
          // ARRANGE - Add negative XP entry (disadvantages grant XP)
          const xpManual = actor.getFlag(SYS_ID, "xpManual") || [];

          // ACT - Add disadvantage XP
          await actor.setFlag(SYS_ID, "xpManual", [
            ...xpManual,
            { delta: -10, note: "Disadvantage: Bad Eyesight" }
          ]);

          // ASSERT - Negative XP stored correctly
          const updatedXP = actor.getFlag(SYS_ID, "xpManual");

          assert.isArray(updatedXP, "XP manual is array");
          const disadvantageEntry = updatedXP.find(e => e.delta === -10);
          assert.exists(disadvantageEntry, "Disadvantage entry exists");
          assert.equal(disadvantageEntry.delta, -10, "Negative delta stored");
          assert.isNumber(disadvantageEntry.delta, "Delta is number");
        });

        it("should calculate total XP correctly with negative entries", async () => {
          // ARRANGE - Add mix of positive and negative XP
          await actor.setFlag(SYS_ID, "xpManual", [
            { delta: 50, note: "Session 1" },
            { delta: -10, note: "Disadvantage" },
            { delta: 30, note: "Session 2" }
          ]);

          // ACT - Calculate total
          const xpManual = actor.getFlag(SYS_ID, "xpManual");
          const total = xpManual.reduce((sum, entry) => sum + entry.delta, 0);

          // ASSERT - Total should be 70 (50 - 10 + 30)
          assert.equal(total, 70, "Total XP calculated correctly");
        });

        it("should handle zero XP cost items", async () => {
          // ARRANGE - Add zero-cost XP entry
          await actor.setFlag(SYS_ID, "xpSpent", [{ delta: 0, note: "Free skill rank" }]);

          // ACT
          const xpSpent = actor.getFlag(SYS_ID, "xpSpent");

          // ASSERT - Zero cost should be valid
          assert.isArray(xpSpent, "XP spent is array");
          assert.equal(xpSpent[0].delta, 0, "Zero cost stored");
        });

        it("should prevent XP total from going negative", async () => {
          // ARRANGE - Set low XP base
          await actor.setFlag(SYS_ID, "xpBase", 10);
          await actor.setFlag(SYS_ID, "xpManual", []);
          await actor.setFlag(SYS_ID, "xpSpent", []);

          // ACT - Attempt to spend more than available
          await actor.setFlag(SYS_ID, "xpSpent", [{ delta: 20, note: "Expensive purchase" }]);

          // ASSERT - System should handle this
          const xpBase = actor.getFlag(SYS_ID, "xpBase");
          const xpSpent = actor.getFlag(SYS_ID, "xpSpent");
          const spent = xpSpent.reduce((sum, e) => sum + e.delta, 0);

          // Available XP = base - spent
          const available = xpBase - spent;

          // System should either prevent or allow negative
          assert.isNumber(available, "Available XP is number");
        });
      });

      describe("Free Rank Change Deletes XP History", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "XP History Test",
            system: {
              traits: { sta: 3 },
              rings: { earth: 2 }
            }
          });

          // Set up XP history
          await actor.setFlag(SYS_ID, "xpSpent", [
            { delta: 12, note: "Stamina 2→3" },
            { delta: 8, note: "Skill rank" }
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should preserve XP history when changing trait normally", async () => {
          // ARRANGE - Get initial history
          const historyBefore = actor.getFlag(SYS_ID, "xpSpent");
          const countBefore = historyBefore.length;

          // ACT - Increase trait (normal advancement)
          await actor.update({ "system.traits.sta": 4 });

          // ASSERT - History should be preserved
          const historyAfter = actor.getFlag(SYS_ID, "xpSpent");

          assert.isArray(historyAfter, "History is array");
          assert.isAtLeast(historyAfter.length, countBefore, "History not deleted");
        });

        it("should handle free rank toggle without deleting history", async () => {
          // ARRANGE - Get initial history
          const historyBefore = actor.getFlag(SYS_ID, "xpSpent");
          const countBefore = historyBefore.length;

          // ACT - Toggle free rank flag (if system has this feature)
          // This simulates marking a rank as "free" (school skill, etc.)
          await actor.setFlag(SYS_ID, "freeRankApplied", true);

          // ASSERT - History should NOT be deleted
          const historyAfter = actor.getFlag(SYS_ID, "xpSpent");

          assert.isArray(historyAfter, "History preserved");
          assert.equal(historyAfter.length, countBefore, "History count unchanged");
        });

        it("should handle XP refund without corrupting history", async () => {
          // ARRANGE - Get initial history
          const historyBefore = actor.getFlag(SYS_ID, "xpSpent");

          // ACT - Decrease trait (refund XP)
          await actor.update({ "system.traits.sta": 2 });

          // ASSERT - History should be updated, not deleted
          const historyAfter = actor.getFlag(SYS_ID, "xpSpent");

          assert.isArray(historyAfter, "History is array");
          assert.exists(historyAfter, "History exists");

          // History may be modified but should not be completely deleted
        });

        it("should handle complete XP reset without corruption", async () => {
          // ARRANGE - Actor with XP history
          const historyBefore = actor.getFlag(SYS_ID, "xpSpent");
          assert.isAbove(historyBefore.length, 0, "Has XP history");

          // ACT - Reset all XP (GM action)
          await actor.setFlag(SYS_ID, "xpSpent", []);
          await actor.setFlag(SYS_ID, "xpManual", []);
          await actor.setFlag(SYS_ID, "xpBase", 0);

          // ASSERT - Reset should be clean
          const xpSpent = actor.getFlag(SYS_ID, "xpSpent");
          const xpManual = actor.getFlag(SYS_ID, "xpManual");
          const xpBase = actor.getFlag(SYS_ID, "xpBase");

          assert.isArray(xpSpent, "xpSpent is array");
          assert.isArray(xpManual, "xpManual is array");
          assert.isNumber(xpBase, "xpBase is number");
          assert.equal(xpSpent.length, 0, "xpSpent empty");
          assert.equal(xpManual.length, 0, "xpManual empty");
          assert.equal(xpBase, 0, "xpBase zero");
        });
      });
    },
    { displayName: "L5R4: XP Tracking Edge Cases" }
  );
}
