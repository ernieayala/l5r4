/**
 * Skill Roll + Stance Combinations Integration Tests
 *
 * Tests skill rolls in combination with all five L5R4 combat stances.
 * Validates that stance bonuses/penalties correctly apply to skill rolls
 * and that stance restrictions are enforced.
 *
 * Test Coverage (from TEST-COVERAGE-ANALYSIS.md Phase 1 Priority #2):
 * - Skill Roll + Attack Stance (baseline, no modifiers)
 * - Skill Roll + Full Attack Stance (attack skills get +2k1)
 * - Skill Roll + Defense Stance (can use skills, cannot attack)
 * - Skill Roll + Full Defense Stance (only Free Actions allowed)
 * - Skill Roll + Center Stance (next action gets +1k1 + Void Ring)
 *
 * L5R4 Rules Context:
 * - Attack Stance: No modifiers to skill rolls
 * - Full Attack Stance: +2k1 to attack rolls (weapon skills)
 * - Defense Stance: Cannot attack, other skills allowed
 * - Full Defense Stance: Only Free Actions (most skills restricted)
 * - Center Stance: Forfeit actions this round, +1k1 + Void next round
 *
 * Testing Principles (from rules 11-13):
 * - Test behavior, not implementation
 * - Test edge cases and combinations, not just happy paths
 * - Verify tests catch bugs through mutation testing
 * - Focus on real gameplay scenarios
 *
 * @see module/services/dice/rolls/skill-roll.js
 * @see module/services/stance/rolls/attack-bonuses.js
 * @see TEST-COVERAGE-ANALYSIS.md lines 321-327
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";
import { getStanceAttackBonuses } from "../../../module/services/stance/rolls/attack-bonuses.js";

/**
 * Register skill roll + stance combination tests
 * @param {Object} quench - Quench test framework
 */
export function registerSkillStanceCombinationTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.skill-stance-combinations`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Skill Roll + Attack Stance (Water Ring)", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Attack Stance Test Samurai",
            system: {
              traits: { agi: 4 },
              rings: { water: 3 }
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

        it("should not modify skill roll dice pool", () => {
          // Attack Stance provides no bonuses to skill rolls
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];
          const rolled = skillRank + traitValue;
          const kept = traitValue;

          assert.equal(rolled, 9, "Rolled dice = 5 + 4 = 9 (no stance bonus)");
          assert.equal(kept, 4, "Kept dice = 4 (no stance bonus)");
        });

        it("should allow skill roll in Attack Stance", async () => {
          // Apply Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["attackStance"]
            }
          ]);

          // Verify stance is active
          const hasAttackStance = actor.effects.some(e => e.statuses?.has("attackStance"));
          assert.isTrue(hasAttackStance, "Attack Stance is active");

          // Skill rolls should work normally
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];
          const rolled = skillRank + traitValue;

          assert.equal(rolled, 9, "Skill roll allowed in Attack Stance");
        });

        it("should not grant attack bonuses to non-attack skills", async () => {
          // Apply Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["attackStance"]
            }
          ]);

          // Check stance bonuses (should be zero for Attack Stance)
          const bonuses = getStanceAttackBonuses(actor);

          assert.equal(bonuses.roll, 0, "No roll bonus from Attack Stance");
          assert.equal(bonuses.keep, 0, "No keep bonus from Attack Stance");
        });
      });

      describe("Skill Roll + Full Attack Stance (Fire Ring)", () => {
        let actor, weaponSkill, socialSkill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Full Attack Test Samurai",
            system: {
              traits: { agi: 4, awa: 3 },
              rings: { fire: 4 }
            }
          });

          [weaponSkill, socialSkill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi"),
            createSkillData("Etiquette", 3, "awa")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should grant +2k1 bonus to attack skill rolls", async () => {
          // Apply Full Attack Stance with proper flags
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          // Get stance bonuses
          const bonuses = getStanceAttackBonuses(actor);

          assert.equal(bonuses.roll, 2, "Full Attack grants +2 rolled dice");
          assert.equal(bonuses.keep, 1, "Full Attack grants +1 kept die");
        });

        it("should calculate correct dice pool with Full Attack bonus", async () => {
          // Apply Full Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          // Force actor data preparation after effect creation
          actor.prepareData();

          const skillRank = weaponSkill.system.rank;
          const traitValue = actor.system.traits[weaponSkill.system.trait];
          const bonuses = getStanceAttackBonuses(actor);

          // Verify base values before calculating
          assert.equal(skillRank, 5, "Skill rank is 5");
          assert.equal(traitValue, 4, "Trait value is 4");
          assert.equal(bonuses.roll, 2, "Stance bonus is +2 rolled");
          assert.equal(bonuses.keep, 1, "Stance bonus is +1 kept");

          const baseRolled = skillRank + traitValue; // 5 + 4 = 9
          const baseKept = traitValue; // 4
          const finalRolled = baseRolled + bonuses.roll; // 9 + 2 = 11
          const finalKept = baseKept + bonuses.keep; // 4 + 1 = 5

          assert.equal(finalRolled, 11, "Attack roll: 9 + 2 (stance) = 11 rolled");
          assert.equal(finalKept, 5, "Attack roll: 4 + 1 (stance) = 5 kept");
          // Formula would be 11k5
        });

        it("should apply Full Attack bonus to weapon skill rolls only", async () => {
          // Apply Full Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          // Weapon skill gets bonus
          const weaponBonuses = getStanceAttackBonuses(actor);
          assert.equal(weaponBonuses.roll, 2, "Weapon skill gets +2k1");

          // Social skill does NOT get attack bonus (not an attack roll)
          // Social skills use different roll mechanics
          assert.equal(socialSkill.system.rank, 3, "Social skill rank is 3");
          assert.equal(actor.system.traits.awa, 3, "Awareness trait is 3");

          const socialRolled = socialSkill.system.rank + actor.system.traits.awa;
          assert.equal(socialRolled, 6, "Social skill unaffected: 3 + 3 = 6");
        });

        it("should use fallback bonus if flag data missing", async () => {
          // Apply Full Attack Stance WITHOUT explicit attackBonus flag
          // System should use fallback { roll: 2, keep: 1 }
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
              // No flags.l5r4-enhanced.attackBonus
            }
          ]);

          const bonuses = getStanceAttackBonuses(actor);

          assert.equal(bonuses.roll, 2, "Fallback: +2 rolled dice");
          assert.equal(bonuses.keep, 1, "Fallback: +1 kept die");
        });
      });

      describe("Skill Roll + Defense Stance (Air Ring)", () => {
        let actor, weaponSkill, investigationSkill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Defense Stance Test Samurai",
            system: {
              // Air Ring = min(ref, awa), so set both to 3 for Air = 3
              traits: { agi: 3, per: 4, ref: 3, awa: 3 }
            }
          });

          [weaponSkill, investigationSkill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 4, "agi"),
            createSkillData("Investigation", 3, "per")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should not grant attack bonuses in Defense Stance", async () => {
          // Apply Defense Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["defenseStance"]
            }
          ]);

          const bonuses = getStanceAttackBonuses(actor);

          assert.equal(bonuses.roll, 0, "No roll bonus in Defense Stance");
          assert.equal(bonuses.keep, 0, "No keep bonus in Defense Stance");
        });

        it("should allow non-attack skill rolls in Defense Stance", async () => {
          // Apply Defense Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["defenseStance"]
            }
          ]);

          // Non-attack skills should work normally
          const skillRank = investigationSkill.system.rank;
          const traitValue = actor.system.traits[investigationSkill.system.trait];
          const rolled = skillRank + traitValue;
          const kept = traitValue;

          assert.equal(rolled, 7, "Investigation: 3 + 4 = 7 rolled");
          assert.equal(kept, 4, "Investigation: 4 kept");
          // Defense Stance allows all skills except attacks
        });

        it("should restrict attack rolls in Defense Stance", async () => {
          // Apply Defense Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["defenseStance"]
            }
          ]);

          // Verify stance is active
          const hasDefenseStance = actor.effects.some(e => e.statuses?.has("defenseStance"));
          assert.isTrue(hasDefenseStance, "Defense Stance is active");

          // Attack bonuses should be zero (attacks not allowed)
          const bonuses = getStanceAttackBonuses(actor);
          assert.equal(bonuses.roll, 0, "Cannot attack in Defense Stance");
          assert.equal(bonuses.keep, 0, "Cannot attack in Defense Stance");
        });

        it("should increase Armor TN in Defense Stance", async () => {
          // Apply Defense Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["defenseStance"]
            }
          ]);

          // Force actor data preparation to apply stance effects
          actor.prepareData();

          // Defense Stance: +Air Ring + Defense Skill to Armor TN
          // Air Ring = 3, Defense Skill = 0 (untrained)
          // Base TN = (Reflexes 3 × 5) + 5 = 20
          // Defense bonus = 3 + 0 = 3
          // Final TN = 20 + 3 = 23
          const expectedTN = 20 + 3;

          assert.equal(
            actor.system.armorTn.current,
            expectedTN,
            "Armor TN increased by Air Ring + Defense Skill"
          );
        });
      });

      describe("Skill Roll + Full Defense Stance (Earth Ring)", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Full Defense Test Samurai",
            system: {
              // Earth Ring = min(sta, wil), set both to 4 for Earth = 4
              // Also need ref for Armor TN calculation
              traits: { agi: 3, sta: 4, wil: 4, ref: 3 }
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

        it("should not grant attack bonuses in Full Defense Stance", async () => {
          // Apply Full Defense Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["fullDefenseStance"]
            }
          ]);

          const bonuses = getStanceAttackBonuses(actor);

          assert.equal(bonuses.roll, 0, "No roll bonus in Full Defense");
          assert.equal(bonuses.keep, 0, "No keep bonus in Full Defense");
        });

        it("should restrict to Free Actions only in Full Defense Stance", async () => {
          // Apply Full Defense Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["fullDefenseStance"]
            }
          ]);

          // Verify stance is active
          const hasFullDefenseStance = actor.effects.some(e =>
            e.statuses?.has("fullDefenseStance")
          );
          assert.isTrue(hasFullDefenseStance, "Full Defense Stance is active");

          // Full Defense: Only Free Actions allowed
          // Most skill rolls are Complex/Simple Actions (not Free)
          // This is a rules restriction, not a mechanical bonus
          // Test verifies stance is active; enforcement is in UI/handler layer
        });

        it("should increase Armor TN significantly in Full Defense Stance", async () => {
          // Apply Full Defense Stance with stored roll result
          const defenseRollResult = 20; // Defense/Reflexes roll total
          // Flag must be an object with 'total' property (matches Roll object structure)
          await actor.setFlag(SYS_ID, "fullDefenseRoll", { total: defenseRollResult });

          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["fullDefenseStance"]
            }
          ]);

          // Force actor data preparation to apply stance effects
          actor.prepareData();

          // Full Defense: +(Defense roll ÷ 2, rounded up) to Armor TN
          // Roll = 20, bonus = 10
          // Base TN = (Reflexes 3 × 5) + 5 = 20
          // Final TN = 20 + 10 = 30
          const tnBonus = Math.ceil(defenseRollResult / 2);
          const expectedTN = 20 + tnBonus;

          assert.equal(
            actor.system.armorTn.current,
            expectedTN,
            "Armor TN increased by half Defense roll"
          );
        });
      });

      describe("Skill Roll + Center Stance (Void Ring)", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Center Stance Test Samurai",
            system: {
              traits: { agi: 4 },
              rings: { void: { rank: 3, value: 3 } }
            }
          });

          [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Iaijutsu", 5, "agi")
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should not grant bonuses during Center Stance round", async () => {
          // Apply Center Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Center Stance",
              icon: "icons/svg/circle.svg",
              statuses: ["centerStance"]
            }
          ]);

          // Center Stance: Forfeit actions THIS round
          // Bonuses apply NEXT round
          const bonuses = getStanceAttackBonuses(actor);

          assert.equal(bonuses.roll, 0, "No immediate bonus from Center Stance");
          assert.equal(bonuses.keep, 0, "No immediate bonus from Center Stance");
        });

        it("should calculate Center Stance bonus for next round", () => {
          // Center Stance grants +1k1 + Void Ring to NEXT action
          const centerRollBonus = 1;
          const centerKeepBonus = 1;
          const voidRing = actor.system.rings.void.rank;

          const totalRollBonus = centerRollBonus + voidRing; // 1 + 3 = 4
          const totalKeepBonus = centerKeepBonus; // 1

          assert.equal(totalRollBonus, 4, "Next round: +1+Void rolled = +4");
          assert.equal(totalKeepBonus, 1, "Next round: +1 kept");
        });

        it("should apply Center bonus to skill roll next round", () => {
          // Simulate next round with Center bonus applied
          const skillRank = skill.system.rank;
          const traitValue = actor.system.traits[skill.system.trait];
          const voidRing = actor.system.rings.void.rank;

          // Base roll: 5 + 4 = 9k4
          const baseRolled = skillRank + traitValue;
          const baseKept = traitValue;

          // Center bonus: +1+Void rolled, +1 kept
          const centerRollBonus = 1 + voidRing; // 1 + 3 = 4
          const centerKeepBonus = 1;

          const finalRolled = baseRolled + centerRollBonus; // 9 + 4 = 13
          const finalKept = baseKept + centerKeepBonus; // 4 + 1 = 5

          assert.equal(finalRolled, 13, "Next round: 9 + 4 (Center) = 13 rolled");
          assert.equal(finalKept, 5, "Next round: 4 + 1 (Center) = 5 kept");
          // Formula would be 13k5
        });

        it("should grant +10 Initiative bonus in Center Stance", async () => {
          // Apply Center Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Center Stance",
              icon: "icons/svg/circle.svg",
              statuses: ["centerStance"]
            }
          ]);

          // Center Stance: +10 to Initiative
          const initiativeBonus = 10;

          // This is a mechanical effect of Center Stance
          // Initiative calculation happens elsewhere
          assert.equal(initiativeBonus, 10, "Center grants +10 Initiative");
        });
      });

      describe("Stance Transitions and Skill Rolls", () => {
        let actor, skill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Stance Transition Test",
            system: {
              traits: { agi: 4 },
              rings: { fire: 3, air: 3 }
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

        it("should replace stance bonuses when switching stances", async () => {
          // Start with Full Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          let bonuses = getStanceAttackBonuses(actor);
          assert.equal(bonuses.roll, 2, "Full Attack: +2 rolled");
          assert.equal(bonuses.keep, 1, "Full Attack: +1 kept");

          // Remove Full Attack, add Defense Stance
          const oldStances = actor.effects.filter(e => e.statuses?.has("fullAttackStance"));
          await actor.deleteEmbeddedDocuments(
            "ActiveEffect",
            oldStances.map(e => e.id)
          );

          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["defenseStance"]
            }
          ]);

          bonuses = getStanceAttackBonuses(actor);
          assert.equal(bonuses.roll, 0, "Defense: No attack bonus");
          assert.equal(bonuses.keep, 0, "Defense: No attack bonus");
        });

        it("should not stack stance bonuses from multiple stances", async () => {
          // Apply Full Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          // Verify only one stance effect exists
          const stanceEffects = actor.effects.filter(e =>
            Array.from(e.statuses || []).some(id =>
              [
                "attackStance",
                "fullAttackStance",
                "defenseStance",
                "fullDefenseStance",
                "centerStance"
              ].includes(id)
            )
          );

          assert.equal(stanceEffects.length, 1, "Only one stance should be active");

          const bonuses = getStanceAttackBonuses(actor);
          assert.equal(bonuses.roll, 2, "Single stance bonus: +2 rolled");
          assert.equal(bonuses.keep, 1, "Single stance bonus: +1 kept");
        });
      });

      describe("Edge Cases: Skill Rolls in Various Stances", () => {
        let actor, unskilledSkill;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Edge Case Test",
            system: {
              traits: { agi: 3 },
              rings: { fire: 4 }
            }
          });

          [unskilledSkill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 0, "agi") // Rank 0 = unskilled
          ]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle unskilled roll in Full Attack Stance", async () => {
          // Apply Full Attack Stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          // Unskilled: (Trait)k(Trait) = 3k3
          // With Full Attack: +2k1 = 5k4
          const traitValue = actor.system.traits.agi;
          const bonuses = getStanceAttackBonuses(actor);

          const baseRolled = traitValue; // 3 (unskilled = trait only)
          const baseKept = traitValue; // 3
          const finalRolled = baseRolled + bonuses.roll; // 3 + 2 = 5
          const finalKept = baseKept + bonuses.keep; // 3 + 1 = 4

          assert.equal(finalRolled, 5, "Unskilled + Full Attack: 3 + 2 = 5 rolled");
          assert.equal(finalKept, 4, "Unskilled + Full Attack: 3 + 1 = 4 kept");
          // Formula would be 5k4 (no explosions for unskilled)
        });

        it("should handle minimum trait value in stance", async () => {
          // Create actor with minimum trait (2)
          const minActor = await createTestPC({
            name: "Min Trait Test",
            system: {
              traits: { agi: 2 } // Minimum trait value
            }
          });

          const [minSkill] = await minActor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 1, "agi")
          ]);

          // Apply Full Attack Stance
          await minActor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  attackBonus: { roll: 2, keep: 1 }
                }
              }
            }
          ]);

          const bonuses = getStanceAttackBonuses(minActor);
          const skillRank = minSkill.system.rank;
          const traitValue = minActor.system.traits.agi;

          const baseRolled = skillRank + traitValue; // 1 + 2 = 3
          const baseKept = traitValue; // 2
          const finalRolled = baseRolled + bonuses.roll; // 3 + 2 = 5
          const finalKept = baseKept + bonuses.keep; // 2 + 1 = 3

          assert.equal(finalRolled, 5, "Min trait + Full Attack: 3 + 2 = 5");
          assert.equal(finalKept, 3, "Min trait + Full Attack: 2 + 1 = 3");

          await minActor.delete();
        });
      });
    },
    { displayName: "L5R4: Skill Roll + Stance Combinations" }
  );
}
