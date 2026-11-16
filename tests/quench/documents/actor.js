/**
 * Actor documents: creation with default and custom Traits, the XP flags, derived Initiative, Armor TN,
 * Wound levels, and Insight, and derived data recalculated on update.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register the batch.
 * @param {object} quench - The Quench API
 */
export function registerActorTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.actor`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Actor creation", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should create PC with default values", async () => {
          actor = await createTestPC({ name: "Default PC" });

          assert.exists(actor.system, "System data exists");
          assert.exists(actor.system.rings, "Rings exist");
          assert.exists(actor.system.traits, "Traits exist");
          assert.equal(actor.system.rings.earth, 2, "Earth Ring defaults to 2");
        });

        it("should create PC with custom rings", async () => {
          actor = await createTestPC({
            name: "Custom PC",
            system: {
              // Rings are DERIVED from traits: earth = min(sta, wil)
              traits: {
                sta: 4,
                wil: 5, // Earth = min(4, 5) = 4
                ref: 3,
                awa: 4, // Air = min(3, 4) = 3
                agi: 5,
                int: 6, // Fire = min(5, 6) = 5
                str: 3,
                per: 4 // Water = min(3, 4) = 3
              },
              rings: { void: { rank: 2 } }
            }
          });

          assert.equal(actor.system.rings.earth, 4, "Earth Ring calculated correctly from traits");
          assert.equal(actor.system.rings.fire, 5, "Fire Ring calculated correctly from traits");
        });

        it("should initialize XP flags for PC", async () => {
          actor = await createTestPC({ name: "XP Test PC" });

          const flags = actor.flags[SYS_ID];
          assert.exists(flags, "System flags exist");
          assert.isArray(flags.xpManual, "xpManual is array");
          assert.isArray(flags.xpSpent, "xpSpent is array");
          assert.equal(flags.xpBase, 40, "xpBase defaults to 40");
        });
      });

      describe("Actor prepareDerivedData", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Derived Data Test",
            system: {
              rings: { earth: 3, air: 2, fire: 2, water: 2, void: { rank: 2 } },
              traits: {
                sta: 3,
                wil: 3,
                ref: 3,
                awa: 2,
                agi: 2,
                int: 2,
                str: 2,
                per: 2
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should calculate initiative values", () => {
          assert.exists(actor.system.initiative, "Initiative object exists");
          assert.isNumber(actor.system.initiative.roll, "Initiative roll is number");
          assert.isNumber(actor.system.initiative.keep, "Initiative keep is number");
        });

        it("should calculate Armor TN", () => {
          assert.exists(actor.system.armorTn, "Armor TN object exists");
          assert.isNumber(actor.system.armorTn.current, "Armor TN current is number");

          // Armor TN = (Reflexes × 5) + 5 + armor bonus
          // With Reflexes 3: (3 × 5) + 5 = 20
          const expectedBaseTN = 3 * 5 + 5;
          assert.equal(
            actor.system.armorTn.base,
            expectedBaseTN,
            "Base Armor TN calculated correctly"
          );
        });

        it("should calculate wound levels from Earth Ring", () => {
          assert.exists(actor.system.woundLevels, "Wound levels exist");
          assert.exists(actor.system.woundLevels.healthy, "Healthy level exists");
          assert.exists(actor.system.woundLevels.out, "Out level exists");

          // Healthy = Earth × 5 = 3 × 5 = 15
          assert.equal(
            actor.system.woundLevels.healthy.value,
            15,
            "Healthy wounds calculated correctly"
          );
        });

        it("should calculate insight points", () => {
          assert.exists(actor.system.insight, "Insight object exists");
          assert.isNumber(actor.system.insight.points, "Insight points is number");

          // Insight = (Rings × 10) + Skills
          // Rings: 3 + 2 + 2 + 2 + 2 = 11, Skills: 0
          // 11 × 10 = 110
          assert.equal(actor.system.insight.points, 110, "Insight points calculated correctly");
        });
      });

      describe("Actor updates", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Update Test",
            system: {
              // Rings are DERIVED from traits
              traits: { sta: 3, wil: 3 } // Earth = min(3, 3) = 3
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should recalculate derived data on update", async () => {
          const oldHealthy = actor.system.woundLevels.healthy.value;

          // Update traits to change derived earth ring (earth = min(sta, wil))
          await actor.update({ "system.traits.sta": 5, "system.traits.wil": 5 });

          const newHealthy = actor.system.woundLevels.healthy.value;
          assert.notEqual(newHealthy, oldHealthy, "Wound levels recalculated");
          assert.equal(newHealthy, 25, "New healthy level correct (5 × 5)");
        });

        it("should track wound damage", async () => {
          await actor.update({ "system.suffered": 10 });

          assert.equal(actor.system.suffered, 10, "Suffered wounds recorded");
        });
      });
    },
    { displayName: "L5R4: Actor document" }
  );
}
