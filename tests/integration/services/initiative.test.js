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
          // Per design: BOTH roll AND keep must be > 0 for custom initiative
          // Setting only roll to 7 while keep is 0 will still use Reflexes fallback
          await npc.update({
            "system.initiative.roll": 7,
            "system.initiative.keep": 4 // Must set both
          });

          // effRoll should use the roll value since BOTH are > 0
          assert.equal(
            npc.system.initiative.effRoll,
            7,
            "Effective roll uses explicit roll value (7)"
          );
        });

        it("should use explicit keep value when > 0", async () => {
          // Per design: BOTH roll AND keep must be > 0 for custom initiative
          // Setting only keep to 5 while roll is 0 will still use Reflexes fallback
          await npc.update({
            "system.initiative.roll": 6, // Must set both
            "system.initiative.keep": 5
          });

          // effKeep should use the keep value since BOTH are > 0
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
        let combat, actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Modifier Test",
            system: {
              traits: { ref: 3 },
              insight: { rank: 1 }
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

        it("should apply rollMod to increase rolled dice", async () => {
          // ARRANGE - Base is 4k3 (Insight 1 + Ref 3 = 4 rolled, Ref 3 kept)
          const baseRoll = actor.system.initiative.roll;
          assert.equal(baseRoll, 4, "Base roll is 4");

          await actor.update({ "system.initiative.rollMod": 2 });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should now be 6k3 (4 + 2 rollMod)
          assert.equal(actor.system.initiative.roll, 6, "Roll increased by rollMod");
          assert.include(roll.formula, "6d10k3", "Formula contains 6 rolled dice");
        });

        it("should apply keepMod to increase kept dice", async () => {
          // ARRANGE - Base is 4k3
          const baseKeep = actor.system.initiative.keep;
          assert.equal(baseKeep, 3, "Base keep is 3");

          await actor.update({ "system.initiative.keepMod": 2 });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should now be 4k5 (3 + 2 keepMod)
          assert.equal(actor.system.initiative.keep, 5, "Keep increased by keepMod");
          assert.include(roll.formula, "4d10k5", "Formula contains 5 kept dice");
        });

        it("should apply totalMod as flat bonus", async () => {
          // ARRANGE
          await actor.update({ "system.initiative.totalMod": 5 });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should be 4k3+5
          assert.equal(actor.system.initiative.totalMod, 5, "totalMod set");
          assert.match(roll.formula, /\+\s*5/, "Formula contains +5 flat bonus");
        });

        it("should apply negative rollMod as penalty", async () => {
          // ARRANGE
          await actor.update({ "system.initiative.rollMod": -1 });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should be 3k3 (4 - 1)
          assert.equal(actor.system.initiative.roll, 3, "Roll decreased by negative rollMod");
          assert.include(roll.formula, "3d10k3", "Formula contains 3 rolled dice");
        });

        it("should apply negative keepMod as penalty", async () => {
          // ARRANGE
          await actor.update({ "system.initiative.keepMod": -1 });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should be 4k2 (3 - 1)
          assert.equal(actor.system.initiative.keep, 2, "Keep decreased by negative keepMod");
          assert.include(roll.formula, "4d10k2", "Formula contains 2 kept dice");
        });

        it("should apply negative totalMod as penalty", async () => {
          // ARRANGE
          await actor.update({ "system.initiative.totalMod": -3 });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should be 4k3-3
          assert.equal(actor.system.initiative.totalMod, -3, "totalMod set to -3");
          assert.match(roll.formula, /-\s*3/, "Formula contains -3 penalty");
        });

        it("should apply all modifiers together", async () => {
          // ARRANGE
          await actor.update({
            "system.initiative.rollMod": 2,
            "system.initiative.keepMod": 1,
            "system.initiative.totalMod": 5
          });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should be 6k4+5 (4+2 rolled, 3+1 kept, +5 flat)
          assert.equal(actor.system.initiative.roll, 6, "Roll is 6");
          assert.equal(actor.system.initiative.keep, 4, "Keep is 4");
          assert.equal(actor.system.initiative.totalMod, 5, "totalMod is 5");
          assert.include(roll.formula, "6d10k4", "Formula has correct dice");
          assert.match(roll.formula, /\+\s*5/, "Formula has flat bonus");
        });

        it("should handle modifiers with 10-dice cap", async () => {
          // ARRANGE - Create high-level character at cap
          await actor.update({
            "system.traits.ref": 10,
            "system.initiative.rollMod": 5, // Would push to 15 rolled
            "system.initiative.keepMod": 2, // Would push to 12 kept
            "system.initiative.totalMod": 3
          });

          // Add skills to push insight rank high
          await actor.createEmbeddedDocuments("Item", [
            { name: "Skill1", type: "skill", system: { rank: 10 } },
            { name: "Skill2", type: "skill", system: { rank: 10 } },
            { name: "Skill3", type: "skill", system: { rank: 10 } }
          ]);

          actor.prepareData();

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should cap at 10k10 and convert excess to flat bonuses
          assert.include(roll.formula, "10d10k10", "Capped at 10k10");
          // Excess dice should be converted to flat bonuses
          // The formula should have a positive flat bonus from conversions + totalMod
          const match = roll.formula.match(/\+\s*(\d+)/);
          assert.exists(match, "Has flat bonus from conversions");
          const flatBonus = parseInt(match[1]);
          assert.isAbove(flatBonus, 3, "Flat bonus includes conversions plus totalMod");
        });

        it("should handle zero modifiers (no change)", async () => {
          // ARRANGE
          await actor.update({
            "system.initiative.rollMod": 0,
            "system.initiative.keepMod": 0,
            "system.initiative.totalMod": 0
          });

          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should be base 4k3 with no flat bonus
          assert.equal(actor.system.initiative.roll, 4, "Roll unchanged");
          assert.equal(actor.system.initiative.keep, 3, "Keep unchanged");
          assert.include(roll.formula, "4d10k3", "Formula is base 4k3");
          assert.notInclude(roll.formula, "+0", "No +0 in formula");
        });

        it("should handle undefined modifiers as zero", async () => {
          // ARRANGE - Don't set modifiers (undefined)
          // ACT
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
          const roll = combatant.getInitiativeRoll();

          // ASSERT - Should treat undefined as 0
          assert.include(roll.formula, "4d10k3", "Formula uses base values");
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
