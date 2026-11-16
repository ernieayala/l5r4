/**
 * Actor XP: a PC's XP flags and breakdown, Insight points and Insight Rank, and NPCs carrying no XP.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register the batch.
 * @param {object} quench - The Quench API
 */
export function registerActorXpTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.actor-xp`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("PC XP initialization", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP Test PC" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should initialize XP flags for PC", () => {
          const flags = actor.flags[SYS_ID];

          assert.exists(flags, "System flags exist");
          assert.exists(flags.xpBase, "xpBase flag exists");
          assert.exists(flags.xpManual, "xpManual flag exists");
          assert.exists(flags.xpSpent, "xpSpent flag exists");

          assert.equal(flags.xpBase, 40, "Default xpBase is 40");
          assert.isArray(flags.xpManual, "xpManual is array");
          assert.isArray(flags.xpSpent, "xpSpent is array");
        });

        it("should calculate insight points from rings", () => {
          assert.exists(actor.system.insight, "Insight object exists");
          assert.isNumber(actor.system.insight.points, "Insight points is number");

          // Default rings: 2+2+2+2+2 = 10
          // Insight = (10 × 10) + skills = 100 + 0 = 100
          const expectedInsight = 100;
          assert.equal(
            actor.system.insight.points,
            expectedInsight,
            "Insight calculated correctly"
          );
        });

        it("should calculate insight rank from insight points", () => {
          assert.exists(actor.system.insight.rank, "Insight rank exists");
          assert.isNumber(actor.system.insight.rank, "Insight rank is number");

          // With 100 insight points, should be rank 1 (0-149)
          assert.equal(actor.system.insight.rank, 1, "Insight rank is 1");
        });
      });

      describe("Insight Rank progression", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Rank Progression Test",
            system: {
              traits: {
                sta: 3,
                wil: 3, // Earth = 3
                ref: 3,
                awa: 3, // Air = 3
                agi: 3,
                int: 3, // Fire = 3
                str: 3,
                per: 3 // Water = 3
              },
              rings: { void: { rank: 3 } }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should reach rank 2 with sufficient insight", async () => {
          // Rings: 3+3+3+3+3 = 15, Insight = 150
          // Need to add skills to reach 150
          await actor.createEmbeddedDocuments("Item", [
            { name: "Skill1", type: "skill", system: { rank: 10 } },
            { name: "Skill2", type: "skill", system: { rank: 10 } },
            { name: "Skill3", type: "skill", system: { rank: 10 } },
            { name: "Skill4", type: "skill", system: { rank: 10 } },
            { name: "Skill5", type: "skill", system: { rank: 10 } }
          ]);

          // Force re-preparation
          actor.reset();

          const insight = actor.system.insight.points;
          assert.isAtLeast(insight, 150, "Insight at least 150");
          assert.isAtLeast(actor.system.insight.rank, 2, "Insight rank at least 2");
        });
      });

      describe("XP tracking", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP Tracking Test" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have XP breakdown in system._xp", () => {
          assert.exists(actor.system._xp, "XP breakdown exists");
          assert.exists(actor.system._xp.total, "Total XP exists");
          assert.exists(actor.system._xp.spent, "Spent XP exists");
          assert.exists(actor.system._xp.available, "Available XP exists");
        });

        it("should start with base XP available", () => {
          const total = actor.system._xp.total;
          const base = actor.flags[SYS_ID].xpBase;

          assert.isAtLeast(total, base, "Total XP includes base");
        });

        it("should calculate available XP", () => {
          const total = actor.system._xp.total;
          const spent = actor.system._xp.spent;
          const available = actor.system._xp.available;

          assert.equal(available, total - spent, "Available = Total - Spent");
        });
      });

      describe("NPC XP handling", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
            npc = null;
          }
        });

        it("should not initialize XP flags for NPCs", async () => {
          npc = await createTestNPC({ name: "Test NPC" });

          const flags = npc.flags[SYS_ID];

          // NPCs should not have xpBase, xpManual, xpSpent
          assert.isUndefined(flags?.xpBase, "NPC has no xpBase");
          assert.isUndefined(flags?.xpManual, "NPC has no xpManual");
        });

        it("should not have _xp breakdown for NPCs", async () => {
          npc = await createTestNPC({ name: "Test NPC" });

          assert.isUndefined(npc.system._xp, "NPC has no XP breakdown");
        });
      });
    },
    { displayName: "L5R4: Actor XP" }
  );
}
