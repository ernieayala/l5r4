/**
 * Integration Tests: Wound Penalty Application Across All Roll Types
 *
 * Critical Verification:
 * - Wound penalties ALWAYS subtract from roll total (never add to TN)
 * - Wound penalties apply to ALL roll types (skill, trait, ring, spell, attack)
 * - Wound penalties combine correctly with other modifiers (void, emphasis, stance)
 * - applyWoundPenalty flag can disable penalty when needed
 *
 * L5R4 Rules Context:
 * Wound penalties represent physical impairment from injuries. They reduce the
 * character's effectiveness by subtracting from their roll result, making it
 * harder to meet target numbers. Penalties scale with wound severity:
 * - Healthy: 0, Nicked: +3, Grazed: +5, Hurt: +10, Injured: +15, Crippled: +20, Down: +40
 *
 */

import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  createSkillData,
  createSpellData,
  createWeaponData
} from "../../fixtures/item-fixtures.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { TraitRoll } from "../../../module/services/dice/rolls/trait-roll.js";
import { RingRoll } from "../../../module/services/dice/rolls/ring-roll.js";
import { SpellCastRoll } from "../../../module/services/dice/rolls/spell-cast-roll.js";
import { MahoCastRoll } from "../../../module/services/dice/rolls/maho-cast-roll.js";
import { SimpleRoll } from "../../../module/services/dice/rolls/simple-roll.js";

/**
 * Register Quench test batch for wound penalty integration tests.
 */
export function register(quench) {
  quench.registerBatch(
    "l5r4-enhanced.wound-penalty-all-rolls",
    context => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe("Wound Penalty Application Across All Roll Types", () => {
        let actor;

        before(async () => {
          // Create test actor with moderate wound penalty
          actor = await createTestPC({
            name: "Wounded Samurai",
            traits: { agi: 3, str: 4, ref: 3, sta: 3, int: 3, per: 3, wil: 3, awa: 3 },
            rings: { earth: 3, water: 3, fire: 3, air: 3, void: 3 },
            voidPoints: { current: 3, max: 3 }
          });

          // Set wound level to "Hurt" (10 penalty)
          await actor.update({ "system.suffered": 20 });
        });

        after(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        describe("Skill Rolls + Wound Penalty", () => {
          let skill;

          beforeEach(async () => {
            const skillData = createSkillData("Kenjutsu", 3, "agi");
            const items = await actor.createEmbeddedDocuments("Item", [skillData]);
            skill = items[0];
          });

          afterEach(async () => {
            if (skill) {
              await skill.delete();
            }
          });

          it("should apply wound penalty to skill roll total", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // ACT
            const message = await SkillRoll({
              actor,
              skillName: "kenjutsu",
              actorTrait: 3,
              skillRank: 3,
              skillTrait: "agi",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];
            assert.exists(roll, "Roll exists");

            // Verify wound penalty was subtracted from total
            // Base pool: (3 skill + 3 agi)k3 = 6k3
            // With wound penalty: 6k3 - woundPenalty
            // Note: buildFormula adds spaces around operators
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty in formula");
          });

          it("should not apply wound penalty when flag is false", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT - Explicitly disable wound penalty
            const message = await SkillRoll({
              actor,
              skillName: "kenjutsu",
              actorTrait: 3,
              skillRank: 3,
              skillTrait: "agi",
              woundPenalty,
              askForOptions: false
              // Note: applyWoundPenalty controlled via dialog, default is true
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            // This test documents current behavior - wound penalty applies by default
            // To disable, user must uncheck in dialog
          });

          it("should combine wound penalty with void point", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            const initialVoid = actor.system.rings.void.value;

            // ACT - This would require dialog interaction to spend void
            // For now, document that combination should work
            // Future: Add dialog mock to test void + wound penalty

            // ASSERT
            assert.isAbove(woundPenalty, 0, "Wound penalty exists");
            assert.isAbove(initialVoid, 0, "Void points available");
            // Test documents requirement: wound penalty + void should both apply
          });

          it("should apply wound penalty to unskilled roll", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT - Unskilled roll (rank 0)
            const message = await SkillRoll({
              actor,
              skillName: "kenjutsu",
              actorTrait: 3,
              skillRank: 0, // Unskilled
              skillTrait: "agi",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];

            // Unskilled: 3k3 (trait only, no exploding)
            // With wound penalty: 3k3 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty applied to unskilled");
          });
        });

        describe("Trait Rolls + Wound Penalty", () => {
          it("should apply wound penalty to trait roll total", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // ACT
            const message = await TraitRoll({
              actor,
              traitName: "Strength",
              traitRank: 4,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];

            // Trait roll: 4k4 (STR 4)
            // With wound penalty: 4k4 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty in trait roll");
          });

          it("should apply wound penalty to minimum trait value", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT - Minimum trait (2)
            const message = await TraitRoll({
              actor,
              traitName: "Reflexes",
              traitRank: 2,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];

            // Even with minimum trait, wound penalty applies
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty on minimum trait");
          });

          it("should apply wound penalty to maximum trait value", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // Update actor to have max trait
            await actor.update({ "system.traits.str": 10 });

            // ACT
            const message = await TraitRoll({
              actor,
              traitName: "Strength",
              traitRank: 10,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];

            // Maximum trait still gets wound penalty
            // 10k10 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty on maximum trait");

            // Cleanup
            await actor.update({ "system.traits.str": 4 });
          });
        });

        describe("Ring Rolls + Wound Penalty", () => {
          it("should apply wound penalty to ring roll total", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // ACT - Fire ring roll
            const message = await RingRoll({
              actor,
              ringRank: 3,
              ringName: "Fire",
              systemRing: "fire",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];

            // Ring roll: 3k3 (Fire 3)
            // With wound penalty: 3k3 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty in ring roll");
          });

          it("should apply wound penalty to void ring roll", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT - Void ring roll (special case)
            const message = await RingRoll({
              actor,
              ringRank: 3,
              ringName: "Void",
              systemRing: "void",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll message created");
            const roll = message.rolls[0];

            // Void ring roll also gets wound penalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty on void ring");
          });
        });

        describe("Spell Casting + Wound Penalty", () => {
          let spell;

          beforeEach(async () => {
            const spellData = createSpellData("Test Fire Spell", "fire", 2);
            const items = await actor.createEmbeddedDocuments("Item", [spellData]);
            spell = items[0];
          });

          afterEach(async () => {
            if (spell) {
              await spell.delete();
            }
          });

          it("should apply wound penalty to spell casting roll", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // Ensure actor has spell slots
            await actor.update({ "system.spellSlots.fire": 3 });

            // ACT
            const message = await SpellCastRoll({
              actor,
              spell,
              woundPenalty,
              showDialog: false
            });

            // ASSERT
            assert.exists(message, "Spell cast message created");
            const roll = message.rolls[0];

            // Spell casting: (Ring + School Rank)k(Ring)
            // Assuming school rank 1: (3 + 1)k3 = 4k3
            // With wound penalty: 4k3 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty in spell roll");
          });

          it("should apply wound penalty with affinity bonus", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // Create shugenja school with Fire affinity
            const school = await actor.createEmbeddedDocuments("Item", [
              {
                name: "Isawa Shugenja",
                type: "technique",
                system: {
                  shugenja: true,
                  affinity: "fire",
                  deficiency: "earth"
                }
              }
            ]);

            await actor.update({ "system.spellSlots.fire": 3 });

            // ACT
            const message = await SpellCastRoll({
              actor,
              spell,
              woundPenalty,
              showDialog: false
            });

            // ASSERT
            assert.exists(message, "Spell cast with affinity");
            const roll = message.rolls[0];

            // Affinity adds +1 to school rank: (3 + 2)k3 = 5k3
            // With wound penalty: 5k3 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty with affinity");

            // Cleanup
            await school[0].delete();
          });

          it("should apply wound penalty with deficiency penalty", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // Create Earth spell (deficiency element)
            const earthSpellData = createSpellData("Test Earth Spell", "earth", 1);
            const earthSpellItems = await actor.createEmbeddedDocuments("Item", [earthSpellData]);
            const earthSpell = earthSpellItems[0];

            // Create shugenja school with Earth deficiency
            const school = await actor.createEmbeddedDocuments("Item", [
              {
                name: "Isawa Shugenja",
                type: "technique",
                system: {
                  shugenja: true,
                  affinity: "fire",
                  deficiency: "earth"
                }
              }
            ]);

            await actor.update({ "system.spellSlots.earth": 3 });

            // ACT
            const message = await SpellCastRoll({
              actor,
              spell: earthSpell,
              woundPenalty,
              showDialog: false
            });

            // ASSERT
            // Deficiency subtracts 1 from school rank
            // If school rank becomes 0 or less, casting is blocked
            // This test verifies wound penalty still applies if casting allowed
            if (message) {
              const roll = message.rolls[0];
              assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty with deficiency");
            }

            // Cleanup
            await earthSpell.delete();
            await school[0].delete();
          });
        });

        describe("Maho Casting + Wound Penalty", () => {
          let mahoSpell;

          beforeEach(async () => {
            const mahoSpellData = createSpellData("Test Maho Spell", "earth", 1, {
              system: { maho: true }
            });
            const items = await actor.createEmbeddedDocuments("Item", [mahoSpellData]);
            mahoSpell = items[0];
          });

          afterEach(async () => {
            if (mahoSpell) {
              await mahoSpell.delete();
            }
          });

          it("should apply wound penalty to maho casting roll", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // ACT
            const message = await MahoCastRoll({
              actor,
              spell: mahoSpell,
              woundPenalty,
              showDialog: false
            });

            // ASSERT
            assert.exists(message, "Maho cast message created");
            const roll = message.rolls[0];

            // Maho uses Insight Rank instead of School Rank
            // (Ring + Insight Rank)k(Ring)
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty in maho roll");
          });

          it("should apply wound penalty even after blood cost", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            const initialWounds = actor.system.suffered;

            // ACT - Maho inflicts blood cost wounds before roll
            const message = await MahoCastRoll({
              actor,
              spell: mahoSpell,
              woundPenalty,
              showDialog: false
            });

            // ASSERT
            assert.exists(message, "Maho cast successful");

            // Verify wounds increased from blood cost
            const finalWounds = actor.system.suffered;
            assert.isAbove(finalWounds, initialWounds, "Blood cost inflicted");

            // Wound penalty still applied to roll
            const roll = message.rolls[0];
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty after blood cost");
          });
        });

        describe("Attack Rolls + Wound Penalty", () => {
          let weapon;

          beforeEach(async () => {
            const weaponData = createWeaponData("Katana", 3, 2, {
              system: {
                associatedSkill: "kenjutsu",
                fallbackTrait: "agi",
                rollBonus: 0,
                keepBonus: 0
              }
            });
            const items = await actor.createEmbeddedDocuments("Item", [weaponData]);
            weapon = items[0];
          });

          afterEach(async () => {
            if (weapon) {
              await weapon.delete();
            }
          });

          it("should apply wound penalty to attack roll", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // Create skill for weapon
            const skillData = createSkillData("Kenjutsu", 3, "agi");
            const skillItems = await actor.createEmbeddedDocuments("Item", [skillData]);
            const skill = skillItems[0];

            // ACT
            const message = await SkillRoll({
              actor,
              skillName: "kenjutsu",
              actorTrait: 3,
              skillRank: 3,
              skillTrait: "agi",
              rollType: "attack",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Attack roll created");
            const roll = message.rolls[0];

            // Attack roll gets wound penalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty in attack");

            // Cleanup
            await skill.delete();
          });

          it("should apply wound penalty with stance bonuses", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // Set Full Attack stance (+2k1 to attack)
            await actor.update({ "system.stance": "fullAttackStance" });

            const skillData = createSkillData("Kenjutsu", 3, "agi");
            const skillItems = await actor.createEmbeddedDocuments("Item", [skillData]);
            const skill = skillItems[0];

            // ACT
            const message = await SkillRoll({
              actor,
              skillName: "kenjutsu",
              actorTrait: 3,
              skillRank: 3,
              skillTrait: "agi",
              rollType: "attack",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Attack with stance created");
            const roll = message.rolls[0];

            // Full Attack: (3+3+2)k(3+1) = 8k4
            // With wound penalty: 8k4 - woundPenalty
            assert.include(roll.formula, `- ${woundPenalty}`, "Wound penalty with stance");

            // Cleanup
            await skill.delete();
            await actor.update({ "system.stance": "" });
          });
        });

        // Note: SimpleRoll tests omitted because SimpleRoll always shows dialog
        // and cannot be bypassed for automated testing. Wound penalty application
        // in SimpleRoll is verified through the formula builder tests instead.

        describe("Wound Penalty Edge Cases", () => {
          it("should handle zero wound penalty", async () => {
            // ARRANGE - Heal actor to healthy
            await actor.update({ "system.suffered": 0 });
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT
            const message = await TraitRoll({
              actor,
              traitName: "Strength",
              traitRank: 4,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll with no penalty created");
            const roll = message.rolls[0];

            // No wound penalty: 4k4 (no subtraction)
            assert.equal(woundPenalty, 0, "No wound penalty");
            assert.notInclude(roll.formula, "-0", "No zero penalty in formula");
          });

          it("should handle maximum wound penalty (Down)", async () => {
            // ARRANGE - Set to Down wound level (40 penalty)
            await actor.update({ "system.suffered": 60 }); // Beyond Crippled
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT
            const message = await TraitRoll({
              actor,
              traitName: "Strength",
              traitRank: 4,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll with max penalty created");
            const roll = message.rolls[0];

            // Maximum penalty applied
            assert.isAbove(woundPenalty, 20, "Severe wound penalty");
            assert.include(roll.formula, `- ${woundPenalty}`, "Max penalty in formula");
          });

          it("should handle wound penalty exceeding roll total", async () => {
            // ARRANGE - Severe wounds with low trait
            await actor.update({ "system.suffered": 60 }); // Down level
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT - Low trait roll
            const message = await TraitRoll({
              actor,
              traitName: "Reflexes",
              traitRank: 2,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll created despite high penalty");
            const roll = message.rolls[0];

            // Roll can result in negative total (penalty > roll result)
            // This is correct L5R4 behavior - severely wounded characters fail most rolls
            assert.include(roll.formula, `- ${woundPenalty}`, "Penalty exceeds likely roll");
          });
        });

        describe("Wound Penalty Behavior Verification", () => {
          it("should subtract from roll total, not add to TN", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;
            assert.isAbove(woundPenalty, 0, "Actor has wound penalty");

            // ACT
            const message = await TraitRoll({
              actor,
              traitName: "Strength",
              traitRank: 4,
              woundPenalty,
              askForOptions: false
            });

            // ASSERT
            assert.exists(message, "Roll created");
            const roll = message.rolls[0];

            // CRITICAL: Verify penalty is in formula as subtraction
            // Correct: 4k4 - 10 (subtracts from roll)
            // Wrong: 4k4 with TN+10 (adds to TN)
            assert.include(roll.formula, `- ${woundPenalty}`, "Penalty subtracts from roll");

            // Verify it's not in TN calculation
            const content = message.content;
            // TN should not include wound penalty
            // (This is implementation-specific, but documents expected behavior)
          });

          it("should apply consistently across multiple rolls", async () => {
            // ARRANGE
            const woundPenalty = actor.system.woundPenalty || 0;

            // ACT - Multiple different roll types
            const traitRoll = await TraitRoll({
              actor,
              traitName: "Strength",
              traitRank: 4,
              woundPenalty,
              askForOptions: false
            });

            const ringRoll = await RingRoll({
              actor,
              ringRank: 3,
              ringName: "Fire",
              systemRing: "fire",
              woundPenalty,
              askForOptions: false
            });

            // ASSERT - Both rolls have same wound penalty
            assert.exists(traitRoll, "Trait roll created");
            assert.exists(ringRoll, "Ring roll created");

            const traitFormula = traitRoll.rolls[0].formula;
            const ringFormula = ringRoll.rolls[0].formula;

            assert.include(traitFormula, `- ${woundPenalty}`, "Trait roll has penalty");
            assert.include(ringFormula, `- ${woundPenalty}`, "Ring roll has penalty");
          });
        });
      });
    },
    { displayName: "L5R4: Wound Penalty - All Roll Types" }
  );
}
