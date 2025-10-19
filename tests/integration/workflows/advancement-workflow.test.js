/**
 * Advancement Workflow Integration Tests
 * 
 * Tests complete character advancement sequences from XP spending through
 * insight rank progression. Validates multi-step advancement processes.
 * 
 * Test Priority: Tier 1 (Critical - Character progression)
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register advancement workflow tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerAdvancementWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.advancement`,
    (context) => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Advancement Workflow: Skill Progression", () => {
        let character;

        beforeEach(async () => {
          character = await createTestPC({
            name: "Advancing Character",
            system: {
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } },
              traits: { agi: 3, per: 3 }
            }
          });

          await character.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 1, "agi")
          ]);
        });

        afterEach(async () => {
          if (character) await character.delete();
        });

        it("should advance skill rank and update insight", async () => {
          // ARRANGE
          const skill = character.items.find(i => i.name === "Kenjutsu");
          const initialRank = skill.system.rank;
          const initialInsight = character.system.insight.points;

          assert.equal(initialRank, 1, "Starting skill rank is 1");

          // ACT - Advance skill to rank 2
          await skill.update({ "system.rank": 2 });

          // Force actor to recalculate derived data
          character.prepareData();

          // ASSERT
          const updatedSkill = character.items.get(skill.id);
          const updatedInsight = character.system.insight.points;

          assert.equal(updatedSkill.system.rank, 2, "Skill advanced to rank 2");
          assert.isTrue(updatedInsight > initialInsight, "Insight increased after skill advancement");
        });

        it("should handle multiple skill advancements", async () => {
          // ARRANGE
          await character.createEmbeddedDocuments("Item", [
            createSkillData("Iaijutsu", 1, "ref"),
            createSkillData("Defense", 1, "ref")
          ]);

          const initialInsight = character.system.insight.points;

          // ACT - Advance multiple skills
          const skills = character.items.filter(i => i.type === "skill");
          for (const skill of skills) {
            await skill.update({ "system.rank": skill.system.rank + 1 });
          }

          character.prepareData();

          // ASSERT
          const finalInsight = character.system.insight.points;
          const skillRanks = character.items.filter(i => i.type === "skill").map(s => s.system.rank);

          assert.isTrue(skillRanks.every(r => r >= 2), "All skills advanced");
          assert.isTrue(finalInsight > initialInsight, "Insight increased from multiple advancements");
        });
      });

      describe("Advancement Workflow: Ring Advancement", () => {
        let character;

        beforeEach(async () => {
          character = await createTestPC({
            name: "Ring Advancement Test",
            system: {
              traits: { sta: 3, wil: 3, ref: 3, awa: 3 }
            }
          });
        });

        afterEach(async () => {
          if (character) await character.delete();
        });

        it("should advance traits and recalculate rings", async () => {
          // ARRANGE
          const initialEarth = character.system.rings.earth;
          const initialInsight = character.system.insight.points;

          assert.equal(initialEarth, 3, "Initial Earth Ring is 3");

          // ACT - Advance Stamina trait ONLY (does NOT change Earth Ring)
          await character.update({ "system.traits.sta": 4 });
          const characterAfterSta = game.actors.get(character.id);
          const earthAfterSta = characterAfterSta.system.rings.earth;
          const insightAfterSta = characterAfterSta.system.insight.points;

          // ASSERT - Ring unchanged, so insight unchanged
          assert.equal(earthAfterSta, 3, "Earth stays at 3 (min of sta 4, wil 3)");
          assert.equal(insightAfterSta, initialInsight, "Insight unchanged (ring didn't increase)");

          // ACT - Advance BOTH Earth traits (increases Earth Ring)
          await character.update({ 
            "system.traits.sta": 4,
            "system.traits.wil": 4
          });
          const characterFinal = game.actors.get(character.id);
          const finalEarth = characterFinal.system.rings.earth;
          const finalInsight = characterFinal.system.insight.points;

          // ASSERT - Ring increased, so insight increased
          assert.equal(finalEarth, 4, "Earth Ring now 4 after both traits advanced");
          assert.isTrue(finalInsight > initialInsight, "Insight increased (ring increased from 3 to 4)");
        });

        it("should recalculate wound capacity when Earth Ring changes", async () => {
          // ARRANGE
          const initialWoundCapacity = character.system.woundLevels.healthy.value;
          const initialEarth = character.system.rings.earth;

          // ACT - Advance Earth Ring by advancing both traits
          await character.update({
            "system.traits.sta": 5,
            "system.traits.wil": 5
          });

          // ASSERT
          const newEarth = character.system.rings.earth;
          const newWoundCapacity = character.system.woundLevels.healthy.value;

          assert.equal(newEarth, 5, "Earth Ring advanced to 5");
          assert.isTrue(newWoundCapacity > initialWoundCapacity, "Wound capacity increased");
          
          // Wound capacity = Earth × 5
          const expectedHealthy = newEarth * 5;
          assert.equal(newWoundCapacity, expectedHealthy, "Wound capacity calculated correctly");
        });
      });

      describe("Advancement Workflow: Insight Rank Progression", () => {
        let character;

        beforeEach(async () => {
          character = await createTestPC({
            name: "Insight Progression Test",
            system: {
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } }
            }
          });
        });

        afterEach(async () => {
          if (character) await character.delete();
        });

        it("should progress through insight ranks", async () => {
          // ARRANGE
          const initialRank = character.system.insight.rank;
          const initialPoints = character.system.insight.points;

          assert.equal(initialRank, 1, "Starting at Insight Rank 1");
          
          // Rank 1: 0-149
          // Rank 2: 150-174
          // Need 150+ points for Rank 2

          // ACT - Add skills to reach 150 insight
          const skillsNeeded = [];
          for (let i = 0; i < 5; i++) {
            skillsNeeded.push(createSkillData(`Skill${i}`, 10, "agi"));
          }

          await character.createEmbeddedDocuments("Item", skillsNeeded);
          character.prepareData();

          // ASSERT
          const newPoints = character.system.insight.points;
          const newRank = character.system.insight.rank;

          assert.isTrue(newPoints >= 150, "Insight points reached 150+");
          assert.isAtLeast(newRank, 2, "Progressed to at least Insight Rank 2");
        });
      });

      describe("Advancement Workflow: Complete Progression", () => {
        let character;

        beforeEach(async () => {
          character = await createTestPC({
            name: "Complete Progression Test",
            system: {
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } },
              traits: { agi: 2, per: 2, sta: 2, wil: 2 }
            }
          });
        });

        afterEach(async () => {
          if (character) await character.delete();
        });

        it("should handle complete advancement progression", async () => {
          // ARRANGE
          const initial = {
            insight: character.system.insight.points,
            insightRank: character.system.insight.rank,
            earth: character.system.rings.earth,
            wounds: character.system.woundLevels.healthy.value
          };

          // ACT - Complete advancement sequence
          // 1. Add and advance skills
          await character.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi"),
            createSkillData("Iaijutsu", 5, "ref")
          ]);

          // 2. Advance traits
          await character.update({
            "system.traits.sta": 4,
            "system.traits.wil": 4,
            "system.traits.agi": 4
          });

          character.prepareData();

          // ASSERT
          const final = {
            insight: character.system.insight.points,
            insightRank: character.system.insight.rank,
            earth: character.system.rings.earth,
            wounds: character.system.woundLevels.healthy.value
          };

          assert.isTrue(final.insight > initial.insight, "Insight increased");
          assert.isTrue(final.earth >= initial.earth, "Earth Ring maintained or increased");
          assert.isTrue(final.wounds >= initial.wounds, "Wound capacity maintained or increased");
          
          // Verify all systems updated consistently
          assert.exists(final.insightRank, "Insight rank calculated");
          assert.exists(final.wounds, "Wounds recalculated");
        });
      });
    },
    { displayName: "L5R4: Advancement Workflow Tests" }
  );
}
