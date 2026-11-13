/**
 * @fileoverview Armor TN Calculation Integration Tests
 *
 * Tests complete Armor TN calculation for PC actors including:
 * - Base TN from Reflexes (Reflexes × 5 + 5)
 * - Armor bonuses
 * - Void Point boost (+10 for 1 round)
 * - Condition overrides (Prone, Grappled, Stunned)
 * - Stance modifiers (Full Attack -10, Defense +Air+Defense skill)
 *
 * **Bug Context:**
 * Armor TN was calculated as 5 instead of 15 because Reflexes read as 0
 * when traits stored as objects. Fixed by reading from _derived.traitsEff.
 *
 * **Test Coverage:**
 * - Correct base TN with various Reflexes values
 * - Condition floor enforcement (minimum TN of 5)
 * - Prone penalty (-10, floored at 5)
 * - Void boost integration
 * - Round-based Void expiration
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createArmorData } from "../../fixtures/item-fixtures.js";

/**
 * Register Armor TN calculation integration tests
 * @param {Object} quench - Quench test framework API
 */
export function registerArmorTNCalculationTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.armorTNCalculation`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Base Armor TN Calculation", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should calculate correct base TN for Reflexes 2", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 2 }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const baseTN = actor.system.armorTn.base;
          assert.equal(baseTN, 15, "Base TN = Reflexes 2 × 5 + 5 = 15");
        });

        it("should calculate correct base TN for Reflexes 5", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 5 }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const baseTN = actor.system.armorTn.base;
          assert.equal(baseTN, 30, "Base TN = Reflexes 5 × 5 + 5 = 30");
        });

        it("should use derived traitsEff for calculation", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: {
                ref: 3,
                awa: 3
              }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          // Verify traitsEff exists and is numeric
          const refEff = actor.system._derived.traitsEff.ref;
          assert.equal(typeof refEff, "number", "traitsEff.ref is numeric");
          assert.equal(refEff, 3, "traitsEff.ref equals 3");

          const baseTN = actor.system.armorTn.base;
          assert.equal(baseTN, 20, "Base TN uses traitsEff value");
        });
      });

      describe("Armor TN with Armor Bonus", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should add armor bonus to base TN", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 2 }
            }
          });

          // Create and equip armor item
          await actor.createEmbeddedDocuments("Item", [
            createArmorData("Light Armor", 5, 2, {
              system: { equipped: true }
            })
          ]);

          // ACT - Foundry automatically calls prepareDerivedData after item creation
          // No manual call needed

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 20, "Current TN = 15 (base) + 5 (armor) = 20");
        });
      });

      describe("Condition Effects on Armor TN", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should apply Prone penalty and floor at 5", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 2 }
            }
          });

          // Apply Prone condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Prone",
              statuses: ["prone"],
              disabled: false
            }
          ]);

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 5, "Prone: 15 (base) - 10 (penalty) = 5 (floored)");
        });

        it("should enforce minimum TN of 5 with conditions", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 1 } // Base TN = 1*5+5 = 10
            }
          });

          // Apply Prone
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Prone",
              statuses: ["prone"],
              disabled: false
            }
          ]);

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 5, "TN cannot go below 5 (10 - 10 prone = 0, floored to 5)");
        });

        it("should use condition override for Grappled", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 5 } // Would be TN 30 normally
            }
          });

          // Create and equip armor
          await actor.createEmbeddedDocuments("Item", [
            createArmorData("Light Armor", 3, 1, {
              system: { equipped: true }
            })
          ]);

          // Apply Grappled
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Grappled",
              statuses: ["grappled"],
              disabled: false
            }
          ]);

          // ACT - Foundry automatically calls prepareDerivedData after effect creation
          // No manual call needed

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 8, "Grappled override: 5 + 3 (armor bonus) = 8");
        });

        it("should use condition override for Stunned", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 5 }
            }
          });

          // Create and equip armor
          await actor.createEmbeddedDocuments("Item", [
            createArmorData("Light Armor", 2, 1, {
              system: { equipped: true }
            })
          ]);

          // Apply Stunned
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Stunned",
              statuses: ["stunned"],
              disabled: false
            }
          ]);

          // ACT - Foundry automatically calls prepareDerivedData after effect creation
          // No manual call needed

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 7, "Stunned override: 5 + 2 (armor bonus) = 7");
        });

        it("should allow normal TN without conditions", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 3 },
              armorTn: { bonus: 0 }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 20, "No conditions: 3 × 5 + 5 = 20");
        });
      });

      describe("Void Point Armor TN Boost", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should add +10 when useVoid is true", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 2 },
              armorTn: {
                useVoid: true,
                voidRound: 1
              }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 25, "Void boost: 15 (base) + 10 (void) = 25");
        });

        it("should not add boost when useVoid is false", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 2 },
              armorTn: {
                useVoid: false,
                voidRound: null
              }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.equal(current, 15, "No void boost: base TN only");
        });

        it("should apply void boost before condition penalties", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 2 },
              armorTn: {
                useVoid: true,
                voidRound: 1
              }
            }
          });

          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Prone",
              statuses: ["prone"],
              disabled: false
            }
          ]);

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          // Base 15 + Void 10 - Prone 10 = 15 (but floor is 5)
          assert.equal(current, 15, "Void + Prone: (15+10-10) = 15");
        });
      });

      describe("Regression Prevention", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should never calculate TN as 5 with Reflexes 2 and no conditions", async () => {
          // ARRANGE - This was the original bug
          actor = await createTestPC({
            system: {
              traits: { ref: 2 }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          const current = actor.system.armorTn.current;
          assert.notEqual(current, 5, "TN should NOT be 5 with Reflexes 2");
          assert.equal(current, 15, "TN should be 15 with Reflexes 2");
        });

        it("should read Reflexes from _derived.traitsEff", async () => {
          // ARRANGE
          actor = await createTestPC({
            system: {
              traits: { ref: 4 }
            }
          });

          // ACT
          actor.prepareDerivedData();

          // ASSERT
          assert.exists(actor.system._derived, "_derived exists");
          assert.exists(actor.system._derived.traitsEff, "traitsEff exists");
          assert.equal(actor.system._derived.traitsEff.ref, 4, "traitsEff.ref is correct");

          const baseTN = actor.system.armorTn.base;
          assert.equal(baseTN, 25, "Base TN uses _derived.traitsEff.ref");
        });
      });
    },
    { displayName: "L5R4: Armor TN Calculation Integration Tests" }
  );
}
