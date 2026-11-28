import { SYS_ID } from "../../module/config/constants.js";
import { CHAT_TEMPLATES } from "../../module/config/templates.js";
import { APPLY_EFFECT_QUERY, applyEffect } from "../../module/services/effects/apply.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import {
  SPEND_VOID_QUERY,
  spendVoidPoint
} from "../../module/services/dice/resources/void-points.js";
import { startDuel } from "../../module/services/combat/duel.js";
import { startFlow } from "../../module/services/combat/flow.js";
import { contestRollsOf } from "../../module/services/combat/contest-rolls.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { cleanTest, settleChatNotifications, withGmAnswer } from "./helpers.js";

/** Every d10 shows 9, so every roll is known. */
const NINES = () => 0.15;

/**
 * Registers the `requests` batch (#162): a GM query for a player changes an actor that player does not own with a
 * proof the GM's client checks, which sets the effect's level and timing, or once the GM allows it when asked (#223).
 * The handlers run here as the world's player user would call them.
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
        // #223: an effect no proof covers is the GM's call, not a refusal
        it(
          "should ask the GM about an effect with no proof, naming the player",
          clean(async () => {
            const npc = track(await createTestNPC({ name: "Requests: NPC" }));
            let refusal;
            const { asked } = await withGmAnswer(false, async () => {
              refusal = await refusalOf(askEffect(npc, "fatigued"));
            });
            assert.equal(refusal, "l5r4.ui.requests.declined");
            assert.lengthOf(asked, 1, "the GM was asked");
            assert.include(asked[0], player.name);
            assert.isFalse(npc.statuses.has("fatigued"), "declined");
            await withGmAnswer(true, () => askEffect(npc, "fatigued"));
            assert.isTrue(npc.statuses.has("fatigued"), "allowed");
          })
        );

        it(
          "should put a condition a successful roll offers on its target, and ask the GM about one it does not",
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
            let refusal;
            const { asked } = await withGmAnswer(false, async () => {
              refusal = await refusalOf(askEffect(npc, "stunned", { proof }));
            });
            assert.equal(
              refusal,
              "l5r4.ui.requests.declined",
              "a condition the roll does not offer"
            );
            assert.lengthOf(asked, 1);
            const { asked: offered } = await withGmAnswer(false, () =>
              askEffect(npc, "dazed", { proof })
            );
            assert.isEmpty(offered, "an offered condition asks nobody");
            await npc.deleteEmbeddedDocuments(
              "ActiveEffect",
              npc.effects.filter(e => e.statuses.has("dazed")).map(e => e.id)
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
            let refusal;
            await withGmAnswer(false, async () => {
              refusal = await refusalOf(
                askEffect(ward, "guarded", {
                  proof: { kind: "guard", protectorUuid: stranger.uuid }
                })
              );
            });
            assert.equal(refusal, "l5r4.ui.requests.declined", "a guard the player does not own");
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
          "should land a player's damage roll on its own target, and ask the GM about anything more",
          clean(async () => {
            const target = track(await createTestNPC({ name: "Requests: damage target" }));
            const bystander = track(await createTestNPC({ name: "Requests: bystander" }));
            const damage = await playersDamage(target);
            const apply = actor =>
              refusalOf(
                askDamage({ action: "apply", messageId: damage.id, actorUuid: actor.uuid })
              );
            const refusals = [];
            const { asked } = await withGmAnswer(false, async () => {
              refusals.push(await apply(bystander));
              refusals.push(await apply(target));
              refusals.push(await apply(target));
            });
            assert.deepEqual(refusals, [
              "l5r4.ui.requests.declined",
              null,
              "l5r4.ui.requests.declined"
            ]);
            assert.lengthOf(asked, 2, "the GM was asked about the bystander and the second hit");
            assert.equal(
              bystander._source.system.suffered,
              0,
              "declined: the bystander is untouched"
            );
            assert.equal(target._source.system.suffered, 18, "2k2 of nines, not twice");
            await withGmAnswer(true, () => apply(bystander));
            assert.equal(bystander._source.system.suffered, 18, "allowed by the GM");
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

      // #170: GM-side writes to one actor run one at a time, each reading the stored values in its turn
      describe("Writes to one actor at the same time", () => {
        const askDamage = request => CONFIG.queries[`${SYS_ID}.damage`](request, { user: player });
        const askVoid = (actor, count = 1) =>
          CONFIG.queries[SPEND_VOID_QUERY]({ actorUuid: actor.uuid, count }, { user: player });

        /** A damage roll by a character of the player's against `target`, 2k2 of nines = 18. */
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

        /** The result card a damage roll's application posted, tracked for deletion. */
        const resultOf = damage =>
          track(
            game.messages.contents.findLast(
              m => m.getFlag(SYS_ID, "damageResult")?.damageMessageId === damage.id
            )
          );

        it(
          "should keep both of two hits applied together",
          clean(async () => {
            const target = track(await createTestNPC({ name: "Requests: two hits" }));
            const first = await playersDamage(target);
            const second = await playersDamage(target);
            await Promise.all(
              [first, second].map(damage =>
                askDamage({ action: "apply", messageId: damage.id, actorUuid: target.uuid })
              )
            );
            assert.equal(target._source.system.suffered, 36, "18 and 18");
            resultOf(first);
            resultOf(second);
          })
        );

        it(
          "should undo one hit while another lands, keeping the other",
          clean(async () => {
            const target = track(await createTestNPC({ name: "Requests: undo and hit" }));
            const first = await playersDamage(target);
            const second = await playersDamage(target);
            await askDamage({ action: "apply", messageId: first.id, actorUuid: target.uuid });
            await Promise.all([
              askDamage({ action: "undo", messageId: resultOf(first).id }),
              askDamage({ action: "apply", messageId: second.id, actorUuid: target.uuid })
            ]);
            assert.equal(target._source.system.suffered, 18, "the second hit only");
            resultOf(second);
          })
        );

        it(
          "should spend two Void Points for a roll's spend and a damage card's spend made together",
          clean(async () => {
            const target = await playersCharacter();
            await target.update({ "system.rings.void.value": 2 });
            const damage = await playersDamage(target);
            await askDamage({ action: "apply", messageId: damage.id, actorUuid: target.uuid });
            const [spend] = await Promise.all([
              askVoid(target),
              askDamage({ action: "void", messageId: resultOf(damage).id })
            ]);
            assert.isTrue(spend.spent);
            assert.equal(target._source.system.rings.void.value, 0, "one point each");
            assert.equal(target._source.system.suffered, 8, "18 - 10");
          })
        );

        it(
          "should spend a damage card's Void Point once for two clicks",
          clean(async () => {
            const target = await playersCharacter();
            await target.update({ "system.rings.void.value": 2 });
            const damage = await playersDamage(target);
            await askDamage({ action: "apply", messageId: damage.id, actorUuid: target.uuid });
            const card = resultOf(damage);
            let updates = 0;
            const hook = Hooks.on("updateActor", actor => {
              if (actor === target) {
                updates++;
              }
            });
            try {
              await Promise.all([
                askDamage({ action: "void", messageId: card.id }),
                askDamage({ action: "void", messageId: card.id })
              ]);
            } finally {
              Hooks.off("updateActor", hook);
            }
            assert.equal(updates, 1, "one spend written");
            assert.equal(target._source.system.rings.void.value, 1);
            assert.equal(target._source.system.suffered, 8);
          })
        );

        it(
          "should spend a player's Void Points on the GM, one request after another",
          clean(async () => {
            const actor = await playersCharacter();
            await actor.update({ "system.rings.void.value": 1 });
            const answers = await Promise.all([askVoid(actor), askVoid(actor)]);
            assert.deepEqual(
              answers.map(a => a.spent),
              [true, false],
              "the second finds the point gone"
            );
            assert.deepEqual(answers[1], { spent: false, current: 0, overLimit: false });
            assert.equal(actor._source.system.rings.void.value, 0);
          })
        );

        it(
          "should refuse a Void Point spend for a character the player does not own, or a bad count",
          clean(async () => {
            const stranger = track(
              await createTestPC({
                name: "Requests: stranger's Void",
                system: { rings: { void: { rank: 2, value: 2 } } }
              })
            );
            const own = await playersCharacter();
            await own.update({ "system.rings.void.value": 2 });
            assert.equal(await refusalOf(askVoid(stranger)), "l5r4.ui.requests.notYourVoid");
            assert.equal(await refusalOf(askVoid(own, 0)), "l5r4.ui.requests.notVoidSpend");
            assert.equal(await refusalOf(askVoid(own, "1")), "l5r4.ui.requests.notVoidSpend");
            assert.equal(stranger._source.system.rings.void.value, 2, "the stranger's untouched");
            assert.equal(own._source.system.rings.void.value, 2, "a bad count takes nothing");
          })
        );

        it(
          "should spend a Void Point through spendVoidPoint and the queue a request uses together",
          clean(async () => {
            const actor = await playersCharacter();
            await actor.update({ "system.rings.void.value": 1 });
            const [local, asked] = await Promise.all([spendVoidPoint(actor), askVoid(actor)]);
            assert.deepEqual([local.success, asked.spent], [true, false]);
            assert.equal(actor._source.system.rings.void.value, 0);
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

        // #164: a card's steps run one at a time, so two sent together are both kept
        it(
          "should keep both duelists' rolls sent at the same moment",
          clean(async () => {
            const [first, second] = [await playersCharacter(), await playersCharacter()];
            const card = track(await startDuel(first, second));
            const [a, b] = [await assessment(first), await assessment(second)];
            const gmStep = data =>
              CONFIG.queries[`${SYS_ID}.flow`]({ messageId: card.id, data }, { user: game.user });
            await Promise.all([
              gmStep({ action: "roll", duelist: 0, rollId: a.id }),
              gmStep({ action: "roll", duelist: 1, rollId: b.id })
            ]);
            assert.equal(card.getFlag(SYS_ID, "flow").state.stage, "focus", "both recorded");
          })
        );

        // #164, #223: the GM corrects a card; a player cannot
        it(
          "should let the GM redo a duel step and end a grapple whose side is gone",
          clean(async () => {
            const duelist = await playersCharacter();
            const other = track(await createTestPC({ name: "Requests: redo duelist" }));
            const card = track(await startDuel(duelist, other));
            const roll = await assessment(duelist);
            await askStep(card, { action: "roll", duelist: 0, rollId: roll.id });
            assert.equal(
              await refusalOf(askStep(card, { action: "redo" })),
              "l5r4.ui.requests.gmCorrects"
            );
            await CONFIG.queries[`${SYS_ID}.flow`](
              { messageId: card.id, data: { action: "redo" } },
              { user: game.user }
            );
            assert.isNull(card.getFlag(SYS_ID, "flow").state.rolls.assessment[0], "cleared");

            const grappler = track(await createTestPC({ name: "Requests: grappler" }));
            const gone = await createTestPC({ name: "Requests: gone" });
            for (const actor of [grappler, gone]) {
              await applyEffect(actor, "grappled");
            }
            const state = {
              sides: [grappler.uuid, gone.uuid],
              skill: "jiujutsu",
              weapon: null,
              control: 0,
              rolls: [null, null],
              log: [],
              over: false
            };
            const grapple = track(await startFlow("grapple", state, grappler));
            await gone.delete();
            await CONFIG.queries[`${SYS_ID}.flow`](
              { messageId: grapple.id, data: { action: "end" } },
              { user: game.user }
            );
            assert.isTrue(grapple.getFlag(SYS_ID, "flow").state.over, "ended");
            assert.isFalse(grappler.statuses.has("grappled"), "the survivor is free");
          })
        );

        // #164: the second strike only while the duelist stands
        // game-rules/39_iaijutsu_dueling.md, p.87
        it(
          "should offer no strike to a duelist who is Dead",
          clean(async () => {
            const duelist = await playersCharacter();
            const other = track(await createTestPC({ name: "Requests: fallen duelist" }));
            const card = track(await startDuel(duelist, other));
            const flow = card.getFlag(SYS_ID, "flow");
            await card.setFlag(SYS_ID, "flow", {
              ...flow,
              state: { ...flow.state, stage: "strike", firstStrike: null }
            });
            await other.toggleStatusEffect("dead", { active: true });
            const roll = track(
              await rollCheck({
                actor: other,
                kind: "attack",
                label: "Requests strike",
                base: { roll: 2, keep: 2 },
                target: duelist,
                askForOptions: false
              })
            );
            const refusal = await refusalOf(
              CONFIG.queries[`${SYS_ID}.flow`](
                { messageId: card.id, data: { action: "roll", duelist: 1, rollId: roll.id } },
                { user: game.user }
              )
            );
            assert.equal(refusal, "l5r4.ui.requests.notDuelistRoll");
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
          "should ask the GM before anyone but the caster's owner ends a Concentration",
          clean(async () => {
            const caster = track(await createTestPC({ name: "Requests: caster" }));
            const effect = await applyEffect(caster, "concentration", { level: 1 });
            const query = CONFIG.queries[`${SYS_ID}.endConcentration`];
            let refusal;
            await withGmAnswer(false, async () => {
              refusal = await refusalOf(query({ effectUuid: effect.uuid }, { user: player }));
            });
            assert.equal(refusal, "l5r4.ui.requests.declined");
            assert.isTrue(caster.statuses.has("concentration"), "still concentrating");
            await withGmAnswer(true, () => query({ effectUuid: effect.uuid }, { user: player }));
            assert.isFalse(caster.statuses.has("concentration"), "ended once the GM allowed it");
          })
        );

        it(
          "should ask the GM before settling Center Stance for anyone but the owner ending the Round",
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
            let refusal;
            const { asked } = await withGmAnswer(false, async () => {
              refusal = await refusalOf(query({ combatId: combat.id }, { user: player }));
            });
            assert.equal(refusal, "l5r4.ui.requests.declined");
            assert.lengthOf(asked, 1);
          })
        );
      });
    },
    { displayName: "L5R4: GM requests" }
  );
}
