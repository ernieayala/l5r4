import { SYS_ID } from "../../module/config/constants.js";
import {
  isJb2aAvailable,
  isSequencerAvailable
} from "../../module/services/animations/asset-library.js";
import { onCreateActiveEffectAnimation } from "../../module/services/animations/hooks.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { cleanTest, waitFor } from "./helpers.js";

/**
 * Registers the `animations` batch (roadmap/STAGE-12): with Sequencer and a JB2A collection active, a status with an
 * animation plays it once on the actor's token, for the user who set the status, and ending the status ends it. The
 * batch skips itself when either module is inactive.
 * @param {object} quench  The Quench API object.
 */
export function registerAnimationsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.animations`,
    context => {
      const { describe, it, before, afterEach, assert } = context;
      const clean = cleanTest(assert);
      let actor = null;
      let token = null;

      /** The Sequencer effects this system named for a status on the test token. */
      const playing = statusId =>
        Sequencer.EffectManager.getEffects({ name: `${SYS_ID}.${statusId}.${token.id}` });

      before(function () {
        if (!isSequencerAvailable() || !isJb2aAvailable() || !canvas.scene) {
          this.skip();
        }
      });

      afterEach(async () => {
        await token?.delete();
        await actor?.delete();
        actor = token = null;
      });

      /** A PC with a token on the viewed scene. */
      async function placeActor(name) {
        actor = await createTestPC({ name });
        const data = await actor.getTokenDocument({ x: 0, y: 0 });
        [token] = await canvas.scene.createEmbeddedDocuments("Token", [data.toObject()]);
      }

      describe("Status animations", () => {
        it("should play a stance once on the token and end it with the stance", async () => {
          await placeActor("Sequencer: stance");
          await actor.toggleStatusEffect("fullAttackStance", { active: true });
          assert.isTrue(await waitFor(() => playing("fullAttackStance").length === 1));
          await actor.toggleStatusEffect("fullAttackStance", { active: false });
          assert.isTrue(await waitFor(() => playing("fullAttackStance").length === 0));
        });

        it("should play the Concentration animation", async () => {
          await placeActor("Sequencer: concentration");
          await actor.toggleStatusEffect("concentration", { active: true });
          assert.isTrue(await waitFor(() => playing("concentration").length === 1));
        });

        it(
          "should end cleanly when a status is removed while its animation still loads",
          clean(async function () {
            this.timeout(10_000);
            await placeActor("Sequencer: brief");
            await actor.toggleStatusEffect("feared", { active: true });
            await actor.toggleStatusEffect("feared", { active: false });
            // Let a load that was under way finish, so an error from it lands in this test
            await new Promise(resolve => setTimeout(resolve, 3000));
            assert.lengthOf(playing("feared"), 0);
          })
        );

        it(
          "should leave no error when a token is deleted while its animation still loads",
          clean(async function () {
            this.timeout(10_000);
            await placeActor("Sequencer: vanishing");
            await actor.toggleStatusEffect("entangled", { active: true });
            await token.delete();
            token = null;
            await new Promise(resolve => setTimeout(resolve, 3000));
          })
        );

        it("should play nothing on this client for another user's change", async () => {
          await placeActor("Sequencer: elsewhere");
          const [effect] = await actor.createEmbeddedDocuments(
            "ActiveEffect",
            [{ name: "Quench Daze", statuses: ["dazed"] }],
            { animate: false }
          );
          assert.isTrue(await waitFor(() => playing("dazed").length === 1), "played for this user");
          const other = game.users.find(user => user.id !== game.user.id);
          onCreateActiveEffectAnimation(effect, {}, other.id);
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.lengthOf(playing("dazed"), 1, "the other user's client plays it, not this one");
        });
      });
    },
    { displayName: "L5R4: Sequencer and JB2A animations" }
  );
}
