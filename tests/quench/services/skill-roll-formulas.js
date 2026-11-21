/**
 * Skill Roll formulas: XkY notation built into Foundry Roll formulas, unskilled rolls without exploding dice,
 * and the Skill + Trait pool of an actor's Skill.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { buildFormula } from "../helpers.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register the batch.
 * @param {object} quench - The Quench API
 */
export function registerSkillRollFormulaTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.skill-roll-formulas`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Basic roll creation", () => {
        it("should create valid Roll with Roll and Keep notation", async () => {
          // L5R4 uses buildFormula to convert XkY to Foundry notation
          const formula = buildFormula(5, 3, 0, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has total");
          assert.equal(formula, "5d10xa10k3+0", "Formula converted correctly");
        });

        it("should create Roll with modifier", async () => {
          const formula = buildFormula(7, 4, 5, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has total");
          assert.isAtLeast(roll.total, 5, "Roll total includes modifier");
        });

        it("should handle unskilled rolls without explosions", async () => {
          const formula = buildFormula(3, 2, 0, { unskilled: true });
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.equal(formula, "3d10k2+0", "Unskilled formula has no explosions");
          assert.notInclude(formula, "xa10", "No exploding dice for unskilled");
        });
      });

      describe("Actor with Skills", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Skilled Samurai",
            system: {
              traits: { agi: 3, per: 4 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 5, "agi")]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should access skill from actor", () => {
          const skill = actor.items.find(i => i.name === "Kenjutsu");

          assert.exists(skill, "Skill exists on actor");
          assert.equal(skill.system.rank, 5, "Skill has correct rank");
          assert.equal(skill.system.trait, "agi", "Skill has correct trait");
        });

        it("should calculate dice pool from skill and trait", () => {
          const skill = actor.items.find(i => i.name === "Kenjutsu");
          const trait = actor.system.traits[skill.system.trait];

          const rolled = skill.system.rank + trait;
          const kept = trait;

          assert.equal(rolled, 8, "Rolled dice calculated (5 + 3)");
          assert.equal(kept, 3, "Kept dice calculated (trait value)");
        });

        it("should create skill check roll", async () => {
          const skill = actor.items.find(i => i.name === "Kenjutsu");
          const trait = actor.system.traits[skill.system.trait];

          const rolled = skill.system.rank + trait;
          const kept = trait;

          // Use buildFormula to convert XkY to Foundry notation
          const formula = buildFormula(rolled, kept, 0, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has result");
          assert.equal(formula, "8d10xa10k3+0", "Formula built correctly for 8k3");
        });
      });
    },
    { displayName: "L5R4: Skill Roll formulas" }
  );
}
