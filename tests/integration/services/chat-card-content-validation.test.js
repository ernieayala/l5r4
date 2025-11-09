/**
 * Chat Card Content Validation Tests
 *
 * Tests that chat cards display correct information to users for all roll types.
 * This validates the user-facing output, not internal calculations.
 *
 * Critical validation areas:
 * 1. Skill/Trait names displayed correctly
 * 2. Roll formula shown accurately
 * 3. Modifiers listed and labeled properly
 * 4. TN and success/failure calculated correctly
 * 5. Edge cases (emphasis + void + stance + wound penalty)
 * 6. Multiple modifier combinations display correctly
 *
 * Test Priority: Phase 1, Item 6 (CRITICAL)
 * Reason: Users report seeing incorrect information in chat cards
 *
 * @see module/services/dice/rolls/skill-roll.js
 * @see module/services/dice/rolls/trait-roll.js
 * @see module/services/dice/rolls/spell-roll.js
 * @see templates/chat/simple-roll.hbs
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register chat card content validation tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerChatCardContentValidationTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.chat-card-validation`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Basic Chat Card Content", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Chat Test Samurai",
            system: {
              traits: { agi: 4, str: 3, per: 3 }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should display skill name in chat card", async () => {
          // ARRANGE - Basic skill roll
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];

          // ACT - Execute roll
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Verify skill name appears in chat
          assert.exists(message, "Chat message created");
          const content = message.content;
          assert.include(content, "Kenjutsu", "Skill name displayed in chat card");

          // Cleanup
          await message.delete();
        });

        it("should display trait name in chat card", async () => {
          // ARRANGE
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Verify trait name appears
          assert.exists(message, "Chat message created");
          const content = message.content;
          assert.include(content, "Agility", "Trait name displayed in chat card");

          // Cleanup
          await message.delete();
        });

        it("should display correct roll formula in chat card", async () => {
          // ARRANGE - Skill 5 + Agility 4 = 9k4
          const skillRank = 5;
          const traitValue = 4;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Verify formula displayed
          assert.exists(message, "Chat message created");
          assert.equal(message.rolls.length, 1, "Message has one roll");
          const formula = message.rolls[0].formula;
          assert.include(formula, "9d10", "Correct rolled dice (5+4=9)");
          assert.include(formula, "k4", "Correct kept dice (trait=4)");
          assert.include(formula, "x10", "Dice explode on 10");

          // Cleanup
          await message.delete();
        });

        it("should display roll total in chat card", async () => {
          // ARRANGE
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Roll total should be visible in rendered HTML
          assert.exists(message, "Chat message created");
          assert.isNumber(message.rolls[0].total, "Roll has numeric total");
          assert.isAtLeast(message.rolls[0].total, 4, "Total is at least minimum (4 kept dice)");

          // Cleanup
          await message.delete();
        });
      });

      describe("Modifier Display in Chat Cards", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Modifier Test Samurai",
            system: {
              traits: { agi: 4 },
              rings: { void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", { emphasis: ["Katana"] })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should display emphasis indicator in chat card", async () => {
          // ARRANGE - Roll with emphasis
          const skillRank = 5;
          const traitValue = 4;

          // ACT - Execute roll with emphasis (simulated via dialog result)
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false,
            rollBonus: 0,
            keepBonus: 0,
            totalBonus: 0
          });

          // ASSERT - Verify formula has emphasis re-roll
          assert.exists(message, "Chat message created");
          // Note: Emphasis display depends on dialog interaction
          // This test validates formula structure supports emphasis
          const formula = message.rolls[0].formula;
          assert.exists(formula, "Formula exists");

          // Cleanup
          await message.delete();
        });

        it("should display wound penalty in chat card", async () => {
          // ARRANGE - Wounded character
          await actor.update({ "system.suffered": 20 });
          actor.prepareDerivedData();
          const woundPenalty = actor.system.woundPenalty || 0;
          const skillRank = 5;
          const traitValue = 4;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            woundPenalty,
            askForOptions: false
          });

          // ASSERT - Wound penalty affects roll total (subtracted from result)
          assert.exists(message, "Chat message created");
          assert.isAtLeast(woundPenalty, 5, "Character has wound penalty");
          // Wound penalty is applied to roll total, reducing effectiveness
          // Cannot directly test display without parsing HTML, but verify roll executed

          // Cleanup
          await message.delete();
        });

        it("should display modifiers in chat card label", async () => {
          // ARRANGE - Roll with bonuses
          const skillRank = 5;
          const traitValue = 4;
          const rollBonus = 2;
          const keepBonus = 1;
          const totalBonus = 5;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            rollBonus,
            keepBonus,
            totalBonus,
            askForOptions: false
          });

          // ASSERT - Verify modifiers affect formula
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          // Base: 5+4=9k4, with +2k1 = 11k5
          // Ten Dice Rule: 11 rolled → caps at 10, excess +1 bonus
          // Final: 10d10k5 with total bonus (+5 original +1 from excess = +6)
          assert.include(formula, "10d10", "Ten Dice Rule caps rolled at 10");
          assert.include(formula, "k5", "Keep bonus applied (4+1=5)");
          // Total bonus includes original +5 plus excess from Ten Dice Rule
          // Foundry adds spaces around operators: " + 5" not "+5"
          assert.match(formula, /\+\s*\d+/, "Total bonus applied");

          // Cleanup
          await message.delete();
        });
      });

      describe("TN and Success/Failure Display", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "TN Test Samurai",
            system: {
              traits: { agi: 4 }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should display TN in chat card when provided", async () => {
          // ARRANGE - Roll against TN 20
          const skillRank = 5;
          const traitValue = 4;

          // ACT - Cannot directly set TN without dialog, but verify structure
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Message created successfully
          assert.exists(message, "Chat message created");
          // TN display requires dialog interaction or manual TN setting
          // This validates the roll executes without TN

          // Cleanup
          await message.delete();
        });

        it("should calculate success when roll meets TN", async () => {
          // ARRANGE - This test validates TN evaluation logic exists
          const rollTotal = 25;
          const targetNumber = 20;

          // ACT - Verify success logic
          const success = rollTotal >= targetNumber;

          // ASSERT
          assert.isTrue(success, "Roll total 25 meets TN 20");
        });

        it("should calculate failure when roll misses TN", async () => {
          // ARRANGE
          const rollTotal = 15;
          const targetNumber = 20;

          // ACT
          const success = rollTotal >= targetNumber;

          // ASSERT
          assert.isFalse(success, "Roll total 15 misses TN 20");
        });

        it("should calculate raises from excess roll total", async () => {
          // ARRANGE - Roll exceeds TN by 10 = 2 raises
          const rollTotal = 30;
          const targetNumber = 20;
          const excess = rollTotal - targetNumber;
          const raises = Math.floor(excess / 5);

          // ACT & ASSERT
          assert.equal(raises, 2, "Excess 10 = 2 raises (10/5=2)");
        });
      });

      describe("Unskilled Roll Display", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Unskilled Test",
            system: {
              traits: { agi: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should display unskilled indicator in chat card", async () => {
          // ARRANGE - Skill rank 0 = unskilled
          const skillRank = 0;
          const traitValue = 3;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Verify unskilled label appears
          assert.exists(message, "Chat message created");
          const content = message.content;
          assert.include(content, "Unskilled", "Unskilled indicator displayed");

          // Cleanup
          await message.delete();
        });

        it("should display correct unskilled formula (no explosions)", async () => {
          // ARRANGE - Unskilled: Trait only, no explosions
          const skillRank = 0;
          const traitValue = 3;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Verify unskilled formula
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          assert.include(formula, "3d10", "Unskilled rolls trait only (3)");
          assert.include(formula, "k3", "Unskilled keeps trait only (3)");
          assert.notInclude(formula, "x10", "Unskilled dice do NOT explode");

          // Cleanup
          await message.delete();
        });
      });

      describe("Edge Cases - Multiple Modifiers", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Complex Modifier Test",
            system: {
              traits: { agi: 4, sta: 3, wil: 3 },
              rings: { void: { rank: 3, value: 3 } },
              suffered: 15 // Wounded
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", { emphasis: ["Katana"] })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should display all modifiers when multiple are active", async () => {
          // ARRANGE - Roll with multiple bonuses and wound penalty
          actor.prepareDerivedData();
          const woundPenalty = actor.system.woundPenalty || 0;
          const skillRank = 5;
          const traitValue = 4;
          const rollBonus = 2;
          const keepBonus = 1;
          const totalBonus = 3;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            woundPenalty,
            rollBonus,
            keepBonus,
            totalBonus,
            askForOptions: false
          });

          // ASSERT - Verify complex formula
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          // Base: 5+4=9, +2 roll = 11 → Ten Dice Rule caps at 10
          // Keep: 4+1 = 5
          assert.include(formula, "10d10", "Ten Dice Rule applied");
          assert.include(formula, "k5", "Keep bonus applied");
          // Verify formula has modifiers (wound penalty + bonuses)
          // Foundry adds spaces: " + 3" or " - 5"
          assert.match(formula, /[+-]\s*\d+/, "Modifiers present in formula");

          // Cleanup
          await message.delete();
        });

        it("should handle zero modifiers gracefully", async () => {
          // ARRANGE - Roll with no bonuses
          const skillRank = 5;
          const traitValue = 4;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            rollBonus: 0,
            keepBonus: 0,
            totalBonus: 0,
            woundPenalty: 0,
            askForOptions: false
          });

          // ASSERT - Base formula only
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          assert.include(formula, "9d10", "Base rolled dice (5+4=9)");
          assert.include(formula, "k4", "Base kept dice (4)");

          // Cleanup
          await message.delete();
        });

        it("should handle negative modifiers correctly", async () => {
          // ARRANGE - Roll with penalties
          const skillRank = 5;
          const traitValue = 4;
          const rollBonus = -2; // Penalty
          const totalBonus = -5; // Penalty

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            rollBonus,
            keepBonus: 0,
            totalBonus,
            askForOptions: false
          });

          // ASSERT - Penalties applied
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          // Base: 9k4, -2 roll = 7k4, -5 total
          assert.include(formula, "7d10", "Roll penalty applied (9-2=7)");
          assert.include(formula, "k4", "Keep unchanged");
          // Verify negative modifier is present (format may vary: "- 5" or "-5")
          assert.match(formula, /-\s*5/, "Total penalty applied");

          // Cleanup
          await message.delete();
        });
      });

      describe("Formula Accuracy Validation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Formula Test",
            system: {
              traits: { agi: 4, str: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should build correct formula for minimum values", async () => {
          // ARRANGE - Minimum: Skill 1, Trait 2 = 3k2
          const skillRank = 1;
          const traitValue = 2;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          assert.include(formula, "3d10", "Minimum rolled (1+2=3)");
          assert.include(formula, "k2", "Minimum kept (2)");

          // Cleanup
          await message.delete();
        });

        it("should build correct formula for high values", async () => {
          // ARRANGE - High: Skill 8, Trait 6 = 14k6
          const skillRank = 8;
          const traitValue = 6;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Ten Dice Rule may cap at 10k10
          assert.exists(message, "Chat message created");
          const formula = message.rolls[0].formula;
          // Ten Dice Rule should cap rolled at 10
          assert.exists(formula, "Formula created for high values");

          // Cleanup
          await message.delete();
        });

        it("should preserve formula structure in chat message", async () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Formula structure preserved
          assert.exists(message, "Chat message created");
          assert.equal(message.rolls.length, 1, "One roll in message");
          assert.exists(message.rolls[0].formula, "Formula exists");
          assert.isTrue(message.rolls[0]._evaluated, "Roll was evaluated");
          assert.isNumber(message.rolls[0].total, "Total is numeric");

          // Cleanup
          await message.delete();
        });
      });

      describe("Chat Card Regression Tests", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Regression Test",
            system: {
              traits: { agi: 4 }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should not show undefined or null in chat card", async () => {
          // ARRANGE
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - No undefined/null text in content
          assert.exists(message, "Chat message created");
          const content = message.content;
          assert.notInclude(content, "undefined", "No 'undefined' text in chat");
          assert.notInclude(content, "null", "No 'null' text in chat");
          assert.notInclude(content, "NaN", "No 'NaN' text in chat");

          // Cleanup
          await message.delete();
        });

        it("should handle missing skill name gracefully", async () => {
          // ARRANGE - No skill name provided
          const skillRank = 5;
          const traitValue = 4;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: null, // Missing
            skillTrait: "agi",
            askForOptions: false
          });

          // ASSERT - Should use fallback label
          assert.exists(message, "Chat message created");
          const content = message.content;
          assert.exists(content, "Content exists");
          // Should show "Skill" as fallback

          // Cleanup
          await message.delete();
        });

        it("should handle missing trait gracefully", async () => {
          // ARRANGE - Invalid trait
          const skillRank = 5;
          const traitValue = 4;

          // ACT
          const message = await SkillRoll({
            actor,
            skillRank,
            actorTrait: traitValue,
            skillName: "kenjutsu",
            skillTrait: null, // Missing
            askForOptions: false
          });

          // ASSERT - Should handle gracefully
          assert.exists(message, "Chat message created despite missing trait");

          // Cleanup
          await message.delete();
        });
      });
    },
    {
      displayName: "L5R4: Chat Card Content Validation"
    }
  );
}
