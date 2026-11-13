/**
 * Status Effects Complete Workflow Tests
 *
 * Applying and removing each condition as an Active Effect, through to what the actor and its rolls get (Core
 * Rulebook p.89, Guard p.88): Armor TN, the roll pipeline's modifiers (checkEffects), movement, stacking, disabled
 * effects, and Fasting's block on Void recovery.
 *
 * Each effect is made from its status id alone, as a macro or another module would; the status's rules come with it
 * (module/documents/active-effect.js).
 *
 * @see module/config/status-effects.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { applyLongRest } from "../../../module/services/rest.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { checkEffects } from "../helpers.js";

/**
 * Register status effects workflow tests
 * @param {Object} quench - Quench test framework
 */
export function registerStatusEffectsWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.status-effects`,
    context => {
      const { describe, it, assert, before, after, afterEach } = context;

      describe("Status Effects Complete Workflow", () => {
        let actor;

        /**
         * Create effects from status ids alone.
         * @param {...string} ids
         * @returns {Promise<ActiveEffect[]>}
         */
        const add = (...ids) =>
          actor.createEmbeddedDocuments(
            "ActiveEffect",
            ids.map(id => ({ name: id, statuses: [id] }))
          );

        // Reflexes 3: base Armor TN 3 × 5 + 5 = 20 (p.82), no armor
        const BASE_TN = 20;

        before(async () => {
          actor = await createTestPC({
            name: "Status Effects Test Character",
            system: {
              traits: { ref: 3, sta: 3, wil: 3, str: 3, agi: 3, int: 3, per: 3, awa: 3 },
              rings: { void: { rank: 3, value: 3 } },
              suffered: 0
            }
          });
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

        describe("Apply/Remove Status Effect Workflow", () => {
          it("Blinded: -3k3 ranged, -1k1 melee, base Armor TN Reflexes + 5, Water -2 for movement", async () => {
            assert.equal(actor.system.armorTn.current, BASE_TN);
            await add("blinded");
            assert.isTrue(actor.statuses.has("blinded"));
            assert.deepInclude(checkEffects(actor, "attack", { range: "ranged" }), {
              roll: -3,
              keep: -3
            });
            assert.deepInclude(checkEffects(actor, "attack", { range: "melee" }), {
              roll: -1,
              keep: -1
            });
            assert.equal(actor.system.armorTn.current, 3 + 5 + actor.system.armorTn.bonus);
            assert.equal(actor.system.movementWater, -2);
          });

          it("removing Blinded restores the stats", async () => {
            const [blind] = await add("blinded");
            await blind.delete();
            assert.isFalse(actor.statuses.has("blinded"));
            assert.deepInclude(checkEffects(actor, "attack"), { roll: 0, keep: 0 });
            assert.equal(actor.system.armorTn.current, BASE_TN);
            assert.equal(actor.system.movementWater, 0);
          });

          it("Stunned: Armor TN 5 plus armor", async () => {
            await add("stunned");
            assert.equal(actor.system.armorTn.current, 5 + actor.system.armorTn.bonus);
          });

          it("Prone: -10 Armor TN against melee only, -2k0 to attacks", async () => {
            await add("prone");
            assert.equal(actor.system.armorTn.current, BASE_TN, "the shown Armor TN is unchanged");
            assert.deepEqual(actor.system.armorTn.vs, { melee: -10, ranged: 0 });
            assert.equal(checkEffects(actor, "attack", { range: "melee" }).roll, -2);
            assert.equal(checkEffects(actor, "attack", { range: "ranged" }).roll, -2);
          });

          it("Dazed: -3k0 to every roll", async () => {
            await add("dazed");
            for (const kind of ["attack", "skill", "trait", "ring", "damage"]) {
              assert.deepInclude(checkEffects(actor, kind), { roll: -3, keep: 0 }, kind);
            }
          });

          it("Fatigued: +5 TN on Skill, physical Trait, and Spell Casting Rolls", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "skill").tn, 5);
            assert.equal(checkEffects(actor, "trait", { trait: "str" }).tn, 5);
            assert.equal(checkEffects(actor, "spell").tn, 5);
            assert.equal(checkEffects(actor, "trait", { trait: "int" }).tn, 0, "a mental Trait");
          });

          it("Grappled: Armor TN 5 plus armor", async () => {
            await add("grappled");
            assert.equal(actor.system.armorTn.current, 5 + actor.system.armorTn.bonus);
          });

          it("Guarded: +10 Armor TN (p.88)", async () => {
            await add("guarded");
            assert.equal(actor.system.armorTn.current, BASE_TN + 10);
          });

          it("Guarding: -5 Armor TN (p.88)", async () => {
            await add("guarding");
            assert.equal(actor.system.armorTn.current, BASE_TN - 5);
          });
        });

        describe("Multiple Conditions Stacking", () => {
          it("dice penalties add: Dazed and Blinded", async () => {
            await add("dazed", "blinded");
            assert.deepInclude(checkEffects(actor, "attack", { range: "melee" }), {
              roll: -4,
              keep: -1
            });
            assert.deepInclude(checkEffects(actor, "attack", { range: "ranged" }), {
              roll: -6,
              keep: -3
            });
          });

          it("Stunned and Grappled together: 5 plus armor", async () => {
            await add("stunned", "grappled");
            assert.equal(actor.system.armorTn.current, 5 + actor.system.armorTn.bonus);
          });

          it("Grappled sets the whole Armor TN: Prone against melee adds nothing (decision 3)", async () => {
            await add("grappled", "prone");
            assert.equal(actor.system.armorTn.current, 5 + actor.system.armorTn.bonus);
            assert.deepEqual(actor.system.armorTn.vs, { melee: 0, ranged: 0 });
          });

          it("Fatigued at level 2: +10 TN", async () => {
            const [effect] = await add("fatigued");
            await effect.update({ "system.level": 2 });
            assert.equal(checkEffects(actor, "skill").tn, 10);
          });

          it("Prone, Dazed, and Fatigued together", async () => {
            await add("prone", "dazed", "fatigued");
            for (const status of ["prone", "dazed", "fatigued"]) {
              assert.isTrue(actor.statuses.has(status), status);
            }
            const attack = checkEffects(actor, "attack", { skill: "kenjutsu" });
            assert.equal(attack.roll, -5, "Prone -2k0 and Dazed -3k0");
            assert.equal(attack.tn, 5, "Fatigued +5");
          });
        });

        describe("Fasting Condition Workflow", () => {
          it("Fasting is an effect with its status", async () => {
            await add("fasting");
            assert.isTrue(actor.statuses.has("fasting"));
          });

          it("a long rest restores no Void Points while Fasting (p.89)", async () => {
            await actor.update({ "system.rings.void.value": 0 });
            await add("fasting");
            await applyLongRest(actor);
            assert.equal(actor.system.rings.void.value, 0);
          });

          it("Void Points recover after breaking the fast", async () => {
            await actor.update({ "system.rings.void.value": 0 });
            const [fasting] = await add("fasting");
            await fasting.delete();
            await applyLongRest(actor);
            assert.equal(actor.system.rings.void.value, actor.system.rings.void.rank);
          });
        });

        describe("Condition Edge Cases", () => {
          it("a disabled condition does nothing", async () => {
            await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Stunned", statuses: ["stunned"], disabled: true }
            ]);
            assert.isFalse(actor.statuses.has("stunned"));
            assert.equal(actor.system.armorTn.current, BASE_TN);
          });

          it("disabling and enabling a condition turns its rules off and on", async () => {
            const [blind] = await add("blinded");
            assert.equal(checkEffects(actor, "attack").roll, -1);
            await blind.update({ disabled: true });
            assert.equal(checkEffects(actor, "attack").roll, 0);
            await blind.update({ disabled: false });
            assert.equal(checkEffects(actor, "attack").roll, -1);
          });

          it("the Armor TN never drops below 5", async () => {
            await add("stunned", "guarding");
            assert.isAtLeast(actor.system.armorTn.current, 5);
          });
        });
      });
    },
    {
      displayName: "L5R4 Enhanced: Status Effects Workflow"
    }
  );
}
