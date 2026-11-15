import { SYS_ID } from "../../module/config/constants.js";
import { StanceHandler } from "../../module/sheets/handlers/stance-handler.js";
import { SkillRoll } from "../../module/services/dice/rolls/skill-roll.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData } from "../fixtures/item-fixtures.js";
import { autoAnswerRolls, cleanTest, settleChatNotifications, waitFor } from "./helpers.js";

/**
 * Registers the `regressions` batch (roadmap/STAGE-13): one test per closed rule bug from 3.x whose code path runs
 * in Foundry, named for its issue. The pure-math ones are Vitest cases (#5, #7, #10, #14, #32).
 * @param {object} quench  The Quench API object.
 */
export function registerRegressionsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.regressions`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const posted = [];
      let hook;
      let stopAnswering;

      before(() => {
        hook = Hooks.on("createChatMessage", message => posted.push(message));
        // Taking the Full Defense Stance opens its roll dialog
        // game-rules/36_stances.md, p.84
        stopAnswering = autoAnswerRolls();
      });

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      after(async function () {
        this.timeout(30_000);
        stopAnswering();
        Hooks.off("createChatMessage", hook);
        await settleChatNotifications();
        for (const message of posted) {
          if (game.messages.has(message.id)) {
            await message.delete();
          }
        }
      });

      /** Reflexes 3 and Awareness 3 (Air 3, Armor TN 20), Agility 3, Defense 2, Kenjutsu 2. */
      const samurai = async () => {
        const actor = await createTestPC({
          name: "Closed rule bugs: samurai",
          system: { traits: { ref: 3, awa: 3, agi: 3 } }
        });
        actors.push(actor);
        await actor.createEmbeddedDocuments("Item", [
          createSkillData("Defense", 2, "ref"),
          createSkillData("Kenjutsu", 2, "agi")
        ]);
        return actor;
      };

      /** Pick a stance on the sheet's stance select, as the sheet's handler receives it. */
      const pick = (actor, stanceId) =>
        StanceHandler.changeStance({ actor }, null, { value: stanceId });

      /** A Kenjutsu / Agility attack with no dialog. */
      const kenjutsuAttack = async actor => {
        const message = await SkillRoll({
          actor,
          actorTrait: actor.system.traits.agi,
          skillRank: 2,
          skillName: "Kenjutsu",
          skillTrait: "agi",
          askForOptions: false,
          rollType: "attack"
        });
        return message;
      };

      // game-rules/36_stances.md, p.84
      describe("Stances", () => {
        // #9, #12
        it(
          "should move the Armor TN with each stance picked, and back again",
          clean(async () => {
            const actor = await samurai();
            const tn = () => actor.system.armorTn.current;
            assert.equal(tn(), 20, "Reflexes 3 × 5 + 5");
            await pick(actor, "fullAttackStance");
            assert.equal(tn(), 10, "Full Attack: -10");
            await pick(actor, "defenseStance");
            assert.equal(tn(), 25, "Defense: Air 3 + Defense 2");
            await pick(actor, "attackStance");
            assert.equal(tn(), 20, "Attack: no change");
            await pick(actor, "");
            assert.equal(tn(), 20, "no stance");
          })
        );

        // #11
        it(
          "should leave one stance and log no error when each stance is picked in turn",
          clean(async function () {
            this.timeout(10_000);
            const actor = await samurai();
            for (const stance of [
              "attackStance",
              "fullAttackStance",
              "defenseStance",
              "fullDefenseStance",
              "centerStance"
            ]) {
              await pick(actor, stance);
              const stances = actor.effects.filter(e => e.system.group === "stance");
              assert.deepEqual(
                stances.map(e => [...e.statuses]),
                [[stance]],
                stance
              );
            }
          })
        );

        // #8
        it(
          "should roll Defense / Reflexes once when Full Defense is taken",
          clean(async () => {
            const actor = await samurai();
            const rolls = () =>
              posted.filter(m => m.speaker.actor === actor.id && m.system.kind === "skill");
            await pick(actor, "fullDefenseStance");
            assert.isTrue(
              await waitFor(() =>
                actor.effects.some(e => e.getFlag(SYS_ID, "effectId") === "fullDefense")
              ),
              "the bonus effect"
            );
            // A second roll would land within this wait
            await new Promise(resolve => setTimeout(resolve, 500));
            assert.lengthOf(rolls(), 1);
          })
        );

        // #13
        it(
          "should add Full Attack's +2k1 to a Skill attack",
          clean(async () => {
            const actor = await samurai();
            await pick(actor, "fullAttackStance");
            const message = await kenjutsuAttack(actor);
            assert.deepInclude(message.system.pool, { roll: 3 + 2 + 2, keep: 3 + 1 });
          })
        );
      });

      // #15
      it(
        "should add a Skill's roll, keep, and total bonus fields to its roll",
        clean(async () => {
          const actor = await samurai();
          const kenjutsu = actor.items.getName("Kenjutsu");
          await kenjutsu.update({
            "system.rollBonus": 1,
            "system.keepBonus": 1,
            "system.totalBonus": 3
          });
          const message = await kenjutsuAttack(actor);
          assert.deepInclude(message.system.pool, { roll: 3 + 2 + 1, keep: 3 + 1, bonus: 3 });
        })
      );
    },
    { displayName: "L5R4: Closed rule bugs" }
  );
}
