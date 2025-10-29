/**
 * Melee Weapon Damage + Strength Integration Tests
 *
 * Tests that melee weapons correctly add actor Strength to damage rolls
 * per L5R4 Combat rules: "For melee attacks, characters add their Strength
 * to the first number of a weapon's DR."
 *
 * Bug Report Verification:
 * - Issue: "Kojin's katana damage: Only rolling 3-keep-2 base damage instead
 *   of adding her Strength modifier (should be 5-keep-2 or 6-keep-2)"
 * - Expected: Katana (3k2) + Strength 3 = 6k2 damage
 *
 * Test Priority: Tier 1 (Critical - Core combat mechanics)
 *
 * @see module/documents/item/preparation/melee-damage.js
 * @see module/documents/item/preparation/derived-data.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createWeaponData } from "../../fixtures/item-fixtures.js";

/**
 * Register melee damage + Strength tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerMeleeDamageStrengthTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.melee-damage-strength`,
    context => {
      const { describe, it, assert, after } = context;

      describe("Melee Damage: Strength Addition", () => {
        it("should add Strength to katana damage (Bug Report: Kojin scenario)", async () => {
          // ARRANGE - Create character matching bug report
          // Kojin with Strength 3, Katana 3k2
          const actor = await createTestPC({
            name: "Kojin",
            system: {
              traits: { str: 3 },
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: 2 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          // ACT - Get weapon and check derived damage values
          const weapon = actor.items.find(i => i.type === "weapon");
          assert.exists(weapon, "Weapon exists on actor");

          // Force prepareDerivedData to ensure calculations run
          weapon.prepareDerivedData();

          // ASSERT - Verify Strength is added to damage
          // Expected: Katana 3k2 + Strength 3 = 6k2
          assert.equal(
            weapon.system.derivedDamageRoll,
            6,
            "derivedDamageRoll should be 6 (weapon 3 + str 3)"
          );
          assert.equal(
            weapon.system.derivedDamageKeep,
            2,
            "derivedDamageKeep should be 2 (weapon keep unchanged)"
          );
          assert.equal(
            weapon.system.derivedDamageFormula,
            "6k2",
            "derivedDamageFormula should be '6k2'"
          );

          // Verify base values are unchanged
          assert.equal(weapon.system.damageRoll, 3, "Base damageRoll unchanged (3)");
          assert.equal(weapon.system.damageKeep, 2, "Base damageKeep unchanged (2)");

          // Cleanup
          await actor.delete();
        });

        it("should add Strength to various melee weapons", async () => {
          // ARRANGE - Character with Strength 4
          const actor = await createTestPC({
            name: "Strong Samurai",
            system: {
              traits: { str: 4 },
              rings: { earth: 3, air: 3, fire: 3, water: 3, void: 3 }
            }
          });

          // Create multiple weapon types
          await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2),
            createWeaponData("Tetsubo", 5, 2),
            createWeaponData("Tanto", 1, 1)
          ]);

          // ACT & ASSERT - Check each weapon
          const katana = actor.items.find(i => i.name === "Katana");
          katana.prepareDerivedData();
          assert.equal(katana.system.derivedDamageRoll, 7, "Katana: 3 + 4 = 7");
          assert.equal(katana.system.derivedDamageKeep, 2, "Katana keep: 2");

          const tetsubo = actor.items.find(i => i.name === "Tetsubo");
          tetsubo.prepareDerivedData();
          assert.equal(tetsubo.system.derivedDamageRoll, 9, "Tetsubo: 5 + 4 = 9");
          assert.equal(tetsubo.system.derivedDamageKeep, 2, "Tetsubo keep: 2");

          const tanto = actor.items.find(i => i.name === "Tanto");
          tanto.prepareDerivedData();
          assert.equal(tanto.system.derivedDamageRoll, 5, "Tanto: 1 + 4 = 5");
          assert.equal(tanto.system.derivedDamageKeep, 1, "Tanto keep: 1");

          // Cleanup
          await actor.delete();
        });

        it("should handle zero Strength", async () => {
          // ARRANGE - Character with Strength 0 (edge case)
          const actor = await createTestPC({
            name: "Weak Character",
            system: {
              traits: { str: 0 },
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: 2 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          // ACT
          const weapon = actor.items.find(i => i.type === "weapon");
          weapon.prepareDerivedData();

          // ASSERT - Should use base weapon damage only
          assert.equal(
            weapon.system.derivedDamageRoll,
            3,
            "derivedDamageRoll should be 3 (weapon 3 + str 0)"
          );
          assert.equal(weapon.system.derivedDamageKeep, 2, "Keep unchanged");

          // Cleanup
          await actor.delete();
        });

        it("should handle high Strength values", async () => {
          // ARRANGE - Character with very high Strength
          const actor = await createTestPC({
            name: "Mighty Warrior",
            system: {
              traits: { str: 8 },
              rings: { earth: 4, air: 4, fire: 4, water: 4, void: 4 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          // ACT
          const weapon = actor.items.find(i => i.type === "weapon");
          weapon.prepareDerivedData();

          // ASSERT
          assert.equal(
            weapon.system.derivedDamageRoll,
            11,
            "derivedDamageRoll should be 11 (weapon 3 + str 8)"
          );
          assert.equal(weapon.system.derivedDamageKeep, 2, "Keep unchanged");

          // Cleanup
          await actor.delete();
        });

        it("should recalculate when Strength changes", async () => {
          // ARRANGE
          const actor = await createTestPC({
            name: "Growing Samurai",
            system: {
              traits: { str: 2 },
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: 2 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          const weapon = actor.items.find(i => i.type === "weapon");
          weapon.prepareDerivedData();

          // ASSERT - Initial state
          assert.equal(weapon.system.derivedDamageRoll, 5, "Initial: 3 + 2 = 5");

          // ACT - Increase Strength
          await actor.update({ "system.traits.str": 4 });
          weapon.prepareDerivedData();

          // ASSERT - After Strength increase
          assert.equal(weapon.system.derivedDamageRoll, 7, "After update: 3 + 4 = 7");

          // Cleanup
          await actor.delete();
        });

        it("should handle unowned weapons (no actor)", async () => {
          // ARRANGE - Create weapon item without owner
          const weapon = await Item.create({
            name: "Unowned Katana",
            type: "weapon",
            system: {
              damageRoll: 3,
              damageKeep: 2,
              isBow: false
            }
          });

          // ACT
          weapon.prepareDerivedData();

          // ASSERT - Should use base damage without Strength
          assert.equal(
            weapon.system.derivedDamageRoll,
            3,
            "Unowned weapon uses base damage (no Strength)"
          );
          assert.equal(weapon.system.derivedDamageKeep, 2, "Keep unchanged");
          assert.equal(weapon.system.derivedDamageFormula, "3k2", "Formula is base");

          // Cleanup
          await weapon.delete();
        });
      });

      describe("Melee Damage: Edge Cases", () => {
        it("should handle undefined Strength trait", async () => {
          // ARRANGE - Actor with missing traits object
          const actor = await createTestPC({
            name: "Broken Character",
            system: {
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: 2 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          // ACT
          const weapon = actor.items.find(i => i.type === "weapon");
          weapon.prepareDerivedData();

          // ASSERT - Should handle gracefully, treating as 0 Strength
          assert.exists(weapon.system.derivedDamageRoll, "derivedDamageRoll exists");
          assert.isNumber(weapon.system.derivedDamageRoll, "derivedDamageRoll is number");
          assert.isAtLeast(
            weapon.system.derivedDamageRoll,
            3,
            "derivedDamageRoll at least base weapon damage"
          );

          // Cleanup
          await actor.delete();
        });

        it("should handle negative Strength (edge case)", async () => {
          // ARRANGE - Character with negative Strength (shouldn't happen, but test)
          const actor = await createTestPC({
            name: "Cursed Character",
            system: {
              traits: { str: -2 },
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: 2 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          // ACT
          const weapon = actor.items.find(i => i.type === "weapon");
          weapon.prepareDerivedData();

          // ASSERT - Should still calculate (3 + (-2) = 1)
          assert.equal(
            weapon.system.derivedDamageRoll,
            1,
            "Negative Strength reduces damage (3 + (-2) = 1)"
          );

          // Cleanup
          await actor.delete();
        });
      });
    },
    { displayName: "L5R4: Melee Damage + Strength Tests" }
  );
}
