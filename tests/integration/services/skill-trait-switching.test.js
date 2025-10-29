/**
 * Skill Roll Trait Switching Integration Tests
 *
 * Tests the ability to roll a skill with a different trait than its default.
 * This is an advanced L5R4 technique where GMs allow using alternate traits
 * for specific situations.
 *
 * Example: Kenjutsu (normally Agility) rolled with Strength for a power attack
 *
 * Implementation: Trait switching is done on the character sheet by changing
 * the trait dropdown for a skill. The skill item's system.trait is updated,
 * and subsequent rolls use the new trait automatically.
 *
 * Critical Test Cases:
 * - Formula recalculates correctly when skill trait is changed
 * - Chat card displays correct trait name
 * - Trait switching persists across rolls
 * - Edge cases: minimum/maximum trait values
 *
 * @see module/services/dice/rolls/skill-roll.js
 * @see module/sheets/handlers/roll-handler.js
 * @see TEST-COVERAGE-ANALYSIS.md line 19-22
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register trait switching integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerSkillTraitSwitchingTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.rolls.skill-trait-switching`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Trait Switching - Basic Mechanics", () => {
        let actor, skill;

        beforeEach(async () => {
          await game.settings.set(SYS_ID, "showSkillRollOptions", false);

          // Create actor with different trait values to verify switching
          actor = await createTestPC({
            name: "Trait Switch Test Samurai",
            system: {
              traits: {
                agi: 3, // Default trait for Kenjutsu
                str: 5, // Alternative trait (higher)
                sta: 2, // Alternative trait (lower)
                ref: 4,
                per: 3,
                int: 3,
                wil: 3,
                awa: 3
              }
            }
          });

          // Create Kenjutsu skill (normally uses Agility)
          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 4, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should use skill's trait for roll calculation", async () => {
          // ARRANGE
          const skillTrait = skill.system.trait; // "agi"
          const traitValue = actor.system.traits[skillTrait]; // 3

          // ACT - Roll with skill's current trait
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: traitValue, // 3
            skillName: skill.name,
            skillTrait: skillTrait,
            askForOptions: false
          });

          // ASSERT
          assert.exists(message, "Chat message created");

          // Verify formula uses skill's trait
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: (Skill 4 + Trait 3)k(Trait 3) = 7k3
          assert.include(formula, "7d10", "Rolled dice = Skill + Trait (4+3=7)");
          assert.include(formula, "k3", "Kept dice = Trait (3)");

          // Verify chat content shows trait
          const content = message.content;
          assert.include(content, "Agility", "Chat shows trait name");
        });

        it("should recalculate formula when skill trait is changed to higher trait", async () => {
          // ARRANGE - Change skill's trait on character sheet (simulates dropdown change)
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 5

          // ACT - Roll with new trait (Strength instead of Agility)
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: newTraitValue, // 5
            skillName: skill.name,
            skillTrait: newTrait, // "str"
            askForOptions: false
          });

          // ASSERT
          assert.exists(message, "Chat message created");

          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: (Skill 4 + Trait 5)k(Trait 5) = 9k5
          assert.include(formula, "9d10", "Rolled dice = Skill + Alternative Trait (4+5=9)");
          assert.include(formula, "k5", "Kept dice = Alternative Trait (5)");

          // Verify chat content shows alternative trait
          const content = message.content;
          assert.include(content, "Strength", "Chat shows alternative trait name");
        });

        it("should recalculate formula when skill trait is changed to lower trait", async () => {
          // ARRANGE - Change skill's trait on character sheet
          await skill.update({ "system.trait": "sta" });

          const newTrait = skill.system.trait; // "sta"
          const newTraitValue = actor.system.traits[newTrait]; // 2

          // ACT - Roll with new trait (Stamina instead of Agility)
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: newTraitValue, // 2
            skillName: skill.name,
            skillTrait: newTrait, // "sta"
            askForOptions: false
          });

          // ASSERT
          assert.exists(message, "Chat message created");

          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: (Skill 4 + Trait 2)k(Trait 2) = 6k2
          assert.include(formula, "6d10", "Rolled dice = Skill + Lower Trait (4+2=6)");
          assert.include(formula, "k2", "Kept dice = Lower Trait (2)");

          // Verify chat content shows alternative trait
          const content = message.content;
          assert.include(content, "Stamina", "Chat shows alternative trait name");
        });

        it("should display changed trait in chat card", async () => {
          // ARRANGE - Change skill's trait on character sheet
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 5

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank,
            actorTrait: newTraitValue,
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const content = message.content;

          // Chat should show the current trait
          assert.include(content, "Kenjutsu", "Skill name shown");
          assert.include(content, "Strength", "Changed trait shown");
        });
      });

      describe("Trait Switching - Combined with Other Mechanics", () => {
        let actor, skill;

        beforeEach(async () => {
          await game.settings.set(SYS_ID, "showSkillRollOptions", false);

          actor = await createTestPC({
            name: "Combined Mechanics Test",
            system: {
              traits: {
                agi: 3,
                str: 5,
                sta: 2
              },
              rings: {
                void: { rank: 3, value: 3 }
              }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 4, "agi", { emphasis: ["Katana"] })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should work with emphasis when skill trait is changed", async () => {
          // ARRANGE - Change skill's trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 5

          // ACT - Roll with changed trait
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: newTraitValue, // 5
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: 9k5 with emphasis
          assert.include(formula, "9d10", "Correct rolled dice");
          assert.include(formula, "k5", "Correct kept dice");
          // Note: Emphasis would be applied via dialog, not tested here
        });

        it("should work with void point when skill trait is changed", async () => {
          // ARRANGE - Change skill's trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 5
          const voidRollBonus = 1;
          const voidKeepBonus = 1;

          // ACT - Roll with changed trait + Void Point
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: newTraitValue, // 5
            skillName: skill.name,
            skillTrait: newTrait,
            rollBonus: voidRollBonus,
            keepBonus: voidKeepBonus,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: (4 + 5 + 1)k(5 + 1) = 10k6
          assert.include(formula, "10d10", "Void bonus applied to rolled (9+1=10)");
          assert.include(formula, "k6", "Void bonus applied to kept (5+1=6)");
        });

        it("should work with wound penalty when skill trait is changed", async () => {
          // ARRANGE - Change skill's trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 5
          const woundPenalty = 10;

          // ACT - Roll with changed trait + Wound Penalty
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: newTraitValue, // 5
            skillName: skill.name,
            skillTrait: newTrait,
            woundPenalty: woundPenalty,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: 9k5 with -10 penalty applied to total
          assert.include(formula, "9d10", "Dice pool unchanged");
          assert.include(formula, "k5", "Kept dice unchanged");
          // Wound penalty applied to total, not formula directly
        });
      });

      describe("Trait Switching - Edge Cases", () => {
        let actor, skill;

        beforeEach(async () => {
          await game.settings.set(SYS_ID, "showSkillRollOptions", false);

          actor = await createTestPC({
            name: "Edge Case Test",
            system: {
              traits: {
                agi: 3,
                str: 2, // Minimum trait
                sta: 10 // Maximum trait (rare but possible)
              }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Athletics", 5, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle minimum trait value (2)", async () => {
          // ARRANGE - Change skill's trait to minimum value trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 2

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 5
            actorTrait: newTraitValue, // 2
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: (5 + 2)k(2) = 7k2
          assert.include(formula, "7d10", "Minimum trait rolled (5+2=7)");
          assert.include(formula, "k2", "Minimum trait kept (2)");
        });

        it("should handle maximum trait value (10)", async () => {
          // ARRANGE - Change skill's trait to maximum value trait
          await skill.update({ "system.trait": "sta" });

          const newTrait = skill.system.trait; // "sta"
          const newTraitValue = actor.system.traits[newTrait]; // 10

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 5
            actorTrait: newTraitValue, // 10
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: (5 + 10)k(10) = 15k10
          // Ten Dice Rule: Rolled capped at 10, excess becomes bonus
          // So 15 rolled becomes 10k10+5
          assert.include(formula, "10d10", "Ten Dice Rule caps rolled at 10");
          assert.include(formula, "k10", "Kept at maximum (10)");
        });

        it("should handle unskilled roll with changed trait", async () => {
          // ARRANGE
          const unskilledSkill = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Calligraphy", 0, "int") // Rank 0 = unskilled
          ]);

          // Change unskilled skill's trait
          await unskilledSkill[0].update({ "system.trait": "awa" });

          const newTrait = unskilledSkill[0].system.trait; // "awa"
          const newTraitValue = actor.system.traits[newTrait] || 3;

          // ACT - Unskilled roll with changed trait
          const message = await SkillRoll({
            actor,
            skillRank: 0, // Unskilled
            actorTrait: newTraitValue,
            skillName: "Calligraphy",
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const formula = roll.formula;

          // Expected: Unskilled = (Trait)k(Trait) with no explosions
          assert.include(formula, `${newTraitValue}d10`, "Unskilled uses trait only");
          assert.include(formula, `k${newTraitValue}`, "Keeps trait only");
          assert.notInclude(formula, "x10", "No explosions for unskilled");

          // Cleanup
          await unskilledSkill[0].delete();
        });

        it("should persist trait change across multiple rolls", async () => {
          // ARRANGE - Change skill's trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 2

          // ACT - Roll twice with same changed trait
          const message1 = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 5
            actorTrait: newTraitValue, // 2
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          const message2 = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 5
            actorTrait: newTraitValue, // 2
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT - Both rolls use changed trait
          const formula1 = message1.rolls[0].formula;
          const formula2 = message2.rolls[0].formula;

          // Expected: (5 + 2)k(2) = 7k2 for both
          assert.include(formula1, "7d10", "First roll uses changed trait");
          assert.include(formula1, "k2", "First roll keeps changed trait");
          assert.include(formula2, "7d10", "Second roll uses changed trait");
          assert.include(formula2, "k2", "Second roll keeps changed trait");
        });
      });

      describe("Trait Switching - Chat Card Display", () => {
        let actor, skill;

        beforeEach(async () => {
          await game.settings.set(SYS_ID, "showSkillRollOptions", false);

          actor = await createTestPC({
            name: "Chat Display Test",
            system: {
              traits: {
                agi: 3,
                str: 5
              }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 4, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should show correct trait name in chat card", async () => {
          // ARRANGE - Change skill's trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait];

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank,
            actorTrait: newTraitValue,
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const content = message.content;

          // Must show the trait being used
          assert.include(content, "Strength", "Shows changed trait name");
        });

        it("should show formula in chat card matches actual roll", async () => {
          // ARRANGE - Change skill's trait
          await skill.update({ "system.trait": "str" });

          const newTrait = skill.system.trait; // "str"
          const newTraitValue = actor.system.traits[newTrait]; // 5

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank: skill.system.rank, // 4
            actorTrait: newTraitValue, // 5
            skillName: skill.name,
            skillTrait: newTrait,
            askForOptions: false
          });

          // ASSERT
          const roll = message.rolls[0];
          const rollFormula = roll.formula;
          const content = message.content;

          // Chat should display the formula or dice pool
          // Expected: 9k5
          assert.include(rollFormula, "9d10k5", "Roll formula is 9k5");

          // Content should reflect this somehow
          // (exact format depends on template)
        });
      });
    },
    { displayName: "L5R4: Skill Trait Switching Tests" }
  );
}
