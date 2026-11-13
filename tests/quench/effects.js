import { SYS_ID } from "../../module/config/constants.js";
import { SkillRoll } from "../../module/services/dice/rolls/skill-roll.js";
import { TraitRoll } from "../../module/services/dice/rolls/trait-roll.js";
import { applyConditionFromMessage } from "../../module/services/dice/check/chat-actions.js";
import { applyEffect, effectsOf } from "../../module/services/effects/apply.js";
import { onPromptClick } from "../../module/services/effects/prompts.js";
import { syncProne } from "../../module/services/effects/automation.js";
import { voidOverLimit, voidSpent } from "../../module/services/effects/uses.js";
import { spendVoidPoint } from "../../module/services/dice/resources/void-manager.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { autoAnswerRolls, settleChatNotifications, waitFor } from "./helpers.js";

/**
 * Registers the `effects` batch (roadmap Stage 9): stances, conditions, and timed effects as Active Effects whose
 * mechanics are rules, ending on the combat events the book names, with saves, use counters, and the effects the
 * system creates. Values are the Core Rulebook's (pp.78, 84, 88-90, 166) and the stage's decisions.
 * @param {object} quench  The Quench API object.
 */
export function registerEffectsBatch(quench) {
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

      describe("Stances (p.84)", () => {
        it("one stance at a time: a new stance ends the old one", async () => {
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

        it("stances created at the same moment settle on one", async () => {
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

        it("a Full Defense bonus ends at the start of the actor's next Turn", async function () {
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

        it("Center Stance: next Round, +10 Initiative and the bonus offered unticked on one roll", async function () {
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

          const bonus = collectCheck(actor, { kind: "skill" }).modifiers.find(m => m.consumes);
          assert.deepInclude(bonus, { roll: 1, keep: 1, total: 3, enabled: false });

          await actor.toggleStatusEffect("attackStance", { active: true });
          await combat.nextTurn();
          await combat.nextTurn();
          assert.equal(combatant.initiative, 10, "the +10 lasted one Round");
        });

        it("Center Stance: using the bonus ends it", async () => {
          const actor = track(await createTestPC({ name: "Effects centered use" }));
          await applyEffect(actor, "centered");
          const index = collectCheck(actor, { kind: "trait", trait: "ref" }).modifiers.findIndex(
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
            const message = await TraitRoll({ actor, traitName: "ref", traitRank: 2 });
            await answered;
            assert.deepInclude(message.system.pool, { roll: 3, keep: 3 }, "2k2 plus 1k1");
          } finally {
            stopAnswering = autoAnswerRolls();
          }
          assert.lengthOf(effectsOf(actor, "centered"), 0, "used, so ended");
        });
      });

      describe("Conditions (p.89)", () => {
        it("a Dazed save in the Reactions stage removes it on success", async function () {
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

        it("a failed Dazed save lowers the next TN by 5", async function () {
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

        it("a failed Stunned save ends it at the end of the next Round", async function () {
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

        it("a condition the actor is immune to is not created", async () => {
          const actor = track(await createTestPC({ name: "Effects immune" }));
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Fearless",
              type: "advantage",
              system: { rules: [{ key: "ConditionImmunity", condition: "feared" }] }
            }
          ]);
          await actor.toggleStatusEffect("feared", { active: true });
          assert.isFalse(actor.statuses.has("feared"));
        });

        it("a hit offers its ApplyCondition rule's condition on the target", async () => {
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
          const [token] = await canvas.scene.createEmbeddedDocuments("Token", [
            { actorId: target.id, x: 100, y: 100 }
          ]);
          try {
            canvas.tokens.get(token.id).setTarget(true, { releaseOthers: true });
            const message = await SkillRoll({
              actor: attacker,
              skillName: "Kenjutsu",
              actorTrait: 10,
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
            await applyConditionFromMessage(message, 0);
            const targetActor = token.actor;
            assert.isTrue(targetActor.statuses.has("dazed"));
          } finally {
            canvas.tokens.get(token.id)?.setTarget(false);
            await token.delete();
          }
        });
      });

      describe("Fear (p.90)", () => {
        it("ends when the combat it began in ends", async function () {
          this.timeout(20_000);
          const actor = track(await createTestPC({ name: "Effects fear combat" }));
          const combat = await startCombat([actor, 10]);
          await applyEffect(actor, "feared", { level: 2 });
          assert.equal(
            collectCheck(actor, { kind: "skill" }).modifiers[0].roll,
            -2,
            "Fear 2: -2k0"
          );
          await combat.delete();
          assert.isTrue(await waitFor(() => !actor.statuses.has("feared")));
        });

        it("outside combat, ends when the GM ends the encounter", async () => {
          const actor = track(await createTestPC({ name: "Effects fear encounter" }));
          await applyEffect(actor, "feared", { level: 1 });
          await game.time.advance(3600);
          assert.isTrue(actor.statuses.has("feared"), "world time alone does not end it");
          await foundry.documents.ActiveEffect.registry.refresh("encounterEnd", {});
          assert.isTrue(await waitFor(() => !actor.statuses.has("feared")));
        });
      });

      describe("Prone from Wounds (B10)", () => {
        it("goes on at Down and comes off above Down", async function () {
          this.timeout(10_000);
          const actor = track(await createTestPC({ name: "Effects prone" }));
          const downAt = actor.system.woundLevels.down.value;
          await actor.update({ "system.suffered": downAt });
          assert.isTrue(await waitFor(() => actor.statuses.has("prone")), "Prone at Down");
          assert.lengthOf(effectsOf(actor, "prone"), 1, "applied once");
          await actor.update({ "system.suffered": 0 });
          assert.isTrue(await waitFor(() => !actor.statuses.has("prone")), "removed when healed");
        });

        it("leaves a Prone the GM applied by hand", async () => {
          const actor = track(await createTestPC({ name: "Effects prone manual" }));
          await actor.toggleStatusEffect("prone", { active: true });
          await syncProne(actor);
          assert.isTrue(actor.statuses.has("prone"));
        });
      });

      describe("Concentration (p.166)", () => {
        it("more Wounds than the Earth Ring in one hit asks for the Willpower roll", async () => {
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
      });

      describe("Void Points (p.78; decision 6)", () => {
        it("counts the Void Points spent this Round in combat and warns past one", async function () {
          this.timeout(10_000);
          const actor = track(
            await createTestPC({
              name: "Effects void",
              system: { rings: { void: { rank: 3, value: 3 } } }
            })
          );
          await startCombat([actor, 10]);
          assert.isFalse(voidOverLimit(actor));
          await spendVoidPoint(actor);
          assert.equal(voidSpent(actor), 1);
          assert.isTrue(voidOverLimit(actor), "the dialog warns");
          await spendVoidPoint(actor);
          assert.equal(actor.system.rings.void.value, 1, "never blocked");
        });

        it("a Resource rule for void raises the limit", async () => {
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
          assert.isFalse(voidOverLimit(actor));
        });
      });
    },
    { displayName: "L5R4: Effects, Conditions, Durations" }
  );
}
