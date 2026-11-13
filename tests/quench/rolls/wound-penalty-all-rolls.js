/**
 * Integration Tests: Wound Penalty Application Across All Roll Types
 *
 * Each Wound Rank past Healthy increases the TN of all rolls by its penalty (Core Rulebook p.82; roadmap
 * STAGE-08 decision 2): Nicked +3, Grazed +5, Hurt +10, Injured +15, Crippled +20, Down +40. The roll pipeline adds
 * it to every roll's TN, never to the total; the roll dialog can leave it off; a damage roll has no TN; a roll with
 * no TN set records none.
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
import { WeaponRoll } from "../../../module/services/dice/rolls/weapon-roll.js";
import { settleChatNotifications } from "../helpers.js";

/** TN the tests give rolls through the dialog. */
const TN = 15;

/**
 * Answer the next roll dialog: set its fields, then click Roll.
 * @param {Record<string, string|number|boolean>} values  Field name to value; booleans set checkboxes
 * @returns {Promise<void>}
 */
function answerDialog(values) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      for (const [name, value] of Object.entries(values)) {
        const input = app.element.querySelector(`[name="${name}"]`);
        if (input.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
        }
      }
      app.element.querySelector('[data-action="ok"]').click();
      resolve();
    });
  });
}

/**
 * Register Quench test batch for wound penalty integration tests.
 * @param {object} quench  The Quench API object.
 */
export function register(quench) {
  quench.registerBatch(
    "l5r4-enhanced.wound-penalty-all-rolls",
    context => {
      const { describe, it, assert, before, after } = context;
      const messages = [];

      describe("Wound Penalty Application Across All Roll Types", () => {
        let actor;
        let penalty;

        /**
         * Roll with a TN given in the dialog and check the TN carries the penalty and the total does not.
         * @param {function(): Promise<ChatMessage>} roll
         * @param {object} [dialog]  More dialog fields
         * @returns {Promise<ChatMessage>}
         */
        const rollWithTN = async (roll, dialog = {}) => {
          const answered = answerDialog({ tn: TN, ...dialog });
          const message = await roll();
          await answered;
          messages.push(message);
          assert.equal(message.system.tn.woundPenalty, penalty, "penalty recorded on the TN");
          assert.equal(message.system.tn.effective, TN + penalty, "TN + penalty");
          assert.notInclude(message.rolls[0].formula, `- ${penalty}`, "total untouched");
          return message;
        };

        before(async function () {
          this.timeout(30_000);
          await settleChatNotifications();
          actor = await createTestPC({
            name: "Wounded Samurai",
            system: { traits: { agi: 3, str: 4, ref: 3, sta: 3, int: 3, per: 3, wil: 3, awa: 3 } }
          });
          await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createWeaponData("Katana", 3, 2, { system: { associatedSkill: "Kenjutsu" } }),
            createSpellData("Test Fire Spell", "fire", 2),
            createSpellData("Test Maho Spell", "earth", 1, { system: { maho: true } })
          ]);
          // Past Healthy, into a Wound Rank with a penalty
          await actor.update({ "system.suffered": actor.system.woundLevels.healthy.value + 1 });
          penalty = actor.system.woundPenalty;
        });

        after(async function () {
          this.timeout(30_000);
          await settleChatNotifications();
          for (const message of messages) {
            await message.delete();
          }
          await actor?.delete();
        });

        it("the wounded actor has a penalty", () => {
          assert.isAbove(penalty, 0);
        });

        it("Skill Roll", async () => {
          await rollWithTN(() =>
            SkillRoll({
              actor,
              skillName: "Kenjutsu",
              actorTrait: 3,
              skillRank: 3,
              skillTrait: "agi"
            })
          );
        });

        it("Unskilled Roll", async () => {
          await rollWithTN(() =>
            SkillRoll({
              actor,
              skillName: "Athletics",
              actorTrait: 3,
              skillRank: 0,
              skillTrait: "agi"
            })
          );
        });

        it("Skill attack", async () => {
          const katana = actor.items.find(i => i.type === "weapon");
          await rollWithTN(() =>
            SkillRoll({
              actor,
              skillName: "Kenjutsu",
              actorTrait: 3,
              skillRank: 3,
              skillTrait: "agi",
              rollType: "attack",
              weaponId: katana.id
            })
          );
        });

        it("Trait Roll, low and high ranks", async () => {
          await rollWithTN(() => TraitRoll({ actor, traitName: "ref", traitRank: 2 }));
          await rollWithTN(() => TraitRoll({ actor, traitName: "str", traitRank: 10 }));
        });

        it("Ring Rolls, the Void Ring included", async () => {
          await rollWithTN(() =>
            RingRoll({ actor, ringRank: 3, ringName: "Fire", systemRing: "fire" })
          );
          await rollWithTN(() =>
            RingRoll({ actor, ringRank: 3, ringName: "Void", systemRing: "void" })
          );
        });

        it("Spell Casting Roll", async () => {
          const spell = actor.items.getName("Test Fire Spell");
          await rollWithTN(() => SpellCastRoll({ actor, spell }));
        });

        it("Maho casting, after its blood cost", async () => {
          const spell = actor.items.getName("Test Maho Spell");
          await rollWithTN(() => MahoCastRoll({ actor, spell }));
          // The blood cost may move the actor to a worse Wound Rank before the roll
          penalty = actor.system.woundPenalty;
        });

        it("NPC-style XkY roll", async () => {
          await rollWithTN(() =>
            SimpleRoll({ actor, diceRoll: 4, diceKeep: 2, rollName: "Plain" })
          );
        });

        it("the dialog can leave the penalty off", async () => {
          const answered = answerDialog({ tn: TN, woundPenalty: false });
          const message = await TraitRoll({ actor, traitName: "ref", traitRank: 3 });
          await answered;
          messages.push(message);
          assert.equal(message.system.tn.effective, TN);
          assert.equal(message.system.tn.woundPenalty, 0);
        });

        it("a roll with no TN records no TN", async () => {
          const message = await TraitRoll({
            actor,
            traitName: "ref",
            traitRank: 3,
            askForOptions: false
          });
          messages.push(message);
          assert.isNull(message.system.tn.effective);
          assert.equal(message.system.pool.bonus, 0);
        });

        it("a damage roll has no TN and no penalty", async () => {
          const message = await WeaponRoll({
            actor,
            diceRoll: 4,
            diceKeep: 2,
            weaponName: "Katana",
            askForOptions: false
          });
          messages.push(message);
          assert.isNull(message.system.tn.effective);
          assert.equal(message.system.tn.woundPenalty, 0);
        });

        it("a Healthy actor has no penalty on the TN", async () => {
          await actor.update({ "system.suffered": 0 });
          penalty = 0;
          await rollWithTN(() => TraitRoll({ actor, traitName: "str", traitRank: 4 }));
        });
      });
    },
    { displayName: "L5R4: Wound Penalty - All Roll Types" }
  );
}
