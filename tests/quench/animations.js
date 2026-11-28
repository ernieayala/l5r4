import { SYS_ID } from "../../module/config/constants.js";
import {
  getConditionAnimation,
  isJb2aAvailable,
  isSequencerAvailable
} from "../../module/services/animations/asset-library.js";
import {
  onActiveEffectAnimation,
  onCanvasReadyAnimation,
  onCreateChatMessageAnimation
} from "../../module/services/animations/hooks.js";
import { refreshTokenAnimations } from "../../module/services/animations/status-animations.js";
import { startAttackAnimation } from "../../module/services/animations/attack-animations.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createWeaponData } from "../fixtures/item-fixtures.js";
import { cleanTest, waitFor } from "./helpers.js";

/**
 * Registers the `animations` batch (roadmap/STAGE-12, #198): with Sequencer and a JB2A collection active, each client
 * keeps its tokens' stance and condition auras in line with their statuses, played locally and never stored on the
 * token, and plays a hit's attack animation only when its user can read the roll and sees both tokens. The batch skips
 * itself when either module is inactive.
 * @param {object} quench  The Quench API object.
 */
export function registerAnimationsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.animations`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      let matchMedia;

      /** The Sequencer effects this system named for a status on a token. */
      const aurasOf = (token, statusId) =>
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

      /**
       * A PC with a token on the viewed scene, `squares` grid spaces right of the scene's corner.
       * @returns {Promise<{actor: Actor, token: Token}>} The actor and its drawn token
       */
      async function placeActor(name, { squares = 0, items = [] } = {}) {
        const actor = await createTestPC({ name, items });
        actors.push(actor);
        const data = await actor.getTokenDocument({ x: squares * canvas.grid.size, y: 0 });
        const [document] = await canvas.scene.createEmbeddedDocuments("Token", [data.toObject()]);
        // A new token is drawn at the canvas origin and moves to its place on the next refresh; Sequencer measures an
        // arrow's range from where the tokens are drawn
        await waitFor(
          () =>
            document.object?.position.x === document.x && document.object.position.y === document.y
        );
        return { actor, token: document.object };
      }

      /** Play an aura on a token the way a caller other than the refresh would. */
      const playAura = (token, statusId, { stored }) => {
        const effect = new Sequence()
          .effect()
          .file(getConditionAnimation(statusId).file)
          .attachTo(token)
          .persist()
          .name(`${SYS_ID}.${statusId}.${token.id}`);
        return stored ? effect.play() : effect.temporary().play({ local: true });
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
        for (const actor of actors.splice(0)) {
          await canvas.scene.deleteEmbeddedDocuments(
            "Token",
            canvas.scene.tokens.filter(token => token.actorId === actor.id).map(token => token.id)
          );
          await actor.delete();
        }
        reportMotion(false);
      });

      describe("Status auras", () => {
        it("should play a stance once on this client, unstored, and end it with the stance", async () => {
          const { actor, token } = await placeActor("Sequencer: stance");
          await actor.toggleStatusEffect("fullAttackStance", { active: true });
          assert.isTrue(await waitFor(() => aurasOf(token, "fullAttackStance").length === 1));
          const [aura] = aurasOf(token, "fullAttackStance");
          assert.isTrue(aura.data.local, "played on this client only");
          assert.isTrue(aura.data.temporary, "not stored on the token");
          await actor.toggleStatusEffect("fullAttackStance", { active: false });
          assert.isTrue(await waitFor(() => aurasOf(token, "fullAttackStance").length === 0));
        });

        // #79, #198: the viewer's own setting decides
        it("should play no stance for a user who asked for less motion, and end one shown", async () => {
          const { actor, token } = await placeActor("Sequencer: reduced motion");
          await actor.toggleStatusEffect("fullAttackStance", { active: true });
          assert.isTrue(await waitFor(() => aurasOf(token, "fullAttackStance").length === 1));
          reportMotion(true);
          await refreshTokenAnimations(token);
          assert.lengthOf(
            aurasOf(token, "fullAttackStance"),
            0,
            "the status icon shows the stance"
          );
          await actor.toggleStatusEffect("defenseStance", { active: true });
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.lengthOf(aurasOf(token, "defenseStance"), 0);
          assert.isTrue(actor.statuses.has("defenseStance"));
        });

        it("should play the Concentration animation", async () => {
          const { actor, token } = await placeActor("Sequencer: concentration");
          await actor.toggleStatusEffect("concentration", { active: true });
          assert.isTrue(await waitFor(() => aurasOf(token, "concentration").length === 1));
        });

        it(
          "should end cleanly when a status is removed while its animation still loads",
          clean(async function () {
            this.timeout(10_000);
            const { actor, token } = await placeActor("Sequencer: brief");
            await actor.toggleStatusEffect("feared", { active: true });
            await actor.toggleStatusEffect("feared", { active: false });
            // Let a load that was under way finish, so an error from it lands in this test
            await new Promise(resolve => setTimeout(resolve, 3000));
            assert.lengthOf(aurasOf(token, "feared"), 0);
          })
        );

        it(
          "should leave no error when a token is deleted while its animation still loads",
          clean(async function () {
            this.timeout(10_000);
            const { actor, token } = await placeActor("Sequencer: vanishing");
            await actor.toggleStatusEffect("entangled", { active: true });
            await token.document.delete();
            await new Promise(resolve => setTimeout(resolve, 3000));
          })
        );

        it("should refresh on this client for a change any client made", async () => {
          const { actor, token } = await placeActor("Sequencer: elsewhere");
          const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
            { name: "Quench Daze", statuses: ["dazed"] }
          ]);
          assert.isTrue(await waitFor(() => aurasOf(token, "dazed").length === 1));
          // This client missed the aura; another client's change to the actor reaches it as a hook
          await Sequencer.EffectManager.endEffects({ effects: aurasOf(token, "dazed") }, false);
          onActiveEffectAnimation(effect);
          assert.isTrue(await waitFor(() => aurasOf(token, "dazed").length === 1), "played here");
        });

        it("should rebuild a scene's auras from its statuses when the canvas loads", async () => {
          const { actor, token } = await placeActor("Sequencer: scene change");
          const { token: other } = await placeActor("Sequencer: stale", { squares: 2 });
          await actor.toggleStatusEffect("stunned", { active: true });
          assert.isTrue(await waitFor(() => aurasOf(token, "stunned").length === 1));
          // As a client that was on another scene sees it: one status with no aura, one aura with no status
          await Sequencer.EffectManager.endEffects({ effects: aurasOf(token, "stunned") }, false);
          await playAura(other, "dazed", { stored: false });
          assert.isTrue(await waitFor(() => aurasOf(other, "dazed").length === 1));
          await onCanvasReadyAnimation();
          assert.isTrue(await waitFor(() => aurasOf(token, "stunned").length === 1), "rebuilt");
          assert.isTrue(
            await waitFor(() => aurasOf(other, "dazed").length === 0),
            "stale one ended"
          );
        });

        it("should play a new token's auras when it is placed", async () => {
          const actor = await createTestPC({ name: "Sequencer: placed" });
          actors.push(actor);
          await actor.toggleStatusEffect("grappled", { active: true });
          const data = await actor.getTokenDocument({ x: 0, y: 0 });
          const [document] = await canvas.scene.createEmbeddedDocuments("Token", [data.toObject()]);
          assert.isTrue(
            await waitFor(
              () => document.object && aurasOf(document.object, "grappled").length === 1
            )
          );
        });

        it(
          "should end the auras an earlier version stored on a token, as the GM loads the canvas",
          clean(async function () {
            this.timeout(10_000);
            const { token } = await placeActor("Sequencer: stored");
            await playAura(token, "dazed", { stored: true });
            assert.isTrue(await waitFor(() => aurasOf(token, "dazed").length === 1));
            assert.isFalse(aurasOf(token, "dazed")[0].data.temporary, "stored on the token");
            await onCanvasReadyAnimation();
            assert.isTrue(await waitFor(() => aurasOf(token, "dazed").length === 0));
          })
        );
      });

      describe("Attack animations", () => {
        const played = [];
        let hookId;

        before(() => {
          hookId = Hooks.on("preCreateSequencerEffect", data => {
            played.push(data);
          });
        });

        after(() => Hooks.off("preCreateSequencerEffect", hookId));

        afterEach(() => {
          played.length = 0;
        });

        /** An attacker with one weapon, and a target three grid spaces away. */
        async function placeDuel(weaponData) {
          const { actor: attacker, token: attackerToken } = await placeActor("Sequencer: archer", {
            items: [weaponData]
          });
          const { actor: target, token: targetToken } = await placeActor("Sequencer: mark", {
            squares: 3
          });
          return {
            attacker,
            attackerToken,
            target,
            targetToken,
            weapon: attacker.items.contents[0]
          };
        }

        /** The file of the one effect played since the test began. */
        const playedFile = async () => {
          await waitFor(() => played.length > 0, 3000);
          assert.lengthOf(played, 1, "one effect");
          return played[0].file;
        };

        it("should stretch the arrow that covers the distance, played on this client only", async () => {
          const duel = await placeDuel(createWeaponData("Yumi", 2, 2, { system: { isBow: true } }));
          // Left running: the play resolves only as the arrow lands, and the test reads the arrow in flight
          startAttackAnimation(duel.attacker, duel.target, duel.weapon);
          let arrow;
          // atLocation stores the attacker as a cached location that holds its uuid
          await waitFor(() => {
            arrow = Sequencer.EffectManager.getEffects({ sceneId: canvas.scene.id }).find(
              effect => effect.data.source?.uuid === duel.attackerToken.document.uuid
            );
            return arrow?._currentFilePath;
          });
          assert.equal(played[0].file, "jb2a.arrow.physical.white.01");
          assert.include(arrow._currentFilePath, "_15ft_", "three squares away");
          assert.isTrue(played[0].local, "not sent to other clients");
        });

        it("should slash with a weapon whose name holds 'bow' but is no bow", async () => {
          const duel = await placeDuel(createWeaponData("Elbow Spike", 1, 1));
          await startAttackAnimation(duel.attacker, duel.target, duel.weapon);
          assert.match(await playedFile(), /^jb2a\.melee_attack\.04\.katana/);
        });

        it("should play nothing when this client cannot see the attacker", async () => {
          const duel = await placeDuel(createWeaponData("Yumi", 2, 2, { system: { isBow: true } }));
          // As a player sees a hidden token; a GM sees every token
          Object.defineProperty(duel.attackerToken, "isVisible", {
            configurable: true,
            get: () => false
          });
          await startAttackAnimation(duel.attacker, duel.target, duel.weapon);
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.lengthOf(played, 0);
        });

        it("should play nothing for a user who asked for less motion", async () => {
          const duel = await placeDuel(createWeaponData("Katana", 3, 2));
          reportMotion(true);
          await startAttackAnimation(duel.attacker, duel.target, duel.weapon);
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.lengthOf(played, 0);
        });

        it("should animate a hit only for a user who can read the roll", async () => {
          const duel = await placeDuel(createWeaponData("Katana", 3, 2));
          const hit = isContentVisible => ({
            type: "roll",
            isContentVisible,
            system: {
              kind: "attack",
              outcome: { success: true },
              actorUuid: duel.attacker.uuid,
              weaponUuid: duel.weapon.uuid,
              target: { uuid: duel.target.uuid }
            }
          });
          onCreateChatMessageAnimation(hit(false));
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.lengthOf(played, 0, "a blind or whispered roll this user cannot read");
          onCreateChatMessageAnimation(hit(true));
          assert.match(await playedFile(), /^jb2a\.melee_attack\.04\.katana/);
        });
      });
    },
    { displayName: "L5R4: Sequencer and JB2A animations" }
  );
}
