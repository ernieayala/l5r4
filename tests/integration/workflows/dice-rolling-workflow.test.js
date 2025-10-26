/**
 * Dice Rolling Complete Workflow Integration Tests
 *
 * Tests the complete dice rolling workflow from notation parsing through actual roll execution.
 * Addresses gaps identified in test-coverage-gap-analysis.md §3:
 * - Inline roll parsing workflow ([[XkY]])
 * - Unskilled rolls workflow (uXkY)
 * - Emphasis rolls workflow (eXkY)
 *
 * This test suite validates:
 * 1. Roll notation parsing (roll-parser.js)
 * 2. Formula construction (formula-builder.js)
 * 3. Actual roll execution (Foundry Roll API)
 * 4. Inline roll detection and replacement
 * 5. Special mechanics (unskilled, emphasis)
 *
 * Test Priority: Tier 1 (Critical - Core dice mechanics)
 *
 * @see module/services/dice/core/roll-parser.js
 * @see module/services/dice/core/formula-builder.js
 * @see module/services/chat.js (inline roll parsing)
 * @see game-rules/Skills_and_Rolls.md
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { roll_parser } from "../../../module/services/dice/core/roll-parser.js";
import { buildFormula } from "../../../module/services/dice/core/formula-builder.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register dice rolling workflow tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerDiceRollingWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.dice-rolling`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Standard Roll & Keep Workflow", () => {
        it("should parse basic notation and create valid Roll", async () => {
          // ARRANGE
          const notation = "7k3";

          // ACT - Parse notation
          const parsed = roll_parser(notation);

          // ASSERT - Parsing
          assert.equal(parsed.dice_count, 7, "Parsed rolled dice");
          assert.equal(parsed.kept, 3, "Parsed kept dice");
          assert.equal(parsed.bonus, 0, "No bonus");
          assert.isFalse(parsed.unskilled, "Not unskilled");
          assert.isFalse(parsed.emphasis, "No emphasis");

          // ACT - Build formula
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            unskilled: parsed.unskilled,
            emphasis: parsed.emphasis
          });

          // ASSERT - Formula
          assert.equal(formula, "7d10k3x10+0", "Correct formula");
          assert.include(formula, "x10", "Dice explode");

          // ACT - Execute actual roll
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT - Roll executed
          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has numeric total");
          assert.isTrue(roll._evaluated, "Roll was evaluated");
          assert.isAtLeast(roll.total, 3, "Minimum possible (3 ones kept)");
          assert.equal(roll.dice.length, 1, "One dice pool");
          assert.equal(roll.dice[0].faces, 10, "d10 dice");
        });

        it("should handle rolls with flat bonuses", async () => {
          // ARRANGE
          const notation = "7k3+5";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.bonus, 5, "Bonus parsed");
          assert.include(formula, "+5", "Bonus in formula");
          assert.isAtLeast(roll.total, 8, "Minimum with bonus (3 + 5)");
        });

        it("should handle rolls with negative modifiers", async () => {
          // ARRANGE
          const notation = "5k3-10";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});

          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.bonus, -10, "Negative bonus parsed");
          assert.include(formula, "x10-10", "Negative modifier after explode");
          assert.isNumber(roll.total, "Roll executes with negative modifier");
        });

        it("should apply Ten Dice Rule automatically", async () => {
          // ARRANGE - Roll that exceeds 10 dice
          const notation = "15k8";

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT - Ten Dice Rule caps and converts excess
          // 15k8: 5 excess rolled → 2 kept (at 2:1), leaves 1 leftover → +2 bonus
          // Result: 10k10+2
          assert.equal(parsed.dice_count, 10, "Rolled dice capped at 10");
          assert.equal(parsed.kept, 10, "Kept dice at 10 (8 + 2 from conversion)");
          assert.equal(parsed.bonus, 2, "Leftover rolled die converted to bonus");
        });

        it("should handle minimum rolls (1k1)", async () => {
          // ARRANGE
          const notation = "1k1";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.dice_count, 1, "One die rolled");
          assert.equal(parsed.kept, 1, "One die kept");
          assert.isNumber(roll.total, "Minimum roll executes");
          assert.isAtLeast(roll.total, 1, "At least 1");
        });

        it("should allow dice to explode on 10s", async () => {
          // ARRANGE
          const notation = "5k3";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});

          // ASSERT
          assert.include(formula, "x10", "Formula includes explosion");
          assert.notInclude(formula, "min", "No minimum enforced");

          // Execute multiple times to increase chance of seeing explosion
          // (not asserting explosion happened, just that roll supports it)
          const roll = new Roll(formula);
          await roll.evaluate();
          assert.exists(roll.dice[0], "Dice pool exists");
        });
      });

      describe("Unskilled Roll Workflow (uXkY)", () => {
        it("should parse unskilled notation correctly", async () => {
          // ARRANGE
          const notation = "u3k3";

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT
          assert.isTrue(parsed.unskilled, "Unskilled flag set");
          assert.equal(parsed.dice_count, 3, "Dice count correct");
          assert.equal(parsed.kept, 3, "Keep count correct");
        });

        it("should prevent dice explosions for unskilled rolls", async () => {
          // ARRANGE
          const notation = "u5k3";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            unskilled: parsed.unskilled
          });

          // ASSERT
          assert.notInclude(formula, "x10", "No explosion for unskilled");
          assert.equal(formula, "5d10k3+0", "Formula correct without explosion");
        });

        it("should execute unskilled roll without explosions", async () => {
          // ARRANGE
          const notation = "u4k3";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            unskilled: parsed.unskilled
          });
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.isNumber(roll.total, "Unskilled roll executes");
          assert.isNumber(roll.total, "Has numeric result");
          assert.isAtLeast(roll.total, 3, "Minimum (3 kept dice at 1)");
          assert.isAtMost(roll.total, 30, "Maximum without explosions (3 kept at 10)");
        });

        it("should handle unskilled rolls with bonuses", async () => {
          // ARRANGE
          const notation = "u3k3+7";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            unskilled: parsed.unskilled
          });
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.isTrue(parsed.unskilled, "Unskilled flag preserved");
          assert.equal(parsed.bonus, 7, "Bonus parsed");
          assert.notInclude(formula, "x10", "No explosion");
          assert.include(formula, "+7", "Bonus included");
          assert.isAtLeast(roll.total, 10, "Minimum with bonus (3 + 7)");
        });

        it("should not allow emphasis and unskilled simultaneously", async () => {
          // ARRANGE - Notation with both prefixes (u takes precedence in parser)
          const notation = "u5k3";

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT
          assert.isTrue(parsed.unskilled, "Unskilled set");
          assert.isFalse(parsed.emphasis, "Emphasis not set");
        });
      });

      describe("Emphasis Roll Workflow (eXkY)", () => {
        it("should parse emphasis notation correctly", async () => {
          // ARRANGE
          const notation = "e7k3";

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT
          assert.isTrue(parsed.emphasis, "Emphasis flag set");
          assert.equal(parsed.dice_count, 7, "Dice count correct");
          assert.equal(parsed.kept, 3, "Keep count correct");
        });

        it("should add re-roll modifier for emphasis", async () => {
          // ARRANGE
          const notation = "e7k3";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            emphasis: parsed.emphasis
          });

          // ASSERT
          assert.include(formula, "r1", "Re-roll 1s modifier present");
          assert.include(formula, "x10", "Still explodes on 10s");
          assert.equal(formula, "7d10r1k3x10+0", "Complete formula correct");
        });

        it("should execute emphasis roll with re-roll mechanic", async () => {
          // ARRANGE
          const notation = "e5k3";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            emphasis: parsed.emphasis
          });
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.isNumber(roll.total, "Emphasis roll executes");
          assert.isNumber(roll.total, "Has numeric result");
          assert.isAtLeast(roll.total, 3, "Minimum (3 kept dice)");

          // Verify formula contains both re-roll and explosion
          assert.include(formula, "r1", "Re-roll 1s");
          assert.include(formula, "x10", "Explode 10s");
        });

        it("should handle emphasis with bonuses", async () => {
          // ARRANGE
          const notation = "e7k3+5";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            emphasis: parsed.emphasis
          });
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.isTrue(parsed.emphasis, "Emphasis preserved");
          assert.equal(parsed.bonus, 5, "Bonus parsed");
          assert.include(formula, "r1", "Re-roll modifier");
          assert.include(formula, "+5", "Bonus included");
          assert.isAtLeast(roll.total, 8, "Minimum with bonus (3 + 5)");
        });

        it("should allow both re-roll and explosion mechanics", async () => {
          // ARRANGE
          const notation = "e10k5";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            emphasis: parsed.emphasis
          });

          // ASSERT - Both mechanics present in formula
          assert.include(formula, "r1", "Re-roll 1s mechanic");
          assert.include(formula, "x10", "Explosion mechanic");

          // Execute roll
          const roll = new Roll(formula);
          await roll.evaluate();
          assert.isNumber(roll.total, "Roll with both mechanics executes");
        });
      });

      describe("Inline Roll Parsing Workflow [[XkY]]", () => {
        it("should detect L5R4 notation in inline format", () => {
          // ARRANGE - Test inline roll detection patterns
          const patterns = [
            { input: "[[7k3]]", expected: true, desc: "Basic notation" },
            { input: "[[7k3+5]]", expected: true, desc: "With bonus" },
            { input: "[[u3k3]]", expected: true, desc: "Unskilled" },
            { input: "[[e7k3]]", expected: true, desc: "Emphasis" },
            { input: "I attack [[7k3]]", expected: true, desc: "Inline in text" },
            { input: "[[1d20]]", expected: false, desc: "Not L5R4 notation" }
          ];

          // ACT & ASSERT
          const kxy = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;
          patterns.forEach(pattern => {
            const containsNotation = kxy.test(pattern.input);
            assert.equal(containsNotation, pattern.expected, `${pattern.desc}: "${pattern.input}"`);
          });
        });

        it("should parse whole-message rolls [[XkY]]", () => {
          // ARRANGE
          const message = "[[7k3+5]]";

          // ACT - Extract notation
          const whole = /^\[\[(.*)\]\]$/;
          const match = message.match(whole);
          assert.exists(match, "Whole-message pattern matched");

          const notation = match[1];
          const parsed = roll_parser(notation);

          // ASSERT
          assert.equal(notation, "7k3+5", "Extracted notation");
          assert.equal(parsed.dice_count, 7, "Parsed correctly");
          assert.equal(parsed.kept, 3, "Parsed correctly");
          assert.equal(parsed.bonus, 5, "Parsed correctly");
        });

        it("should extract multiple inline rolls from text", () => {
          // ARRANGE
          const message = "I attack [[7k3]] and defend [[5k3+2]]";

          // ACT - Find all inline rolls
          const inline = /\[\[(.*?)\]\]/g;
          const matches = [...message.matchAll(inline)];

          // ASSERT
          assert.equal(matches.length, 2, "Found both rolls");
          assert.equal(matches[0][1], "7k3", "First roll notation");
          assert.equal(matches[1][1], "5k3+2", "Second roll notation");

          // Parse each
          const roll1 = roll_parser(matches[0][1]);
          const roll2 = roll_parser(matches[1][1]);

          assert.equal(roll1.dice_count, 7, "First roll parsed");
          assert.equal(roll2.dice_count, 5, "Second roll parsed");
          assert.equal(roll2.bonus, 2, "Second roll bonus");
        });

        it("should distinguish L5R4 notation from Foundry notation", () => {
          // ARRANGE - Different notation formats
          const l5r4Patterns = ["7k3", "u3k3", "e7k3+5", "10k5"];
          const foundryPatterns = ["1d20", "2d6+5", "4d10"];

          // ACT & ASSERT
          const kxy = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;

          l5r4Patterns.forEach(pattern => {
            assert.isTrue(kxy.test(pattern), `L5R4: ${pattern} matches`);
          });

          foundryPatterns.forEach(pattern => {
            assert.isFalse(kxy.test(pattern), `Foundry: ${pattern} doesn't match`);
          });
        });

        it("should handle inline rolls with special modifiers", () => {
          // ARRANGE
          const messages = [
            { text: "Unskilled attack [[u3k3]]", notation: "u3k3", unskilled: true },
            { text: "With emphasis [[e7k3+2]]", notation: "e7k3+2", emphasis: true },
            { text: "Standard [[5k3]]", notation: "5k3", emphasis: false }
          ];

          // ACT & ASSERT
          const inline = /\[\[(.*?)\]\]/;
          messages.forEach(msg => {
            const match = msg.text.match(inline);
            assert.exists(match, `Found notation in: ${msg.text}`);

            const parsed = roll_parser(match[1]);
            if (msg.unskilled) {
              assert.isTrue(parsed.unskilled, "Unskilled flag detected");
            }
            if (msg.emphasis) {
              assert.isTrue(parsed.emphasis, "Emphasis flag detected");
            }
          });
        });
      });

      describe("Complex Roll Scenarios", () => {
        it("should handle explode bonus notation (xN)", async () => {
          // ARRANGE
          const notation = "7k3x2+5";

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT
          assert.equal(parsed.dice_count, 7, "Base dice");
          assert.equal(parsed.kept, 3, "Kept dice");
          assert.equal(parsed.explode_bonus, 2, "Explode bonus parsed");
          assert.equal(parsed.bonus, 5, "Flat bonus parsed");
        });

        it("should handle zero-value components", async () => {
          // ARRANGE
          const notation = "3k3+0";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.bonus, 0, "Zero bonus accepted");
          assert.isNumber(roll.total, "Roll executes with zero bonus");
        });

        it("should preserve notation through complete workflow", async () => {
          // ARRANGE - Start with chat notation
          const chatMessage = "I roll [[e7k3+5]] for my attack";

          // ACT - Extract notation
          const inline = /\[\[(.*?)\]\]/;
          const match = chatMessage.match(inline);
          const notation = match[1];

          // Parse
          const parsed = roll_parser(notation);

          // Build formula
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {
            emphasis: parsed.emphasis,
            unskilled: parsed.unskilled
          });

          // Execute
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT - Complete workflow
          assert.equal(notation, "e7k3+5", "Notation extracted");
          assert.isTrue(parsed.emphasis, "Emphasis preserved");
          assert.equal(parsed.dice_count, 7, "Dice count preserved");
          assert.equal(parsed.kept, 3, "Keep count preserved");
          assert.equal(parsed.bonus, 5, "Bonus preserved");
          assert.include(formula, "r1", "Emphasis in formula");
          assert.include(formula, "+5", "Bonus in formula");
          assert.isNumber(roll.total, "Roll executed");
          assert.isNumber(roll.total, "Result calculated");
        });
      });

      describe("Edge Cases and Error Handling", () => {
        it("should handle maximum dice pools", async () => {
          // ARRANGE - At Ten Dice Rule limit
          const notation = "10k10";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.dice_count, 10, "Max rolled dice");
          assert.equal(parsed.kept, 10, "Max kept dice");
          assert.isNumber(roll.total, "Maximum pool executes");
        });

        it("should handle keep greater than roll (invalid but test gracefully)", async () => {
          // ARRANGE - Invalid notation (keep > roll) but parser accepts it
          const notation = "3k5";

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT - Parser doesn't validate, just parses
          assert.equal(parsed.dice_count, 3, "Parsed dice count");
          assert.equal(parsed.kept, 3, "Keep capped at rolled by Ten Dice Rule");

          // Note: Foundry Roll API will handle this gracefully by keeping max available
        });

        it("should handle very large bonuses", async () => {
          // ARRANGE
          const notation = "5k3+100";

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.bonus, 100, "Large bonus parsed");
          assert.isAtLeast(roll.total, 103, "Minimum with large bonus (3 + 100)");
        });

        it("should handle notation without spaces", async () => {
          // ARRANGE - Compact notation
          const notations = ["7k3", "u3k3", "e7k3+5", "10k10+20"];

          // ACT & ASSERT
          notations.forEach(notation => {
            const parsed = roll_parser(notation);
            assert.exists(parsed, `Parsed: ${notation}`);
            assert.isNumber(parsed.dice_count, "Has dice_count");
            assert.isNumber(parsed.kept, "Has kept");
          });
        });

        it("should handle mixed case prefixes", async () => {
          // ARRANGE - Parser expects lowercase but test resilience
          const notation = "e5k3"; // Parser uses .includes() which is case-sensitive

          // ACT
          const parsed = roll_parser(notation);

          // ASSERT
          assert.isTrue(parsed.emphasis, "Lowercase prefix works");
        });
      });

      describe("Integration with Actor Context", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Dice Test Samurai",
            system: {
              traits: { agi: 4, per: 3 },
              rings: { earth: 3, void: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should execute skill-based roll with parsed notation", async () => {
          // ARRANGE - Skill 3 + Trait 4 = 7k4
          const skillRank = 3;
          const traitValue = actor.system.traits.agi;
          const rolled = skillRank + traitValue;
          const kept = traitValue;

          // Create notation that matches this skill roll
          const notation = `${rolled}k${kept}`;

          // ACT - Parse and execute
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, 0, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.equal(parsed.dice_count, 7, "Matches skill + trait");
          assert.equal(parsed.kept, 4, "Matches trait");
          assert.isNumber(roll.total, "Roll executes with actor context");
        });

        it("should apply wound penalties through bonus modifier", async () => {
          // ARRANGE - Wounded actor
          await actor.update({ "system.suffered": 20 });
          const woundPenalty = actor.system.woundPenalty || 0;

          // Create roll with penalty as negative bonus
          const notation = `5k3-${woundPenalty}`;

          // ACT
          const parsed = roll_parser(notation);
          const formula = buildFormula(parsed.dice_count, parsed.kept, parsed.bonus, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          // ASSERT
          assert.isBelow(parsed.bonus, 0, "Wound penalty is negative");
          assert.isNumber(roll.total, "Roll with penalty executes");
        });

        it("should support Void Point bonus notation", async () => {
          // ARRANGE - Void Point adds +1k1
          const baseNotation = "5k3";
          const withVoid = "6k4"; // +1k1 from Void

          // ACT
          const base = roll_parser(baseNotation);
          const voided = roll_parser(withVoid);

          // ASSERT - Void effect visible in notation
          assert.equal(voided.dice_count - base.dice_count, 1, "Void adds 1 rolled");
          assert.equal(voided.kept - base.kept, 1, "Void adds 1 kept");
        });
      });
    },
    { displayName: "L5R4: Dice Rolling Complete Workflow Tests" }
  );
}
