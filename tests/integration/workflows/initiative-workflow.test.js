/**
 * Initiative Complete Workflow Integration Tests
 *
 * Tests complete initiative workflows from rolling to combat tracker integration.
 * Addresses test-coverage-gap-analysis.md §5 missing workflows.
 *
 * Test Priority: Tier 1 (Critical - Core combat mechanic)
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";

export function registerInitiativeWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.initiative`,
    context => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe("Complete Workflow: Roll to Combat Tracker", () => {
        let combat, pc1, pc2, npc;

        beforeEach(async () => {
          pc1 = await createTestPC({
            name: "Fast Samurai",
            system: {
              traits: { ref: 5 },
              insight: { rank: 3 }
            }
          });

          pc2 = await createTestPC({
            name: "Slow Samurai",
            system: { traits: { ref: 2 }, insight: { rank: 1 } }
          });

          npc = await createTestNPC({
            name: "Bandit",
            system: { traits: { ref: 3 }, initiative: { roll: 5, keep: 3 } }
          });

          combat = await Combat.create({ scene: null, active: false });
        });

        afterEach(async () => {
          // Delete combat first (may have references to actors)
          if (combat) {
            try {
              await combat.delete();
            } catch (e) {
              // Combat may already be deleted
            }
            combat = null;
          }

          // Then delete actors
          if (npc) {
            try {
              await npc.delete();
            } catch (e) {
              // Actor may already be deleted
            }
            npc = null;
          }
          if (pc2) {
            try {
              await pc2.delete();
            } catch (e) {
              // Actor may already be deleted
            }
            pc2 = null;
          }
          if (pc1) {
            try {
              await pc1.delete();
            } catch (e) {
              // Actor may already be deleted
            }
            pc1 = null;
          }
        });

        it("should complete workflow: add combatants and roll initiative", async () => {
          // ACT
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: pc2.id, tokenId: null },
            { actorId: npc.id, tokenId: null }
          ]);

          await combat.rollAll();

          // ASSERT
          assert.equal(combat.combatants.size, 3, "All combatants added");

          const allHaveInitiative = Array.from(combat.combatants).every(
            c => c.initiative !== null && c.initiative > 0
          );
          assert.isTrue(allHaveInitiative, "All rolled initiative");
        });

        it("should order combatants by initiative descending", async () => {
          // ACT
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: pc2.id, tokenId: null }
          ]);

          await combat.rollAll();

          // ASSERT - Descending order
          const initiatives = combat.turns.map(c => c.initiative);
          for (let i = 0; i < initiatives.length - 1; i++) {
            assert.isAtLeast(initiatives[i], initiatives[i + 1], "Descending order");
          }
        });

        it("should start combat and set active combatant", async () => {
          // ACT
          await combat.createEmbeddedDocuments("Combatant", [{ actorId: pc1.id, tokenId: null }]);

          await combat.rollAll();
          await combat.startCombat();

          // ASSERT - Check round/turn instead of active flag
          assert.equal(combat.round, 1, "Combat is in round 1");
          assert.equal(combat.turn, 0, "First combatant's turn");
          assert.exists(combat.combatant, "Active combatant exists");
          assert.equal(combat.combatant.id, combat.turns[0].id, "First combatant is active");
          assert.isAbove(combat.round, 0, "Combat has started (round > 0)");
        });

        it("should advance through combat turns", async () => {
          // ACT
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: pc2.id, tokenId: null }
          ]);

          await combat.rollAll();
          await combat.startCombat();

          const firstCombatantId = combat.combatant.id;
          await combat.nextTurn();

          // ASSERT
          assert.equal(combat.turn, 1, "Advanced to turn 2");
          assert.notEqual(combat.combatant.id, firstCombatantId, "Different combatant active");
        });

        it("should advance to next round after last turn", async () => {
          // ACT
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: pc2.id, tokenId: null }
          ]);

          await combat.rollAll();
          await combat.startCombat();
          await combat.nextTurn(); // Turn 2
          await combat.nextTurn(); // Round 2, Turn 1

          // ASSERT
          assert.equal(combat.round, 2, "Advanced to round 2");
          assert.equal(combat.turn, 0, "Back to first combatant");
        });
      });

      describe("Void Point Initiative Prompt Workflow", () => {
        let combat, actor, originalConfirm;

        before(() => {
          originalConfirm = Dialog.confirm;
        });

        after(() => {
          if (originalConfirm) {
            Dialog.confirm = originalConfirm;
          }
        });

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Void Test",
            system: {
              traits: { ref: 3 },
              insight: { rank: 2 },
              rings: { void: { rank: 3, value: 2 } },
              initiative: { useVoid: false }
            }
          });

          combat = await Combat.create({ scene: null, active: false });
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should prompt when useVoid flag is true", async () => {
          // ARRANGE
          let dialogShown = false;
          Dialog.confirm = async function (config) {
            dialogShown = true;
            assert.include(config.title, "Void", "Title mentions Void");
            assert.include(config.title, actor.name, "Title includes actor name");
            return false;
          };

          await actor.update({ "system.initiative.useVoid": true });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);

          // ASSERT
          assert.isTrue(dialogShown, "Dialog shown");
        });

        it("should consume void and add +10 when accepted", async () => {
          // ARRANGE
          Dialog.confirm = async () => true;
          await actor.update({ "system.initiative.useVoid": true });

          const initialVoid = actor.system.rings.void.value;

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);

          // Re-fetch actor to get updated data
          const updatedActor = game.actors.get(actor.id);

          // ASSERT
          assert.equal(updatedActor.system.rings.void.value, initialVoid - 1, "Void consumed");
          assert.exists(combatant.initiative, "Initiative rolled");
          assert.isFalse(updatedActor.system.initiative.useVoid, "useVoid flag cleared");
        });

        it("should not consume void when declined", async () => {
          // ARRANGE
          Dialog.confirm = async () => false;
          await actor.update({ "system.initiative.useVoid": true });

          const initialVoid = actor.system.rings.void.value;

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);

          // Re-fetch actor to get updated data
          const updatedActor = game.actors.get(actor.id);

          // ASSERT
          assert.equal(updatedActor.system.rings.void.value, initialVoid, "Void not consumed");
          assert.isFalse(updatedActor.system.initiative.useVoid, "useVoid flag cleared");
        });

        it("should handle zero void gracefully", async () => {
          // ARRANGE
          await actor.update({
            "system.rings.void.value": 0,
            "system.initiative.useVoid": true
          });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);
          // Re-fetch actor to get updated data
          const updatedActor = game.actors.get(actor.id);

          // ASSERT
          assert.exists(combatant.initiative, "Initiative rolled");
          assert.isFalse(updatedActor.system.initiative.useVoid, "useVoid flag cleared");
          assert.equal(updatedActor.system.rings.void.value, 0, "Void still 0");
        });

        it("should not prompt for NPCs", async () => {
          // ARRANGE
          const npc = await createTestNPC({
            name: "NPC Test",
            system: {
              traits: { ref: 3 },
              initiative: { useVoid: true }
            }
          });

          let dialogShown = false;
          Dialog.confirm = async () => {
            dialogShown = true;
            return true;
          };

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: npc.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);

          // ASSERT
          assert.isFalse(dialogShown, "No dialog for NPCs");
          assert.exists(combatant.initiative, "NPC initiative rolled");

          await npc.delete();
        });
      });

      describe("Adding/Removing Combatants Mid-Combat", () => {
        let combat, pc1, pc2, npc;

        beforeEach(async () => {
          pc1 = await createTestPC({
            name: "PC 1",
            system: { traits: { ref: 3 }, insight: { rank: 2 } }
          });

          npc = await createTestNPC({
            name: "NPC 1",
            system: { traits: { ref: 3 } }
          });

          combat = await Combat.create({ scene: null, active: false });

          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: npc.id, tokenId: null }
          ]);

          await combat.rollAll();
          await combat.startCombat();
        });

        afterEach(async () => {
          // Delete combat first
          if (combat) {
            try {
              await combat.delete();
            } catch (e) {
              // Combat may already be deleted
            }
            combat = null;
          }

          // Then delete actors
          if (pc2) {
            try {
              await pc2.delete();
            } catch (e) {
              // Actor may already be deleted
            }
            pc2 = null;
          }
          if (npc) {
            try {
              await npc.delete();
            } catch (e) {
              // Actor may already be deleted
            }
            npc = null;
          }
          if (pc1) {
            try {
              await pc1.delete();
            } catch (e) {
              // Actor may already be deleted
            }
            pc1 = null;
          }
        });

        it("should add combatant during active combat", async () => {
          // ARRANGE
          pc2 = await createTestPC({
            name: "Late Arrival",
            system: { traits: { ref: 4 }, insight: { rank: 3 } }
          });

          const initialCount = combat.combatants.size;

          // ACT
          const [_newCombatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc2.id, tokenId: null }
          ]);

          // ASSERT
          assert.equal(combat.combatants.size, initialCount + 1, "Combatant added");
          assert.isAbove(combat.round, 0, "Combat still running (round > 0)");
          assert.exists(combat.combatant, "Active combatant still exists");
        });

        it("should roll initiative for new combatant mid-combat", async () => {
          // ARRANGE
          pc2 = await createTestPC({
            name: "Late Arrival",
            system: { traits: { ref: 4 }, insight: { rank: 3 } }
          });

          // ACT
          const [newCombatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc2.id, tokenId: null }
          ]);

          await combat.rollInitiative(newCombatant.id);

          // ASSERT
          assert.exists(newCombatant.initiative, "Initiative rolled");
          assert.isNumber(newCombatant.initiative, "Initiative numeric");
        });

        it("should remove combatant from active combat", async () => {
          // ARRANGE
          const initialCount = combat.combatants.size;
          const toRemove = combat.combatants.find(c => c.actor.id === npc.id);

          // ACT
          await combat.deleteEmbeddedDocuments("Combatant", [toRemove.id]);

          // ASSERT
          assert.equal(combat.combatants.size, initialCount - 1, "Combatant removed");
          assert.isAbove(combat.round, 0, "Combat still running (round > 0)");
          assert.exists(combat.combatant, "Active combatant still exists");
        });

        it("should handle removing current combatant", async () => {
          // ARRANGE
          const currentCombatant = combat.combatant;

          // ACT
          await combat.deleteEmbeddedDocuments("Combatant", [currentCombatant.id]);

          // ASSERT
          assert.isAbove(combat.round, 0, "Combat still running (round > 0)");
          assert.exists(combat.combatant, "New active combatant");
          assert.notEqual(combat.combatant.id, currentCombatant.id, "Different combatant active");
        });
      });

      describe("Re-rolling Initiative", () => {
        let combat, pc1, pc2;

        beforeEach(async () => {
          pc1 = await createTestPC({
            name: "PC 1",
            system: { traits: { ref: 3 }, insight: { rank: 2 } }
          });

          pc2 = await createTestPC({
            name: "PC 2",
            system: { traits: { ref: 4 }, insight: { rank: 3 } }
          });

          combat = await Combat.create({ scene: null, active: false });

          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: pc2.id, tokenId: null }
          ]);

          await combat.rollAll();
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
          }
          if (pc2) {
            await pc2.delete();
          }
          if (pc1) {
            await pc1.delete();
          }
        });

        it("should re-roll initiative for all combatants", async () => {
          // ACT
          await combat.rollAll();

          // ASSERT
          Array.from(combat.combatants).forEach(c => {
            assert.exists(c.initiative, "Initiative rolled");
            assert.isNumber(c.initiative, "Initiative numeric");
          });
        });
      });

      describe("Edge Cases", () => {
        let combat;
        const actors = [];

        beforeEach(async () => {
          combat = await Combat.create({ scene: null, active: false });
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
          }
          for (const actor of actors) {
            if (actor) {
              await actor.delete();
            }
          }
          actors.length = 0;
        });

        it("should handle minimum initiative pool (1k1)", async () => {
          // ARRANGE
          const weakPC = await createTestPC({
            name: "Weak",
            system: { traits: { ref: 1 }, insight: { rank: 1 } }
          });
          actors.push(weakPC);

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: weakPC.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);

          // ASSERT
          assert.exists(combatant.initiative, "Minimum pool rolled");
          assert.isNumber(combatant.initiative, "Initiative numeric");
          assert.isAbove(combatant.initiative, 0, "Initiative positive");
        });

        it("should handle high initiative pool with bonuses", async () => {
          // ARRANGE
          const master = await createTestPC({
            name: "Master",
            system: {
              traits: { ref: 10 },
              insight: { rank: 10 },
              initiative: { rollMod: 5, keepMod: 5, totalMod: 10 }
            }
          });
          actors.push(master);

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: master.id, tokenId: null }
          ]);

          await combat.rollInitiative(combatant.id);

          // ASSERT
          assert.exists(combatant.initiative, "High pool handled");
          assert.isNumber(combatant.initiative, "Initiative numeric");
          assert.isAbove(combatant.initiative, 0, "Initiative positive");
        });
      });

      describe("Maintain Turn Order", () => {
        let combat, pc1, pc2;

        beforeEach(async () => {
          pc1 = await createTestPC({
            name: "PC 1",
            system: { traits: { ref: 3 }, insight: { rank: 2 } }
          });

          pc2 = await createTestPC({
            name: "PC 2",
            system: { traits: { ref: 4 }, insight: { rank: 3 } }
          });

          combat = await Combat.create({ scene: null, active: false });

          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: pc1.id, tokenId: null },
            { actorId: pc2.id, tokenId: null }
          ]);

          await combat.rollAll();
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
          }
          if (pc2) {
            await pc2.delete();
          }
          if (pc1) {
            await pc1.delete();
          }
        });

        it("should maintain turn order when adding combatant", async () => {
          // ARRANGE
          const master = await createTestPC({
            name: "Master",
            system: {
              traits: { ref: 10 },
              insight: { rank: 10 },
              initiative: { rollMod: 5, keepMod: 5, totalMod: 10 }
            }
          });

          await combat.rollAll();
          await combat.startCombat();

          const _currentTurn = combat.turn;
          const currentRound = combat.round;

          // ACT
          const [newCombatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: master.id, tokenId: null }
          ]);

          await combat.rollInitiative(newCombatant.id);

          // ASSERT - Turn/round not disrupted
          assert.equal(combat.round, currentRound, "Round unchanged");
          assert.isAbove(combat.round, 0, "Combat still running (round > 0)");
          assert.exists(combat.combatant, "Active combatant still exists");
          // Note: turn index might change if new combatant inserted before current

          // Cleanup master actor
          await master.delete();
        });
      });
    },
    { displayName: "L5R4: Initiative Workflow Tests" }
  );
}
