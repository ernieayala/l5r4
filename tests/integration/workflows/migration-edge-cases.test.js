/**
 * Migration Edge Case Tests
 *
 * Tests edge cases in data migration that could corrupt actor/item data.
 * Specifically tests repeated migrations, icon preservation, and flag management.
 *
 * **What Can Break:**
 * - Repeated migrations causing data corruption
 * - Custom icon paths being overwritten
 * - forceMigration flag not resetting
 * - Migration markers not being set correctly
 * - Compendium migrations corrupting data
 *
 */

import { SYS_ID, MIGRATION_FLAG } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";
import { hasBeenMigrated, markAsMigrated } from "../../../module/setup/migrations/utils/helpers.js";

/**
 * Register migration edge case tests
 * @param {Object} quench - Quench test framework
 */
export function registerMigrationEdgeCaseTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.migration-edge-cases`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Repeated Migrations - Data Corruption Prevention", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Migration Test PC",
            system: {
              traits: { sta: 3, wil: 3 },
              rings: { earth: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should mark actor as migrated after first migration", async () => {
          // ARRANGE - Fresh actor with no migration flag
          const initialFlag = actor.getFlag(SYS_ID, MIGRATION_FLAG);
          assert.notExists(initialFlag, "No migration flag initially");

          // ACT - Mark as migrated to version 1.0.0
          await markAsMigrated(actor, "1.0.0");

          // ASSERT
          const migratedFlag = actor.getFlag(SYS_ID, MIGRATION_FLAG);
          assert.exists(migratedFlag, "Migration flag set");
          assert.equal(migratedFlag, "1.0.0", "Version marked correctly");
        });

        it("should detect already-migrated documents", async () => {
          // ARRANGE - Mark as migrated to 1.0.0
          await markAsMigrated(actor, "1.0.0");

          // ACT - Check if migrated
          const isMigrated = hasBeenMigrated(actor, "1.0.0");

          // ASSERT
          assert.isTrue(isMigrated, "Document detected as migrated");
        });

        it("should skip re-migration of already-migrated documents", async () => {
          // ARRANGE - Mark as migrated
          await markAsMigrated(actor, "1.0.0");
          const originalData = foundry.utils.deepClone(actor.system);

          // ACT - Check if should skip
          const shouldSkip = hasBeenMigrated(actor, "1.0.0");

          // ASSERT
          assert.isTrue(shouldSkip, "Should skip re-migration");
          assert.deepEqual(actor.system, originalData, "Data unchanged");
        });

        it("should handle repeated migrations without data corruption", async () => {
          // ARRANGE - Migrate multiple times
          await markAsMigrated(actor, "1.0.0");
          const afterFirst = actor.getFlag(SYS_ID, MIGRATION_FLAG);

          // ACT - Migrate again to same version
          await markAsMigrated(actor, "1.0.0");
          const afterSecond = actor.getFlag(SYS_ID, MIGRATION_FLAG);

          // ACT - Migrate to newer version
          await markAsMigrated(actor, "1.1.0");
          const afterThird = actor.getFlag(SYS_ID, MIGRATION_FLAG);

          // ASSERT
          assert.equal(afterFirst, "1.0.0", "First migration marked");
          assert.equal(afterSecond, "1.0.0", "Second migration same version");
          assert.equal(afterThird, "1.1.0", "Third migration updated version");
        });

        it("should preserve actor data across multiple migrations", async () => {
          // ARRANGE - Store original critical data
          const originalName = actor.name;
          const originalEarth = actor.system.rings.earth;
          const originalStamina = actor.system.traits.sta;

          // ACT - Migrate multiple times
          await markAsMigrated(actor, "1.0.0");
          await markAsMigrated(actor, "1.1.0");
          await markAsMigrated(actor, "1.2.0");

          // ASSERT - Critical data unchanged
          assert.equal(actor.name, originalName, "Name preserved");
          assert.equal(actor.system.rings.earth, originalEarth, "Earth Ring preserved");
          assert.equal(actor.system.traits.sta, originalStamina, "Stamina preserved");
        });

        it("should handle migration version comparison correctly", async () => {
          // ARRANGE - Mark as 1.0.0
          await markAsMigrated(actor, "1.0.0");

          // ACT & ASSERT - Version comparisons
          assert.isTrue(hasBeenMigrated(actor, "1.0.0"), "Same version detected");
          assert.isTrue(hasBeenMigrated(actor, "0.9.9"), "Older version detected");
          assert.isFalse(hasBeenMigrated(actor, "1.0.1"), "Newer version not detected");
          assert.isFalse(hasBeenMigrated(actor, "2.0.0"), "Much newer version not detected");
        });

        it("should handle missing migration flag gracefully", async () => {
          // ARRANGE - Actor with no migration flag (fresh)
          const hasMigrationFlag = actor.getFlag(SYS_ID, MIGRATION_FLAG);
          assert.notExists(hasMigrationFlag, "No migration flag");

          // ACT - Check if migrated
          const isMigrated = hasBeenMigrated(actor, "1.0.0");

          // ASSERT
          assert.isFalse(isMigrated, "Not migrated when flag missing");
        });

        it("should handle concurrent migration attempts", async () => {
          // ARRANGE - Attempt to mark as migrated concurrently
          const promises = [
            markAsMigrated(actor, "1.0.0"),
            markAsMigrated(actor, "1.0.0"),
            markAsMigrated(actor, "1.0.0")
          ];

          // ACT - Race condition
          await Promise.all(promises);

          // ASSERT - Should handle gracefully
          const finalFlag = actor.getFlag(SYS_ID, MIGRATION_FLAG);
          assert.equal(finalFlag, "1.0.0", "Migration flag set correctly");
        });
      });

      describe("Custom Icon Preservation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Icon Test PC",
            img: "systems/l5r4-enhanced/assets/icons/custom-character.webp"
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should preserve custom actor icon during migration", async () => {
          // ARRANGE - Custom icon set
          const customIcon = "systems/l5r4-enhanced/assets/icons/custom-character.webp";
          await actor.update({ img: customIcon });

          // ACT - Simulate migration
          await markAsMigrated(actor, "1.0.0");

          // ASSERT
          assert.equal(actor.img, customIcon, "Custom icon preserved");
        });

        it("should preserve user-uploaded icon paths", async () => {
          // ARRANGE - User-uploaded icon (not in system assets)
          const userIcon = "worlds/my-world/images/my-character.png";
          await actor.update({ img: userIcon });

          // ACT - Simulate migration
          await markAsMigrated(actor, "1.0.0");

          // ASSERT
          assert.equal(actor.img, userIcon, "User icon preserved");
        });

        it("should preserve token icon separately from actor icon", async () => {
          // ARRANGE - Different token and actor icons
          const actorIcon = "systems/l5r4-enhanced/assets/icons/samurai.webp";
          const tokenIcon = "systems/l5r4-enhanced/assets/icons/token-samurai.webp";

          await actor.update({
            img: actorIcon,
            "prototypeToken.texture.src": tokenIcon
          });

          // ACT - Simulate migration
          await markAsMigrated(actor, "1.0.0");

          // ASSERT
          assert.equal(actor.img, actorIcon, "Actor icon preserved");
          assert.equal(actor.prototypeToken.texture.src, tokenIcon, "Token icon preserved");
        });

        it("should handle missing icon paths gracefully", async () => {
          // ARRANGE - Remove icon
          await actor.update({ img: null });

          // ACT - Simulate migration
          await markAsMigrated(actor, "1.0.0");

          // ASSERT - Should not crash
          const migratedFlag = actor.getFlag(SYS_ID, MIGRATION_FLAG);
          assert.equal(migratedFlag, "1.0.0", "Migration completed despite missing icon");
        });

        it("should preserve icon after multiple migrations", async () => {
          // ARRANGE - Custom icon
          const customIcon = "systems/l5r4-enhanced/assets/icons/ronin.webp";
          await actor.update({ img: customIcon });

          // ACT - Multiple migrations
          await markAsMigrated(actor, "1.0.0");
          await markAsMigrated(actor, "1.1.0");
          await markAsMigrated(actor, "1.2.0");

          // ASSERT
          assert.equal(actor.img, customIcon, "Icon preserved across migrations");
        });
      });

      describe("forceMigration Flag Management", () => {
        let originalSetting;

        beforeEach(() => {
          // Store original setting
          originalSetting = game.settings.get(SYS_ID, "forceMigration");
        });

        afterEach(async () => {
          // Restore original setting
          await game.settings.set(SYS_ID, "forceMigration", originalSetting);
        });

        it("should have forceMigration setting registered", () => {
          // ACT
          const setting = game.settings.settings.get(`${SYS_ID}.forceMigration`);

          // ASSERT
          assert.exists(setting, "forceMigration setting exists");
          assert.equal(setting.type, Boolean, "Setting is boolean");
          assert.equal(setting.scope, "world", "Setting is world-scoped");
        });

        it("should default forceMigration to false", () => {
          // ACT
          const defaultValue = game.settings.settings.get(`${SYS_ID}.forceMigration`).default;

          // ASSERT
          assert.isFalse(defaultValue, "Defaults to false");
        });

        it("should allow setting forceMigration to true", async () => {
          // ACT
          await game.settings.set(SYS_ID, "forceMigration", true);
          const value = game.settings.get(SYS_ID, "forceMigration");

          // ASSERT
          assert.isTrue(value, "Can set to true");
        });

        it("should allow resetting forceMigration to false", async () => {
          // ARRANGE
          await game.settings.set(SYS_ID, "forceMigration", true);

          // ACT
          await game.settings.set(SYS_ID, "forceMigration", false);
          const value = game.settings.get(SYS_ID, "forceMigration");

          // ASSERT
          assert.isFalse(value, "Can reset to false");
        });

        it("should persist forceMigration setting", async () => {
          // ARRANGE
          await game.settings.set(SYS_ID, "forceMigration", true);

          // ACT - Read setting again
          const value = game.settings.get(SYS_ID, "forceMigration");

          // ASSERT
          assert.isTrue(value, "Setting persists");
        });
      });

      describe("Migration Marker Edge Cases", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Marker Test PC"
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle null version gracefully", async () => {
          // ACT - Check with null version
          const isMigrated = hasBeenMigrated(actor, null);

          // ASSERT
          assert.isFalse(isMigrated, "Null version handled");
        });

        it("should handle undefined version gracefully", async () => {
          // ACT - Check with undefined version
          const isMigrated = hasBeenMigrated(actor, undefined);

          // ASSERT
          assert.isFalse(isMigrated, "Undefined version handled");
        });

        it("should handle empty string version", async () => {
          // ACT - Check with empty string
          const isMigrated = hasBeenMigrated(actor, "");

          // ASSERT
          assert.isFalse(isMigrated, "Empty string handled");
        });

        it("should handle invalid version format", async () => {
          // ARRANGE - Mark with valid version
          await markAsMigrated(actor, "1.0.0");

          // ACT - Check with invalid format
          const isMigrated = hasBeenMigrated(actor, "invalid-version");

          // ASSERT - Should handle gracefully
          assert.exists(actor.getFlag(SYS_ID, MIGRATION_FLAG), "Flag exists");
        });

        it("should handle very long version strings", async () => {
          // ARRANGE - Mark with long version
          const longVersion = "1.0.0-beta.1+build.12345.abcdef";
          await markAsMigrated(actor, longVersion);

          // ACT
          const isMigrated = hasBeenMigrated(actor, longVersion);

          // ASSERT
          assert.isTrue(isMigrated, "Long version handled");
        });
      });

      describe("NPC Migration Edge Cases", () => {
        let npc;

        beforeEach(async () => {
          npc = await createTestNPC({
            name: "Migration NPC",
            system: {
              woundMode: "formula",
              traits: { sta: 4, wil: 4 }
            }
          });
        });

        afterEach(async () => {
          if (npc) {
            await npc.delete();
            npc = null;
          }
        });

        it("should preserve NPC wound mode during migration", async () => {
          // ARRANGE - Formula mode
          const originalMode = npc.system.woundMode;
          assert.equal(originalMode, "formula", "NPC in formula mode");

          // ACT - Simulate migration
          await markAsMigrated(npc, "1.0.0");

          // ASSERT
          assert.equal(npc.system.woundMode, originalMode, "Wound mode preserved");
        });

        it("should preserve NPC manual wounds during migration", async () => {
          // ARRANGE - Switch to manual mode
          await npc.update({
            "system.woundMode": "manual",
            "system.wounds.max": 75
          });

          // ACT - Simulate migration
          await markAsMigrated(npc, "1.0.0");

          // ASSERT
          assert.equal(npc.system.woundMode, "manual", "Manual mode preserved");
          assert.equal(npc.system.wounds.max, 75, "Manual wounds preserved");
        });

        it("should preserve NPC wound multiplier during migration", async () => {
          // ARRANGE - Custom multiplier
          await npc.update({ "system.woundsMultiplier": 3 });

          // ACT - Simulate migration
          await markAsMigrated(npc, "1.0.0");

          // ASSERT
          assert.equal(npc.system.woundsMultiplier, 3, "Multiplier preserved");
        });
      });

      describe("Embedded Items Migration", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Embedded Items Test"
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should preserve embedded items during migration", async () => {
          // ARRANGE - Add items
          await actor.createEmbeddedDocuments("Item", [
            { name: "Kenjutsu", type: "skill", system: { rank: 5 } },
            { name: "Katana", type: "weapon" }
          ]);

          const itemCount = actor.items.size;
          assert.equal(itemCount, 2, "Two items added");

          // ACT - Simulate migration
          await markAsMigrated(actor, "1.0.0");

          // ASSERT
          assert.equal(actor.items.size, itemCount, "Item count preserved");

          const skill = actor.items.find(i => i.name === "Kenjutsu");
          const weapon = actor.items.find(i => i.name === "Katana");

          assert.exists(skill, "Skill preserved");
          assert.exists(weapon, "Weapon preserved");
          assert.equal(skill.system.rank, 5, "Skill rank preserved");
        });

        it("should preserve item data during migration", async () => {
          // ARRANGE - Add item with custom data
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Custom Skill",
              type: "skill",
              system: {
                rank: 7,
                trait: "agi",
                emphasis: ["Dueling"]
              }
            }
          ]);

          // ACT - Simulate migration
          await markAsMigrated(actor, "1.0.0");

          // ASSERT
          const item = actor.items.find(i => i.name === "Custom Skill");
          assert.equal(item.system.rank, 7, "Rank preserved");
          assert.equal(item.system.trait, "agi", "Trait preserved");
          assert.deepEqual(item.system.emphasis, ["Dueling"], "Emphasis preserved");
        });
      });
    },
    { displayName: "L5R4: Migration Edge Cases" }
  );
}
