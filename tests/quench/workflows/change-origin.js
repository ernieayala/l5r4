/**
 * The work that follows a change runs on the client that sent it, not on every client its user is signed in on
 * (module/services/change-origin.js, module/utils/change-origin.js): grants, taking grants back, an exclusive group's
 * clean-up, the Full Defense roll, and marking the XP history stale. `withAnotherClient` (tests/quench/helpers.js) makes this client receive a change
 * as the user's other client would.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { grantQueueOf } from "../../../module/documents/item/lifecycle/grants.js";
import { APPLY_EFFECT_QUERY } from "../../../module/services/effects/apply.js";
import { isAnsweringGmClient, onGmClientMessage } from "../../../module/services/gm-client.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";
import { cleanTest, guardRolls, waitFor, withAnotherClient } from "../helpers.js";

/**
 * Registers the `workflows.change-origin` batch.
 * @param {object} quench - The Quench API object
 */
export function registerChangeOriginTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.change-origin`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const track = actor => (actors.push(actor), actor);
      // Taking the Full Defense Stance opens its roll dialog
      // game-rules/36_stances.md, p.84
      guardRolls({ before, after });

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await grantQueueOf(actor);
          await actor.delete();
        }
      });

      /** Long enough for work a hook starts without awaiting it to land. */
      const settle = () => new Promise(resolve => setTimeout(resolve, 1000));

      /** The Hida Bushi School's source data from the schools pack. */
      const hidaSource = async () => {
        const pack = game.packs.get(`${SYS_ID}.schools`);
        const id = pack.index.find(entry => entry.name === "Hida Bushi School")._id;
        return (await pack.getDocument(id)).toObject();
      };

      /** The items a School granted the actor. */
      const grantedOf = actor => actor.items.filter(item => item.getFlag(SYS_ID, "grantedBy"));

      /** Add the Hida Bushi School, once its grants have run. */
      const addSchool = async actor => {
        const [school] = await actor.createEmbeddedDocuments("Item", [await hidaSource()]);
        await grantQueueOf(actor);
        return school;
      };

      // #80
      // game-rules/48_character_creation_expanded.md, p.102
      describe("Grants", () => {
        it(
          "should grant a School's items only on the client that added it",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Changes from another client: added" }));
            await withAnotherClient(async () => {
              await actor.createEmbeddedDocuments("Item", [await hidaSource()]);
            });
            await settle();
            await grantQueueOf(actor);
            assert.lengthOf(grantedOf(actor), 0, "the client that added the School grants");
          })
        );

        it(
          "should grant on a School or actor change only on the client that made it",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(
              await createTestPC({ name: "Changes from another client: changed" })
            );
            const school = await withAnotherClient(async () => {
              const [created] = await actor.createEmbeddedDocuments("Item", [await hidaSource()]);
              await created.update({ name: "Hida Bushi School, renamed" });
              await actor.update({ "system.traits.ref": 3 });
              return created;
            });
            await settle();
            await grantQueueOf(actor);
            assert.lengthOf(grantedOf(actor), 0, "another client's changes grant nothing here");
            await school.update({ name: "Hida Bushi School" });
            await grantQueueOf(actor);
            assert.isAbove(grantedOf(actor).length, 0, "this client's own change grants");
          })
        );

        it(
          "should take back a School's grants only on the client that deleted it",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(
              await createTestPC({ name: "Changes from another client: deleted" })
            );
            const school = await addSchool(actor);
            const granted = grantedOf(actor).length;
            assert.isAbove(granted, 0);
            await withAnotherClient(() => school.delete());
            await settle();
            await grantQueueOf(actor);
            assert.lengthOf(
              grantedOf(actor),
              granted,
              "the client that deleted it takes them back"
            );
          })
        );
      });

      // #80
      describe("XP history", () => {
        it(
          "should mark the XP history stale only on the client that added a Skill",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Changes from another client: XP" }));
            await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 5);
            await withAnotherClient(() =>
              actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 1)])
            );
            await settle();
            assert.equal(
              actor.getFlag(SYS_ID, "xpRetroactiveVersion"),
              5,
              "the client that added the Skill marks it"
            );
          })
        );

        // #125: a player who does not own the caster cannot write the flag
        // game-rules/66_magic_and_spell_casting.md, p.164
        it(
          "should mark the XP history stale only on the client that memorized a spell",
          clean(async () => {
            const actor = track(
              await createTestPC({ name: "Changes from another client: memorized" })
            );
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench spell", type: "spell", system: { ring: "fire", mastery: 1 } }
            ]);
            await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 5);
            await withAnotherClient(() => spell.update({ "system.memorized": true }));
            await settle();
            assert.equal(
              actor.getFlag(SYS_ID, "xpRetroactiveVersion"),
              5,
              "the client that memorized it marks it"
            );
            await spell.update({ "system.memorized": false });
            assert.isTrue(
              await waitFor(() => actor.getFlag(SYS_ID, "xpRetroactiveVersion") === 0),
              "this client's own change marks it"
            );
          })
        );
      });

      // #82: core sends a GM query to every client of the GM user, so only one of them answers
      describe("GM clients", () => {
        const earlier = { id: "quench-earlier-gm-client", startedAt: 0, userId: game.user.id };

        it(
          "should leave a GM query to the GM client that started first, and answer once it leaves",
          clean(async function () {
            this.timeout(10_000);
            const actor = track(await createTestPC({ name: "Changes from another client: query" }));
            const query = () =>
              CONFIG.queries[APPLY_EFFECT_QUERY](
                { actorUuid: actor.uuid, id: "dazed" },
                { user: game.user }
              );
            const settled = promise =>
              Promise.race([
                promise.then(() => true),
                new Promise(resolve => setTimeout(() => resolve(false), 500))
              ]);
            onGmClientMessage({ ...earlier, type: "hello" });
            try {
              assert.isFalse(isAnsweringGmClient(), "another GM client started first");
              assert.isFalse(await settled(query()), "this client does not answer");
              assert.isFalse(actor.statuses.has("dazed"), "nor does the work");
            } finally {
              onGmClientMessage({ ...earlier, type: "bye" });
            }
            assert.isTrue(isAnsweringGmClient(), "the other one left");
            assert.isTrue(await settled(query()), "this client answers");
            assert.isTrue(actor.statuses.has("dazed"));
          })
        );
      });

      // game-rules/36_stances.md, p.84
      describe("Stances", () => {
        it(
          "should leave stances started together to the client that took them",
          clean(async () => {
            const actor = track(
              await createTestPC({ name: "Changes from another client: stances" })
            );
            await withAnotherClient(() =>
              Promise.all(
                ["attackStance", "fullAttackStance"].map(statusId =>
                  actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: statusId, statuses: [statusId] }
                  ])
                )
              )
            );
            await settle();
            const stances = actor.effects.filter(effect => effect.system.group === "stance");
            assert.lengthOf(stances, 2, "the client that took them keeps the newest");
          })
        );

        it(
          "should ask for the Full Defense roll only on the client that took the stance",
          clean(async () => {
            const actor = track(
              await createTestPC({ name: "Changes from another client: Full Defense" })
            );
            await withAnotherClient(() =>
              actor.createEmbeddedDocuments("ActiveEffect", [
                { name: "Full Defense Stance", statuses: ["fullDefenseStance"] }
              ])
            );
            await settle();
            const rolls = game.messages.filter(
              message => message.speaker.actor === actor.id && message.system?.kind === "skill"
            );
            assert.lengthOf(rolls, 0, "the client that took the stance rolls");
          })
        );
      });
    },
    { displayName: "L5R4: Changes from another client" }
  );
}
