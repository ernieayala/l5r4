/**
 * Actor Wounds: Wound levels from the Earth Ring, suffered Wounds and the current level, NPC formula and
 * manual wound modes, and Wound penalties with their modifier.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register the batch.
 * @param {object} quench - The Quench API
 */
export function registerActorWoundsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.actor-wounds`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Wound calculation integration", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Wound Test PC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = min(3, 3) = 3
              woundsMultiplier: 2
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should calculate wound levels on actor creation", () => {
          assert.exists(actor.system.woundLevels, "Wound levels exist");
          assert.exists(actor.system.woundLevels.healthy, "Healthy level exists");
          assert.exists(actor.system.woundLevels.out, "Out level exists");

          // Healthy = Earth × 5 = 3 × 5 = 15
          assert.equal(actor.system.woundLevels.healthy.value, 15, "Healthy threshold correct");
        });

        it("should recalculate wounds when Earth Ring changes", async () => {
          const oldHealthy = actor.system.woundLevels.healthy.value;

          // Change Earth traits: sta 3→5, wil 3→5, so Earth 3→5
          await actor.update({
            "system.traits.sta": 5,
            "system.traits.wil": 5
          });

          const newHealthy = actor.system.woundLevels.healthy.value;
          assert.notEqual(newHealthy, oldHealthy, "Healthy threshold recalculated");
          assert.equal(newHealthy, 25, "New healthy threshold correct (5 × 5)");
        });

        it("should track suffered wounds", async () => {
          await actor.update({ "system.suffered": 10 });

          assert.equal(actor.system.suffered, 10, "Suffered wounds tracked");
          assert.exists(actor.system.wounds, "Wounds object exists");
        });

        it("should determine current wound level from suffered damage", async () => {
          // Set suffered to be in "nicked" range (between healthy and grazed)
          await actor.update({ "system.suffered": 16 });

          assert.exists(actor.system.woundLevels.nicked, "Nicked level exists");
          // Current wound level should be marked
          const hasCurrentLevel = Object.values(actor.system.woundLevels).some(
            lvl => lvl.current === true
          );
          assert.isTrue(hasCurrentLevel, "A wound level is marked as current");
        });

        it("should calculate wounds.max from out threshold", () => {
          assert.exists(actor.system.wounds, "Wounds object exists");
          assert.isNumber(actor.system.wounds.max, "Wounds max is number");
          assert.isTrue(actor.system.wounds.max > 0, "Wounds max is positive");
        });

        it("should calculate wounds.value as max minus suffered", async () => {
          const maxWounds = actor.system.wounds.max;
          await actor.update({ "system.suffered": 5 });

          assert.equal(
            actor.system.wounds.value,
            maxWounds - 5,
            "Current wounds calculated correctly"
          );
        });
      });

      describe("NPC wound modes", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
            npc = null;
          }
        });

        it("should support formula mode for NPCs", async () => {
          npc = await createTestNPC({
            name: "Formula NPC",
            system: {
              traits: { sta: 4, wil: 4 }, // Set traits so Earth = 4
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          assert.equal(npc.system.woundMode, "formula", "Formula mode set");
          assert.exists(npc.system.woundLevels.healthy, "Wound levels calculated");
          assert.equal(npc.system.rings.earth, 4, "Earth Ring is 4");
          assert.equal(npc.system.woundLevels.healthy.value, 20, "Healthy = 4 × 5");
        });

        it("should support manual mode for NPCs", async () => {
          npc = await createTestNPC({
            name: "Manual NPC",
            system: {
              woundMode: "manual",
              wounds: { max: 50 }
            }
          });

          assert.equal(npc.system.woundMode, "manual", "Manual mode set");
          assert.equal(npc.system.wounds.max, 50, "Manual max wounds set");
        });
      });

      describe("Wound penalties", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Penalty Test",
            system: {
              traits: { sta: 3, wil: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have penalty values for wound levels", () => {
          const nicked = actor.system.woundLevels.nicked;
          assert.exists(nicked, "Nicked level exists");
          assert.exists(nicked.penalty, "Nicked has penalty");
          assert.isNumber(nicked.penaltyEff, "Effective penalty is number");
        });

        it("should apply wound penalty modifier", async () => {
          const basePenalty = actor.system.woundLevels.nicked.penaltyEff;

          await actor.update({ "system.woundsPenaltyMod": 5 });

          const newPenalty = actor.system.woundLevels.nicked.penaltyEff;
          assert.isTrue(newPenalty >= basePenalty, "Penalty increased by modifier");
        });
      });
    },
    { displayName: "L5R4: Actor Wounds" }
  );
}
