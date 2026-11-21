import { CHANGE_ORIGIN_OPTION, SYS_ID } from "../../module/config/constants.js";
import {
  isJb2aAvailable,
  isSequencerAvailable
} from "../../module/services/animations/asset-library.js";
import { onCreateActiveEffectAnimation } from "../../module/services/animations/hooks.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { ANOTHER_CLIENT_ID, cleanTest, waitFor } from "./helpers.js";

/**
 * Registers the `animations` batch (roadmap/STAGE-12): with Sequencer and a JB2A collection active, a status with an
 * animation plays it once on the actor's token, from the client that set the status, and ending the status ends it. The
 * batch skips itself when either module is inactive.
 * @param {object} quench  The Quench API object.
 */
export function registerAnimationsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.animations`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      let actor = null;
      let token = null;
      let matchMedia;

      /** The Sequencer effects this system named for a status on the test token. */
      const playing = statusId =>
        Sequencer.EffectManager.getEffects({ name: `${SYS_ID}.${statusId}.${token.id}` });

      /**
       * Have the browser report the user's motion setting, whatever the machine running the batch asks for.
       * @param {boolean} reduced
       */
      const reportMotion = reduced => {
        window.matchMedia = query => ({
          matches: query.includes("prefers-reduced-motion: reduce") ? reduced : false
        });
      };

      before(function () {
        if (!isSequencerAvailable() || !isJb2aAvailable() || !canvas.scene) {
          this.skip();
        }
        matchMedia = window.matchMedia;
        reportMotion(false);
      });

      after(() => {
        if (matchMedia) {
          window.matchMedia = matchMedia;
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

        // #79
        it("should play no stance for a user who asked for less motion", async () => {
          await placeActor("Sequencer: reduced motion");
          reportMotion(true);
          try {
            await actor.toggleStatusEffect("fullAttackStance", { active: true });
            await new Promise(resolve => setTimeout(resolve, 1000));
          } finally {
            reportMotion(false);
          }
          assert.lengthOf(playing("fullAttackStance"), 0, "the status icon shows the stance");
          assert.isTrue(actor.statuses.has("fullAttackStance"));
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

        it("should play nothing on this client for another client's change", async () => {
          await placeActor("Sequencer: elsewhere");
          const [effect] = await actor.createEmbeddedDocuments(
            "ActiveEffect",
            [{ name: "Quench Daze", statuses: ["dazed"] }],
            { animate: false }
          );
          assert.isTrue(
            await waitFor(() => playing("dazed").length === 1),
            "played for this client"
          );
          // The same user's other client receives the change
          onCreateActiveEffectAnimation(
            effect,
            { [CHANGE_ORIGIN_OPTION]: ANOTHER_CLIENT_ID },
            game.user.id
          );
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.lengthOf(playing("dazed"), 1, "the client that made the change plays it");
        });
      });
    },
    { displayName: "L5R4: Sequencer and JB2A animations" }
  );
}
