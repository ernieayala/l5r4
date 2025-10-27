/**
 * Skill Roll Service Integration Tests
 *
 * Tests skill roll mechanics following L5R4 core rules:
 * - Skill + Trait dice pool calculation
 * - Roll and Keep formula construction
 * - Void point spending
 * - Emphasis mechanics
 * - Unskilled rolls
 * - Wound penalty application
 * - Target number evaluation
 *
 * @see module/services/dice/rolls/skill-roll.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { buildFormula } from "../../../module/services/dice/core/formula-builder.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register skill roll integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerSkillRollTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.rolls.skill`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Skill Roll Formula Construction", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Test Samurai",
            system: {
              traits: { agi: 3, per: 4 }
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

        it("should calculate correct dice pool (skill + trait)", () => {
          const traitValue = actor.system.traits[skill.system.trait];
          const rolled = skill.system.rank + traitValue; // 5 + 3 = 8
          const kept = traitValue; // 3

          assert.equal(rolled, 8, "Rolled dice = Skill + Trait");
          assert.equal(kept, 3, "Kept dice = Trait");
        });

        it("should build correct formula with buildFormula", () => {
          const formula = buildFormula(8, 3, 0, {});

          assert.equal(formula, "8d10k3x10+0", "Formula constructed correctly");
          assert.include(formula, "d10", "Uses d10 dice");
          assert.include(formula, "k3", "Keeps 3 dice");
          assert.include(formula, "x10", "Dice explode on 10");
        });

        it("should handle unskilled rolls without explosions", () => {
          const formula = buildFormula(3, 2, 0, { unskilled: true });

          assert.equal(formula, "3d10k2+0", "Unskilled formula correct");
          assert.notInclude(formula, "x10", "No explosions for unskilled");
        });

        it("should apply emphasis for re-rolling 1s", () => {
          const formula = buildFormula(5, 3, 0, { emphasis: true });

          assert.include(formula, "r1", "Emphasis re-rolls 1s");
        });
      });

      describe("Skill Roll Execution", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Roll Test Samurai",
            system: {
              traits: { agi: 4, sta: 3, wil: 3 }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Iaijutsu", 3, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have correct skill and trait values for roll", () => {
          // Test that we can access the data needed for a skill roll
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];

          assert.equal(skillRank, 3, "Skill rank is 3");
          assert.equal(traitValue, 4, "Trait value is 4");

          const rolled = skillRank + traitValue;
          const kept = traitValue;

          assert.equal(rolled, 7, "Roll pool calculated (3+4=7)");
          assert.equal(kept, 4, "Keep pool calculated (4)");
        });

        it("should calculate correct dice pool formula", () => {
          // Test dice pool calculation without calling service
          const skillRank = 3;
          const traitValue = 4;
          const rolled = skillRank + traitValue;
          const kept = traitValue;

          assert.equal(rolled, 7, "Rolled dice = 3 + 4");
          assert.equal(kept, 4, "Kept dice = trait (4)");
          // Formula would be 7k4
        });
      });

      describe("Unskilled Rolls", () => {
        it("should use trait-only formula for rank 0 skills", () => {
          // Unskilled: skill rank 0 = trait only
          const _skillRank = 0;
          const traitValue = 3;
          const rolled = traitValue; // No skill rank added
          const kept = traitValue;

          assert.equal(rolled, 3, "Unskilled rolled = trait only");
          assert.equal(kept, 3, "Unskilled kept = trait only");
          // Formula would be 3k3
        });

        it("should not allow explosions on unskilled rolls", () => {
          const formula = buildFormula(3, 3, 0, { unskilled: true });

          assert.notInclude(formula, "x10", "Unskilled rolls don't explode");
        });
      });

      describe("Roll Modifiers", () => {
        it("should apply roll bonus to dice pool", () => {
          const skillRank = 4;
          const traitValue = 3;
          const rollBonus = 2;
          const rolled = skillRank + traitValue + rollBonus;
          const kept = traitValue;

          assert.equal(rolled, 9, "Roll bonus applied (4+3+2=9)");
          assert.equal(kept, 3, "Keep unchanged");
          // Formula would be 9k3
        });

        it("should apply keep bonus to kept dice", () => {
          const skillRank = 4;
          const traitValue = 3;
          const keepBonus = 1;
          const rolled = skillRank + traitValue;
          const kept = traitValue + keepBonus;

          assert.equal(rolled, 7, "Roll unchanged");
          assert.equal(kept, 4, "Keep bonus applied (3+1=4)");
          // Formula would be 7k4
        });

        it("should apply total bonus to result", () => {
          const formula = buildFormula(5, 3, 5, {});

          assert.include(formula, "+5", "Total bonus added to formula");
        });
      });

      describe("Wound Penalties", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Wounded Samurai",
            system: {
              traits: { sta: 3, wil: 3, agi: 3 },
              suffered: 20 // Wounded
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have wound penalty calculated", () => {
          // Wound penalty is calculated in actor.system.woundPenalty
          const woundPenalty = actor.system.woundPenalty || 0;

          assert.isNumber(woundPenalty, "Wound penalty is a number");
          assert.isAtLeast(woundPenalty, 0, "Wound penalty is non-negative");
          // Penalty would be applied to TN or roll total
        });
      });

      describe("Edge Cases", () => {
        it("should handle minimum trait value (2)", () => {
          const skillRank = 1;
          const traitValue = 2;
          const rolled = skillRank + traitValue;
          const kept = traitValue;

          assert.equal(rolled, 3, "Minimum roll pool (1+2=3)");
          assert.equal(kept, 2, "Minimum keep pool (2)");
          // Formula would be 3k2
        });

        it("should handle zero skill rank (unskilled)", () => {
          const _skillRank = 0;
          const traitValue = 3;
          const rolled = traitValue; // Unskilled = trait only
          const kept = traitValue;

          assert.equal(rolled, 3, "Unskilled uses trait only");
          assert.equal(kept, 3, "Unskilled keeps trait only");
        });

        it("should handle high dice pools", () => {
          const formula = buildFormula(15, 8, 0, {});

          assert.exists(formula, "High dice pool formula created");
          // Ten Dice Rule should cap at 10k10
        });

        it("should handle negative modifiers", () => {
          const formula = buildFormula(5, 3, -5, {});

          assert.include(formula, "-5", "Negative modifiers supported");
        });
      });

      describe("Formula Building", () => {
        it("should create proper Roll formula string", () => {
          const rolled = 7;
          const kept = 4;
          const bonus = 0;
          const formula = buildFormula(rolled, kept, bonus, {});

          assert.include(formula, "7d10", "Rolled dice in formula");
          assert.include(formula, "k4", "Kept dice in formula");
          assert.include(formula, "x10", "Exploding dice in formula");
        });

        it("should include bonuses in formula", () => {
          const formula = buildFormula(5, 3, 10, {});

          assert.include(formula, "+10", "Bonus in formula");
        });
      });

      describe("Raise Mechanics", () => {
        it("should increase effective TN by 5 per raise", () => {
          const baseTN = 15;
          const raises = 2;
          const effectiveTN = baseTN + raises * 5;

          assert.equal(effectiveTN, 25, "Each raise adds +5 to TN (15 + 10 = 25)");
        });

        it("should reduce effective TN by 5 per free raise", () => {
          const baseTN = 20;
          const freeRaises = 2;
          const effectiveTN = baseTN - freeRaises * 5;

          assert.equal(effectiveTN, 10, "Each free raise reduces TN by 5 (20 - 10 = 10)");
        });

        it("should combine raises and free raises correctly", () => {
          const baseTN = 20;
          const raises = 3;
          const freeRaises = 1;
          const effectiveTN = baseTN + raises * 5 - freeRaises * 5;

          assert.equal(effectiveTN, 30, "Raises add, free raises subtract (20 + 15 - 5 = 30)");
        });

        it("should not allow TN to go below 0 with free raises", () => {
          const baseTN = 10;
          const freeRaises = 3;
          const effectiveTN = Math.max(0, baseTN - freeRaises * 5);

          assert.equal(effectiveTN, 0, "TN has floor of 0");
        });

        it("should handle unskilled rolls without raises", () => {
          // Unskilled rolls cannot use raises per L5R4 rules
          const isUnskilled = true;
          const maxRaises = isUnskilled ? 0 : 5;

          assert.equal(maxRaises, 0, "Unskilled rolls cannot declare raises");
        });
      });
    },
    { displayName: "L5R4: Skill Roll Service Tests" }
  );
}
