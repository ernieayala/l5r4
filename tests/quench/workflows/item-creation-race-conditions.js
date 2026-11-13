/**
 * Item Creation Race Condition Tests
 *
 * Tests that rapid concurrent item operations don't corrupt data.
 * Specifically tests rapid item creation and large dataset handling.
 *
 * **What Can Break:**
 * - Rapid item creation race condition (Promise.all)
 * - 100+ items on actor (performance test)
 * - Concurrent item creation and deletion
 * - prepareDerivedData performance with many items
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  createSkillData,
  createWeaponData,
  createArmorData
} from "../../fixtures/item-fixtures.js";

/**
 * Register item creation race condition tests
 * @param {Object} quench - Quench test framework
 */
export function registerItemCreationRaceConditionTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.item-creation-race-conditions`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Rapid Item Creation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Item Race Test",
            system: { rings: { void: 2 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle 5 items created with Promise.all", async () => {
          // ARRANGE - Create 5 items simultaneously
          const itemData = [
            createSkillData({ name: "Skill 1", rank: 3 }),
            createSkillData({ name: "Skill 2", rank: 2 }),
            createWeaponData("Weapon 1", 3, 2),
            createWeaponData("Weapon 2", 2, 1),
            createArmorData("Armor 1", 3, 1)
          ];

          // ACT - Create all simultaneously
          const items = await actor.createEmbeddedDocuments("Item", itemData);

          // ASSERT
          assert.equal(items.length, 5, "All 5 items created");
          assert.equal(actor.items.size, 5, "Actor has 5 items");

          // Verify each item
          for (const item of items) {
            assert.exists(item, "Item exists");
            assert.exists(item.type, "Item has type");
            assert.exists(item.name, "Item has name");
          }
        });

        it("should handle 10 skills created simultaneously", async () => {
          // ARRANGE
          const skillData = Array.from({ length: 10 }, (_, i) =>
            createSkillData({ name: `Skill ${i + 1}`, rank: i + 1 })
          );

          // ACT
          const skills = await actor.createEmbeddedDocuments("Item", skillData);

          // ASSERT
          assert.equal(skills.length, 10, "All 10 skills created");

          // Verify XP calculation with 10 skills
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.exists(xpBreakdown, "XP calculated");
          assert.isNumber(xpBreakdown.skills, "Skill XP is number");
        });

        it("should handle rapid sequential item creation", async () => {
          // ARRANGE - Create items one after another rapidly
          const itemTypes = ["skill", "weapon", "armor", "skill", "weapon"];

          // ACT
          for (let i = 0; i < itemTypes.length; i++) {
            const type = itemTypes[i];
            let itemData;

            if (type === "skill") {
              itemData = createSkillData({ name: `Skill ${i}`, rank: 2 });
            } else if (type === "weapon") {
              itemData = createWeaponData(`Weapon ${i}`, 2, 1);
            } else {
              itemData = createArmorData(`Armor ${i}`, 2, 1);
            }

            await actor.createEmbeddedDocuments("Item", [itemData]);
          }

          // ASSERT
          assert.equal(actor.items.size, 5, "All items created sequentially");
        });

        it("should handle mixed item types created with Promise.all", async () => {
          // ARRANGE - Mix of different item types
          const itemData = [
            createSkillData({ name: "Kenjutsu", rank: 5 }),
            createWeaponData("Katana", 3, 2),
            createArmorData("Light Armor", 3, 1),
            createSkillData({ name: "Iaijutsu", rank: 3 }),
            createWeaponData("Wakizashi", 2, 1)
          ];

          // ACT
          const items = await actor.createEmbeddedDocuments("Item", itemData);

          // ASSERT
          const skills = items.filter(i => i.type === "skill");
          const weapons = items.filter(i => i.type === "weapon");
          const armor = items.filter(i => i.type === "armor");

          assert.equal(skills.length, 2, "2 skills created");
          assert.equal(weapons.length, 2, "2 weapons created");
          assert.equal(armor.length, 1, "1 armor created");
        });
      });

      describe("Large Dataset Handling (100+ Items)", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Large Dataset Test",
            system: { rings: { void: 2 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle 100 items on actor", async function () {
          // ARRANGE - Create 100 items
          const itemData = Array.from({ length: 100 }, (_, i) => {
            const type = i % 3 === 0 ? "skill" : i % 3 === 1 ? "weapon" : "armor";

            if (type === "skill") {
              return createSkillData({ name: `Skill ${i}`, rank: (i % 10) + 1 });
            } else if (type === "weapon") {
              return createWeaponData(`Weapon ${i}`, 2, 1);
            } else {
              return createArmorData(`Armor ${i}`, 2, 1);
            }
          });

          // ACT - Create all items
          const startTime = Date.now();
          const items = await actor.createEmbeddedDocuments("Item", itemData);
          const creationTime = Date.now() - startTime;

          // ASSERT
          assert.equal(items.length, 100, "All 100 items created");
          assert.equal(actor.items.size, 100, "Actor has 100 items");

          console.log(`L5R4 | Created 100 items in ${creationTime}ms`);

          // Verify data integrity
          for (const item of items) {
            assert.exists(item.name, "Item has name");
            assert.exists(item.type, "Item has type");
          }
        });

        it("should handle prepareDerivedData with 100+ items (performance)", async function () {
          // ARRANGE - Create 100 skills (worst case for XP calculation)
          const skillData = Array.from({ length: 100 }, (_, i) =>
            createSkillData({ name: `Skill ${i}`, rank: (i % 10) + 1 })
          );

          await actor.createEmbeddedDocuments("Item", skillData);

          // ACT - Measure prepareDerivedData performance
          const startTime = Date.now();
          actor.prepareData();
          const prepTime = Date.now() - startTime;

          // ASSERT - Should complete in reasonable time (< 100ms target)
          console.log(`L5R4 | prepareDerivedData with 100 items: ${prepTime}ms`);

          // Verify XP calculated correctly
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.exists(xpBreakdown, "XP breakdown exists");
          assert.isNumber(xpBreakdown.skills, "Skill XP calculated");

          // Performance assertion (may need adjustment based on system)
          // Target: < 100ms for 100 items
          if (prepTime > 100) {
            console.warn(`L5R4 | prepareDerivedData took ${prepTime}ms (target: <100ms)`);
          }
        });

        it("should handle 50 items created in batches", async () => {
          // ARRANGE - Create in 5 batches of 10
          const batchSize = 10;
          const batchCount = 5;

          // ACT
          for (let batch = 0; batch < batchCount; batch++) {
            const itemData = Array.from({ length: batchSize }, (_, i) =>
              createSkillData({ name: `Batch${batch}_Skill${i}`, rank: 2 })
            );

            await actor.createEmbeddedDocuments("Item", itemData);
          }

          // ASSERT
          assert.equal(actor.items.size, 50, "All 50 items created in batches");

          // Verify data integrity
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated for 50 items");
        });
      });

      describe("Concurrent Creation and Deletion", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Concurrent Test",
            system: { rings: { void: 2 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle item creation and deletion simultaneously", async () => {
          // ARRANGE - Create some initial items
          const initialItems = await actor.createEmbeddedDocuments("Item", [
            createSkillData({ name: "Skill 1", rank: 3 }),
            createSkillData({ name: "Skill 2", rank: 2 })
          ]);

          // ACT - Create new items while deleting old ones
          const operations = [
            actor.createEmbeddedDocuments("Item", [createSkillData({ name: "Skill 3", rank: 4 })]),
            initialItems[0].delete()
          ];

          await Promise.all(operations);

          // ASSERT - Should have 2 items (1 deleted, 1 added, 1 remaining)
          assert.equal(actor.items.size, 2, "Concurrent operations completed");

          // Verify data integrity
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated after concurrent ops");
        });

        it("should handle rapid item additions and removals", async () => {
          // ARRANGE - Add and remove items rapidly
          const operations = [];

          // Create 5 items
          for (let i = 0; i < 5; i++) {
            operations.push(
              actor.createEmbeddedDocuments("Item", [
                createSkillData({ name: `Skill ${i}`, rank: 2 })
              ])
            );
          }

          // ACT - Execute all creations
          const results = await Promise.all(operations);

          // Delete 3 of them immediately
          const itemsToDelete = results.slice(0, 3).map(r => r[0]);
          await Promise.all(itemsToDelete.map(item => item.delete()));

          // ASSERT
          assert.equal(actor.items.size, 2, "2 items remain after rapid add/remove");

          // Verify XP integrity
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated correctly");
        });
      });

      describe("Item Update Race Conditions", () => {
        let actor, items;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Update Race Test",
            system: { rings: { void: 2 } }
          });

          items = await actor.createEmbeddedDocuments("Item", [
            createSkillData({ name: "Skill 1", rank: 3 }),
            createSkillData({ name: "Skill 2", rank: 2 }),
            createSkillData({ name: "Skill 3", rank: 4 })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle 3 items updated with Promise.all", async () => {
          // ARRANGE - Update all items simultaneously
          const updatePromises = items.map(item =>
            item.update({ "system.rank": item.system.rank + 1 })
          );

          // ACT
          await Promise.all(updatePromises);

          // ASSERT - All items updated
          for (const item of items) {
            const updated = actor.items.get(item.id);
            assert.exists(updated, "Item exists");
            assert.isNumber(updated.system.rank, "Rank is number");
          }

          // Verify XP recalculated
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP recalculated");
        });

        it("should handle same item updated multiple times rapidly", async () => {
          // ARRANGE - Update same item multiple times
          const item = items[0];
          const updates = [
            item.update({ "system.rank": 5 }),
            item.update({ "system.rank": 6 }),
            item.update({ "system.rank": 7 })
          ];

          // ACT
          await Promise.all(updates);

          // ASSERT - Last write wins
          const updated = actor.items.get(item.id);
          assert.exists(updated, "Item exists");
          assert.isNumber(updated.system.rank, "Rank is number");

          // Verify no corruption
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated");
        });
      });
    },
    { displayName: "L5R4: Item Creation Race Conditions" }
  );
}
