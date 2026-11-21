/**
 * Status effects on all roll types
 *
 * Conditions reach every roll type through their rules (module/config/status-effects.js) and the roll pipeline:
 * - Dazed: -3k0 to every roll, keeping no more dice than are rolled, so 6k4 becomes 3k3
 * - Fatigued: +5 TN per level on Skill, physical Trait, and Spell Casting Rolls
 * - Blinded: -1k1 melee and -3k3 ranged attacks
 * - Prone: -2k0 to attacks
 * game-rules/41_conditional_effects.md, p.89
 *
 * @see module/services/dice/check/collect.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { rollTrait } from "../../../module/services/dice/rolls/trait-roll.js";
import { rollSpellCast } from "../../../module/services/dice/rolls/spell-cast-roll.js";
import { rollRing } from "../../../module/services/dice/rolls/ring-roll.js";
import { rollMahoCast } from "../../../module/services/dice/rolls/maho-cast-roll.js";
import { rollSkill } from "../../../module/services/dice/rolls/skill-roll.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { checkEffects, settleChatNotifications } from "../helpers.js";

/**
 * Answer the next roll dialog with a TN, then click Roll.
 * @param {number} tn
 * @returns {Promise<void>}
 */
function answerWithTn(tn) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      app.element.querySelector('[name="tn"]').value = String(tn);
      app.element.querySelector('[data-action="ok"]').click();
      resolve();
    });
  });
}

/**
 * Register status effects on all roll types tests
 * @param {Object} quench - Quench test framework
 */
export function registerStatusEffectsAllRollsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.status-effects-all-rolls`,
    context => {
      const { describe, it, assert, before, after, afterEach } = context;

      describe("Status effects on all roll types", () => {
        let actor;
        let spell;
        let mahoSpell;
        const messages = [];

        /** Create effects from status ids alone. */
        const add = (...ids) =>
          actor.createEmbeddedDocuments(
            "ActiveEffect",
            ids.map(id => ({ name: id, statuses: [id] }))
          );

        /** Keep a message for cleanup and return it. */
        const keep = message => {
          messages.push(message);
          return message;
        };

        before(async function () {
          this.timeout(30_000);
          await settleChatNotifications();
          actor = await createTestPC({
            name: "Status effects on all roll types: roll character",
            system: {
              traits: { ref: 4, sta: 4, wil: 4, str: 4, agi: 4, int: 4, per: 4, awa: 4 },
              rings: { void: { rank: 4, value: 4 } },
              insight: { rank: 3, autoCalculate: false },
              spellSlots: { earth: 4, air: 4, fire: 4, water: 4, void: 2 },
              suffered: 0
            }
          });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Kenjutsu", type: "skill", system: { rank: 5, trait: "agi" } }
          ]);
          // createEmbeddedDocuments does not keep the order it was given, so each spell is found by name
          await actor.createEmbeddedDocuments("Item", [
            { name: "Test Spell", type: "spell", system: { ring: "fire", mastery: 2 } },
            { name: "Test Maho", type: "spell", system: { ring: "earth", mastery: 1, maho: true } }
          ]);
          spell = actor.items.getName("Test Spell");
          mahoSpell = actor.items.getName("Test Maho");
        });

        afterEach(async () => {
          const ids = actor.effects.map(e => e.id);
          if (ids.length) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
          }
        });

        after(async function () {
          this.timeout(30_000);
          await settleChatNotifications();
          for (const message of messages) {
            await message.delete();
          }
          await actor?.delete();
        });

        describe("Dazed condition at -3k0 to all actions", () => {
          it("should roll a 4k4 Trait roll as 1k1", async () => {
            await add("dazed");
            const message = keep(
              await rollTrait({ traitRank: 4, traitName: "sta", askForOptions: false, actor })
            );
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
          });

          it("should roll a 4k4 Ring roll as 1k1", async () => {
            await add("dazed");
            const message = keep(
              await rollRing({
                ringRank: 4,
                ringName: "Water",
                ringKey: "water",
                askForOptions: false,
                actor
              })
            );
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
          });

          it("should roll a 9k4 Skill roll as 6k4", async () => {
            await add("dazed");
            const message = keep(
              await rollSkill({
                actor,
                skillRank: 5,
                traitRank: 4,
                skillName: "kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            assert.deepInclude(message.system.pool, { roll: 6, keep: 4 });
          });

          it("should roll a 9k4 attack roll as 6k4", async () => {
            await add("dazed");
            const message = keep(
              await rollSkill({
                actor,
                skillRank: 5,
                traitRank: 4,
                skillName: "kenjutsu",
                skillTrait: "agi",
                rollType: "attack",
                askForOptions: false
              })
            );
            assert.deepInclude(message.system.pool, { roll: 6, keep: 4 });
          });

          it("should roll a Spell Casting Roll of Fire 4 + School Rank 3 = 7k4 as 4k4", async () => {
            await add("dazed");
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            assert.deepInclude(message.system.pool, { roll: 4, keep: 4 });
          });

          it("should give maho casting the penalty too", async () => {
            await add("dazed");
            const message = keep(
              await rollMahoCast({ actor, spell: mahoSpell, showDialog: false })
            );
            assert.isTrue(
              message.system.modifiers.some(m => m.roll === -3),
              "Dazed listed on the card"
            );
          });
        });

        describe("Fatigued condition at +5 TN", () => {
          it("should raise a physical Trait roll's TN by 5", async () => {
            await add("fatigued");
            const answered = answerWithTn(15);
            const message = keep(await rollTrait({ traitRank: 4, traitName: "sta", actor }));
            await answered;
            assert.equal(message.system.tn.effective, 20);
          });

          it("should leave a mental Trait roll's TN unchanged", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "trait", { trait: "int" }).tn, 0);
          });

          it("should raise a Spell Casting Roll's TN by 5: 5 + 5 × 2 + 5 = 20", async () => {
            await add("fatigued");
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            assert.equal(message.system.tn.effective, 20);
          });

          it("should raise the TN of Skill and attack rolls by 5", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "skill", { skill: "kenjutsu", trait: "agi" }).tn, 5);
            assert.equal(checkEffects(actor, "attack", { skill: "kenjutsu", trait: "agi" }).tn, 5);
          });

          it("should leave a Ring roll's TN unchanged, since it is not a physical Trait roll", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "ring", { ring: "water" }).tn, 0);
          });
        });

        describe("Multiple conditions stacking on all roll types", () => {
          it("should roll a Dazed and Fatigued physical Trait roll as 1k1 at TN + 5", async () => {
            await add("dazed", "fatigued");
            const answered = answerWithTn(15);
            const message = keep(await rollTrait({ traitRank: 4, traitName: "sta", actor }));
            await answered;
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
            assert.equal(message.system.tn.effective, 20);
          });

          it("should give a Dazed and Blinded melee attack -4k1", async () => {
            await add("dazed", "blinded");
            assert.deepInclude(checkEffects(actor, "attack", { range: "melee" }), {
              roll: -4,
              keep: -1
            });
          });

          it("should give a Prone and Dazed attack -5k0", async () => {
            await add("prone", "dazed");
            assert.equal(checkEffects(actor, "attack").roll, -5);
            assert.equal(
              checkEffects(actor, "ring", { ring: "earth" }).roll,
              -3,
              "Prone is attacks only"
            );
          });
        });

        describe("Condition removal restoring normal rolls", () => {
          it("should restore 4k4 when Dazed is removed", async () => {
            const [dazed] = await add("dazed");
            await dazed.delete();
            const message = keep(
              await rollTrait({ traitRank: 4, traitName: "sta", askForOptions: false, actor })
            );
            assert.deepInclude(message.system.pool, { roll: 4, keep: 4 });
          });

          it("should restore the spell's TN when Fatigued is removed", async () => {
            const [fatigued] = await add("fatigued");
            await fatigued.delete();
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            assert.equal(message.system.tn.effective, 15);
          });
        });

        describe("Status effect edge cases", () => {
          it("should give no penalty from a disabled Dazed", async () => {
            await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Dazed", statuses: ["dazed"], disabled: true }
            ]);
            const message = keep(
              await rollTrait({ traitRank: 4, traitName: "sta", askForOptions: false, actor })
            );
            assert.deepInclude(message.system.pool, { roll: 4, keep: 4 });
          });

          // The Ten Dice Rule helper holds the floor
          it("should leave the 1k1 minimum when penalties pass the whole pool", async () => {
            await add("dazed", "blinded", "prone");
            const message = keep(
              await rollSkill({
                actor,
                skillRank: 0,
                traitRank: 4,
                skillName: "jiujutsu",
                skillTrait: "agi",
                rollType: "attack",
                askForOptions: false
              })
            );
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
          });
        });
      });
    },
    {
      displayName: "L5R4: Status effects on all roll types"
    }
  );
}
