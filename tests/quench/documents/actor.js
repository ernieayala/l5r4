/**
 * Actor documents: creation with default and custom Traits, the XP flags, derived Initiative, Armor TN,
 * Wound levels, and Insight, and derived data recalculated on update and on each reset.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestNPC, createTestPC } from "../../fixtures/actor-fixtures.js";

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

        // game-rules/25_rings_and_traits.md, p.78
        it("should start a new PC with Void Points equal to its Void Ring", async () => {
          actor = await Actor.create({ name: "Void Points PC", type: "pc" });
          assert.equal(actor.system.rings.void.value, 2, "the default Void Ring 2");
          await actor.delete();

          actor = await Actor.create({
            name: "Void Points PC",
            type: "pc",
            system: { rings: { void: { rank: 3 } } }
          });
          assert.equal(actor.system.rings.void.value, 3, "a Void Ring given at creation");
        });

        it("should keep the Void Points a new PC's data gives", async () => {
          actor = await Actor.create({
            name: "Void Points PC",
            type: "pc",
            system: { rings: { void: { rank: 3, value: 1 } } }
          });
          assert.equal(actor.system.rings.void.value, 1);
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

      // L5R4Actor.prepareDerivedData runs the PC and NPC preparation between core's "initial" and "final" Active
      // Effect phases (docs/code-system/foundry-patterns.md, Preparation order)
      describe("Preparation in core's cycle", () => {
        const actors = [];
        const track = created => (actors.push(created), created);

        afterEach(async () => {
          for (const created of actors.splice(0)) {
            await created.delete();
          }
        });

        it("should derive a PC's Rings, Armor TN, and Insight when an update prepares it", async () => {
          const pc = track(await createTestPC({ name: "Preparation: update" }));
          await pc.update({
            "system.traits.ref": 3,
            "system.traits.awa": 4,
            "system.traits.sta": 3,
            "system.traits.wil": 3
          });
          assert.equal(pc.system.rings.air, 3, "Air = lower of Reflexes 3 and Awareness 4");
          assert.equal(pc.system.rings.earth, 3, "Earth = lower of Stamina 3 and Willpower 3");
          assert.equal(pc.system.armorTn.base, 20, "Reflexes 3 x 5 + 5");
          assert.equal(
            pc.system.insight.points,
            120,
            "(Air 3 + Earth 3 + Fire 2 + Water 2 + Void 2) x 10"
          );
        });

        it("should rebuild a PC's and an NPC's values from the stored data in reset", async () => {
          const pc = track(
            await createTestPC({ name: "Preparation: PC", system: { traits: { ref: 3 } } })
          );
          const npc = track(await createTestNPC({ name: "Preparation: NPC" }));
          // Wipe the prepared values and change a stored one in memory only: reset rebuilds the system data from
          // _source, then prepares it
          pc.system.traits.ref = 9;
          pc.system.rings.air = 0;
          pc.system.armorTn.base = 0;
          pc.system.insight.points = 0;
          npc.system.initiative.roll = 0;
          pc.reset();
          npc.reset();
          assert.equal(pc.system.traits.ref, 3, "the stored Reflexes");
          assert.equal(pc.system.rings.air, 2, "Air = lower of Reflexes 3 and Awareness 2");
          assert.equal(pc.system.armorTn.base, 20, "Reflexes 3 x 5 + 5");
          assert.equal(pc.system.insight.points, 100, "five Rings at 2, x 10");
          // An NPC counts as Insight Rank 1 (Ernie's ruling): (1 + Reflexes 2)k2
          assert.equal(npc.system.initiative.roll, 3);
          assert.equal(npc.system.initiative.keep, 2);
        });

        // Fails if preparation adds into anything a reset keeps: the stored data, the items, or module state
        it("should give the same values when reset runs again", async () => {
          const pc = track(await createTestPC({ name: "Preparation: again" }));
          await pc.createEmbeddedDocuments("Item", [
            {
              name: "Preparation rules",
              type: "advantage",
              system: {
                rules: [
                  { key: "TraitAdjust", trait: "void", value: 1 },
                  { key: "Initiative", roll: 1, keep: 1, total: 2 },
                  { key: "Wounds", perRank: 3, penalty: 1 }
                ]
              }
            }
          ]);
          await pc.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Preparation change",
              system: { changes: [{ key: "system.armorTn.mod", type: "add", value: "5" }] }
            }
          ]);
          const prepared = () => ({
            voidRank: pc.system.rings.void.rank,
            initiativeRoll: pc.system.initiative.roll,
            initiativeKeep: pc.system.initiative.keep,
            initiativeTotal: pc.system.initiative.totalMod,
            healthy: pc.system.woundLevels.healthy.value,
            nickedPenalty: pc.system.woundLevels.nicked.penaltyEff,
            armorTn: pc.system.armorTn.current
          });
          const expected = {
            voidRank: 3,
            // Insight Rank 1 + Reflexes 2 + 1, keep Reflexes 2 + 1
            initiativeRoll: 4,
            initiativeKeep: 3,
            initiativeTotal: 2,
            // Earth 2 x 5 + 3
            healthy: 13,
            // Nicked +3, plus 1
            nickedPenalty: 4,
            // Reflexes 2 x 5 + 5, plus 5
            armorTn: 20
          };
          assert.deepEqual(prepared(), expected, "after the creations");
          pc.reset();
          pc.reset();
          assert.deepEqual(prepared(), expected, "after two more resets");
        });

        it("should prepare derived values after the initial effect phase and before the final one", async () => {
          const pc = track(await createTestPC({ name: "Preparation: phases" }));
          await pc.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Preparation phases",
              system: {
                changes: [
                  { key: "system.traits.ref", type: "add", value: "1", phase: "initial" },
                  { key: "system.armorTn.current", type: "override", value: "99", phase: "final" }
                ]
              }
            }
          ]);
          for (const when of ["after the creation", "after reset"]) {
            assert.equal(pc.system.armorTn.base, 20, `${when}: Reflexes 3 from the initial phase`);
            assert.equal(pc.system.armorTn.current, 99, `${when}: the final phase comes last`);
            pc.reset();
          }
        });
      });
    },
    { displayName: "L5R4: Actor document" }
  );
}
