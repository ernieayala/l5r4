/**
 * Condition Manager Integration Tests
 *
 * Tests the ConditionManager ApplicationV2 dialog for toggling status conditions.
 * Verifies that conditions can be added/removed via the multi-checkbox interface
 * and that ActiveEffects are created/deleted correctly.
 *
 * Key Test Areas:
 * - Condition list filtering (excludes stances)
 * - ActiveEffect creation when condition toggled on
 * - ActiveEffect deletion when condition toggled off
 * - Multiple conditions can be active simultaneously
 * - Stances are properly excluded from the list
 *
 * @module tests/integration/apps/condition-manager
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { STATUS_EFFECTS } from "../../../module/config/game-data.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import ConditionManager from "../../../module/apps/condition-manager.js";

export function registerConditionManagerTests(quench) {
  quench.registerBatch(
    "l5r4-enhanced.integration.condition-manager",
    context => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe("ConditionManager Application", () => {
        let actor;

        before(async () => {
          // Create test actor using fixture
          actor = await createTestPC({
            name: "Test Character - Condition Manager",
            system: {
              traits: {
                ref: 3,
                awa: 3,
                sta: 3,
                wil: 3,
                agi: 3,
                int: 3,
                str: 3,
                per: 3
              }
            }
          });
        });

        after(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        beforeEach(async () => {
          // Clean up all effects before each test
          if (actor && actor.effects) {
            const effectIds = Array.from(actor.effects).map(e => e.id);
            if (effectIds.length > 0) {
              await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
            }
            actor.prepareData();
          }
        });

        afterEach(async () => {
          // Clean up after each test
          if (actor && actor.effects) {
            const effectIds = Array.from(actor.effects).map(e => e.id);
            if (effectIds.length > 0) {
              await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
            }
          }
        });

        describe("Initialization", () => {
          it("should create ConditionManager instance with actor", () => {
            const manager = new ConditionManager(actor);

            assert.exists(manager, "Manager created");
            assert.equal(manager.actor, actor, "Actor reference stored");
          });

          it("should throw error if created without actor", () => {
            assert.throws(() => new ConditionManager(null), "ConditionManager requires an actor");
          });
        });

        describe("Condition List Preparation", () => {
          it("should exclude stance effects from condition list", async () => {
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            const conditionList = context.conditionList;

            // Verify no stances in the list
            const stanceIds = [
              "attackStance",
              "fullAttackStance",
              "defenseStance",
              "fullDefenseStance",
              "centerStance"
            ];

            for (const stanceId of stanceIds) {
              const hasStance = conditionList.some(c => c.id === stanceId);
              assert.isFalse(hasStance, `Stance ${stanceId} should be excluded`);
            }
          });

          it("should include non-stance conditions in list", async () => {
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            const conditionList = context.conditionList;

            // Verify some known non-stance conditions are present
            const expectedConditions = ["blinded", "dazed", "fatigued", "prone", "stunned"];

            for (const conditionId of expectedConditions) {
              const hasCondition = conditionList.some(c => c.id === conditionId);
              assert.isTrue(hasCondition, `Condition ${conditionId} should be included`);
            }
          });

          it("should mark active conditions correctly", async () => {
            // Add a condition to the actor
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Dazed",
                icon: `systems/${SYS_ID}/assets/icons/dazed.webp`,
                statuses: ["dazed"]
              }
            ]);

            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            const dazedCondition = context.conditionList.find(c => c.id === "dazed");

            assert.exists(dazedCondition, "Dazed condition in list");
            assert.isTrue(dazedCondition.active, "Dazed marked as active");
          });

          it("should mark inactive conditions correctly", async () => {
            // Don't add any conditions
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            const blindedCondition = context.conditionList.find(c => c.id === "blinded");

            assert.exists(blindedCondition, "Blinded condition in list");
            assert.isFalse(blindedCondition.active, "Blinded marked as inactive");
          });
        });

        describe("Condition Toggling", () => {
          it("should create ActiveEffect when condition toggled on", async () => {
            // ARRANGE - Verify no effects initially
            assert.equal(actor.effects.size, 0, "No effects initially");

            // Find a non-stance condition definition
            const statusDef = STATUS_EFFECTS.find(s => s.id === "blinded");
            assert.exists(statusDef, "Blinded status definition exists");

            // ACT - Create the effect (simulating what _onOptionClick does)
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: game.i18n.localize(statusDef.name),
                icon: statusDef.img,
                statuses: ["blinded"],
                flags: {
                  [SYS_ID]: {
                    conditionId: "blinded"
                  }
                }
              }
            ]);

            // ASSERT
            const effect = actor.effects.find(e => e.statuses.has("blinded"));

            assert.exists(effect, "Blinded effect created");
            assert.equal(effect.statuses.size, 1, "Effect has one status");
            assert.isTrue(effect.statuses.has("blinded"), "Effect has blinded status");
            assert.equal(effect.flags[SYS_ID]?.conditionId, "blinded", "Condition ID flag set");
          });

          it("should delete ActiveEffect when condition toggled off", async () => {
            // ARRANGE - Create an effect first
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Dazed",
                icon: `systems/${SYS_ID}/assets/icons/dazed.webp`,
                statuses: ["dazed"],
                flags: {
                  [SYS_ID]: {
                    conditionId: "dazed"
                  }
                }
              }
            ]);

            assert.equal(actor.effects.size, 1, "One effect initially");

            // ACT - Remove the effect (simulating what _onOptionClick does)
            const effectToRemove = actor.effects.find(e => e.statuses.has("dazed"));
            await effectToRemove.delete();

            // ASSERT
            assert.equal(actor.effects.size, 0, "Effect removed");
            const stillExists = actor.effects.find(e => e.statuses.has("dazed"));
            assert.notExists(stillExists, "Dazed effect no longer exists");
          });

          it("should handle multiple conditions simultaneously", async () => {
            // ARRANGE - Add multiple conditions
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Blinded",
                icon: `systems/${SYS_ID}/assets/icons/blinded.webp`,
                statuses: ["blinded"]
              },
              {
                name: "Dazed",
                icon: `systems/${SYS_ID}/assets/icons/dazed.webp`,
                statuses: ["dazed"]
              },
              {
                name: "Prone",
                icon: `systems/${SYS_ID}/assets/icons/prone.webp`,
                statuses: ["prone"]
              }
            ]);

            // ASSERT
            assert.equal(actor.effects.size, 3, "Three effects created");

            const hasBlinded = actor.effects.some(e => e.statuses.has("blinded"));
            const hasDazed = actor.effects.some(e => e.statuses.has("dazed"));
            const hasProne = actor.effects.some(e => e.statuses.has("prone"));

            assert.isTrue(hasBlinded, "Blinded effect exists");
            assert.isTrue(hasDazed, "Dazed effect exists");
            assert.isTrue(hasProne, "Prone effect exists");

            // ACT - Remove one condition
            const dazedEffect = actor.effects.find(e => e.statuses.has("dazed"));
            await dazedEffect.delete();

            // ASSERT - Other conditions remain
            assert.equal(actor.effects.size, 2, "Two effects remain");
            assert.isTrue(
              actor.effects.some(e => e.statuses.has("blinded")),
              "Blinded still exists"
            );
            assert.isTrue(
              actor.effects.some(e => e.statuses.has("prone")),
              "Prone still exists"
            );
            assert.isFalse(
              actor.effects.some(e => e.statuses.has("dazed")),
              "Dazed removed"
            );
          });
        });

        describe("Stance Exclusion", () => {
          it("should not include stance effects in condition list even if active", async () => {
            // ARRANGE - Add a stance effect to the actor
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Full Attack Stance",
                icon: `systems/${SYS_ID}/assets/icons/full-attack-stance.webp`,
                statuses: ["fullAttackStance"],
                flags: {
                  [SYS_ID]: {
                    stanceType: "fullAttack"
                  }
                }
              }
            ]);

            // ACT
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            // ASSERT - Stance should not appear in condition list
            const hasStance = context.conditionList.some(c => c.id === "fullAttackStance");
            assert.isFalse(hasStance, "Stance excluded from condition list");

            // But the effect should still exist on the actor
            const stanceEffect = actor.effects.find(e => e.statuses.has("fullAttackStance"));
            assert.exists(stanceEffect, "Stance effect still exists on actor");
          });

          it("should not count stance effects as active conditions", async () => {
            // ARRANGE - Add both a stance and a condition
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Defense Stance",
                icon: `systems/${SYS_ID}/assets/icons/defence-stance.webp`,
                statuses: ["defenseStance"]
              },
              {
                name: "Fatigued",
                icon: `systems/${SYS_ID}/assets/icons/fatigued.webp`,
                statuses: ["fatigued"]
              }
            ]);

            // ACT
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            // ASSERT - Only non-stance condition should be marked active
            const fatigued = context.conditionList.find(c => c.id === "fatigued");
            const defense = context.conditionList.find(c => c.id === "defenseStance");

            assert.exists(fatigued, "Fatigued in list");
            assert.isTrue(fatigued.active, "Fatigued marked active");
            assert.notExists(defense, "Defense stance not in list");
          });
        });

        describe("Edge Cases", () => {
          it("should handle disabled effects correctly", async () => {
            // ARRANGE - Create a disabled effect
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Stunned",
                icon: `systems/${SYS_ID}/assets/icons/stunned.webp`,
                statuses: ["stunned"],
                disabled: true
              }
            ]);

            // ACT
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            // ASSERT - Disabled effect should not be marked as active
            const stunned = context.conditionList.find(c => c.id === "stunned");
            assert.exists(stunned, "Stunned in list");
            assert.isFalse(stunned.active, "Disabled effect not marked active");
          });

          it("should handle actor with no effects", async () => {
            // ARRANGE - Ensure no effects
            assert.equal(actor.effects.size, 0, "No effects on actor");

            // ACT
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            // ASSERT - All conditions should be inactive
            const activeConditions = context.conditionList.filter(c => c.active);
            assert.equal(activeConditions.length, 0, "No active conditions");
          });

          it("should handle effect with multiple statuses", async () => {
            // ARRANGE - Create effect with multiple statuses (edge case)
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Multiple Conditions",
                icon: `systems/${SYS_ID}/assets/icons/dazed.webp`,
                statuses: ["dazed", "fatigued"]
              }
            ]);

            // ACT
            const manager = new ConditionManager(actor);
            const context = await manager._prepareContext({});

            // ASSERT - Both conditions should be marked active
            const dazed = context.conditionList.find(c => c.id === "dazed");
            const fatigued = context.conditionList.find(c => c.id === "fatigued");

            assert.isTrue(dazed.active, "Dazed marked active");
            assert.isTrue(fatigued.active, "Fatigued marked active");
          });
        });

        describe("Condition Effects Application", () => {
          it("should apply Blinded condition to actor data (penalties and Armor TN)", async () => {
            // Ensure clean state
            assert.equal(actor.effects.size, 0, "No effects initially");

            // Create Blinded effect
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: game.i18n.localize("EFFECT.blinded"),
                icon: `systems/${SYS_ID}/assets/icons/blinded.webp`,
                statuses: ["blinded"],
                flags: { [SYS_ID]: { conditionId: "blinded" } }
              }
            ]);

            // Force recalculation (hooks should do this, but be explicit for test stability)
            actor.prepareData();

            const effects = actor.system._conditionEffects;
            assert.exists(effects, "Condition effects tracking exists");
            assert.include(effects.active, "blinded", "Blinded is active");

            // Verify roll penalties per rules: ranged -3k3, melee -1k1
            assert.equal(effects.rollPenalties.ranged.roll, -3, "Ranged roll penalty -3");
            assert.equal(effects.rollPenalties.ranged.keep, -3, "Ranged keep penalty -3");
            assert.equal(effects.rollPenalties.melee.roll, -1, "Melee roll penalty -1");
            assert.equal(effects.rollPenalties.melee.keep, -1, "Melee keep penalty -1");

            // Verify Armor TN override = Reflexes + 5 + armor bonus (+ stanceMod if any)
            const ref = actor.system.traits.ref ?? 0;
            const armorBonus = actor.system.armorTn?.bonus ?? 0;
            const stanceMod = actor.system.armorTn?.stanceMod ?? 0;
            const expectedTN = ref + 5 + armorBonus + stanceMod;
            assert.equal(
              actor.system.armorTn.current,
              expectedTN,
              "Armor TN overridden by Blinded (Reflexes + 5 + armor)"
            );
          });

          it("should restore Armor TN when Blinded is removed", async () => {
            // Remove the blinded effect
            const blinded = actor.effects.find(e => e.statuses?.has("blinded"));
            if (blinded) {
              await blinded.delete();
            }

            actor.prepareData();

            const effects = actor.system._conditionEffects;
            assert.notInclude(effects.active, "blinded", "Blinded removed from active conditions");

            // Current TN should be at least the base + bonuses (i.e., higher than blinded override)
            const baseTN =
              (actor.system.armorTn?.base ?? 0) +
              (actor.system.armorTn?.bonus ?? 0) +
              (actor.system.armorTn?.stanceMod ?? 0);
            assert.isAtLeast(
              actor.system.armorTn.current,
              baseTN,
              "Armor TN restored to normal (>= base + bonuses)"
            );
          });
        });
      });
    },
    { displayName: "L5R4: Condition Manager Tests" }
  );
}
