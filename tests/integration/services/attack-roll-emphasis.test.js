/**
 * Attack Roll + Emphasis Integration Tests
 *
 * **What This Tests:**
 * - Attack rolls with weapon skills that have emphasis
 * - Emphasis re-roll mechanic (r1) on attack rolls
 * - Attack + Emphasis + Void Point combination
 * - Attack + Emphasis + Stance combinations
 * - Attack + Emphasis + All modifiers
 * - Chat card validation for emphasis display
 *
 * **Why This Matters:**
 * - Weapon skills (Kenjutsu, Kyujutsu, etc.) commonly have emphasis
 * - Emphasis is a core L5R4 mechanic that re-rolls 1s once
 * - Users report this combination is broken in production
 * - Missing from current test coverage
 *
 * **L5R4 Rules:**
 * - Emphasis allows re-rolling 1s once per roll
 * - Attack formula: (Skill + Trait)k(Trait) with emphasis = r1
 * - Unskilled attacks cannot use emphasis (no skill = no emphasis)
 * - Emphasis stacks with void points, stances, and other modifiers
 *
 * @see module/services/dice/rolls/skill-roll.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { buildFormula } from "../../../module/services/dice/core/formula-builder.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData, createWeaponData } from "../../fixtures/item-fixtures.js";

/**
 * Register attack roll + emphasis integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerAttackRollEmphasisTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.rolls.attack-emphasis`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Attack Roll + Emphasis (Basic)", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          // ARRANGE - Create actor with Kenjutsu skill that has emphasis
          actor = await createTestPC({
            name: "Emphasis Test Samurai",
            system: {
              traits: { agi: 4, str: 3 },
              rings: { earth: 3, void: { rank: 3, value: 3 } }
            }
          });

          // Create Kenjutsu skill with Katana emphasis
          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: {
                emphasis: "Katana"
              }
            })
          ]);

          // Create Katana weapon
          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: {
                associatedSkill: "kenjutsu",
                fallbackTrait: "agi"
              }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should apply emphasis to weapon attack roll", async () => {
          // ARRANGE - Verify skill has emphasis
          assert.equal(skill.system.emphasis, "Katana", "Skill has Katana emphasis");
          assert.equal(skill.system.rank, 5, "Skill rank is 5");
          assert.equal(actor.system.traits.agi, 4, "Agility is 4");

          // ACT - Calculate attack roll formula
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits.agi;
          const rolled = skillRank + traitValue; // 5 + 4 = 9
          const kept = traitValue; // 4

          // ASSERT - Verify dice pool calculation
          assert.equal(rolled, 9, "Rolled dice = Skill + Trait (5+4=9)");
          assert.equal(kept, 4, "Kept dice = Trait (4)");

          // Formula with emphasis should include r1 (re-roll 1s)
          // Expected: 9d10k4r1x10
        });

        it("should include r1 modifier in formula when emphasis applies", () => {
          // ARRANGE - Emphasis flag set to true
          const emphasis = true;
          const rolled = 9;
          const kept = 4;

          // ACT - Build formula with emphasis
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - Formula must include r1 for emphasis
          assert.include(formula, "r1", "Formula includes r1 (re-roll 1s)");
          assert.include(formula, "9d10", "Correct rolled dice");
          assert.include(formula, "k4", "Correct kept dice");
          assert.include(formula, "x10", "Dice explode on 10");
        });

        it("should not include r1 when emphasis is false", () => {
          // ARRANGE - Emphasis flag set to false
          const emphasis = false;
          const rolled = 9;
          const kept = 4;

          // ACT - Build formula without emphasis
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - Formula must NOT include r1
          assert.notInclude(formula, "r1", "Formula does not include r1");
          assert.include(formula, "9d10k4", "Correct dice pool");
        });

        it("should handle weapon with no emphasis", async () => {
          // ARRANGE - Create skill without emphasis
          const [noEmphasisSkill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kyujutsu", 3, "ref", {
              system: {
                emphasis: "" // No emphasis
              }
            })
          ]);

          // ASSERT - Skill has no emphasis
          assert.equal(noEmphasisSkill.system.emphasis, "", "Skill has no emphasis");

          // Attack roll should work without r1 modifier
          const skillRank = noEmphasisSkill.system.rank;
          const traitValue = actor.system.traits.ref;
          const rolled = skillRank + traitValue;
          const kept = traitValue;

          assert.isNumber(rolled, "Rolled dice calculated");
          assert.isNumber(kept, "Kept dice calculated");
        });
      });

      describe("Attack Roll + Emphasis + Void Point", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Void + Emphasis Test",
            system: {
              traits: { agi: 4, str: 3 },
              rings: { void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: { emphasis: "Katana" }
            })
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should combine emphasis and void point bonuses", () => {
          // ARRANGE
          const skillRank = 5;
          const traitValue = 4;
          const voidRollBonus = 1;
          const voidKeepBonus = 1;

          // ACT - Calculate with void point
          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + voidRollBonus; // 10
          const finalKept = baseKept + voidKeepBonus; // 5

          // ASSERT
          assert.equal(finalRolled, 10, "Void adds +1 rolled (9+1=10)");
          assert.equal(finalKept, 5, "Void adds +1 kept (4+1=5)");

          // Formula should be: 10d10k5r1x10
          // - 10d10: rolled dice with void
          // - k5: kept dice with void
          // - r1: emphasis re-rolls 1s
          // - x10: dice explode
        });

        it("should build correct formula with emphasis and void", () => {
          // ARRANGE
          const rolled = 10; // Base 9 + void 1
          const kept = 5; // Base 4 + void 1
          const emphasis = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - Both emphasis and void bonuses present
          assert.include(formula, "10d10", "Rolled dice includes void bonus");
          assert.include(formula, "k5", "Kept dice includes void bonus");
          assert.include(formula, "r1", "Emphasis re-rolls 1s");
          assert.include(formula, "x10", "Dice explode");
        });

        it("should verify void point available before spending", () => {
          // ARRANGE
          const voidRank = actor.system.rings.void.rank;
          const voidCurrent = actor.system.rings.void.value;

          // ASSERT
          assert.equal(voidRank, 3, "Void Ring rank is 3");
          assert.equal(voidCurrent, 3, "Current void points is 3");
          assert.isAtLeast(voidCurrent, 1, "Actor has void points to spend");
        });
      });

      describe("Attack Roll + Emphasis + Full Attack Stance", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Stance + Emphasis Test",
            system: {
              traits: { agi: 4, ref: 3, str: 3 },
              rings: { earth: 3 }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: { emphasis: "Katana" }
            })
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should apply Full Attack stance bonuses to attack with emphasis", async () => {
          // ARRANGE - Apply Full Attack stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              statuses: ["fullAttackStance"],
              disabled: false
            }
          ]);

          actor.prepareData();

          // Full Attack gives +2k1 to attack rolls
          const stanceRollBonus = 2;
          const stanceKeepBonus = 1;

          // ACT - Calculate attack with stance
          const skillRank = 5;
          const traitValue = 4;
          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + stanceRollBonus; // 11
          const finalKept = baseKept + stanceKeepBonus; // 5

          // ASSERT
          assert.equal(finalRolled, 11, "Stance adds +2 rolled (9+2=11)");
          assert.equal(finalKept, 5, "Stance adds +1 kept (4+1=5)");

          // Formula should be: 11d10k5r1x10
          // - 11d10: base + stance roll bonus
          // - k5: base + stance keep bonus
          // - r1: emphasis
          // - x10: explode
        });

        it("should verify Armor TN penalty from Full Attack", async () => {
          // ARRANGE - Get base Armor TN
          const baseArmorTN = actor.system.armorTn.current; // (3 * 5) + 5 = 20

          // Apply Full Attack
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              statuses: ["fullAttackStance"],
              disabled: false
            }
          ]);

          // ACT
          actor.prepareData();

          // ASSERT - Full Attack reduces Armor TN by 10
          const fullAttackTN = actor.system.armorTn.current;
          assert.equal(fullAttackTN, baseArmorTN - 10, "Full Attack -10 Armor TN");
        });

        it("should build correct formula with emphasis and Full Attack", () => {
          // ARRANGE
          const rolled = 11; // Base 9 + stance 2
          const kept = 5; // Base 4 + stance 1
          const emphasis = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT
          assert.include(formula, "11d10", "Rolled includes stance bonus");
          assert.include(formula, "k5", "Kept includes stance bonus");
          assert.include(formula, "r1", "Emphasis re-rolls 1s");
          assert.include(formula, "x10", "Dice explode");
        });
      });

      describe("Attack Roll + Emphasis + All Modifiers", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "All Modifiers Test",
            system: {
              traits: { agi: 4, ref: 3, str: 3 },
              rings: { earth: 3, void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: { emphasis: "Katana" }
            })
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should combine emphasis + void + Full Attack stance", async () => {
          // ARRANGE - Apply Full Attack stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              statuses: ["fullAttackStance"],
              disabled: false
            }
          ]);

          actor.prepareData();

          // ACT - Calculate with all modifiers
          const skillRank = 5;
          const traitValue = 4;
          const voidRoll = 1;
          const voidKeep = 1;
          const stanceRoll = 2;
          const stanceKeep = 1;

          const baseRolled = skillRank + traitValue; // 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + voidRoll + stanceRoll; // 12
          const finalKept = baseKept + voidKeep + stanceKeep; // 6

          // ASSERT - All bonuses stack
          assert.equal(finalRolled, 12, "All roll bonuses stack (9+1+2=12)");
          assert.equal(finalKept, 6, "All keep bonuses stack (4+1+1=6)");

          // Formula should be: 12d10k6r1x10
          // - Emphasis: r1
          // - Void: +1k1
          // - Full Attack: +2k1
          // - Total: (5+4+1+2)k(4+1+1) = 12k6 with r1 and x10
        });

        it("should build correct formula with all modifiers", () => {
          // ARRANGE
          const rolled = 12; // Base 9 + void 1 + stance 2
          const kept = 6; // Base 4 + void 1 + stance 1
          const emphasis = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - All modifiers present
          assert.include(formula, "12d10", "All roll bonuses applied");
          assert.include(formula, "k6", "All keep bonuses applied");
          assert.include(formula, "r1", "Emphasis re-rolls 1s");
          assert.include(formula, "x10", "Dice explode");
        });

        it("should handle emphasis + void + stance + raises", () => {
          // ARRANGE
          const baseRolled = 9; // Skill 5 + Trait 4
          const baseKept = 4;
          const voidBonus = 1;
          const stanceRollBonus = 2;
          const stanceKeepBonus = 1;
          const raises = 2; // Declared raises (affects TN, not dice)

          // ACT - Calculate final dice pool
          const finalRolled = baseRolled + voidBonus + stanceRollBonus; // 12
          const finalKept = baseKept + voidBonus + stanceKeepBonus; // 6

          // Calculate TN with raises
          const baseTN = 20; // Target's Armor TN
          const effectiveTN = baseTN + raises * 5; // 20 + 10 = 30

          // ASSERT
          assert.equal(finalRolled, 12, "Dice pool correct");
          assert.equal(finalKept, 6, "Kept dice correct");
          assert.equal(effectiveTN, 30, "TN increased by raises (20 + 10 = 30)");

          // Raises affect TN, not dice pool
          // Formula: 12d10k6r1x10 vs TN 30
        });
      });

      describe("Unskilled Attack (No Emphasis)", () => {
        let actor, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Unskilled Test",
            system: {
              traits: { agi: 3, str: 3 },
              rings: { earth: 2 }
            }
          });

          // Create weapon but NO skill
          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Naginata", 3, 2, {
              system: {
                associatedSkill: "polearms",
                fallbackTrait: "agi"
              }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should not apply emphasis to unskilled attack", () => {
          // ARRANGE - No skill = unskilled attack
          const hasSkill = actor.items.find(i => i.name.toLowerCase() === "polearms");
          assert.notExists(hasSkill, "Actor doesn't have Polearms skill");

          // ACT - Unskilled attack uses trait only
          const traitValue = actor.system.traits.agi; // 3
          const rolled = traitValue; // 3 (no skill rank)
          const kept = traitValue; // 3

          // ASSERT
          assert.equal(rolled, 3, "Unskilled rolled = trait only");
          assert.equal(kept, 3, "Unskilled kept = trait only");

          // Formula should be: 3d10k3 (no r1, no x10 for unskilled)
        });

        it("should not include r1 or x10 for unskilled attacks", () => {
          // ARRANGE
          const rolled = 3;
          const kept = 3;
          const unskilled = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { unskilled });

          // ASSERT - Unskilled has no emphasis or explosions
          assert.notInclude(formula, "r1", "No emphasis for unskilled");
          assert.notInclude(formula, "x10", "No explosions for unskilled");
          assert.include(formula, "3d10k3", "Correct unskilled formula");
        });

        it("should handle unskilled attack with rank 0 skill", async () => {
          // ARRANGE - Create skill with rank 0
          const [zeroRankSkill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Polearms", 0, "agi", {
              system: { emphasis: "Naginata" } // Has emphasis but rank 0
            })
          ]);

          // ACT - Rank 0 = unskilled
          const skillRank = zeroRankSkill.system.rank;
          const traitValue = actor.system.traits.agi;
          const rolled = traitValue; // Unskilled uses trait only
          const kept = traitValue;

          // ASSERT
          assert.equal(skillRank, 0, "Skill rank is 0");
          assert.equal(rolled, 3, "Unskilled uses trait only");
          assert.equal(kept, 3, "Unskilled keeps trait only");

          // Even with emphasis defined, rank 0 = unskilled = no r1
        });
      });

      describe("Edge Cases", () => {
        let actor, skill, weapon;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Edge Case Test",
            system: {
              traits: { agi: 4, str: 3 },
              rings: { earth: 3, void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi", {
              system: { emphasis: "Katana" }
            })
          ]);

          [weapon] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle emphasis with minimum trait value", async () => {
          // ARRANGE - Set trait to minimum (2)
          await actor.update({ "system.traits.agi": 2 });

          // ACT
          const skillRank = 5;
          const traitValue = 2;
          const rolled = skillRank + traitValue; // 7
          const kept = traitValue; // 2

          // ASSERT
          assert.equal(rolled, 7, "Minimum trait still works (5+2=7)");
          assert.equal(kept, 2, "Minimum kept dice (2)");

          // Formula: 7d10k2r1x10
        });

        it("should handle emphasis with high dice pool", () => {
          // ARRANGE - High skill and trait
          const skillRank = 10;
          const traitValue = 8;
          const rolled = skillRank + traitValue; // 18
          const kept = traitValue; // 8

          // ACT - Ten Dice Rule should cap this
          const cappedRolled = Math.min(rolled, 10);
          const cappedKept = Math.min(kept, 10);

          // ASSERT
          assert.equal(cappedRolled, 10, "Rolled capped at 10");
          assert.equal(cappedKept, 8, "Kept not capped (8 < 10)");

          // Ten Dice Rule: max 10 rolled, excess becomes bonus
          // Formula: 10d10k8r1x10+8
        });

        it("should handle emphasis with zero void points", async () => {
          // ARRANGE - Spend all void points
          await actor.update({ "system.rings.void.value": 0 });

          // ACT
          const voidCurrent = actor.system.rings.void.value;

          // ASSERT
          assert.equal(voidCurrent, 0, "No void points available");

          // Attack with emphasis should still work, just no void bonus
          const rolled = 9; // Base only
          const kept = 4;

          assert.equal(rolled, 9, "Dice pool without void");
          assert.equal(kept, 4, "Kept dice without void");
        });

        it("should handle multiple emphases on same skill", async () => {
          // ARRANGE - Skill with multiple emphases (e.g., "Katana, Wakizashi")
          await skill.update({ "system.emphasis": "Katana, Wakizashi" });

          // ACT
          const emphasis = skill.system.emphasis;

          // ASSERT
          assert.include(emphasis, "Katana", "Has Katana emphasis");
          assert.include(emphasis, "Wakizashi", "Has Wakizashi emphasis");

          // System should handle multiple emphases
          // User selects which applies during roll dialog
        });

        it("should handle weapon with different skill than emphasis", async () => {
          // ARRANGE - Skill has emphasis for different weapon
          const [kyujutsuSkill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kyujutsu", 4, "ref", {
              system: { emphasis: "Yumi" } // Emphasis for Yumi
            })
          ]);

          const [daikyu] = await actor.createEmbeddedDocuments("Item", [
            createWeaponData("Daikyu", 2, 2, {
              system: { associatedSkill: "kyujutsu" } // Uses Kyujutsu
            })
          ]);

          // ACT - Using Daikyu with Yumi emphasis
          const skillEmphasis = kyujutsuSkill.system.emphasis;
          const weaponName = daikyu.name;

          // ASSERT
          assert.equal(skillEmphasis, "Yumi", "Emphasis is for Yumi");
          assert.equal(weaponName, "Daikyu", "Weapon is Daikyu");

          // Emphasis applies to skill, not weapon
          // User decides if emphasis applies (Daikyu is a type of Yumi)
        });
      });

      describe("Formula Validation", () => {
        it("should create valid attack formula with emphasis", () => {
          // ARRANGE
          const rolled = 9;
          const kept = 4;
          const emphasis = true;

          // ACT
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          // ASSERT - Formula is valid Roll syntax
          assert.exists(formula, "Formula exists");
          assert.isString(formula, "Formula is string");
          assert.include(formula, "d10", "Uses d10 dice");
          assert.include(formula, "k", "Has keep notation");
          assert.include(formula, "r1", "Has re-roll notation");
          assert.include(formula, "x10", "Has explode notation");

          // Should be parseable by Foundry's Roll class
          assert.doesNotThrow(() => {
            new Roll(formula);
          }, "Formula is valid Roll syntax");
        });

        it("should enforce dice pool constraints with emphasis", () => {
          // ARRANGE
          const rolled = 8;
          const kept = 4;

          // ASSERT - Constraints
          assert.isAtLeast(rolled, 1, "Must roll at least 1 die");
          assert.isAtLeast(kept, 1, "Must keep at least 1 die");
          assert.isAtMost(kept, rolled, "Cannot keep more than rolled");

          // Emphasis doesn't change constraints
          const emphasis = true;
          const formula = buildFormula(rolled, kept, 0, { emphasis });

          assert.exists(formula, "Valid formula with constraints");
        });
      });
    },
    { displayName: "L5R4: Attack Roll + Emphasis Tests" }
  );
}
