/**
 * Integration Tests: Wound Penalty Application Across All Roll Types
 *
 * Each Wound Rank past Healthy increases the TN of all rolls by its penalty (roadmap/STAGE-08 decision 2): Nicked +3,
 * Grazed +5, Hurt +10, Injured +15, Crippled +20, Down +40. The roll pipeline adds it to every roll's TN, never to the
 * total; the roll dialog can leave it off; a damage roll has no TN; a roll with no TN set records none.
 * game-rules/33_wounds.md, p.82
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  createSkillData,
  createSpellData,
  createWeaponData
} from "../../fixtures/item-fixtures.js";
import { rollSkill } from "../../../module/services/dice/rolls/skill-roll.js";
import { rollTrait } from "../../../module/services/dice/rolls/trait-roll.js";
import { rollRing } from "../../../module/services/dice/rolls/ring-roll.js";
import { rollSpellCast } from "../../../module/services/dice/rolls/spell-cast-roll.js";
import { rollMahoCast } from "../../../module/services/dice/rolls/maho-cast-roll.js";
import { rollPool } from "../../../module/services/dice/rolls/simple-roll.js";
import { rollWeaponDamage } from "../../../module/services/dice/rolls/weapon-roll.js";
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
export function registerWoundPenaltyAllRollsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.wound-penalty-all-rolls`,
    context => {
      const { describe, it, assert, before, after } = context;
      const messages = [];

      describe("Wound penalty application across all roll types", () => {
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
            name: "Wound penalty on every roll: wounded samurai",
            system: { traits: { agi: 3, str: 4, ref: 3, sta: 3, int: 3, per: 3, wil: 3, awa: 3 } }
          });
          await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createWeaponData("Katana", 3, 2, { system: { associatedSkill: "Kenjutsu" } }),
            // Mastery 1: within School Rank 1, so no GM confirm opens
            // game-rules/66_magic_and_spell_casting.md, p.164
            createSpellData("Test Fire Spell", "fire", 1),
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

        it("should give the wounded actor a penalty", () => {
          assert.isAbove(penalty, 0);
        });

        it("should add the penalty to the TN of a Skill Roll", async () => {
          await rollWithTN(() =>
            rollSkill({
              actor,
              skillName: "Kenjutsu",
              traitRank: 3,
              skillRank: 3,
              skillTrait: "agi"
            })
          );
        });

        it("should add the penalty to the TN of an Unskilled Roll", async () => {
          await rollWithTN(() =>
            rollSkill({
              actor,
              skillName: "Athletics",
              traitRank: 3,
              skillRank: 0,
              skillTrait: "agi"
            })
          );
        });

        it("should add the penalty to the TN of a Skill attack", async () => {
          const katana = actor.items.find(i => i.type === "weapon");
          await rollWithTN(() =>
            rollSkill({
              actor,
              skillName: "Kenjutsu",
              traitRank: 3,
              skillRank: 3,
              skillTrait: "agi",
              rollType: "attack",
              weaponId: katana.id
            })
          );
        });

        it("should add the penalty to the TN of a Trait Roll at low and high ranks", async () => {
          await rollWithTN(() => rollTrait({ actor, traitName: "ref", traitRank: 2 }));
          await rollWithTN(() => rollTrait({ actor, traitName: "str", traitRank: 10 }));
        });

        it("should add the penalty to the TN of a Ring Roll, the Void Ring included", async () => {
          await rollWithTN(() =>
            rollRing({ actor, ringRank: 3, ringName: "Fire", ringKey: "fire" })
          );
          await rollWithTN(() =>
            rollRing({ actor, ringRank: 3, ringName: "Void", ringKey: "void" })
          );
        });

        it("should add the penalty to the TN of a Spell Casting Roll", async () => {
          const spell = actor.items.getName("Test Fire Spell");
          await rollWithTN(() => rollSpellCast({ actor, spell }));
        });

        it("should add the penalty to the TN of maho casting after its blood cost", async () => {
          const spell = actor.items.getName("Test Maho Spell");
          await rollWithTN(() => rollMahoCast({ actor, spell }));
          // The blood cost may move the actor to a worse Wound Rank before the roll
          penalty = actor.system.woundPenalty;
        });

        it("should add the penalty to the TN of an NPC-style XkY roll", async () => {
          await rollWithTN(() => rollPool({ actor, roll: 4, keep: 2, rollName: "Plain" }));
        });

        it("should let the dialog leave the penalty off", async () => {
          const answered = answerDialog({ tn: TN, woundPenalty: false });
          const message = await rollTrait({ actor, traitName: "ref", traitRank: 3 });
          await answered;
          messages.push(message);
          assert.equal(message.system.tn.effective, TN);
          assert.equal(message.system.tn.woundPenalty, 0);
        });

        it("should record no TN for a roll with no TN", async () => {
          const message = await rollTrait({
            actor,
            traitName: "ref",
            traitRank: 3,
            askForOptions: false
          });
          messages.push(message);
          assert.isNull(message.system.tn.effective);
          assert.equal(message.system.pool.bonus, 0);
        });

        // A Raise on a roll with no TN counts only in a Contested Roll (roadmap/STAGE-18 decision 12)
        // game-rules/29_types_of_rolls.md, p.80
        it("should show a roll with no TN its Raises and no TN line", async () => {
          const answered = answerDialog({ raises: 1 });
          const message = await rollTrait({ actor, traitName: "ref", traitRank: 3 });
          await answered;
          messages.push(message);
          assert.isNull(message.system.tn.effective, "no TN made from the Raise");
          assert.equal(message.system.tn.raises, 1, "the Raise is kept for a Contested Roll");
          const card = await message.renderHTML();
          const againstTn = game.i18n
            .localize("l5r4.ui.check.outcomeAgainstTn", { outcome: "", tn: "" })
            .trim();
          assert.notInclude(card.textContent, againstTn, "no TN line");
          assert.include(
            card.textContent,
            game.i18n.localize("l5r4.ui.check.raisesNote", { count: 1 }),
            "the Raises noted"
          );
        });

        it("should give a damage roll no TN and no penalty", async () => {
          const message = await rollWeaponDamage({
            actor,
            roll: 4,
            keep: 2,
            weaponName: "Katana",
            askForOptions: false
          });
          messages.push(message);
          assert.isNull(message.system.tn.effective);
          assert.equal(message.system.tn.woundPenalty, 0);
        });

        it("should add no penalty to the TN of a Healthy actor", async () => {
          await actor.update({ "system.suffered": 0 });
          penalty = 0;
          await rollWithTN(() => rollTrait({ actor, traitName: "str", traitRank: 4 }));
        });

        // Healthy and Out carry no penalty whatever the modifier (roadmap/STAGE-18 decision 14, #102)
        it("should add the penalty modifier only to the ranks between Healthy and Out", async () => {
          await actor.update({ "system.woundsPenaltyMod": 5 });
          const penaltyAt = async suffered => {
            await actor.update({ "system.suffered": suffered });
            return actor.system.woundPenalty;
          };
          const levels = actor.system.woundLevels;
          try {
            assert.equal(await penaltyAt(0), 0, "Healthy");
            assert.equal(await penaltyAt(levels.healthy.value + 1), 3 + 5, "Nicked");
            assert.equal(await penaltyAt(levels.out.value), 0, "Out");
          } finally {
            await actor.update({ "system.woundsPenaltyMod": 0, "system.suffered": 0 });
          }
        });
      });
    },
    { displayName: "L5R4: Wound penalty on every roll" }
  );
}
