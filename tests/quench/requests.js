import { SYS_ID } from "../../module/config/constants.js";
import { CHAT_TEMPLATES } from "../../module/config/templates.js";
import { APPLY_EFFECT_QUERY, applyEffect } from "../../module/services/effects/apply.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { startDuel } from "../../module/services/combat/duel.js";
import { contestRollsOf } from "../../module/services/combat/contest-rolls.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { cleanTest, settleChatNotifications } from "./helpers.js";

/** Every d10 shows 9, so every roll is known. */
const NINES = () => 0.15;

/**
 * Registers the `requests` batch (#162): a GM query for a player changes an actor that player does not own only with
 * a proof the GM's client checks, and takes the effect's level and timing from the proof. The handlers run here as
 * the world's player user would call them.
 * @param {object} quench  The Quench API object.
 */
export function registerRequestsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.requests`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const created = [];
      const track = doc => (created.push(doc), doc);
      let player;
      let uniform;

      before(async function () {
        player = game.users.find(user => !user.isGM);
        if (!player) {
          this.skip();
        }
        await settleChatNotifications();
        uniform = CONFIG.Dice.randomUniform;
        CONFIG.Dice.randomUniform = NINES;
      });

      afterEach(async () => {
        for (const doc of created.splice(0).reverse()) {
          await doc.delete();
        }
      });

      after(() => {
        if (uniform) {
          CONFIG.Dice.randomUniform = uniform;
        }
      });

      /** A character the player owns, with `rules` on an item. */
      const playersCharacter = async (rules = []) => {
        const actor = track(
          await createTestPC({
            name: "Requests: player's character",
            ownership: { [player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
          })
        );
        if (rules.length) {
          await actor.createEmbeddedDocuments("Item", [
            { name: "Requests rules", type: "commonItem", system: { rules } }
          ]);
        }
        return actor;
      };

      /** The effect query as the player would send it. */
      const askEffect = (actor, id, options = {}) =>
        CONFIG.queries[APPLY_EFFECT_QUERY](
          { actorUuid: actor.uuid, id, options },
          { user: player }
        );

      /** Whether a promise rejects with a refusal key. */
      const refusalOf = promise => promise.then(() => null).catch(err => err.message);

      describe("Effects on another's actor", () => {
        it(
          "should refuse an effect with no proof",
          clean(async () => {
            const npc = track(await createTestNPC({ name: "Requests: NPC" }));
            assert.equal(
              await refusalOf(askEffect(npc, "fatigued")),
              "l5r4.ui.requests.effectNotProven"
            );
            assert.isFalse(npc.statuses.has("fatigued"));
          })
        );

        it(
          "should put a condition a successful roll offers on its target, and refuse one it does not",
          clean(async () => {
            const actor = await playersCharacter([
              { key: "ApplyCondition", selector: "any", condition: "dazed" }
            ]);
            const npc = track(await createTestNPC({ name: "Requests: target" }));
            const hit = track(
              await rollCheck({
                actor,
                kind: "skill",
                label: "Requests roll",
                base: { roll: 3, keep: 2 },
                tn: 5,
                target: npc,
                askForOptions: false
              })
            );
            assert.lengthOf(hit.system.conditions, 1, "Dazed is offered");
            const proof = { kind: "roll", messageId: hit.id, index: 0 };
            assert.equal(
              await refusalOf(askEffect(npc, "stunned", { proof })),
              "l5r4.ui.requests.effectNotProven",
              "a condition the roll does not offer"
            );
            assert.deepEqual(await askEffect(npc, "dazed", { proof, level: 9 }), {
              applied: true
            });
            const dazed = npc.effects.find(e => e.statuses.has("dazed"));
            assert.exists(dazed);
            assert.notEqual(
              dazed.system.level,
              9,
              "the level comes from the roll, not the request"
            );
          })
        );

        it(
          "should guard a ward for a guard the player owns, timed from the guard",
          clean(async () => {
            const protector = await playersCharacter();
            const ward = track(await createTestPC({ name: "Requests: ward" }));
            const stranger = track(await createTestPC({ name: "Requests: stranger" }));
            assert.equal(
              await refusalOf(
                askEffect(ward, "guarded", {
                  proof: { kind: "guard", protectorUuid: stranger.uuid }
                })
              ),
              "l5r4.ui.requests.effectNotProven",
              "a guard the player does not own"
            );
            await askEffect(ward, "guarded", {
              proof: { kind: "guard", protectorUuid: protector.uuid }
            });
            assert.equal(ward.effects.find(e => e.statuses.has("guarded"))?.origin, protector.uuid);
          })
        );
      });

      describe("Damage", () => {
        /** The damage query as the player would send it. */
        const askDamage = request => CONFIG.queries[`${SYS_ID}.damage`](request, { user: player });

        /** A damage roll by the player's character against `target`. */
        const playersDamage = async target =>
          track(
            await rollCheck({
              actor: await playersCharacter(),
              kind: "damage",
              label: "Requests damage",
              base: { roll: 2, keep: 2 },
              target,
              askForOptions: false
            })
          );

        it(
          "should land a player's damage roll on its own target once, and nowhere else",
          clean(async () => {
            const target = track(await createTestNPC({ name: "Requests: damage target" }));
            const bystander = track(await createTestNPC({ name: "Requests: bystander" }));
            const damage = await playersDamage(target);
            assert.equal(
              await refusalOf(
                askDamage({ action: "apply", messageId: damage.id, actorUuid: bystander.uuid })
              ),
              "l5r4.ui.requests.damageNotTarget"
            );
            assert.equal(bystander._source.system.suffered, 0, "the bystander is untouched");
            await askDamage({ action: "apply", messageId: damage.id, actorUuid: target.uuid });
            assert.equal(target._source.system.suffered, 18, "2k2 of nines");
            assert.equal(
              await refusalOf(
                askDamage({ action: "apply", messageId: damage.id, actorUuid: target.uuid })
              ),
              "l5r4.ui.requests.damageApplied"
            );
            assert.equal(target._source.system.suffered, 18, "not twice");
            for (const card of game.messages.contents.filter(
              m => m.getFlag(SYS_ID, "damageResult")?.damageMessageId === damage.id
            )) {
              track(card);
            }
          })
        );

        it(
          "should refuse to undo a result card the GM's client did not make",
          clean(async () => {
            const target = track(await createTestNPC({ name: "Requests: forged result" }));
            // A damage roll by the player's own character, so the card names a roll the player may undo
            const roll = track(
              await rollCheck({
                actor: await playersCharacter(),
                kind: "damage",
                label: "Requests damage",
                base: { roll: 2, keep: 2 },
                askForOptions: false
              })
            );
            const forged = track(
              await ChatMessage.create({
                author: player.id,
                content: "Quench",
                flags: {
                  [SYS_ID]: {
                    damageResult: { actorUuid: target.uuid, wounds: -50, damageMessageId: roll.id }
                  }
                }
              })
            );
            assert.equal(
              await refusalOf(askDamage({ action: "undo", messageId: forged.id })),
              "l5r4.ui.requests.notDamageResult"
            );
            assert.equal(target._source.system.suffered, 0);
          })
        );
      });

      describe("Duel and grapple cards", () => {
        const askStep = (card, data) =>
          CONFIG.queries[`${SYS_ID}.flow`]({ messageId: card.id, data }, { user: player });

        /** An Assessment roll by `actor`: Iaijutsu / Awareness. */
        const assessment = async actor =>
          track(
            await rollCheck({
              actor,
              kind: "skill",
              label: "Requests assessment",
              base: { roll: 2, keep: 2 },
              skill: "iaijutsu",
              trait: "awa",
              askForOptions: false
            })
          );

        it(
          "should act only on a flow card the GM's client made",
          clean(async () => {
            const forged = track(
              await ChatMessage.create({
                author: player.id,
                content: "Quench",
                flags: { [SYS_ID]: { flow: { name: "duel", state: {} } } }
              })
            );
            assert.equal(
              await refusalOf(askStep(forged, { action: "roll", duelist: 0, rollId: "" })),
              "l5r4.ui.requests.notFlowCard"
            );
          })
        );

        it(
          "should record a duelist's roll only once, and only one made after the card",
          clean(async () => {
            const duelist = await playersCharacter();
            const other = track(await createTestPC({ name: "Requests: other duelist" }));
            const early = await assessment(duelist);
            const card = track(await startDuel(duelist, other));
            assert.equal(
              await refusalOf(askStep(card, { action: "roll", duelist: 0, rollId: early.id })),
              "l5r4.ui.requests.notFreshRoll",
              "a roll older than the card"
            );
            const roll = await assessment(duelist);
            await askStep(card, { action: "roll", duelist: 0, rollId: roll.id });
            assert.isNotNull(card.getFlag(SYS_ID, "flow").state.rolls.assessment[0], "recorded");
            assert.equal(
              await refusalOf(askStep(card, { action: "roll", duelist: 0, rollId: roll.id })),
              "l5r4.ui.requests.notDuelistRoll",
              "the slot is filled"
            );
          })
        );
      });

      describe("Prompt and contest cards", () => {
        it(
          "should refuse to answer a prompt card the GM's client did not post",
          clean(async () => {
            const actor = await playersCharacter();
            const forged = track(
              await ChatMessage.create({
                author: player.id,
                content: "Quench",
                flags: { [SYS_ID]: { prompt: { kind: "fullDefense", actorUuid: actor.uuid } } }
              })
            );
            const query = CONFIG.queries[`${SYS_ID}.answerPrompt`];
            assert.equal(
              await refusalOf(query({ messageId: forged.id }, { user: player })),
              "l5r4.ui.requests.notYourPrompt"
            );
          })
        );

        it(
          "should count a contest roll only for the side whose actor made it",
          clean(async () => {
            const attacker = await playersCharacter();
            const target = track(await createTestNPC({ name: "Requests: contest target" }));
            const attack = track(
              await rollCheck({
                actor: attacker,
                kind: "attack",
                label: "Requests attack",
                base: { roll: 3, keep: 2 },
                target,
                tn: 5,
                askForOptions: false
              })
            );
            const strength = track(
              await rollCheck({
                actor: attacker,
                kind: "trait",
                label: "Requests Strength",
                base: { roll: 2, keep: 2 },
                trait: "str",
                askForOptions: false
              })
            );
            await strength.setFlag(SYS_ID, "contest", { attackId: attack.id, side: "target" });
            assert.notExists(
              contestRollsOf(attack).target,
              "the attacker's roll does not count for the target"
            );
            const own = track(
              await rollCheck({
                actor: target,
                kind: "trait",
                label: "Requests Strength",
                base: { roll: 2, keep: 2 },
                trait: "str",
                askForOptions: false
              })
            );
            await own.setFlag(SYS_ID, "contest", { attackId: attack.id, side: "target" });
            assert.equal(contestRollsOf(attack).target?.id, own.id, "the target's own roll counts");
          })
        );
      });

      describe("Request cards", () => {
        it(
          "should show a request card's Roll button only when the GM's client posted it",
          clean(async () => {
            const content = await foundry.applications.handlebars.renderTemplate(
              CHAT_TEMPLATES.checkRequest,
              { text: "Quench", tn: 10 }
            );
            const card = author =>
              ChatMessage.create({
                type: "checkRequest",
                author,
                content,
                system: { label: "Quench", skill: "", trait: "awa", ring: "", tn: 10 }
              });
            const button = async message =>
              Boolean(
                (await message.renderHTML()).querySelector("[data-action='check-request-roll']")
              );
            assert.isTrue(await button(track(await card(game.user.id))), "the GM's card");
            assert.isFalse(await button(track(await card(player.id))), "a player's card");
          })
        );
      });

      describe("Concentration and Center Stance", () => {
        it(
          "should let only the caster's owner end a Concentration",
          clean(async () => {
            const caster = track(await createTestPC({ name: "Requests: caster" }));
            const effect = await applyEffect(caster, "concentration", { level: 1 });
            const query = CONFIG.queries[`${SYS_ID}.endConcentration`];
            assert.equal(
              await refusalOf(query({ effectUuid: effect.uuid }, { user: player })),
              "l5r4.ui.requests.notYourCaster"
            );
            assert.isTrue(caster.statuses.has("concentration"), "still concentrating");
          })
        );

        it(
          "should settle Center Stance only for the owner of the combatant ending the Round",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Requests: combatant" }));
            const combat = track(
              await foundry.documents.Combat.implementation.create({ scene: null, active: true })
            );
            await combat.createEmbeddedDocuments("Combatant", [
              { actorId: actor.id, initiative: 10 }
            ]);
            await combat.startCombat();
            const query = CONFIG.queries[`${SYS_ID}.settleCenter`];
            assert.equal(
              await refusalOf(query({ combatId: combat.id }, { user: player })),
              "l5r4.ui.requests.notRoundEnd"
            );
          })
        );
      });
    },
    { displayName: "L5R4: GM requests" }
  );
}
