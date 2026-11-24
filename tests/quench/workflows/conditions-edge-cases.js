/**
 * Conditions Edge Case Tests
 *
 * Tests edge cases in condition management that could break combat. Conditions are status effects, applied with
 * `actor.toggleStatusEffect` and read back from `actor.statuses`, the Armor TN, and what a roll collects
 * (checkEffects). Values are the book's (roadmap/STAGE-09 decision 3).
 * game-rules/41_conditional_effects.md, p.89
 *
 * **What Can Break:**
 * - Stunned and Blinded Armor TN overrides
 * - Fatigued applied twice; Dazed, Fear, and Concentration applied again (#177)
 * - Condition removal recalculation
 * - Several conditions at once
 * - Conditions persisting across preparations
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { applyEffect, effectsOf } from "../../../module/services/effects/apply.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { checkEffects } from "../helpers.js";

/**
 * Apply or remove conditions, one status change at a time; each awaited change re-prepares the actor.
 * @param {Actor} actor
 * @param {Record<string, boolean>} states  Status id -> active.
 */
async function setConditions(actor, states) {
  for (const [id, active] of Object.entries(states)) {
    await actor.toggleStatusEffect(id, { active });
  }
}

/**
 * Register conditions edge case tests
 * @param {Object} quench - Quench test framework
 */
export function registerConditionsEdgeCaseTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.conditions-edge-cases`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Stunned condition", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Conditions edge cases: Stunned Test",
            system: { traits: { ref: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should apply the Stunned Armor TN override of TN 5", async () => {
          await setConditions(actor, { stunned: true });

          assert.isTrue(actor.statuses.has("stunned"), "Stunned condition active");
          // Stunned: 5 + armor bonus (no armor worn), replacing Reflexes x 5 + 5
          assert.equal(actor.system.armorTn.current, 5, "Armor TN overridden to 5");
        });

        it("should override high Armor TN when Stunned", async () => {
          await actor.update({ "system.traits.ref": 10 });
          await setConditions(actor, { stunned: true });

          assert.equal(
            actor.system.armorTn.current,
            5,
            "Reflexes 10 still gives TN 5 while Stunned"
          );
        });

        it("should remove Stunned and recalculate Armor TN", async () => {
          await setConditions(actor, { stunned: true });
          await setConditions(actor, { stunned: false });

          assert.isFalse(actor.statuses.has("stunned"), "Stunned removed");
          assert.equal(actor.system.armorTn.current, 3 * 5 + 5, "TN recalculated to base");
        });
      });

      describe("Fatigued condition", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Conditions edge cases: Fatigue Test",
            system: { traits: { sta: 3, ref: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should apply the Fatigued TN penalty", async () => {
          await setConditions(actor, { fatigued: true });

          assert.isTrue(actor.statuses.has("fatigued"), "Fatigued active");
          assert.equal(checkEffects(actor, "skill").tn, 5, "+5 TN while Fatigued");
        });

        it("should not stack Fatigued applied twice", async () => {
          await setConditions(actor, { fatigued: true });
          await actor.toggleStatusEffect("fatigued", { active: true });

          const fatigued = actor.effects.filter(effect => effect.statuses.has("fatigued"));
          assert.lengthOf(fatigued, 1, "One Fatigued effect");
          assert.equal(checkEffects(actor, "skill").tn, 5, "Penalty applied once");
        });

        it("should remove Fatigued and its penalty", async () => {
          await setConditions(actor, { fatigued: true });
          await setConditions(actor, { fatigued: false });

          assert.isFalse(actor.statuses.has("fatigued"), "Fatigued removed");
          assert.equal(checkEffects(actor, "skill").tn, 0, "No TN penalty");
        });
      });

      // #177: applyEffect, the path of condition links, card buttons, Fear, and the GM's queries
      describe("A condition applied again", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Conditions edge cases: applied again" });
        });

        afterEach(async () => {
          await actor?.delete();
          actor = null;
        });

        it("should hold one Dazed for two, at one -3k0", async () => {
          await applyEffect(actor, "dazed");
          await applyEffect(actor, "dazed", { origin: actor.uuid });
          assert.lengthOf(effectsOf(actor, "dazed"), 1);
          assert.equal(checkEffects(actor, "skill").roll, -3);
        });

        // Ernie's ruling (#177): the higher Fear replaces the lower
        // game-rules/42_fear.md, p.90
        it("should keep the higher Fear, whichever order the Fears land in", async () => {
          await applyEffect(actor, "feared", { level: 2, name: "Fear 2" });
          await applyEffect(actor, "feared", { level: 3, name: "Fear 3" });
          await applyEffect(actor, "feared", { level: 1, name: "Fear 1" });
          const [fear, ...more] = effectsOf(actor, "feared");
          assert.isEmpty(more, "one Feared effect");
          assert.equal(fear.system.level, 3);
          assert.equal(fear.name, "Fear 3");
          assert.equal(checkEffects(actor, "skill").roll, -3, "not -6k0");
        });

        // game-rules/67_universal_spells.md, p.166
        it("should hold a Concentration per spell, and one for the same spell", async () => {
          const [spellA, spellB] = [1, 2].map(() => `Item.${foundry.utils.randomID()}`);
          await applyEffect(actor, "concentration", { origin: spellA });
          await applyEffect(actor, "concentration", { origin: spellA });
          await applyEffect(actor, "concentration", { origin: spellB });
          assert.lengthOf(effectsOf(actor, "concentration"), 2);
        });
      });

      describe("Multiple conditions at once", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Conditions edge cases: Multi-Condition Test",
            system: { traits: { ref: 3, sta: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle Stunned + Prone simultaneously", async () => {
          await setConditions(actor, { stunned: true, prone: true });

          assert.isTrue(actor.statuses.has("stunned"), "Stunned active");
          assert.isTrue(actor.statuses.has("prone"), "Prone active");
          // Stunned sets the whole Armor TN to 5 plus armor; Prone's melee -10 adds nothing
          // (roadmap/STAGE-09 decision 3)
          assert.equal(actor.system.armorTn.current, 5, "Stunned Armor TN");
          assert.deepEqual(actor.system.armorTn.vs, { melee: 0, ranged: 0 });
        });

        it("should handle Blinded + Fatigued + Prone", async () => {
          await setConditions(actor, { blinded: true, fatigued: true, prone: true });

          for (const id of ["blinded", "fatigued", "prone"]) {
            assert.isTrue(actor.statuses.has(id), `${id} active`);
          }
          assert.equal(checkEffects(actor, "attack").tn, 5, "Fatigued TN penalty");
          assert.equal(
            checkEffects(actor, "attack", { range: "ranged" }).roll,
            -5,
            "Blinded -3 and Prone -2 rolled dice on ranged"
          );
          assert.equal(actor.system.armorTn.current, 3 + 5, "Blinded base Reflexes + 5");
          assert.equal(actor.system.armorTn.vs.melee, -10, "Prone counts against melee");
        });

        it("should handle the conflicting conditions Stunned and Dazed", async () => {
          await setConditions(actor, { stunned: true, dazed: true });

          assert.isTrue(actor.statuses.has("stunned"), "Stunned tracked");
          assert.isTrue(actor.statuses.has("dazed"), "Dazed tracked");
          assert.equal(checkEffects(actor, "attack").roll, -3, "Dazed melee penalty");
        });

        it("should remove one condition while keeping others", async () => {
          await setConditions(actor, { stunned: true, prone: true, blinded: true });
          await setConditions(actor, { stunned: false });

          assert.isFalse(actor.statuses.has("stunned"), "Stunned removed");
          assert.isTrue(actor.statuses.has("prone"), "Prone remains");
          assert.isTrue(actor.statuses.has("blinded"), "Blinded remains");
        });

        it("should clear all conditions at once", async () => {
          await setConditions(actor, { stunned: true, prone: true, blinded: true, fatigued: true });
          await setConditions(actor, {
            stunned: false,
            prone: false,
            blinded: false,
            fatigued: false
          });

          assert.equal(actor.statuses.size, 0, "No conditions active");
          assert.equal(actor.system.armorTn.current, 3 * 5 + 5, "Armor TN back to base");
        });
      });

      describe("Condition recalculation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Conditions edge cases: Recalc Test",
            system: { traits: { ref: 3, sta: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should recalculate Armor TN when condition added", async () => {
          const baseTN = actor.system.armorTn.current;
          await setConditions(actor, { stunned: true });

          assert.equal(baseTN, 20, "Base TN from Reflexes 3");
          assert.equal(actor.system.armorTn.current, 5, "Stunned TN after adding");
        });

        it("should recalculate when condition removed", async () => {
          await setConditions(actor, { stunned: true });
          await setConditions(actor, { stunned: false });

          assert.equal(actor.system.armorTn.current, 3 * 5 + 5, "TN recalculated to base");
        });

        it("should handle rapid condition toggling", async () => {
          for (const active of [true, false, true, false, true]) {
            await actor.toggleStatusEffect("prone", { active });
          }

          assert.isTrue(actor.statuses.has("prone"), "Final state correct");
          const prone = actor.effects.filter(effect => effect.statuses.has("prone"));
          assert.lengthOf(prone, 1, "One Prone effect");
        });

        it("should handle concurrent condition updates", async () => {
          await Promise.all([
            actor.toggleStatusEffect("stunned", { active: true }),
            actor.toggleStatusEffect("prone", { active: true }),
            actor.toggleStatusEffect("blinded", { active: true })
          ]);

          for (const id of ["stunned", "prone", "blinded"]) {
            assert.isTrue(actor.statuses.has(id), `${id} applied`);
          }
        });
      });

      describe("Condition persistence", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Conditions edge cases: Persistence Test",
            system: { traits: { ref: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should keep a condition across a fresh preparation", async () => {
          await setConditions(actor, { blinded: true });
          actor.reset();

          assert.isTrue(actor.statuses.has("blinded"), "Blinded persists");
          assert.equal(actor.system.armorTn.current, 3 + 5, "Blinded TN: Reflexes + 5");
        });
      });
    },
    { displayName: "L5R4: Conditions edge cases" }
  );
}
