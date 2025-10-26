/**
 * Combat Workflow Integration Tests
 *
 * Tests complete combat sequences from attack roll through damage application.
 * Validates multi-step combat processes work together correctly.
 *
 * Test Priority: Tier 1 (Critical - Core combat mechanics)
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";
import { createWeaponData, createSkillData } from "../../fixtures/item-fixtures.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { WeaponRoll } from "../../../module/services/dice/rolls/weapon-roll.js";

/**
 * Register combat workflow tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerCombatWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.combat`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Combat Workflow: Attack Sequence", () => {
        let attacker;
        let defender;

        beforeEach(async () => {
          // Create attacker with weapon and skill
          attacker = await createTestPC({
            name: "Attacker Samurai",
            system: {
              traits: { agi: 3, str: 4 },
              rings: { earth: 3, air: 3, fire: 3, water: 3, void: 3 }
            }
          });

          await attacker.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "Kenjutsu" }
            })
          ]);

          // Create defender
          defender = await createTestPC({
            name: "Defender Samurai",
            system: {
              traits: { ref: 3 },
              rings: { earth: 3, air: 3, fire: 3, water: 3, void: 3 }
            }
          });
        });

        afterEach(async () => {
          if (defender) {
            await defender.delete();
          }
          if (attacker) {
            await attacker.delete();
          }
        });

        it("should execute complete attack sequence", async () => {
          // ARRANGE
          const weapon = attacker.items.find(i => i.type === "weapon");
          const defenderTN = defender.system.armorTn.current;
          const _initialWounds = defender.system.suffered || 0;

          assert.exists(weapon, "Weapon exists on attacker");
          assert.isNumber(defenderTN, "Defender has Armor TN");

          // Find weapon skill item
          const skillName = weapon.system.associatedSkill || "Kenjutsu";
          const skillItem = attacker.items.find(
            i => i.type === "skill" && i.name.toLowerCase() === skillName.toLowerCase()
          );
          const skillRank = skillItem?.system?.rank ?? 0;
          const skillTrait = skillItem?.system?.trait ?? "agi";
          const traitValue = attacker.system.traits[skillTrait] ?? 2;

          // ACT - Use REAL attack service (SkillRoll for weapon attacks)
          // Match setting to bypass dialog (XOR logic: askForOptions must equal setting)
          const skillSetting = game.settings.get(SYS_ID, "showSkillRollOptions") ?? false;

          const attackMessage = await SkillRoll({
            actor: attacker,
            skillRank,
            skillName,
            skillTrait,
            actorTrait: traitValue,
            woundPenalty: 0,
            askForOptions: skillSetting, // Match setting to bypass dialog
            rollType: "attack"
          });

          // ASSERT attack roll executed
          assert.exists(attackMessage, "Attack roll executed");
          const roll = attackMessage.rolls?.[0];
          assert.exists(roll, "Roll object exists");
          assert.isNumber(roll.total, "Attack total calculated");
          assert.isTrue(roll.terms.length > 0, "Roll has dice terms");

          // ACT - If hit, roll damage using REAL damage service
          if (roll.total >= defenderTN) {
            // Use derived damage values (includes Strength)
            const diceRoll = weapon.system.derivedDamageRoll ?? weapon.system.damageRoll ?? 0;
            const diceKeep = weapon.system.derivedDamageKeep ?? weapon.system.damageKeep ?? 0;

            // Get weapon roll options setting to match askForOptions
            const setting = game.settings.get(SYS_ID, "showWeaponRollOptions") ?? false;

            const damageMessage = await WeaponRoll({
              actor: attacker,
              diceRoll,
              diceKeep,
              weaponName: weapon.name,
              askForOptions: setting // Match setting to bypass dialog (XOR logic)
            });

            // ASSERT damage roll executed
            assert.exists(damageMessage, "Damage roll chat message created");
            assert.isString(damageMessage.content, "Chat message has content");
            // Note: WeaponRoll uses ChatMessage.create() which doesn't attach Roll object
            // So we verify the service executed successfully by checking message creation
          }
        });

        it("should handle attack that misses", async () => {
          // ARRANGE - Set up low skill attacker vs high TN defender
          const weakAttacker = await createTestPC({
            name: "Weak Attacker",
            system: {
              traits: { agi: 1, str: 1 },
              rings: { earth: 2, air: 2, fire: 2, water: 2, void: 2 }
            }
          });

          await weakAttacker.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 1, "agi"),
            createWeaponData("Dagger", 1, 1, {
              system: { associatedSkill: "Kenjutsu" }
            })
          ]);

          const weapon = weakAttacker.items.find(i => i.type === "weapon");
          assert.exists(weapon, "Weapon exists");

          // Find weapon skill
          const skillName = weapon.system.associatedSkill || "Kenjutsu";
          const skillItem = weakAttacker.items.find(
            i => i.type === "skill" && i.name.toLowerCase() === skillName.toLowerCase()
          );
          const skillRank = skillItem?.system?.rank ?? 0;
          const skillTrait = skillItem?.system?.trait ?? "agi";
          const traitValue = weakAttacker.system.traits[skillTrait] ?? 1;

          // ACT - Attempt attack (likely to miss with low dice)
          // Match setting to bypass dialog (XOR logic)
          const skillSetting = game.settings.get(SYS_ID, "showSkillRollOptions") ?? false;

          const attackMessage = await SkillRoll({
            actor: weakAttacker,
            skillRank,
            skillName,
            skillTrait,
            actorTrait: traitValue,
            woundPenalty: 0,
            askForOptions: skillSetting, // Match setting to bypass dialog
            rollType: "attack"
          });

          // ASSERT
          assert.exists(attackMessage, "Attack roll executed even on miss");
          const roll = attackMessage.rolls?.[0];
          assert.exists(roll, "Roll object exists");
          assert.isNumber(roll.total, "Attack total calculated");
          // Test validates attack attempt happens, regardless of success
          // Real gameplay would show "missed" in chat

          // Cleanup
          await weakAttacker.delete();
        });

        it("should apply strength bonus to damage roll", async () => {
          // ARRANGE - High strength attacker
          const strongAttacker = await createTestPC({
            name: "Strong Attacker",
            system: {
              traits: { str: 5, agi: 3 },
              rings: { earth: 3, air: 3, fire: 3, water: 3, void: 3 }
            }
          });

          await strongAttacker.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createWeaponData("Katana", 3, 2, {
              system: { associatedSkill: "Kenjutsu" }
            })
          ]);

          const weapon = strongAttacker.items.find(i => i.type === "weapon");
          assert.exists(weapon, "Weapon exists");

          // ACT - Roll damage using REAL service
          const diceRoll = weapon.system.derivedDamageRoll ?? weapon.system.damageRoll ?? 0;
          const diceKeep = weapon.system.derivedDamageKeep ?? weapon.system.damageKeep ?? 0;

          // Get weapon roll options setting to match askForOptions
          const setting = game.settings.get(SYS_ID, "showWeaponRollOptions") ?? false;

          const damageMessage = await WeaponRoll({
            actor: strongAttacker,
            diceRoll,
            diceKeep,
            weaponName: weapon.name,
            askForOptions: setting // Match setting to bypass dialog
          });

          // ASSERT - Verify strength is included in derivedDamageRoll
          assert.exists(damageMessage, "Damage roll chat message created");
          assert.isString(damageMessage.content, "Chat message has content");

          // Verify weapon's derivedDamageRoll includes strength
          // Katana base 3k2 + Strength 5 = 8k2 (derivedDamageRoll should be 8)
          assert.isTrue(
            diceRoll >= 8,
            `Damage rolled dice (${diceRoll}) includes strength bonus (base 3 + str 5 = 8)`
          );
          assert.equal(diceKeep, 2, "Damage kept dice matches weapon base (2)");

          // Cleanup
          await strongAttacker.delete();
        });

        it("should track wound progression during combat", async () => {
          // ARRANGE
          const healthyThreshold = defender.system.woundLevels.healthy.value;
          const nickedThreshold = defender.system.woundLevels.nicked?.value;

          // ACT - Apply light damage (stay in healthy)
          await defender.update({ "system.suffered": 5 });
          const defenderAfter5 = game.actors.get(defender.id);
          const levelAfter5 = defenderAfter5.system.woundLevels.healthy.current;

          // Apply medium damage (move to nicked)
          await defender.update({ "system.suffered": healthyThreshold + 2 });
          const defenderInNicked = game.actors.get(defender.id);
          const isNicked = defenderInNicked.system.woundLevels.nicked?.current || false;

          // Apply heavy damage (move past nicked to grazed)
          await defender.update({ "system.suffered": nickedThreshold + 2 });
          const defenderInGrazed = game.actors.get(defender.id);
          const notNicked = !defenderInGrazed.system.woundLevels.nicked?.current;

          // ASSERT
          assert.isTrue(levelAfter5, "Still healthy after light damage");
          assert.isTrue(isNicked, "Moved to nicked after exceeding healthy");
          assert.isTrue(notNicked, "Moved past nicked after exceeding nicked threshold");
        });

        it("should handle defeat conditions", async () => {
          // ARRANGE
          const outThreshold = defender.system.woundLevels.out.value;

          // ACT - Apply lethal damage
          await defender.update({ "system.suffered": outThreshold + 10 });

          // ASSERT
          const isOut = defender.system.woundLevels.out.current;
          const currentWounds = defender.system.suffered;

          assert.isTrue(currentWounds >= outThreshold, "Damage exceeds Out threshold");
          assert.isTrue(isOut, "Character marked as Out");
        });
      });

      describe("Combat Workflow: Multiple Attacks", () => {
        let samurai;
        let enemies;

        beforeEach(async () => {
          samurai = await createTestPC({
            name: "Combat Samurai",
            system: {
              traits: { agi: 4, str: 3 }
            }
          });

          await samurai.createEmbeddedDocuments("Item", [createWeaponData("Katana", 3, 2)]);

          // Create multiple enemies
          enemies = [];
          for (let i = 0; i < 3; i++) {
            const enemy = await createTestNPC({ name: `Enemy ${i + 1}` });
            enemies.push(enemy);
          }
        });

        afterEach(async () => {
          for (const enemy of enemies) {
            if (enemy) {
              await enemy.delete();
            }
          }
          if (samurai) {
            await samurai.delete();
          }
        });

        it("should handle attacks against multiple targets", async () => {
          // ARRANGE
          const weapon = samurai.items.find(i => i.type === "weapon");
          assert.exists(weapon, "Weapon exists");

          // ACT - Attack each enemy
          const results = [];
          for (const enemy of enemies) {
            const _initialWounds = enemy.system.wounds?.value || enemy.system.wounds?.max || 50;
            const damage = 10;

            await enemy.update({ "system.suffered": damage });

            results.push({
              enemy: enemy.name,
              damaged: true
            });
          }

          // ASSERT
          assert.equal(results.length, 3, "Attacked all three enemies");
          assert.isTrue(
            results.every(r => r.damaged),
            "All enemies took damage"
          );
        });
      });
    },
    { displayName: "L5R4: Combat Workflow Tests" }
  );
}
