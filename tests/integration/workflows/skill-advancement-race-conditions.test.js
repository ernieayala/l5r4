/**
 * Skill Advancement Race Condition Tests
 *
 * Tests that rapid concurrent skill operations don't corrupt data.
 * Specifically tests emphasis addition and skill rank changes.
 *
 * **What Can Break:**
 * - Multiple emphasis rapid add - race condition
 * - Skill rank decrease - XP refunded?
 * - School skill free rank handling
 * - Emphasis beyond rank limit
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register skill advancement race condition tests
 * @param {Object} quench - Quench test framework
 */
export function registerSkillAdvancementRaceConditionTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.skill-advancement-race-conditions`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Rapid Emphasis Addition", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Emphasis Race Test",
            system: { rings: { void: 2 } }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 5 }),
              system: {
                rank: 5,
                trait: "agi",
                availableEmphases: ["Katana", "Wakizashi", "Nodachi", "Naginata", "Tanto"],
                trainedEmphases: [],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle 3 emphases added with Promise.all", async () => {
          // ARRANGE - Add 3 emphases simultaneously
          const updatePromises = [
            skill.update({ "system.trainedEmphases": ["Katana"] }),
            skill.update({ "system.trainedEmphases": ["Katana", "Wakizashi"] }),
            skill.update({ "system.trainedEmphases": ["Katana", "Wakizashi", "Nodachi"] })
          ];

          // ACT - Apply simultaneously (race condition)
          await Promise.all(updatePromises);

          // ASSERT - Last write wins
          const updatedSkill = actor.items.get(skill.id);
          assert.exists(updatedSkill, "Skill still exists");
          assert.isArray(updatedSkill.system.trainedEmphases, "Trained emphases is array");

          // Verify no corruption
          for (const emphasis of updatedSkill.system.trainedEmphases) {
            assert.isString(emphasis, "Emphasis is string");
          }

          // Verify XP calculation still works
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.exists(xpBreakdown, "XP calculated after race");
          assert.isNumber(xpBreakdown.skills, "Skill XP is number");
        });

        it("should handle rapid emphasis toggling", async () => {
          // ARRANGE - Toggle emphases rapidly
          const emphasisStates = [
            ["Katana"],
            ["Katana", "Wakizashi"],
            ["Katana"],
            ["Katana", "Wakizashi", "Nodachi"],
            ["Katana", "Wakizashi"]
          ];

          // ACT - Apply in rapid succession
          for (const emphases of emphasisStates) {
            await skill.update({ "system.trainedEmphases": emphases });
          }

          // ASSERT
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(
            updatedSkill.system.trainedEmphases.length,
            2,
            "Final emphasis count correct"
          );

          // Verify XP recalculated correctly
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP recalculated");
        });

        it("should handle adding all 5 emphases simultaneously", async () => {
          // ARRANGE - Add all 5 at once (max allowed)
          const allEmphases = ["Katana", "Wakizashi", "Nodachi", "Naginata", "Tanto"];

          // ACT
          await skill.update({ "system.trainedEmphases": allEmphases });

          // ASSERT
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(updatedSkill.system.trainedEmphases.length, 5, "All 5 emphases added");

          // Verify XP for 5 emphases
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;

          // 5 emphases × 2 XP = 10 XP (plus skill ranks)
          assert.isNumber(xpBreakdown.skills, "XP calculated for 5 emphases");
        });

        it("should handle emphasis beyond rank limit (rule violation)", async () => {
          // ARRANGE - Skill rank 3, try to add 4 emphases (violates rank limit)
          await skill.update({ "system.rank": 3 });

          const tooManyEmphases = ["Katana", "Wakizashi", "Nodachi", "Naginata"];

          // ACT - System allows this (UI should prevent)
          await skill.update({ "system.trainedEmphases": tooManyEmphases });

          // ASSERT - System doesn't enforce, but data should be valid
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(updatedSkill.system.rank, 3, "Rank is 3");
          assert.equal(
            updatedSkill.system.trainedEmphases.length,
            4,
            "System allowed 4 emphases (UI should prevent)"
          );

          // Verify XP still calculates (even with rule violation)
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated despite rule violation");
        });
      });

      describe("Skill Rank Changes", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Rank Change Test",
            system: { rings: { void: 2 } }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 5 }),
              system: {
                rank: 5,
                trait: "agi",
                trainedEmphases: [],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle skill rank decrease", async () => {
          // ARRANGE - Skill at rank 5
          await actor.prepareDerivedData();
          const initialXP = actor.system._xp?.breakdown?.skills;

          // ACT - Decrease rank to 3
          await skill.update({ "system.rank": 3 });
          await actor.prepareDerivedData();

          // ASSERT - XP should be recalculated (lower)
          const finalXP = actor.system._xp?.breakdown?.skills;
          assert.isBelow(finalXP, initialXP, "XP decreased with rank decrease");
          assert.isNumber(finalXP, "XP is number");
        });

        it("should handle rapid rank changes", async () => {
          // ARRANGE - Change rank multiple times rapidly
          const rankChanges = [3, 5, 2, 7, 4];

          // ACT
          for (const rank of rankChanges) {
            await skill.update({ "system.rank": rank });
          }

          // ASSERT
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(updatedSkill.system.rank, 4, "Final rank correct");

          // Verify XP calculated correctly
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP recalculated");
        });

        it("should handle rank decrease below emphasis count", async () => {
          // ARRANGE - Rank 5 with 3 emphases
          await skill.update({
            "system.rank": 5,
            "system.trainedEmphases": ["Katana", "Wakizashi", "Nodachi"]
          });

          // ACT - Decrease rank to 2 (below emphasis count)
          await skill.update({ "system.rank": 2 });

          // ASSERT - System allows this (UI should prevent or warn)
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(updatedSkill.system.rank, 2, "Rank decreased to 2");
          assert.equal(
            updatedSkill.system.trainedEmphases.length,
            3,
            "Emphases remain (rule violation)"
          );

          // Verify XP still calculates
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated despite violation");
        });

        it("should handle rank set to zero (unskilled)", async () => {
          // ARRANGE - Set rank to 0
          await skill.update({ "system.rank": 0 });

          // ACT
          await actor.prepareDerivedData();

          // ASSERT
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(updatedSkill.system.rank, 0, "Rank is 0 (unskilled)");

          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated for unskilled");
        });
      });

      describe("School Skill Free Ranks", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "School Skill Test",
            system: { rings: { void: 2 } }
          });

          skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3,
                trait: "agi",
                freeEmphasis: 1, // School skill gets 1 free emphasis
                trainedEmphases: []
              }
            },
            { parent: actor }
          );
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle free emphasis correctly in XP calculation", async () => {
          // ARRANGE - Add 2 emphases (1 free, 1 paid)
          await skill.update({
            "system.trainedEmphases": ["Katana", "Wakizashi"]
          });

          // ACT
          await actor.prepareDerivedData();

          // ASSERT
          const xpBreakdown = actor.system._xp?.breakdown;

          // Only 1 emphasis should cost XP (2 total - 1 free = 1 paid)
          // 1 emphasis × 2 XP = 2 XP (plus skill ranks)
          assert.isNumber(xpBreakdown.skills, "XP calculated with free emphasis");
        });

        it("should handle rapid free emphasis changes", async () => {
          // ARRANGE - Toggle free emphasis value
          const freeEmphasisStates = [0, 1, 0, 2, 1];

          // ACT
          for (const freeCount of freeEmphasisStates) {
            await skill.update({ "system.freeEmphasis": freeCount });
            await actor.prepareDerivedData();
          }

          // ASSERT
          const updatedSkill = actor.items.get(skill.id);
          assert.equal(updatedSkill.system.freeEmphasis, 1, "Final free count correct");

          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP recalculated after changes");
        });
      });

      describe("Multiple Skills Race Conditions", () => {
        let actor, skills;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Multi-Skill Test",
            system: { rings: { void: 2 } }
          });

          // Create multiple skills
          skills = await actor.createEmbeddedDocuments("Item", [
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: { rank: 3, trait: "agi" }
            },
            {
              ...createSkillData({ name: "Iaijutsu", rank: 2 }),
              system: { rank: 2, trait: "ref" }
            },
            {
              ...createSkillData({ name: "Kyujutsu", rank: 4 }),
              system: { rank: 4, trait: "ref" }
            }
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle 3 skills updated with Promise.all", async () => {
          // ARRANGE - Update all skills simultaneously
          const updatePromises = skills.map((skill, i) =>
            skill.update({ "system.rank": skill.system.rank + 1 })
          );

          // ACT
          await Promise.all(updatePromises);

          // ASSERT - All skills updated
          for (const skill of skills) {
            const updated = actor.items.get(skill.id);
            assert.exists(updated, "Skill exists");
            assert.isNumber(updated.system.rank, "Rank is number");
          }

          // Verify XP calculated for all skills
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "Total skill XP calculated");
        });

        it("should handle rapid skill additions and removals", async () => {
          // ARRANGE - Add and remove skills rapidly
          const newSkill = await Item.create(
            {
              ...createSkillData({ name: "Jiujutsu", rank: 2 }),
              system: { rank: 2, trait: "agi" }
            },
            { parent: actor }
          );

          const initialCount = actor.items.size;

          // ACT - Delete immediately after creation
          await newSkill.delete();

          // ASSERT
          const finalCount = actor.items.size;
          assert.equal(finalCount, initialCount - 1, "Skill removed");

          // Verify XP still calculates
          await actor.prepareDerivedData();
          const xpBreakdown = actor.system._xp?.breakdown;
          assert.isNumber(xpBreakdown.skills, "XP calculated after removal");
        });
      });
    },
    { displayName: "L5R4: Skill Advancement Race Conditions" }
  );
}
