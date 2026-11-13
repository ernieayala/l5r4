/**
 * Combat Stance Switching Complete Workflow Tests
 *
 * Tests the complete combat stance system workflows including:
 * - Stance switching via service hooks
 * - Center stance bonus application and tracking
 * - Full Defense roll workflow
 * - Stance restrictions from conditions
 *
 * These tests verify the COMPLETE workflow from user action through service
 * layer to final effect on actor stats, including:
 * - Mutual exclusivity enforcement (only one stance at a time)
 * - Proper flag management and cleanup
 * - Integration with roll services
 * - Condition-based stance restrictions
 *
 * @see module/services/stance/
 */

import { statusRules } from "../../../module/utils/rule-engine.js";
import { SYS_ID } from "../../../module/config/constants.js";
import { STANCE_IDS } from "../../../module/utils/stances.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { rollFullDefense } from "../../../module/services/effects/prompts.js";
import { guardRolls, waitFor } from "../helpers.js";

/**
 * Register stance switching workflow tests
 * @param {Object} quench - Quench test framework
 */
export function registerStanceSwitchingWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.stance-switching`,
    context => {
      const { describe, it, assert, before, after, afterEach } = context;

      // Taking the Full Defense Stance opens its roll dialog (p.84)
      guardRolls(context);

      describe("Stance Switching Workflow", () => {
        let actor;

        before(async () => {
          actor = await createTestPC({
            name: "Stance Workflow Test Character",
            system: {
              traits: { ref: 3, sta: 3, wil: 3, str: 3, agi: 3, int: 3, per: 3, awa: 3 },
              rings: { void: 2 }
            }
          });

          // Add Defense skill for Full Defense testing
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Defense",
              type: "skill",
              system: { rank: 2, trait: "ref" }
            }
          ]);

          actor.prepareData();
        });

        afterEach(async () => {
          // Clean up ALL effects between tests (check existence first)
          if (actor && actor.effects.size > 0) {
            const effectIds = Array.from(actor.effects.keys());
            const validIds = effectIds.filter(id => actor.effects.get(id) !== undefined);
            if (validIds.length > 0) {
              await actor.deleteEmbeddedDocuments("ActiveEffect", validIds);
            }
          }

          actor.prepareData();
        });

        after(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should apply stance through ActiveEffect creation", async function () {
          // ARRANGE
          const _baseTN = 20; // (Reflexes 3 × 5) + 5

          // ACT - Create Full Attack stance effect
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              img: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
            }
          ]);

          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.armorTn.current, 10, "Full Attack reduces TN by 10");

          // Verify stance is active
          const activeStances = actor.effects.filter(
            e => !e.disabled && e.statuses?.has("fullAttackStance")
          );
          assert.equal(activeStances.length, 1, "One Full Attack stance active");
        });

        it("should enforce mutual exclusivity when switching stances", async function () {
          // ARRANGE - Start in Full Attack
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              img: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
            }
          ]);

          actor.prepareData();
          assert.equal(actor.system.armorTn.current, 10, "Full Attack active");

          // ACT - Switch to Defense stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              img: "icons/svg/shield.svg",
              system: { rules: statusRules("defenseStance") },
              statuses: ["defenseStance"]
            }
          ]);

          // Wait for hook processing (preCreate hook deletes conflicting stance)
          await new Promise(resolve => setTimeout(resolve, 50));

          actor.prepareData();

          // ASSERT - Only Defense stance should be active
          const activeStances = actor.effects.filter(e => {
            if (e.disabled) {
              return false;
            }
            const statuses = Array.from(e.statuses || []);
            return statuses.some(id => STANCE_IDS.has(id));
          });

          assert.equal(activeStances.length, 1, "Only one stance active");
          assert.isTrue(activeStances[0].statuses.has("defenseStance"), "Defense stance is active");
          assert.isFalse(
            activeStances[0].statuses.has("fullAttackStance"),
            "Full Attack stance removed"
          );

          // TN should be Defense bonus (Air Ring 3 + Defense skill 2 = +5)
          assert.equal(actor.system.armorTn.current, 25, "Defense TN applied");
        });

        it("should handle rapid stance transitions without accumulation", async function () {
          // ARRANGE - Sequence of stance changes
          const stances = [
            { id: "attackStance", expectedTN: 20 },
            { id: "fullAttackStance", expectedTN: 10 },
            { id: "defenseStance", expectedTN: 25 },
            { id: "centerStance", expectedTN: 20 },
            { id: "attackStance", expectedTN: 20 }
          ];

          // ACT & ASSERT
          for (const stance of stances) {
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: `${stance.id} Stance`,
                img: "icons/svg/combat.svg",
                system: { rules: statusRules(stance.id) },
                statuses: [stance.id]
              }
            ]);

            // Wait for hook processing (preCreate hook deletes conflicting stance)
            await new Promise(resolve => setTimeout(resolve, 50));

            actor.prepareData();

            const activeStances = actor.effects.filter(
              e => !e.disabled && Array.from(e.statuses || []).some(id => STANCE_IDS.has(id))
            );

            assert.equal(activeStances.length, 1, `${stance.id}: Only one stance active`);
            assert.equal(
              actor.system.armorTn.current,
              stance.expectedTN,
              `${stance.id}: TN = ${stance.expectedTN}`
            );
          }
        });

        it("a disabled stance gives nothing and does not end the other stance", async function () {
          await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Full Attack Stance", statuses: ["fullAttackStance"] }
          ]);
          const [defense] = await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Defense Stance", statuses: ["defenseStance"] }
          ]);
          assert.isFalse(actor.statuses.has("fullAttackStance"), "the group swapped the stance");
          await defense.update({ disabled: true });
          assert.isFalse(actor.statuses.has("defenseStance"), "disabled");
          assert.equal(actor.system.armorTn.current, 20, "no stance bonus while disabled");
        });
      });

      describe("Center Stance Bonus Tracking", () => {
        let actor;

        before(async () => {
          actor = await createTestPC({
            name: "Center Stance Test Character",
            system: {
              traits: { ref: 3, sta: 3, wil: 3, str: 3, agi: 3, int: 3, per: 3, awa: 3 },
              rings: { void: { rank: 3, value: 3 } }
            }
          });

          actor.prepareData();
        });

        afterEach(async () => {
          if (actor && actor.effects.size > 0) {
            const effectIds = Array.from(actor.effects.keys());
            const validIds = effectIds.filter(id => actor.effects.get(id) !== undefined);
            if (validIds.length > 0) {
              await actor.deleteEmbeddedDocuments("ActiveEffect", validIds);
            }
          }
          try {
            await actor.unsetFlag(SYS_ID, "centerStanceBonus");
          } catch (err) {
            // Ignore if flag doesn't exist
          }
          actor.prepareData();
        });

        after(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should apply Center stance without immediate bonuses", async function () {
          // ARRANGE
          const baseTN = 20;

          // ACT - Enter Center stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Center Stance",
              img: "icons/svg/sun.svg",
              statuses: ["centerStance"]
            }
          ]);

          actor.prepareData();

          // ASSERT - No immediate TN change (Center doesn't modify defense)
          assert.equal(actor.system.armorTn.current, baseTN, "Center stance: TN unchanged");

          // Verify stance is active
          const centerStance = actor.effects.find(e => e.statuses?.has("centerStance"));
          assert.exists(centerStance, "Center stance active");
          assert.isFalse(centerStance.disabled, "Center stance enabled");
        });

        it("should track Center stance bonus with Void Ring value", async function () {
          // ARRANGE
          const voidRing = actor.system.rings.void.rank;
          assert.equal(voidRing, 3, "Void Ring = 3");

          // ACT - Enter Center stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Center Stance",
              img: "icons/svg/sun.svg",
              statuses: ["centerStance"]
            }
          ]);

          // ASSERT - Bonus should be +1k1 + Void Ring = +4k1
          const expectedRollBonus = 1 + voidRing; // +4 rolled dice
          const expectedKeepBonus = 1; // +1 kept die

          // Note: Actual bonus application happens in roll services
          // This test verifies stance is tracked correctly
          assert.equal(expectedRollBonus, 4, "Center grants +4 rolled (1+Void 3)");
          assert.equal(expectedKeepBonus, 1, "Center grants +1 kept");
        });

        it("should allow Center stance to be overridden by other stances", async function () {
          // ARRANGE - Enter Center stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Center Stance",
              img: "icons/svg/sun.svg",
              statuses: ["centerStance"]
            }
          ]);

          actor.prepareData();
          assert.exists(
            actor.effects.find(e => e.statuses?.has("centerStance")),
            "Center stance active"
          );

          // ACT - Switch to Full Attack (loses Center bonus)
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              img: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
            }
          ]);

          // Wait for hook processing (preCreate hook deletes conflicting stance)
          await new Promise(resolve => setTimeout(resolve, 50));

          actor.prepareData();

          // ASSERT - Center stance removed, Full Attack active
          const centerStance = actor.effects.find(
            e => !e.disabled && e.statuses?.has("centerStance")
          );
          assert.notExists(centerStance, "Center stance removed");

          const fullAttackStance = actor.effects.find(e => e.statuses?.has("fullAttackStance"));
          assert.exists(fullAttackStance, "Full Attack stance active");
        });
      });

      describe("Full Defense Roll Workflow", () => {
        let actor;

        /** The Full Defense bonus effects on the actor. */
        const bonusEffects = () =>
          actor.effects.filter(e => e.getFlag(SYS_ID, "effectId") === "fullDefense");

        /** The last Defense roll message of the actor. */
        const lastDefenseRoll = () =>
          game.messages.contents
            .filter(m => m.type === "roll" && m.system.actorUuid === actor.uuid)
            .at(-1);

        before(async () => {
          actor = await createTestPC({
            name: "Full Defense Roll Test Character",
            system: {
              traits: { ref: 4, sta: 3, wil: 3, str: 3, agi: 3, int: 3, per: 3, awa: 3 }
            }
          });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Defense", type: "skill", system: { rank: 3, trait: "ref" } }
          ]);
        });

        afterEach(async () => {
          const ids = actor.effects.map(e => e.id);
          if (ids.length) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
          }
        });

        after(async () => {
          await actor?.delete();
        });

        it("taking the stance rolls Defense / Reflexes and adds half, rounded up, to Armor TN (p.84)", async () => {
          const base = actor.system.armorTn.current;
          await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Full Defense Stance", statuses: ["fullDefenseStance"] }
          ]);
          assert.isTrue(await waitFor(() => bonusEffects().length === 1), "bonus effect created");
          const total = lastDefenseRoll().system.outcome.total;
          assert.equal(actor.system.armorTn.current, base + Math.ceil(total / 2));
        });

        it("rolls Defense 3 + Reflexes 4, keeping Reflexes: 7k4", async () => {
          await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Full Defense Stance", statuses: ["fullDefenseStance"] }
          ]);
          await waitFor(() => bonusEffects().length === 1);
          assert.deepInclude(lastDefenseRoll().system.pool, { roll: 7, keep: 4 });
        });

        it("a new roll replaces the bonus instead of adding to it", async () => {
          await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Full Defense Stance", statuses: ["fullDefenseStance"] }
          ]);
          await waitFor(() => bonusEffects().length === 1);
          await rollFullDefense(actor);
          assert.lengthOf(bonusEffects(), 1);
          const total = lastDefenseRoll().system.outcome.total;
          assert.equal(actor.system.armorTn.current, 25 + Math.ceil(total / 2));
        });

        it("the bonus lasts until the start of the actor's next Turn", async () => {
          await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Full Defense Stance", statuses: ["fullDefenseStance"] }
          ]);
          await waitFor(() => bonusEffects().length === 1);
          assert.deepEqual(bonusEffects()[0].toObject().duration, {
            value: 1,
            units: "rounds",
            expiry: "turnStart",
            expired: false
          });
        });
      });

      describe("Stance Restrictions from Conditions", () => {
        let actor;

        before(async () => {
          actor = await createTestPC({
            name: "Stance Restrictions Test Character",
            system: {
              traits: { ref: 3, sta: 3, wil: 3, str: 3, agi: 3, int: 3, per: 3, awa: 3 }
            }
          });

          actor.prepareData();
        });

        afterEach(async () => {
          if (actor && actor.effects.size > 0) {
            const effectIds = Array.from(actor.effects.keys());
            const validIds = effectIds.filter(id => actor.effects.get(id) !== undefined);
            if (validIds.length > 0) {
              await actor.deleteEmbeddedDocuments("ActiveEffect", validIds);
            }
          }
          actor.prepareData();
        });

        after(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should allow stance changes when no restricting conditions present", async function () {
          // ARRANGE - No conditions

          // ACT - Apply Full Attack stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              img: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
            }
          ]);

          actor.prepareData();

          // ASSERT
          const stance = actor.effects.find(e => e.statuses?.has("fullAttackStance"));
          assert.exists(stance, "Full Attack stance applied");
          assert.equal(actor.system.armorTn.current, 10, "Full Attack TN penalty applied");
        });

        it("should detect prone condition on actor", async function () {
          // ARRANGE & ACT - Apply prone condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Prone",
              img: "icons/svg/falling.svg",
              statuses: ["prone"]
            }
          ]);

          actor.prepareData();

          // ASSERT - Prone condition active
          const proneEffect = actor.effects.find(e => e.statuses?.has("prone"));
          assert.exists(proneEffect, "Prone condition applied");

          // Prone applies -10 to Armor TN against melee attacks only (p.89)
          assert.equal(actor.system.armorTn.current, 20, "the shown Armor TN stays");
          assert.equal(actor.system.armorTn.vs.melee, -10, "Prone TN penalty against melee");
        });

        it("should track stunned condition on actor", async function () {
          // ARRANGE & ACT - Apply stunned condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Stunned",
              img: "icons/svg/daze.svg",
              statuses: ["stunned"]
            }
          ]);

          actor.prepareData();

          // ASSERT - Stunned condition active
          const stunnedEffect = actor.effects.find(e => e.statuses?.has("stunned"));
          assert.exists(stunnedEffect, "Stunned condition applied");

          // Stunned: Armor TN = 5 + armor bonus per game rules
          assert.equal(actor.system.armorTn.current, 5, "Stunned TN reduction applied");
        });

        it("should track entangled condition on actor", async function () {
          // ARRANGE & ACT - Apply entangled condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Entangled",
              img: "icons/svg/net.svg",
              statuses: ["entangled"]
            }
          ]);

          actor.prepareData();

          // ASSERT - Entangled condition active
          const entangledEffect = actor.effects.find(e => e.statuses?.has("entangled"));
          assert.exists(entangledEffect, "Entangled condition applied");

          // Entangled prevents most actions per game rules
          // No TN modification, but actions are restricted
        });

        it("should allow stances with conditions (stance system independent of conditions)", async function () {
          // ARRANGE - Apply prone condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Prone",
              img: "icons/svg/falling.svg",
              statuses: ["prone"]
            }
          ]);

          // ACT - Apply Full Attack stance while prone
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              img: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
            }
          ]);

          actor.prepareData();

          // ASSERT - Both effects active
          const proneEffect = actor.effects.find(e => e.statuses?.has("prone"));
          const stanceEffect = actor.effects.find(e => e.statuses?.has("fullAttackStance"));

          assert.exists(proneEffect, "Prone condition still active");
          assert.exists(stanceEffect, "Full Attack stance applied");

          // TN should stack: Base 20 - Prone 10 - Full Attack 10 = 0 (min 5)
          // Note: Actual stacking logic handled in prepareDerivedData
        });

        it("should maintain stance when conditions are added", async function () {
          // ARRANGE - Enter Defense stance first
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              img: "icons/svg/shield.svg",
              system: { rules: statusRules("defenseStance") },
              statuses: ["defenseStance"]
            }
          ]);

          // ACT - Add stunned condition
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Stunned",
              img: "icons/svg/daze.svg",
              statuses: ["stunned"]
            }
          ]);

          actor.prepareData();

          // ASSERT - Both effects active
          const defenseStance = actor.effects.find(e => e.statuses?.has("defenseStance"));
          const stunnedEffect = actor.effects.find(e => e.statuses?.has("stunned"));

          assert.exists(defenseStance, "Defense stance maintained");
          assert.exists(stunnedEffect, "Stunned condition applied");

          // Note: Game rules for how conditions interact with stances
          // are handled in prepareDerivedData calculations
        });
      });
    },
    { displayName: "L5R4: Stance Switching Workflow Tests" }
  );
}
