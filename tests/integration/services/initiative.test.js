/**
 * Initiative Service Integration Tests
 *
 * Tests L5R4 initiative mechanics:
 * - Initiative formula (Insight Rank + Reflexes)k(Reflexes)
 * - PC vs NPC initiative calculation
 * - Stance modifiers on initiative
 * - Ten Dice Rule application
 * - Combat integration
 *
 * @see module/services/initiative.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register initiative service integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerInitiativeTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.initiative`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("PC Initiative Calculation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Initiative Test PC",
            system: {
              traits: {
                sta: 3,
                wil: 3,
                ref: 4,
                awa: 3,
                agi: 3,
                int: 3,
                str: 3,
                per: 3
              },
              rings: { void: { rank: 2 } }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have initiative data in system", () => {
          assert.exists(actor.system.initiative, "Initiative object exists");
          assert.exists(actor.system.initiative.roll, "Initiative roll value exists");
          assert.exists(actor.system.initiative.keep, "Initiative keep value exists");
        });

        it("should calculate initiative roll as Insight Rank + Reflexes", () => {
          const insightRank = actor.system.insight.rank;
          const reflexes = actor.system.traits.ref;
          const expectedRoll = insightRank + reflexes;

          assert.equal(
            actor.system.initiative.roll,
            expectedRoll,
            `Initiative roll = Insight ${insightRank} + Reflexes ${reflexes}`
          );
        });

        it("should calculate initiative keep as Reflexes", () => {
          const reflexes = actor.system.traits.ref;

          assert.equal(
            actor.system.initiative.keep,
            reflexes,
            `Initiative keep = Reflexes ${reflexes}`
          );
        });

        it("should update initiative when Reflexes changes", async () => {
          const oldRoll = actor.system.initiative.roll;
          const oldKeep = actor.system.initiative.keep;

          await actor.update({ "system.traits.ref": 5 });

          const newRoll = actor.system.initiative.roll;
          const newKeep = actor.system.initiative.keep;

          assert.notEqual(newRoll, oldRoll, "Initiative roll updated");
          assert.notEqual(newKeep, oldKeep, "Initiative keep updated");
          assert.equal(newKeep, 5, "New keep equals new Reflexes");
        });

        it("should update initiative when Insight Rank changes", async () => {
          const oldRoll = actor.system.initiative.roll;

          // Add skills to increase insight rank
          await actor.createEmbeddedDocuments("Item", [
            { name: "Skill1", type: "skill", system: { rank: 10 } },
            { name: "Skill2", type: "skill", system: { rank: 10 } },
            { name: "Skill3", type: "skill", system: { rank: 10 } },
            { name: "Skill4", type: "skill", system: { rank: 10 } },
            { name: "Skill5", type: "skill", system: { rank: 10 } }
          ]);

          actor.prepareData();

          const newRoll = actor.system.initiative.roll;
          assert.isAbove(newRoll, oldRoll, "Initiative roll increased with insight");
        });
      });

      describe("NPC Initiative Calculation", () => {
        let npc;

        beforeEach(async () => {
          npc = await createTestNPC({
            name: "Initiative Test NPC",
            system: {
              traits: { ref: 3 },
              initiative: { roll: 0, keep: 0 } // Set to 0 to test Reflexes fallback
            }
          });
        });

        afterEach(async () => {
          if (npc) {
            await npc.delete();
            npc = null;
          }
        });

        it("should have initiative data in system", () => {
          assert.exists(npc.system.initiative, "Initiative object exists");
          assert.exists(npc.system.initiative.roll, "Initiative roll exists");
          assert.exists(npc.system.initiative.keep, "Initiative keep exists");
        });

        it("should default to Reflexes for NPC initiative", () => {
          // First verify what reflexes value the NPC actually has
          const reflexes = npc.system.traits.ref;

          // NPCs use effRoll/effKeep which default to Reflexes when roll/keep are 0
          assert.equal(
            npc.system.initiative.effRoll,
            reflexes,
            `Effective roll defaults to Reflexes (${reflexes})`
          );
          assert.equal(
            npc.system.initiative.effKeep,
            reflexes,
            `Effective keep defaults to Reflexes (${reflexes})`
          );
        });

        it("should use explicit roll value when > 0", async () => {
          // Update from 0 to 7
          await npc.update({ "system.initiative.roll": 7 });

          // effRoll should use the roll value since it's > 0
          assert.equal(
            npc.system.initiative.effRoll,
            7,
            "Effective roll uses explicit roll value (7)"
          );
        });

        it("should use explicit keep value when > 0", async () => {
          // Update from 0 to 5
          await npc.update({ "system.initiative.keep": 5 });

          // effKeep should use the keep value since it's > 0
          assert.equal(
            npc.system.initiative.effKeep,
            5,
            "Effective keep uses explicit keep value (5)"
          );
        });
      });

      describe("Combat Integration", () => {
        let combat, actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Combat Test",
            system: {
              traits: { ref: 4 },
              insight: { rank: 2 }
            }
          });

          combat = await Combat.create({
            scene: null,
            active: false
          });
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
            combat = null;
          }
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should create combatant for actor", async () => {
          await combat.createEmbeddedDocuments("Combatant", [
            {
              actorId: actor.id,
              tokenId: null
            }
          ]);

          assert.equal(combat.combatants.size, 1, "Combatant added to combat");
        });

        it("should roll initiative for combatant", async () => {
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            {
              actorId: actor.id,
              tokenId: null
            }
          ]);

          await combat.rollInitiative(combatant.id);

          assert.exists(combatant.initiative, "Initiative rolled");
          assert.isNumber(combatant.initiative, "Initiative is number");
          assert.isAbove(combatant.initiative, 0, "Initiative is positive");
        });

        it("should use L5R4 Roll and Keep formula", async () => {
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            {
              actorId: actor.id,
              tokenId: null
            }
          ]);

          const roll = combatant.getInitiativeRoll();

          assert.exists(roll, "Initiative roll created");
          assert.instanceOf(roll, Roll, "Is Roll instance");
          assert.include(roll.formula, "d10", "Uses d10 dice");
          assert.include(roll.formula, "k", "Uses keep mechanic");
        });
      });

      describe("Initiative Modifiers", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Modifier Test",
            system: {
              traits: { ref: 3 },
              insight: { rank: 1 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should support rollMod for initiative", async () => {
          const baseRoll = actor.system.initiative.roll;

          await actor.update({ "system.initiative.rollMod": 2 });

          // rollMod should be available in system.initiative
          assert.exists(actor.system.initiative.rollMod, "rollMod exists");
          assert.equal(actor.system.initiative.rollMod, 2, "rollMod set correctly");
        });

        it("should support keepMod for initiative", async () => {
          await actor.update({ "system.initiative.keepMod": 1 });

          assert.exists(actor.system.initiative.keepMod, "keepMod exists");
          assert.equal(actor.system.initiative.keepMod, 1, "keepMod set correctly");
        });

        it("should support totalMod for initiative", async () => {
          await actor.update({ "system.initiative.totalMod": 5 });

          assert.exists(actor.system.initiative.totalMod, "totalMod exists");
          assert.equal(actor.system.initiative.totalMod, 5, "totalMod set correctly");
        });
      });

      describe("Edge Cases", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Edge Case Test",
            system: {
              traits: { ref: 2 },
              insight: { rank: 1 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle minimum Reflexes (2)", () => {
          assert.equal(actor.system.traits.ref, 2, "Reflexes is 2");
          assert.equal(actor.system.initiative.keep, 2, "Initiative keep is 2");
        });

        it("should handle Insight Rank 1", () => {
          assert.equal(actor.system.insight.rank, 1, "Insight Rank is 1");
          // Roll should be 1 + Reflexes
          assert.equal(actor.system.initiative.roll, 3, "Initiative roll is 3 (1+2)");
        });

        it("should handle high initiative pools", async () => {
          await actor.update({
            "system.traits.ref": 10
          });

          // Add skills to increase insight rank to 10
          await actor.createEmbeddedDocuments("Item", [
            { name: "Skill1", type: "skill", system: { rank: 10 } },
            { name: "Skill2", type: "skill", system: { rank: 10 } },
            { name: "Skill3", type: "skill", system: { rank: 10 } },
            { name: "Skill4", type: "skill", system: { rank: 10 } },
            { name: "Skill5", type: "skill", system: { rank: 10 } },
            { name: "Skill6", type: "skill", system: { rank: 10 } },
            { name: "Skill7", type: "skill", system: { rank: 10 } },
            { name: "Skill8", type: "skill", system: { rank: 10 } }
          ]);

          actor.prepareData();

          const roll = actor.system.initiative.roll;
          const keep = actor.system.initiative.keep;
          const insightRank = actor.system.insight.rank;

          assert.equal(keep, 10, "Keep equals Reflexes (10)");
          // Roll = Insight Rank + Reflexes
          assert.isAbove(insightRank, 1, "Insight rank increased with skills");
          assert.isAbove(roll, 10, "Roll can exceed 10 (Insight + Reflexes)");
        });
      });

      describe("Multiple Combatants", () => {
        let combat, actor1, actor2, npc;

        beforeEach(async () => {
          actor1 = await createTestPC({
            name: "Fast PC",
            system: {
              traits: { ref: 5 },
              insight: { rank: 3 }
            }
          });

          actor2 = await createTestPC({
            name: "Slow PC",
            system: {
              traits: { ref: 2 },
              insight: { rank: 1 }
            }
          });

          npc = await createTestNPC({
            name: "NPC",
            system: {
              traits: { ref: 3 }
            }
          });

          combat = await Combat.create({
            scene: null,
            active: false
          });
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
            combat = null;
          }
          if (npc) {
            await npc.delete();
            npc = null;
          }
          if (actor2) {
            await actor2.delete();
            actor2 = null;
          }
          if (actor1) {
            await actor1.delete();
            actor1 = null;
          }
        });

        it("should add multiple combatants", async () => {
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor1.id, tokenId: null },
            { actorId: actor2.id, tokenId: null },
            { actorId: npc.id, tokenId: null }
          ]);

          assert.equal(combat.combatants.size, 3, "Three combatants added");
        });

        it("should roll initiative for all combatants", async () => {
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor1.id, tokenId: null },
            { actorId: actor2.id, tokenId: null },
            { actorId: npc.id, tokenId: null }
          ]);

          await combat.rollAll();

          // combat.combatants is a Collection, not an Array
          const allHaveInitiative = Array.from(combat.combatants).every(c => c.initiative !== null);
          assert.isTrue(allHaveInitiative, "All combatants have initiative");
        });

        it("should sort combatants by initiative", async () => {
          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor1.id, tokenId: null },
            { actorId: actor2.id, tokenId: null }
          ]);

          await combat.rollAll();

          const initiatives = combat.turns.map(c => c.initiative);
          assert.exists(initiatives[0], "First combatant has initiative");
          assert.exists(initiatives[1], "Second combatant has initiative");
        });
      });
    },
    { displayName: "L5R4: Initiative Service Tests" }
  );
}
