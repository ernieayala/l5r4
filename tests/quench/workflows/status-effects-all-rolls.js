/**
 * Status Effects on All Roll Types - Integration Tests
 *
 * Conditions reach every roll type through their rules (module/config/status-effects.js) and the roll pipeline:
 * - Dazed: -3k0 to every roll, keeping no more dice than are rolled (p.89: 6k4 becomes 3k3)
 * - Fatigued: +5 TN per level on Skill, physical Trait, and Spell Casting Rolls (p.89)
 * - Blinded: -1k1 melee and -3k3 ranged attacks (p.89)
 * - Prone: -2k0 to attacks (p.89)
 *
 * @see module/services/dice/check/collect.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { TraitRoll } from "../../../module/services/dice/rolls/trait-roll.js";
import { SpellCastRoll } from "../../../module/services/dice/rolls/spell-cast-roll.js";
import { RingRoll } from "../../../module/services/dice/rolls/ring-roll.js";
import { MahoCastRoll } from "../../../module/services/dice/rolls/maho-cast-roll.js";
import { SkillRoll } from "../../../module/services/dice/rolls/skill-roll.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { checkEffects, settleChatNotifications } from "../helpers.js";

/**
 * Answer the next roll dialog with a TN, then click Roll.
 * @param {number} tn
 * @returns {Promise<void>}
 */
function answerWithTN(tn) {
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

      describe("Status Effects on All Roll Types", () => {
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
            name: "Status Effects Roll Test Character",
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

        describe("Dazed Condition (-3k0 to ALL actions)", () => {
          it("Trait roll: 4k4 rolls 1k1", async () => {
            await add("dazed");
            const message = keep(
              await TraitRoll({ traitRank: 4, traitName: "sta", askForOptions: false, actor })
            );
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
          });

          it("Ring roll: 4k4 rolls 1k1", async () => {
            await add("dazed");
            const message = keep(
              await RingRoll({
                ringRank: 4,
                ringName: "Water",
                systemRing: "water",
                askForOptions: false,
                actor
              })
            );
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
          });

          it("Skill roll: 9k4 rolls 6k4", async () => {
            await add("dazed");
            const message = keep(
              await SkillRoll({
                actor,
                skillRank: 5,
                actorTrait: 4,
                skillName: "kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            assert.deepInclude(message.system.pool, { roll: 6, keep: 4 });
          });

          it("Attack roll: 9k4 rolls 6k4", async () => {
            await add("dazed");
            const message = keep(
              await SkillRoll({
                actor,
                skillRank: 5,
                actorTrait: 4,
                skillName: "kenjutsu",
                skillTrait: "agi",
                rollType: "attack",
                askForOptions: false
              })
            );
            assert.deepInclude(message.system.pool, { roll: 6, keep: 4 });
          });

          it("Spell Casting Roll: Fire 4 + School Rank 3 = 7k4 rolls 4k4", async () => {
            await add("dazed");
            const message = keep(await SpellCastRoll({ actor, spell, showDialog: false }));
            assert.deepInclude(message.system.pool, { roll: 4, keep: 4 });
          });

          it("maho casting gets the penalty too", async () => {
            await add("dazed");
            const message = keep(
              await MahoCastRoll({ actor, spell: mahoSpell, showDialog: false })
            );
            assert.isTrue(
              message.system.modifiers.some(m => m.roll === -3),
              "Dazed listed on the card"
            );
          });
        });

        describe("Fatigued Condition (+5 TN penalty)", () => {
          it("a physical Trait roll's TN rises by 5", async () => {
            await add("fatigued");
            const answered = answerWithTN(15);
            const message = keep(await TraitRoll({ traitRank: 4, traitName: "sta", actor }));
            await answered;
            assert.equal(message.system.tn.effective, 20);
          });

          it("a mental Trait roll's TN stays", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "trait", { trait: "int" }).tn, 0);
          });

          it("a Spell Casting Roll's TN rises by 5: 5 + 5 × 2 + 5 = 20", async () => {
            await add("fatigued");
            const message = keep(await SpellCastRoll({ actor, spell, showDialog: false }));
            assert.equal(message.system.tn.effective, 20);
          });

          it("Skill and attack rolls' TN rises by 5", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "skill", { skill: "kenjutsu", trait: "agi" }).tn, 5);
            assert.equal(checkEffects(actor, "attack", { skill: "kenjutsu", trait: "agi" }).tn, 5);
          });

          it("a Ring roll is not a physical Trait roll: no change", async () => {
            await add("fatigued");
            assert.equal(checkEffects(actor, "ring", { ring: "water" }).tn, 0);
          });
        });

        describe("Multiple Conditions Stacking on All Roll Types", () => {
          it("Dazed and Fatigued on a physical Trait roll: 1k1 at TN + 5", async () => {
            await add("dazed", "fatigued");
            const answered = answerWithTN(15);
            const message = keep(await TraitRoll({ traitRank: 4, traitName: "sta", actor }));
            await answered;
            assert.deepInclude(message.system.pool, { roll: 1, keep: 1 });
            assert.equal(message.system.tn.effective, 20);
          });

          it("Dazed and Blinded on a melee attack: -4k1", async () => {
            await add("dazed", "blinded");
            assert.deepInclude(checkEffects(actor, "attack", { range: "melee" }), {
              roll: -4,
              keep: -1
            });
          });

          it("Prone and Dazed on an attack: -5k0", async () => {
            await add("prone", "dazed");
            assert.equal(checkEffects(actor, "attack").roll, -5);
            assert.equal(
              checkEffects(actor, "ring", { ring: "earth" }).roll,
              -3,
              "Prone is attacks only"
            );
          });
        });

        describe("Condition Removal Restores Normal Rolls", () => {
          it("removing Dazed restores 4k4", async () => {
            const [dazed] = await add("dazed");
            await dazed.delete();
            const message = keep(
              await TraitRoll({ traitRank: 4, traitName: "sta", askForOptions: false, actor })
            );
            assert.deepInclude(message.system.pool, { roll: 4, keep: 4 });
          });

          it("removing Fatigued restores the spell's TN", async () => {
            const [fatigued] = await add("fatigued");
            await fatigued.delete();
            const message = keep(await SpellCastRoll({ actor, spell, showDialog: false }));
            assert.equal(message.system.tn.effective, 15);
          });
        });

        describe("Edge Cases", () => {
          it("a disabled Dazed gives no penalty", async () => {
            await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Dazed", statuses: ["dazed"], disabled: true }
            ]);
            const message = keep(
              await TraitRoll({ traitRank: 4, traitName: "sta", askForOptions: false, actor })
            );
            assert.deepInclude(message.system.pool, { roll: 4, keep: 4 });
          });

          it("penalties past the whole pool leave the 1k1 minimum (Ten Dice Rule helper)", async () => {
            await add("dazed", "blinded", "prone");
            const message = keep(
              await SkillRoll({
                actor,
                skillRank: 0,
                actorTrait: 4,
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
      displayName: "L5R4 Enhanced: Status Effects on All Roll Types"
    }
  );
}
