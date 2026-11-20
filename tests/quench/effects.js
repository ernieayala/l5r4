import { SYS_ID } from "../../module/config/constants.js";
import { F } from "../../module/utils/localization.js";
import { rollSkill } from "../../module/services/dice/rolls/skill-roll.js";
import { rollTrait } from "../../module/services/dice/rolls/trait-roll.js";
import { applyEffect, effectsOf } from "../../module/services/effects/apply.js";
import { onPromptClick } from "../../module/services/effects/prompts.js";
import {
  endEncounter,
  registerTokenEffects,
  updateProne
} from "../../module/services/effects/automation.js";
import { COMBAT_EVENTS } from "../../module/services/effects/combat-events.js";
import { isVoidOverLimit, voidSpentOf } from "../../module/services/effects/uses.js";
import { spendVoidPoint } from "../../module/services/dice/resources/void-points.js";
import { getCheckContext } from "../../module/services/dice/check/collect.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import {
  autoAnswerRolls,
  buttonLabelsOf,
  createDrawnToken,
  settleChatNotifications,
  waitFor
} from "./helpers.js";

/**
 * Registers the `effects` batch (roadmap Stage 9): stances, conditions, and timed effects as Active Effects whose
 * mechanics are rules, ending on the combat events the book names, with saves, use counters, and the effects the
 * system creates. Values are the Core Rulebook's, cited on each group, and the stage's decisions.
 * @param {object} quench  The Quench API object.
 */
export function registerEffectsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.effects`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const actors = [];
      const combats = [];
      const messages = [];
      let messageHook;
      let stopAnswering;
      const track = actor => (actors.push(actor), actor);

      /** A started combat of the actors, in the given Initiative order. */
      const startCombat = async (...entries) => {
        const combat = await foundry.documents.Combat.implementation.create({
          scene: null,
          active: true
        });
        combats.push(combat);
        await combat.createEmbeddedDocuments(
          "Combatant",
          entries.map(([actor, initiative]) => ({ actorId: actor.id, initiative }))
        );
        await combat.startCombat();
        return combat;
      };

      /** The prompt cards posted for an actor. */
      const prompts = (actor, kind) =>
        game.messages.contents.filter(m => {
          const prompt = m.getFlag(SYS_ID, "prompt");
          return prompt?.actorUuid === actor.uuid && (!kind || prompt.kind === kind);
        });

      before(async function () {
        this.timeout(30_000);
        await settleChatNotifications();
        stopAnswering = autoAnswerRolls();
        messageHook = Hooks.on("createChatMessage", message => messages.push(message));
      });

      afterEach(async function () {
        this.timeout(30_000);
        for (const combat of combats.splice(0)) {
          if (game.combats.has(combat.id)) {
            await combat.delete();
          }
        }
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      after(async function () {
        this.timeout(30_000);
        stopAnswering();
        Hooks.off("createChatMessage", messageHook);
        await settleChatNotifications();
        for (const message of messages) {
          if (game.messages.has(message.id)) {
            await message.delete();
          }
        }
      });

      // game-rules/36_stances.md, p.84
      describe("Stances", () => {
        it("should keep one stance at a time: a new stance ends the old one", async () => {
          const actor = track(await createTestPC({ name: "Effects one stance" }));
          await actor.toggleStatusEffect("fullAttackStance", { active: true });
          await actor.toggleStatusEffect("defenseStance", { active: true });
          assert.isFalse(actor.statuses.has("fullAttackStance"));
          assert.isTrue(actor.statuses.has("defenseStance"));
          assert.lengthOf(
            actor.effects.filter(e => e.system.group === "stance"),
            1
          );
        });

        it("should settle stances created at the same moment on one", async () => {
          const actor = track(await createTestPC({ name: "Effects stance race" }));
          await Promise.all(
            ["attackStance", "fullAttackStance", "defenseStance", "centerStance"].map(id =>
              actor.createEmbeddedDocuments("ActiveEffect", [{ name: id, statuses: [id] }])
            )
          );
          assert.isTrue(
            await waitFor(
              () => actor.effects.filter(e => e.system.group === "stance").length === 1
            ),
            "one stance left"
          );
        });

        it("should end a Full Defense bonus at the start of the actor's next Turn", async function () {
          this.timeout(20_000);
          const actor = track(await createTestPC({ name: "Effects full defense" }));
          const other = track(await createTestPC({ name: "Effects other" }));
          const combat = await startCombat([actor, 20], [other, 10]);
          await actor.toggleStatusEffect("fullDefenseStance", { active: true });
          const bonus = () => effectsOf(actor, "fullDefense");
          assert.isTrue(await waitFor(() => bonus().length === 1), "the roll gave a bonus");
          await combat.nextTurn();
          await waitFor(() => false, 500);
          assert.lengthOf(bonus(), 1, "still there on the other combatant's Turn");
          await combat.nextTurn();
          assert.isTrue(
            await waitFor(() => bonus().length === 0),
            "ended as the actor's next Turn began"
          );
          assert.isTrue(
            await waitFor(() => prompts(actor, "fullDefense").length === 1),
            "asked to roll again for the stance kept"
          );
        });

        it("should give Center Stance +10 Initiative next Round and offer the bonus unticked on one roll", async function () {
          this.timeout(20_000);
          const actor = track(
            await createTestPC({
              name: "Effects center",
              system: { rings: { void: { rank: 3, value: 3 } } }
            })
          );
          const other = track(await createTestPC({ name: "Effects center other" }));
          const combat = await startCombat([actor, 10], [other, 15]);
          await actor.toggleStatusEffect("centerStance", { active: true });
          await combat.nextTurn();
          await combat.nextTurn();
          const combatant = combat.combatants.find(c => c.actorId === actor.id);
          assert.equal(combatant.initiative, 20, "+10 for the Round");
          assert.equal(
            combat.combatant.actorId,
            actor.id,
            "the new Round starts with the faster actor"
          );
          assert.lengthOf(effectsOf(actor, "centered"), 1);

          const bonus = getCheckContext(actor, { kind: "skill" }).modifiers.find(m => m.consumes);
          assert.deepInclude(bonus, { roll: 1, keep: 1, total: 3, enabled: false });

          await actor.toggleStatusEffect("attackStance", { active: true });
          await combat.nextTurn();
          await combat.nextTurn();
          assert.equal(combatant.initiative, 10, "the +10 lasted one Round");
        });

        it("should end the Center Stance bonus when it is used", async () => {
          const actor = track(await createTestPC({ name: "Effects centered use" }));
          await applyEffect(actor, "centered");
          const index = getCheckContext(actor, { kind: "trait", trait: "ref" }).modifiers.findIndex(
            m => m.consumes
          );
          // Answer this dialog by hand: tick the Center bonus, then roll
          stopAnswering();
          try {
            const answered = new Promise(resolve =>
              Hooks.once("renderDialogV2", app => {
                app.element.querySelector(`[name="modifier.${index}"]`).checked = true;
                app.element.querySelector('[data-action="ok"]').click();
                resolve();
              })
            );
            const message = await rollTrait({ actor, traitName: "ref", traitRank: 2 });
            await answered;
            assert.deepInclude(message.system.pool, { roll: 3, keep: 3 }, "2k2 plus 1k1");
          } finally {
            stopAnswering = autoAnswerRolls();
          }
          assert.lengthOf(effectsOf(actor, "centered"), 0, "used, so ended");
        });
      });

      // game-rules/41_conditional_effects.md, p.89
      describe("Conditions", () => {
        it("should remove Dazed on a successful save in the Reactions stage", async function () {
          this.timeout(20_000);
          // Earth 10: Dazed leaves 7k7, which always meets TN 5
          const actor = track(
            await createTestPC({ name: "Effects dazed", system: { traits: { sta: 10, wil: 10 } } })
          );
          const combat = await startCombat([actor, 10]);
          const effect = await applyEffect(actor, "dazed");
          assert.equal(effect.getFlag(SYS_ID, "saveTn") ?? 20, 20, "the first save is at TN 20");
          // After three failures the TN is 5 (decision 5)
          await effect.setFlag(SYS_ID, "saveTn", 5);
          await combat.nextTurn();
          assert.isTrue(
            await waitFor(() => prompts(actor, "save").length === 1),
            "save card posted"
          );
          await onPromptClick(prompts(actor, "save")[0]);
          assert.isFalse(actor.statuses.has("dazed"));
        });

        it("should lower the next TN by 5 on a failed Dazed save", async function () {
          this.timeout(20_000);
          const actor = track(await createTestPC({ name: "Effects dazed fail" }));
          const combat = await startCombat([actor, 10]);
          const effect = await applyEffect(actor, "dazed");
          await effect.setFlag(SYS_ID, "saveTn", 200);
          await combat.nextTurn();
          await waitFor(() => prompts(actor, "save").length === 1);
          await onPromptClick(prompts(actor, "save")[0]);
          assert.isTrue(actor.statuses.has("dazed"));
          assert.equal(effect.getFlag(SYS_ID, "saveTn"), 195);
        });

        it("should end Stunned at the end of the next Round on a failed save", async function () {
          this.timeout(20_000);
          const actor = track(await createTestPC({ name: "Effects stunned" }));
          const combat = await startCombat([actor, 10]);
          const effect = await applyEffect(actor, "stunned");
          await combat.nextTurn();
          await waitFor(() => prompts(actor, "save").length === 1);
          // A TN of 200 fails
          const card = prompts(actor, "save")[0];
          await card.update({ [`flags.${SYS_ID}.prompt.tn`]: 200 });
          await onPromptClick(card);
          assert.deepInclude(effect.toObject().duration, {
            value: 0,
            units: "rounds",
            expiry: "roundEnd"
          });
          await combat.nextTurn();
          assert.isTrue(
            await waitFor(() => !actor.statuses.has("stunned")),
            "ended with the Round"
          );
        });

        it("should not create a condition the actor is immune to", async () => {
          const actor = track(await createTestPC({ name: "Effects immune" }));
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Fearless",
              type: "advantage",
              system: { rules: [{ key: "ConditionImmunity", condition: "feared" }] }
            }
          ]);
          // The notice comes through the l5r4-enhanced.immuneStatus hook (module/hooks/register-all.js)
          const notices = [];
          const info = ui.notifications.info;
          ui.notifications.info = message => notices.push(message);
          try {
            await actor.toggleStatusEffect("feared", { active: true });
          } finally {
            ui.notifications.info = info;
          }
          assert.isFalse(actor.statuses.has("feared"));
          assert.deepEqual(notices, [
            F("l5r4.ui.effects.immune", {
              name: actor.name,
              effect: game.i18n.localize(CONFIG.statusEffects.feared.name)
            })
          ]);
        });

        it("should offer a hit's ApplyCondition rule's condition on the target", async () => {
          const attacker = track(
            await createTestPC({ name: "Effects striker", system: { traits: { agi: 10 } } })
          );
          await attacker.createEmbeddedDocuments("Item", [
            { name: "Kenjutsu", type: "skill", system: { rank: 10, trait: "agi" } },
            {
              name: "Stunning Blow",
              type: "technique",
              system: { rules: [{ key: "ApplyCondition", selector: "attack", condition: "dazed" }] }
            }
          ]);
          const target = track(
            await createTestNPC({ name: "Effects target", system: { armor: { armorTn: 5 } } })
          );
          const token = await createDrawnToken({ actorId: target.id, x: 100, y: 100 });
          try {
            canvas.tokens.setTargets([token.id]);
            const message = await rollSkill({
              actor: attacker,
              skillName: "Kenjutsu",
              traitRank: 10,
              skillRank: 10,
              skillTrait: "agi",
              rollType: "attack",
              askForOptions: false
            });
            assert.isTrue(message.system.outcome.success);
            assert.deepEqual(
              message.system.conditions.map(c => c.condition),
              ["dazed"]
            );
            // The card's button, as the player clicks it
            const html = await message.renderHTML();
            html.querySelector('[data-action="apply-condition"][data-index="0"]').click();
            assert.isTrue(await waitFor(() => token.actor.statuses.has("dazed")));
          } finally {
            canvas.tokens.setTargets([]);
            await token.delete();
          }
        });
      });

      // game-rules/42_fear.md, p.90
      describe("Fear", () => {
        it("should end when the combat it began in ends", async function () {
          this.timeout(20_000);
          const actor = track(await createTestPC({ name: "Effects fear combat" }));
          const combat = await startCombat([actor, 10]);
          await applyEffect(actor, "feared", { level: 2 });
          assert.equal(
            getCheckContext(actor, { kind: "skill" }).modifiers[0].roll,
            -2,
            "Fear 2: -2k0"
          );
          await combat.delete();
          assert.isTrue(await waitFor(() => !actor.statuses.has("feared")));
        });

        it("should end outside combat when the GM ends the encounter", async function () {
          this.timeout(20_000);
          const actor = track(await createTestPC({ name: "Effects fear encounter" }));
          await applyEffect(actor, "feared", { level: 1 });
          await game.time.advance(3600);
          assert.isTrue(actor.statuses.has("feared"), "world time alone does not end it");
          let question = "";
          let labels = {};
          const answered = new Promise(resolve => {
            Hooks.once("renderDialogV2", app => {
              question = app.element.querySelector("form").textContent;
              labels = buttonLabelsOf(app);
              app.element.querySelector('[data-action="yes"]').click();
              resolve();
            });
          });
          // The GM's End encounter ends Fear on every actor: put back the world's own afterwards (#106)
          const worldFear = game.actors
            .filter(other => other !== actor)
            .flatMap(other =>
              other.effects.filter(e => e.statuses.has("feared")).map(e => [other, e.toObject()])
            );
          try {
            await Promise.all([answered, endEncounter()]);
          } finally {
            for (const [other, data] of worldFear) {
              await waitFor(() => !other.effects.has(data._id));
              await other.createEmbeddedDocuments("ActiveEffect", [data], { keepId: true });
            }
          }
          assert.include(question, game.i18n.localize("l5r4.ui.effects.endEncounterConfirm"));
          assert.equal(labels.yes, game.i18n.localize("l5r4.ui.effects.endEncounter"));
          assert.equal(labels.no, game.i18n.localize("l5r4.ui.common.cancel"));
          assert.isTrue(await waitFor(() => !actor.statuses.has("feared")));
        });

        // #45
        it("should still end with its combat on an unlinked combatant after the world reloads", async function () {
          this.timeout(20_000);
          const npc = track(
            await createTestNPC({
              name: "Effects fear token",
              prototypeToken: { actorLink: false }
            })
          );
          const data = await npc.getTokenDocument({ x: 0, y: 0 });
          const [token] = await canvas.scene.createEmbeddedDocuments("Token", [data.toObject()]);
          try {
            const combat = await foundry.documents.Combat.implementation.create({
              scene: canvas.scene.id,
              active: true
            });
            combats.push(combat);
            await combat.createEmbeddedDocuments("Combatant", [
              { tokenId: token.id, sceneId: canvas.scene.id, actorId: npc.id }
            ]);
            await combat.startCombat();
            await applyEffect(token.actor, "feared", { level: 1 });
            const fear = effectsOf(token.actor, "feared")[0];
            // On a reload the combatant builds the token's actor before the registry exists, so the registry
            // never sees this effect; registerTokenEffects runs at ready to cover that
            const registry = foundry.documents.ActiveEffect.registry;
            registry.delete(fear);
            registerTokenEffects();
            assert.isTrue(registry.has(fear));
            await combat.delete();
            assert.isTrue(await waitFor(() => !token.actor.statuses.has("feared")));
          } finally {
            await token.delete();
          }
        });
      });

      // roadmap/AUTOMATION.md B10
      describe("Prone from Wounds", () => {
        it("should go on at Down and come off above Down", async function () {
          this.timeout(10_000);
          const actor = track(await createTestPC({ name: "Effects prone" }));
          const downAt = actor.system.woundLevels.down.value;
          await actor.update({ "system.suffered": downAt });
          assert.isTrue(await waitFor(() => actor.statuses.has("prone")), "Prone at Down");
          assert.lengthOf(effectsOf(actor, "prone"), 1, "applied once");
          assert.equal(
            effectsOf(actor, "prone")[0].name,
            game.i18n.localize("l5r4.ui.effects.autoProne"),
            "named as automatic in one key"
          );
          await actor.update({ "system.suffered": 0 });
          assert.isTrue(await waitFor(() => !actor.statuses.has("prone")), "removed when healed");
        });

        it("should leave a Prone the GM applied by hand", async () => {
          const actor = track(await createTestPC({ name: "Effects prone manual" }));
          await actor.toggleStatusEffect("prone", { active: true });
          await updateProne(actor);
          assert.isTrue(actor.statuses.has("prone"));
        });
      });

      // game-rules/67_universal_spells.md, p.166
      describe("Concentration", () => {
        it("should ask for the Willpower roll on more Wounds than the Earth Ring in one hit", async () => {
          const actor = track(await createTestPC({ name: "Effects concentration" }));
          await applyEffect(actor, "concentration", { level: 2 });
          const earth = actor.system.rings.earth;
          await actor.update({ "system.suffered": earth });
          await waitFor(() => false, 300);
          assert.lengthOf(
            prompts(actor, "concentration"),
            0,
            "no more than the Earth Ring: no roll"
          );
          await actor.update({ "system.suffered": earth + earth + 1 });
          assert.isTrue(await waitFor(() => prompts(actor, "concentration").length === 1));
          assert.equal(
            prompts(actor, "concentration")[0].getFlag(SYS_ID, "prompt").tn,
            30,
            "20 + 5 × 2"
          );
        });

        it("should remind the caster of the upkeep at the start of his Turn", async () => {
          const actor = track(await createTestPC({ name: "Effects concentration upkeep" }));
          await applyEffect(actor, "concentration", { level: 1 });
          const [effect] = effectsOf(actor, "concentration");
          const before = messages.length;
          await COMBAT_EVENTS.turn("turnStart", null, { actor });
          const note = messages.slice(before).find(m => m.speaker.actor === actor.id);
          assert.exists(note, "a note is posted");
          assert.equal(
            foundry.utils.parseHTML(note.content).textContent,
            game.i18n.localize("l5r4.ui.effects.concentrationUpkeep", { effect: effect.name })
          );
        });
      });

      // roadmap/STAGE-09 decision 6
      // game-rules/25_rings_and_traits.md, p.78
      describe("Void Points", () => {
        it("should count the Void Points spent this Round in combat and warn past one", async function () {
          this.timeout(10_000);
          const actor = track(
            await createTestPC({
              name: "Effects void",
              system: { rings: { void: { rank: 3, value: 3 } } }
            })
          );
          await startCombat([actor, 10]);
          assert.isFalse(isVoidOverLimit(actor));
          await spendVoidPoint(actor);
          assert.equal(voidSpentOf(actor), 1);
          assert.isTrue(isVoidOverLimit(actor), "the dialog warns");
          await spendVoidPoint(actor);
          assert.equal(actor.system.rings.void.value, 1, "never blocked");
        });

        // Initiative is Stage 1 of the first Round, before the combat begins in the tracker (#104)
        // game-rules/31_combat_round.md, p.81
        it("should count a Void Point spent before the combat begins toward Round 1", async function () {
          this.timeout(10_000);
          const actor = track(
            await createTestPC({
              name: "Effects void at Initiative",
              system: { rings: { void: { rank: 3, value: 3 } } }
            })
          );
          const combat = await foundry.documents.Combat.implementation.create({
            scene: null,
            active: true
          });
          combats.push(combat);
          await combat.createEmbeddedDocuments("Combatant", [{ actorId: actor.id }]);
          await spendVoidPoint(actor);
          await combat.startCombat();
          assert.equal(combat.round, 1);
          assert.equal(voidSpentOf(actor), 1, "the Initiative Void Point counts in Round 1");
          assert.isTrue(isVoidOverLimit(actor), "the next roll's dialog warns");
        });

        it("should raise the limit with a Resource rule for void", async () => {
          const actor = track(
            await createTestPC({
              name: "Effects void resource",
              system: { rings: { void: { rank: 3, value: 3 } } }
            })
          );
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Two Void",
              type: "technique",
              system: { rules: [{ key: "Resource", slug: "void", max: 1 }] }
            }
          ]);
          await startCombat([actor, 10]);
          await spendVoidPoint(actor);
          assert.isFalse(isVoidOverLimit(actor));
        });
      });
    },
    { displayName: "L5R4: Effects, conditions, and durations" }
  );
}
