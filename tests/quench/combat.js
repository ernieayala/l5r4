import { SYS_ID } from "../../module/config/constants.js";
import { F, T } from "../../module/utils/localization.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { getCheckContext } from "../../module/services/dice/check/collect.js";
import { rollPool } from "../../module/services/dice/rolls/simple-roll.js";
import { rollDamageFromAttack } from "../../module/services/combat/damage-roll.js";
import {
  applyConditionFromMessage,
  rollDamageFromMessage
} from "../../module/services/dice/check/chat-actions.js";
import { applyDamage } from "../../module/services/combat/damage.js";
import { rollContest } from "../../module/services/combat/contest.js";
import { contestRollsOf } from "../../module/services/combat/contest-rolls.js";
import { startGrapple } from "../../module/services/combat/grapple-start.js";
import { startDuel } from "../../module/services/combat/duel.js";
import { guard } from "../../module/services/combat/guard.js";
import { applyLongRest } from "../../module/services/rest.js";
import { migrateNpcInitiative } from "../../module/setup/migrations/actors/npc-initiative.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createArmorData, createSkillData, createWeaponData } from "../fixtures/item-fixtures.js";
import {
  answerCheckDialog,
  autoAnswerRolls,
  cleanTest,
  settleChatNotifications,
  waitFor,
  withConnectedPlayer,
  withGmAnswer
} from "./helpers.js";

/** Every d10 shows 9: a face is ceil((1 - u) × 10) [src: client/dice/terms/dice.mjs:412], so no die explodes. */
const NINES = () => 0.15;

/**
 * The wound rank an actor is at.
 * @param {Actor} actor
 * @returns {string}
 */
const rankOf = actor =>
  Object.keys(actor.system.woundLevels).find(key => actor.system.woundLevels[key].current);

/**
 * Registers the `combat` batch (roadmap/STAGE-10): an attack on a target to damage, Wounds, the wound rank, Void
 * reduction, and undo; Reduction, damage sources, Invulnerability, and Spirit; each maneuver bought with Raises;
 * Guard; a grapple; an iaijutsu duel; a stat block's attack. Every die shows 9 while it runs.
 * @param {object} quench  The Quench API object.
 */
export function registerCombatTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.combat`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const posted = [];
      let uniform;
      let hook;
      const track = actor => (actors.push(actor), actor);

      before(async function () {
        this.timeout(30_000);
        await settleChatNotifications();
        uniform = CONFIG.Dice.randomUniform;
        CONFIG.Dice.randomUniform = NINES;
        hook = Hooks.on("createChatMessage", message => posted.push(message));
      });

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      after(async function () {
        this.timeout(30_000);
        CONFIG.Dice.randomUniform = uniform;
        Hooks.off("createChatMessage", hook);
        await settleChatNotifications();
        for (const message of posted) {
          if (game.messages.has(message.id)) {
            await message.delete();
          }
        }
      });

      /**
       * An attacker: Agility 4, Strength 3, Kenjutsu 2, Iaijutsu 2, Jiujutsu 1, and a katana (3k2) with `rules`.
       * Attacks roll 6k4 = 36; the katana's damage is 6k2 = 18. The Void Ring caps declared Raises.
       * game-rules/28_raises.md, p.79
       */
      const attacker = async (rules = [], voidRank = 2) => {
        const actor = track(
          await createTestPC({
            name: "Combat attacker",
            system: {
              traits: { agi: 4, str: 3, ref: 3, awa: 3 },
              rings: { void: { rank: voidRank, value: voidRank } }
            }
          })
        );
        await actor.createEmbeddedDocuments("Item", [
          createSkillData("Kenjutsu", 2, "agi"),
          createSkillData("Iaijutsu", 2, "ref"),
          createSkillData("Jiujutsu", 1, "agi"),
          createWeaponData("Katana", 3, 2, { system: { associatedSkill: "kenjutsu", rules } })
        ]);
        return { actor, katana: actor.items.find(i => i.type === "weapon") };
      };

      /**
       * A defender: Reflexes 3 (Armor TN 20), Strength 2, Iaijutsu 1, with armor (+bonus, Reduction) when given.
       */
      const defender = async ({ armor = null, effects = [] } = {}) => {
        const actor = track(
          await createTestPC({ name: "Combat defender", system: { traits: { ref: 3, awa: 3 } } })
        );
        await actor.createEmbeddedDocuments("Item", [
          createSkillData("Iaijutsu", 1, "ref"),
          ...(armor
            ? [
                createArmorData("Armor", armor.bonus, armor.reduction, {
                  system: { equipped: true }
                })
              ]
            : [])
        ]);
        if (effects.length) {
          await actor.createEmbeddedDocuments("ActiveEffect", effects);
        }
        return actor;
      };

      /**
       * Attack `target` with the katana: Kenjutsu / Agility, 6k4, TN its Armor TN. With `choices` the dialog
       * opens and is answered with them.
       */
      const attack = async (actor, katana, target, choices = null) => {
        const answered = choices ? answerCheckDialog(choices) : null;
        const message = await rollCheck({
          actor,
          kind: "attack",
          label: "Attack",
          base: { roll: 6, keep: 4 },
          skill: "kenjutsu",
          trait: "agi",
          weapon: katana,
          target,
          tn: target.system.armorTn.current,
          askForOptions: Boolean(choices)
        });
        await answered;
        return message;
      };

      /**
       * Start a grapple bare-handed: Jiujutsu 1 / Agility 4, 5k4 = 36, with the Grapple maneuver.
       */
      const grappleAttack = async (actor, target) => {
        const answered = answerCheckDialog({ "maneuver.grapple": true });
        const message = await rollCheck({
          actor,
          kind: "attack",
          label: "Grapple",
          base: { roll: 5, keep: 4 },
          skill: "jiujutsu",
          trait: "agi",
          target,
          tn: target.system.armorTn.current
        });
        await answered;
        return message;
      };

      /** The result card a damage roll's application posted. */
      const resultOf = damage =>
        game.messages.contents.findLast(
          m => m.getFlag(SYS_ID, "damageResult")?.damageMessageId === damage.id
        );

      /** Click a button on a message's freshly rendered card. */
      const click = async (message, selector) => {
        const html = await message.renderHTML();
        html.querySelector(selector).click();
      };

      // game-rules/33_wounds.md, p.82
      // game-rules/25_rings_and_traits.md, p.78
      describe("Attack to Wounds", () => {
        it(
          "should land a hit's damage on its target through Reduction; Void takes back 10; undo restores",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender({ armor: { bonus: 1, reduction: 3 } });
            assert.equal(target.system.armorTn.current, 21, "Reflexes 3 × 5 + 5 + 1");
            const hit = await attack(actor, katana, target);
            assert.isTrue(hit.system.outcome.success, "36 against 21");
            assert.equal(hit.system.target.uuid, target.uuid);
            assert.deepEqual(
              { label: hit.system.damage.label, roll: hit.system.damage.roll },
              { label: "Katana", roll: 6 },
              "the damage pool stored at the attack: 3k2 + Strength 3"
            );
            assert.include(hit.content, "check-damage", "the hit's card has its damage button");

            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(damage.system.attackOf, hit.id);
            assert.equal(damage.system.target.uuid, target.uuid);
            assert.equal(damage.system.outcome.total, 18, "6k2 of nines");
            assert.include(damage.content, "damage-apply-target");

            await applyDamage(damage, [target]);
            assert.equal(target._source.system.suffered, 15, "18 - Reduction 3");
            const card = resultOf(damage);
            assert.equal(card.getFlag(SYS_ID, "damageResult").reduction, 3);
            assert.notEqual(rankOf(target), "healthy", "15 Wounds is past Healthy (Earth 2 × 5)");

            await click(card, "[data-action='damage-void']");
            assert.isTrue(await waitFor(() => target._source.system.suffered === 5), "15 - 10");
            assert.equal(target._source.system.rings.void.value, 1, "one Void Point spent");

            await click(resultOf(damage), "[data-action='damage-undo']");
            assert.isTrue(await waitFor(() => target._source.system.suffered === 0), "undone");
            assert.equal(target._source.system.rings.void.value, 2, "the Void Point is back");
            assert.equal(rankOf(target), "healthy");
            assert.isTrue(resultOf(damage).getFlag(SYS_ID, "damageResult").undone);
          })
        );

        // #140, #223: a card records what its buttons did; the buttons stay as they were, like PF2e's damage buttons
        it(
          "should list on a damage card whom it was applied to, keep its buttons, and drop the line on Undo",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender({ armor: { bonus: 1, reduction: 3 } });
            const damage = await rollDamageFromAttack(await attack(actor, katana, target), {
              askForOptions: false
            });
            await applyDamage(damage, [target]);
            const applied = F("l5r4.ui.combat.appliedTo", { name: target.name, wounds: 15 });
            const card = () => game.messages.get(damage.id);
            assert.isTrue(await waitFor(() => card().content.includes(applied)), "listed");
            const html = await card().renderHTML();
            const button = html.querySelector("[data-action='damage-apply-target']");
            assert.equal(
              button.textContent.trim(),
              F("l5r4.ui.combat.applyTo", { target: target.name }),
              "the button keeps its label"
            );
            assert.isFalse(button.disabled);
            await click(resultOf(damage), "[data-action='damage-undo']");
            assert.isTrue(await waitFor(() => !card().content.includes(applied)), "gone on Undo");
          })
        );

        it(
          "should say on a hit's card that its damage was rolled, and keep the button",
          clean(async () => {
            const { actor, katana } = await attacker();
            const hit = await attack(actor, katana, await defender());
            await rollDamageFromMessage(hit, { askForOptions: false });
            const card = game.messages.get(hit.id);
            assert.include(card.content, T("l5r4.ui.check.damageRolled"));
            assert.include(
              card.content,
              F("l5r4.ui.check.damageRollPool", { pool: hit.system.damage.label })
            );
          })
        );

        it(
          "should note an applied condition and apply it again on a second press, holding one",
          clean(async () => {
            const { actor, katana } = await attacker([
              { key: "ApplyCondition", selector: "attack", condition: "dazed" }
            ]);
            const target = await defender();
            const hit = await attack(actor, katana, target);
            assert.lengthOf(hit.system.conditions, 1, "Dazed is offered");
            await applyConditionFromMessage(hit, 0);
            const html = await game.messages.get(hit.id).renderHTML();
            assert.isFalse(html.querySelector("[data-action='apply-condition']").disabled);
            assert.include(
              html.textContent,
              F("l5r4.ui.effects.appliedTo", {
                effect: hit.system.conditions[0].label,
                target: target.name
              })
            );
            // Removed by mistake, then put back from the card
            await target.deleteEmbeddedDocuments(
              "ActiveEffect",
              target.effects.filter(e => e.statuses.has("dazed")).map(e => e.id)
            );
            await applyConditionFromMessage(game.messages.get(hit.id), 0);
            assert.lengthOf(
              target.effects.filter(e => e.statuses.has("dazed")),
              1,
              "back, once"
            );
          })
        );

        it(
          "should start one grapple from a hit at a time, and another once it has ended",
          clean(async () => {
            const { actor } = await attacker();
            const hit = await grappleAttack(actor, await defender());
            const first = await startGrapple(hit);
            assert.exists(first);
            assert.isNull(await startGrapple(game.messages.get(hit.id)), "none while it runs");
            const flow = first.getFlag(SYS_ID, "flow");
            await first.setFlag(SYS_ID, "flow", { ...flow, state: { ...flow.state, over: true } });
            assert.exists(await startGrapple(game.messages.get(hit.id)), "a new one once it ended");
          })
        );

        // #146: the Dog's "12: +10; 24: Dead", as the creatures pack stores it
        // game-rules/99_creatures.md, p.318, 320
        it(
          "should kill a creature at the total its own Wound list names, and not one Wound later",
          clean(async () => {
            const { actor } = await attacker();
            const dog = track(
              await createTestNPC({
                name: "Combat dog",
                system: {
                  woundMode: "manual",
                  manualWoundLevels: {
                    healthy: { value: 11, penalty: 0, active: true },
                    nicked: { value: 23, penalty: 10, active: true },
                    out: { value: 24, penalty: 0, active: true }
                  }
                }
              })
            );
            const damageOf = async bonus =>
              rollCheck({
                actor,
                kind: "damage",
                label: "Bite",
                base: { roll: 2, keep: 2, bonus },
                target: dog,
                askForOptions: false
              });
            await applyDamage(await damageOf(5), [dog]);
            assert.equal(dog._source.system.suffered, 23, "18 + 5");
            assert.isFalse(dog.statuses.has("dead"), "alive at 23");
            await dog.update({ "system.suffered": 0 });
            await applyDamage(await damageOf(6), [dog]);
            assert.equal(dog._source.system.suffered, 24, "18 + 6");
            assert.isTrue(dog.statuses.has("dead"), "dead at 24");
          })
        );

        // A control the user cannot use is not shown (#108)
        it(
          "should show Undo on a result card only to the roller's owner and a GM",
          clean(async function () {
            const { actor, katana } = await attacker();
            const player = game.users.find(
              user => !user.isGM && !actor.testUserPermission(user, "OWNER")
            );
            if (!player) {
              this.skip();
            }
            const target = await defender();
            const damage = await rollDamageFromAttack(await attack(actor, katana, target), {
              askForOptions: false
            });
            await applyDamage(damage, [target]);
            const card = resultOf(damage);
            const gm = game.users.current;
            const undoShownTo = async user => {
              game.users.current = user;
              try {
                return Boolean(
                  (await card.renderHTML()).querySelector("[data-action='damage-undo']")
                );
              } finally {
                game.users.current = gm;
              }
            };
            assert.isTrue(await undoShownTo(gm), "the GM");
            assert.isFalse(await undoShownTo(player), "a player who did not roll");
          })
        );

        // #113, #142: an actor with no Void Point has nothing to spend, so its owner sees no button to press
        it(
          "should show Reduce with Void only while the damaged actor has a Void Point",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            await target.update({ "system.rings.void.value": 0 });
            const damage = await rollDamageFromAttack(await attack(actor, katana, target), {
              askForOptions: false
            });
            await applyDamage(damage, [target]);
            const card = resultOf(damage);
            const voidButton = async () =>
              (await card.renderHTML()).querySelector("[data-action='damage-void']");
            assert.notExists(await voidButton(), "hidden with no Void Point");
            await target.update({ "system.rings.void.value": 1 });
            assert.exists(await voidButton(), "shown once the actor has one");
          })
        );

        // Every card shows a button only to the users who may press it (roadmap/STAGE-18 decision 15, #112)
        it(
          "should show the attack, damage, and grapple cards' buttons only to their actors' owners",
          clean(async function () {
            this.timeout(20_000);
            const { actor, katana } = await attacker();
            const player = game.users.find(
              user => !user.isGM && !actor.testUserPermission(user, "OWNER")
            );
            if (!player) {
              this.skip();
            }
            const target = await defender();
            const gm = game.users.current;
            const buttonsFor = async (user, message) => {
              game.users.current = user;
              try {
                const html = await message.renderHTML();
                return [...html.querySelectorAll("button[data-action], button[data-flow-action]")];
              } finally {
                game.users.current = gm;
              }
            };
            const hit = await attack(actor, katana, target);
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            const grab = await grappleAttack(actor, target);
            await startGrapple(grab);
            const flowCard = game.messages.contents.findLast(m => m.getFlag(SYS_ID, "flow"));
            for (const [name, message] of Object.entries({ hit, damage, grab, flowCard })) {
              assert.isNotEmpty(await buttonsFor(gm, message), `${name}: the GM sees its buttons`);
              assert.isEmpty(await buttonsFor(player, message), `${name}: a player sees none`);
            }
          })
        );

        // A Void Point that brings the Wounds back within Out saves the life (#117)
        // game-rules/25_rings_and_traits.md, p.78
        // game-rules/33_wounds.md, p.82
        it(
          "should lift Dead when a Void Point takes the Wounds back within Out",
          clean(async function () {
            this.timeout(15_000);
            const { actor, katana } = await attacker();
            const target = await defender();
            const out = target.system.woundLevels.out.value;
            // 18 damage from out - 9 is out + 9: Dead; 10 fewer is out - 1
            await target.update({ "system.suffered": out - 9 });
            const damage = await rollDamageFromAttack(await attack(actor, katana, target), {
              askForOptions: false
            });
            await applyDamage(damage, [target]);
            assert.isTrue(target.statuses.has("dead"), "past Out");
            await click(resultOf(damage), "[data-action='damage-void']");
            assert.isTrue(
              await waitFor(() => target._source.system.suffered === out - 1),
              "10 back"
            );
            assert.isTrue(await waitFor(() => !target.statuses.has("dead")), "Dead lifted");
            assert.isFalse(
              resultOf(damage).getFlag(SYS_ID, "damageResult").killed,
              "the card no longer says so"
            );
          })
        );

        // roadmap/STAGE-10 decision 4
        it(
          "should mark the target Dead for damage past Out, and undo lifts it",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const out = target.system.woundLevels.out.value;
            await target.update({ "system.suffered": out - 5 });
            const damage = await rollDamageFromAttack(await attack(actor, katana, target), {
              askForOptions: false
            });
            await applyDamage(damage, [target]);
            assert.isTrue(target.statuses.has("dead"));
            assert.isTrue(resultOf(damage).getFlag(SYS_ID, "damageResult").killed);
            await click(resultOf(damage), "[data-action='damage-undo']");
            assert.isTrue(await waitFor(() => !target.statuses.has("dead")), "Dead lifted");
            assert.equal(target._source.system.suffered, out - 5);
          })
        );

        it(
          "should roll damage from the hit's Damage button and apply it to the selected token",
          clean(async function () {
            if (!canvas.scene) {
              this.skip();
            }
            const { actor, katana } = await attacker();
            const target = await defender();
            const hit = await attack(actor, katana, target);
            const damageOf = () =>
              game.messages.contents.find(m => m.type === "roll" && m.system.attackOf === hit.id);
            // Shift-click skips the damage options, as on the card
            (await hit.renderHTML())
              .querySelector("[data-action='check-damage']")
              .dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true })
              );
            assert.isTrue(await waitFor(damageOf), "the damage roll posted");
            assert.equal(damageOf().system.outcome.total, 18, "6k2 of nines");

            const data = (await target.getTokenDocument({ x: 0, y: 0 })).toObject();
            const [token] = await canvas.scene.createEmbeddedDocuments("Token", [data]);
            try {
              await waitFor(() => token.object);
              token.object.control({ releaseOthers: true });
              await click(damageOf(), "[data-action='damage-apply-selected']");
              assert.isTrue(await waitFor(() => token.actor._source.system.suffered === 18));
            } finally {
              canvas.tokens.releaseAll();
              await token.delete();
            }
          })
        );

        it(
          "should give a miss no damage button",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const miss = await attack(actor, katana, target, { tn: 40 });
            assert.isFalse(miss.system.outcome.success);
            assert.notInclude(miss.content, "check-damage");
          })
        );
      });

      // game-rules/73_armor.md, p.198
      // game-rules/99_creatures.md, p.319-320
      describe("Damage sources", () => {
        it(
          "should turn damage into one Wound with Invulnerability unless the weapon's DamageSource is jade",
          clean(async () => {
            const invulnerable = [{ name: "Oni", system: { rules: [{ key: "Invulnerability" }] } }];
            const plain = await attacker();
            const target = await defender({ effects: invulnerable });
            const damage = await rollDamageFromAttack(
              await attack(plain.actor, plain.katana, target),
              { askForOptions: false }
            );
            await applyDamage(damage, [target]);
            assert.equal(target._source.system.suffered, 1);
            assert.isTrue(resultOf(damage).getFlag(SYS_ID, "damageResult").invulnerable);

            const jade = await attacker([{ key: "DamageSource", tags: ["jade"] }]);
            const jadeDamage = await rollDamageFromAttack(
              await attack(jade.actor, jade.katana, target),
              { askForOptions: false }
            );
            assert.deepEqual(jadeDamage.system.sources, ["jade"]);
            await applyDamage(jadeDamage, [target]);
            assert.equal(target._source.system.suffered, 1 + 18);
          })
        );

        it(
          "should scope a weapon's DamageSource to that weapon",
          clean(async () => {
            const { actor } = await attacker([{ key: "DamageSource", tags: ["jade"] }]);
            const unarmed = await rollPool({
              actor,
              roll: 3,
              keep: 1,
              rollName: "Unarmed",
              rollType: "damage",
              askForOptions: false
            });
            assert.deepEqual(unarmed.system.sources, []);
          })
        );

        it(
          "should halve Spirit damage after Reduction, rounding down; a Reduction exception skips its part",
          clean(async () => {
            const spirit = [
              {
                name: "Spirit",
                system: {
                  rules: [{ key: "Spirit" }, { key: "Reduction", value: 5, except: ["jade"] }]
                }
              }
            ];
            const { actor, katana } = await attacker();
            const target = await defender({ effects: spirit });
            const damage = await rollDamageFromAttack(await attack(actor, katana, target), {
              askForOptions: false
            });
            await applyDamage(damage, [target]);
            assert.equal(target._source.system.suffered, 6, "floor((18 - 5) / 2)");

            const jade = await attacker([{ key: "DamageSource", tags: ["jade"] }]);
            const jadeDamage = await rollDamageFromAttack(
              await attack(jade.actor, jade.katana, target),
              { askForOptions: false }
            );
            await applyDamage(jadeDamage, [target]);
            assert.equal(target._source.system.suffered, 6 + 18, "jade: no Reduction, not halved");
          })
        );
      });

      // game-rules/38_maneuvers.md, p.86-87
      describe("Maneuvers", () => {
        it(
          "should make declared Raises left over Increased Damage, +1k0 each",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 2 });
            assert.equal(hit.system.maneuvers.increasedDamage, 2);
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "8k2");
          })
        );

        // roadmap/STAGE-10 decision 2
        it(
          "should add half the margin over the raised TN to Feint damage, rounded down",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender({ armor: { bonus: 1, reduction: 0 } });
            const hit = await attack(actor, katana, target, { raises: 2, "maneuver.feint": true });
            assert.equal(hit.system.tn.effective, 31, "21 + 2 Raises");
            assert.equal(hit.system.outcome.margin, 5);
            assert.equal(hit.system.maneuvers.increasedDamage, 0, "both Raises pay for the Feint");
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            const feint = damage.system.modifiers.find(m => m.total);
            assert.equal(feint.total, 2, "floor(5 / 2)");
            assert.equal(damage.system.outcome.total, 18 + 2);
          })
        );

        // The Feint margin leaves out the attacker's wound penalty (Ernie's ruling)
        it(
          "should read the Feint margin over the target's Armor TN + 10, not the attacker's wound penalty",
          clean(async () => {
            const { actor, katana } = await attacker();
            // Nicked: +3 to the attacker's TN
            // game-rules/33_wounds.md, p.82
            const nicked = actor.system.woundLevels.healthy.value + 1;
            await actor.update({ "system.suffered": nicked });
            const target = await defender({ armor: { bonus: 1, reduction: 0 } });
            const hit = await attack(actor, katana, target, { raises: 2, "maneuver.feint": true });
            assert.equal(hit.system.tn.effective, 34, "21 + 2 Raises + 3 for Nicked");
            assert.equal(hit.system.tn.armor, 21);
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(
              damage.system.modifiers.find(m => m.total).total,
              2,
              "floor((36 - 31) / 2), not floor((36 - 34) / 2)"
            );
          })
        );

        it(
          "should stop the roll for maneuvers the Raises cannot pay for when the GM declines",
          clean(async () => {
            // Void 3, so Disarm (3) is within the cap and offered; 1 declared Raise does not pay for it. The values are
            // set without input events, so the dialog's live check does not disable Roll and the pipeline's check runs;
            // an empty gmAllowed is a player's form, so the GM is asked (#223)
            const { actor, katana } = await attacker([], 3);
            const target = await defender();
            const before = game.messages.size;
            const { result: none } = await withGmAnswer(false, () =>
              attack(actor, katana, target, {
                raises: 1,
                gmAllowed: "",
                "maneuver.disarm": true
              })
            );
            assert.isNull(none);
            assert.equal(game.messages.size, before);
          })
        );

        it(
          "should pay for a maneuver with Free Raises before declared Raises",
          clean(async () => {
            const { actor, katana } = await attacker();
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Free",
                system: { rules: [{ key: "FreeRaise", selector: "skill:kenjutsu", value: 2 }] }
              }
            ]);
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 1, "maneuver.feint": true });
            assert.isTrue(Boolean(hit), "the Feint is paid for");
            assert.equal(
              hit.system.maneuvers.increasedDamage,
              1,
              "the declared Raise is left over"
            );
          })
        );

        // #157
        // game-rules/28_raises.md, p.79
        it(
          "should make Free Raises left after the TN and maneuvers Increased Damage, and say so on the card",
          clean(async () => {
            const { actor, katana } = await attacker();
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Free",
                system: { rules: [{ key: "FreeRaise", selector: "skill:kenjutsu", value: 2 }] }
              }
            ]);
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 0 });
            assert.deepInclude(hit.system.maneuvers, { cost: 0, increasedDamage: 2 });
            assert.include(
              hit.content,
              F("l5r4.ui.check.raisesFreeAttackNote", {
                count: 0,
                free: 2,
                maneuvers: 0,
                damage: 2
              })
            );
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            const label = T("l5r4.ui.check.increasedDamage");
            assert.deepInclude(
              damage.system.modifiers.find(m => m.label === label),
              { roll: 2 },
              "+2k0 on the damage"
            );
          })
        );

        it(
          "should roll Disarm as 2k1 damage without Strength, and disarm for the winner of Contested Strength",
          clean(async () => {
            const { actor, katana } = await attacker([], 3);
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 3, "maneuver.disarm": true });
            assert.isTrue(hit.system.outcome.success);
            assert.include(hit.content, "combat-contest");
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "2k1");
            const winner = game.i18n.format("l5r4.ui.check.contestWinner", { name: actor.name });
            const stop = autoAnswerRolls();
            try {
              // The card's Contested Strength button
              await click(hit, "[data-action='combat-contest']");
              assert.isTrue(
                await waitFor(() => game.messages.contents.at(-1).content.includes(winner))
              );
            } finally {
              stop();
            }
            const verdict = game.messages.contents.at(-1).content;
            assert.include(
              verdict,
              game.i18n.format("l5r4.ui.check.contestWinner", { name: actor.name }),
              "Strength 3 (27) beats Strength 2 (18)"
            );
            assert.include(
              verdict,
              game.i18n.format("l5r4.ui.combat.disarmed", { name: target.name })
            );
          })
        );

        // #148
        // game-rules/38_maneuvers.md, p.86
        it(
          "should roll a Disarm's 2k1 exploding on 10, without the weapon's Explodes on or damage rules",
          clean(async () => {
            const { actor, katana } = await attacker(
              [{ key: "RollModifier", selector: "damage", roll: 1 }],
              3
            );
            // The batch rolls every die as a 9, so dice exploding on 9 would never stop
            await katana.update({ "system.explodesOn": 9 });
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 3, "maneuver.disarm": true });
            assert.equal(hit.system.damage.explode, 9, "the attack stores the weapon's");
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "2k1");
            assert.include(damage.rolls[0].formula, "2d10xa10k1");
            const fromKatana = message =>
              message.system.modifiers.filter(m => m.label === katana.name).length;
            assert.equal(fromKatana(damage), 0, "no weapon rule");
            await katana.update({ "system.explodesOn": 10 });
            const plain = await attack(actor, katana, target, { raises: 0 });
            const normal = await rollDamageFromAttack(plain, { askForOptions: false });
            assert.equal(fromKatana(normal), 1, "a normal hit has the weapon's rule");
          })
        );

        it(
          "should knock the target Prone on Knockdown when Contested Strength is won",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const hit = await attack(actor, katana, target, {
              raises: 2,
              "maneuver.knockdown": true
            });
            assert.isTrue(hit.system.maneuvers.knockdown);
            const stop = autoAnswerRolls();
            try {
              await rollContest(hit);
            } finally {
              stop();
            }
            assert.isTrue(await waitFor(() => target.statuses.has("prone")));
          })
        );

        // #165: a connected player's side is theirs to roll, Void Point and Raises included
        // game-rules/25_rings_and_traits.md, p.78
        it(
          "should leave a connected player's Contested Strength to them, and ask the GM before rolling it",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const hit = await attack(actor, katana, target, {
              raises: 2,
              "maneuver.knockdown": true
            });
            const stop = autoAnswerRolls();
            try {
              await withConnectedPlayer(target, async () => {
                const first = await withGmAnswer(true, () => rollContest(hit));
                assert.lengthOf(first.asked, 0, "the GM had a side of its own to roll");
                assert.exists(contestRollsOf(hit).attacker, "the side no player plays is rolled");
                assert.notExists(contestRollsOf(hit).target, "the player's side waits");
                const waited = await withGmAnswer(false, () => rollContest(hit));
                assert.lengthOf(waited.asked, 1, "a press with nothing else left asks the GM");
                assert.include(waited.asked[0], target.name);
                assert.notExists(contestRollsOf(hit).target, "declined, it still waits");
                await withGmAnswer(true, () => rollContest(hit));
                assert.exists(contestRollsOf(hit).target, "the GM rolls for them");
              });
            } finally {
              stop();
            }
            assert.isTrue(await waitFor(() => target.statuses.has("prone")), "and it settles");
          })
        );

        it(
          "should cost 4 Raises for Knockdown against four legs",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const { result: short } = await withGmAnswer(false, () =>
              attack(actor, katana, target, {
                raises: 3,
                gmAllowed: "",
                "maneuver.knockdown": true,
                "maneuver.fourLegged": true
              })
            );
            assert.isNull(short, "a player's 3 Raises do not pay 4, and the GM declines");
          })
        );

        // #135: the dialog shows the cost, raises the Raises to cover it, and never closes on a roll it cannot pay
        // game-rules/28_raises.md, p.79
        // game-rules/38_maneuvers.md, p.86
        it(
          "should keep the maneuvers' cost, payment, and TN live in the attack dialog",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const opened = new Promise(resolve => Hooks.once("renderDialogV2", resolve));
            const rolled = rollCheck({
              actor,
              kind: "attack",
              label: "Attack",
              base: { roll: 6, keep: 4 },
              skill: "kenjutsu",
              trait: "agi",
              weapon: katana,
              target,
              tn: 20
            });
            const app = await opened;
            const form = app.element.querySelector("form");
            const set = (name, value) => {
              const field = form.elements.namedItem(name);
              field.value = String(value);
              field.dispatchEvent(new Event("change", { bubbles: true }));
            };
            const line = form.querySelector("[data-maneuver-cost]");
            const roll = form.querySelector("[data-action='ok']");
            const askGm = form.querySelector("[data-maneuver-ask]");
            const allowed = form.elements.namedItem("gmAllowed");
            const option = value =>
              form.querySelector(`[name="maneuver.calledShot"] option[value="${value}"]`);
            assert.isTrue(line.hidden, "no maneuver, no cost line");
            // #223: a GM is never locked
            assert.equal(allowed.value, "1", "the GM's dialog is unlocked");
            assert.isFalse(option("3").disabled, "the GM may pick past the cap");
            assert.isTrue(askGm.hidden);
            // A player's dialog: locked until the GM allows more
            set("gmAllowed", "");
            assert.isTrue(option("3").disabled, "a head shot (3) is over the Void Ring 2 cap");
            assert.include(option("3").title, "3");
            assert.isFalse(option("2").disabled);
            assert.isFalse(askGm.hidden, "a locked choice offers to ask the GM");

            set("maneuver.calledShot", 2);
            assert.equal(form.elements.namedItem("raises").value, "2", "Raises cover the hand");
            assert.isFalse(line.hidden);
            assert.equal(
              line.textContent,
              F("l5r4.ui.combat.maneuverCost", {
                cost: 2,
                free: 0,
                raises: 2,
                tn: 20 + 2 * 5 + actor.system.woundPenalty
              })
            );
            const feint = form.elements.namedItem("maneuver.feint");
            assert.isTrue(feint.disabled, "a Feint on top costs 4, over the cap");
            assert.isFalse(roll.disabled);

            set("raises", 1);
            assert.isTrue(roll.disabled, "1 Raise does not pay for 2");
            assert.isFalse(form.querySelector("[data-maneuver-short]").hidden);
            assert.equal(
              form.elements.namedItem("raises").value,
              "1",
              "the roller's own Raises stay"
            );

            // The GM allows it: everything unlocks, and the roll goes through short
            const confirm = foundry.applications.api.DialogV2.confirm;
            foundry.applications.api.DialogV2.confirm = async () => true;
            try {
              askGm.click();
              assert.isTrue(await waitFor(() => allowed.value === "1"), "the GM allowed more");
            } finally {
              foundry.applications.api.DialogV2.confirm = confirm;
            }
            assert.isFalse(roll.disabled);
            assert.isFalse(feint.disabled);
            assert.isTrue(askGm.hidden);
            roll.click();
            const message = await rolled;
            assert.equal(message.system.maneuvers.calledShot, 2, "rolled with 1 Raise for 2");
          })
        );

        // roadmap/STAGE-10 decision 1
        it(
          "should post the Called Shot and Extra Attack notes for the GM",
          clean(async () => {
            const { actor, katana } = await attacker([], 5);
            const target = await defender();
            const called = await attack(actor, katana, target, {
              raises: 3,
              "maneuver.calledShot": "3",
              "maneuver.location": "left eye"
            });
            assert.equal(called.system.maneuvers.calledShot, 3);
            assert.include(called.content, "left eye");
            const extra = await attack(actor, katana, target, {
              tn: 5,
              raises: 5,
              "maneuver.extraAttack": true
            });
            assert.isTrue(extra.system.maneuvers.extraAttack);
            assert.include(extra.content, game.i18n.localize("l5r4.ui.combat.extraAttackNote"));
          })
        );

        // game-rules/38_maneuvers.md, p.87
        it(
          "should raise the ward's Armor TN 10 and lower the guard's 5 on Guard",
          clean(async () => {
            const { actor } = await attacker();
            const ward = await defender();
            const [guardTN, wardTN] = [actor.system.armorTn.current, ward.system.armorTn.current];
            assert.isTrue(await guard(actor, ward));
            assert.equal(actor.system.armorTn.current, guardTN - 5);
            assert.equal(ward.system.armorTn.current, wardTN + 10);
          })
        );

        // Not in the Full Attack Stance, unless the GM allows it (#223)
        // game-rules/38_maneuvers.md, p.87
        it(
          "should Guard from the Full Attack Stance only as the GM allows",
          clean(async () => {
            const { actor } = await attacker();
            const ward = await defender();
            await actor.toggleStatusEffect("fullAttackStance", { active: true });
            const declined = await withGmAnswer(false, () => guard(actor, ward));
            assert.isFalse(declined.result);
            assert.include(declined.asked[0], T("l5r4.ui.combat.guardFullAttack"));
            assert.isFalse(ward.statuses.has("guarded"));
            const allowed = await withGmAnswer(true, () => guard(actor, ward));
            assert.isTrue(allowed.result);
            assert.isTrue(ward.statuses.has("guarded"));
          })
        );
      });

      // game-rules/40_grappling.md, p.88-89
      describe("Grapple", () => {
        it(
          "should ignore armor on the attack; control, then a Throw, ends it with the target Prone",
          clean(async () => {
            const { actor } = await attacker();
            const target = await defender({ armor: { bonus: 5, reduction: 0 } });
            const hit = await grappleAttack(actor, target);
            assert.equal(hit.system.tn.effective, 20, "Armor TN 25 without the armor's 5");
            assert.include(hit.content, "grapple-start");
            assert.notInclude(hit.content, "check-damage", "starting a grapple deals no damage");

            // The card's Start grapple button; the grapple's flow card is the first posted after it
            const before = game.messages.size;
            await click(hit, "[data-action='grapple-start']");
            const flowCard = () =>
              game.messages.contents.slice(before).find(m => m.getFlag(SYS_ID, "flow"));
            assert.isTrue(
              await waitFor(
                () =>
                  flowCard() && actor.statuses.has("grappled") && target.statuses.has("grappled")
              )
            );
            const card = flowCard();
            const stop = autoAnswerRolls();
            try {
              await click(card, "[data-flow-action='control'][data-side='1']");
              await waitFor(() => card.getFlag(SYS_ID, "flow").state.rolls[1] !== null);
              await click(card, "[data-flow-action='control'][data-side='0']");
              // Settling adds the winner's line to the log and clears both rolls
              assert.isTrue(
                await waitFor(() => card.getFlag(SYS_ID, "flow").state.log.length === 2),
                "both rolled and the contest settled"
              );
              assert.deepEqual(card.getFlag(SYS_ID, "flow").state.rolls, [null, null]);
            } finally {
              stop();
            }
            assert.equal(
              card.getFlag(SYS_ID, "flow").state.control,
              0,
              "Jiujutsu 1 + Strength 3 (4k3, 27) beats an Unskilled Strength 2 (2k2, 18)"
            );
            await click(card, "[data-flow-action='throw']");
            assert.isTrue(await waitFor(() => target.statuses.has("prone")));
            assert.isTrue(await waitFor(() => !actor.statuses.has("grappled")));
            assert.isFalse(target.statuses.has("grappled"));
            assert.isTrue(card.getFlag(SYS_ID, "flow").state.over);
          })
        );

        it(
          "should roll Hit as unarmed damage, Strength keep 1, against the other side",
          clean(async () => {
            const { actor } = await attacker();
            const target = await defender();
            const card = await startGrapple(await grappleAttack(actor, target));
            assert.include(
              card.content,
              game.i18n.localize("l5r4.ui.combat.grapple.titleFor", {
                name: actor.name,
                target: target.name
              }),
              "the card's title names both sides in one key"
            );
            const stop = autoAnswerRolls();
            try {
              await click(card, "[data-flow-action='hit']");
              assert.isTrue(await waitFor(() => card.getFlag(SYS_ID, "flow").state.log.length > 1));
            } finally {
              stop();
            }
            const damage = game.messages.contents.findLast(
              m => m.type === "roll" && m.system.kind === "damage"
            );
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "3k1");
            assert.equal(damage.system.target.uuid, target.uuid);
          })
        );

        // game-rules/40_grappling.md, p.89
        it(
          "should deal weapon damage in a weapon grapple; losing control gives two Free Raises to Disarm",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = track(
              await createTestPC({
                name: "Combat wrestler",
                system: { traits: { ref: 3, awa: 3, str: 5 } }
              })
            );
            await target.createEmbeddedDocuments("Item", [createSkillData("Jiujutsu", 3, "agi")]);
            const card = await startGrapple(
              await attack(actor, katana, target, { "maneuver.grapple": true })
            );
            assert.equal(card.getFlag(SYS_ID, "flow").state.skill, "kenjutsu");
            const stop = autoAnswerRolls();
            try {
              await click(card, "[data-flow-action='hit']");
              assert.isTrue(
                await waitFor(() => card.getFlag(SYS_ID, "flow").state.log.length === 2)
              );
              const damage = game.messages.contents.findLast(
                m => m.type === "roll" && m.system.kind === "damage"
              );
              assert.equal(
                `${damage.system.pool.roll}k${damage.system.pool.keep}`,
                "6k2",
                "the katana's 3k2 plus Strength 3, not Strength k1"
              );
              assert.equal(damage.system.target.uuid, target.uuid);

              await click(card, "[data-flow-action='control'][data-side='0']");
              await waitFor(() => card.getFlag(SYS_ID, "flow").state.rolls[0] !== null);
              await click(card, "[data-flow-action='control'][data-side='1']");
              assert.isTrue(
                await waitFor(() => card.getFlag(SYS_ID, "flow").state.log.length === 4),
                "both rolled and the contest settled"
              );
            } finally {
              stop();
            }
            const { state } = card.getFlag(SYS_ID, "flow");
            assert.equal(
              state.control,
              1,
              "Jiujutsu 3 + Strength 5 (8k5, 45) beats Kenjutsu 2 + Strength 3 (5k3, 27)"
            );
            assert.include(
              state.log,
              F("l5r4.ui.combat.grapple.weaponLost", { name: target.name })
            );
          })
        );
      });

      // game-rules/39_iaijutsu_dueling.md, p.87-88
      describe("Iaijutsu duel", () => {
        it(
          "should run Assessment, Focus, and Strike in order; the Focus winner strikes first",
          clean(async () => {
            const { actor } = await attacker();
            const target = await defender();
            const card = await startDuel(actor, target);
            const state = () => card.getFlag(SYS_ID, "flow").state;
            const stop = autoAnswerRolls();
            try {
              for (const stage of ["assessment", "focus"]) {
                assert.equal(state().stage, stage);
                await click(card, "[data-flow-action='roll'][data-duelist='0']");
                await waitFor(() => state().rolls[stage][0] !== null);
                await click(card, "[data-flow-action='roll'][data-duelist='1']");
                await waitFor(() => state().stage !== stage);
              }
              const assessment = state().rolls.assessment;
              assert.equal(assessment[0].total, 27, "Iaijutsu 2 + Awareness 3: 5k3 of nines");
              assert.equal(assessment[1].total, 27, "Iaijutsu 1 + Awareness 3: 4k3");
              assert.deepEqual(state().focusBonus, [false, false]);
              assert.equal(state().stage, "strike");
              const [a, b] = state().rolls.focus.map(r => r.total);
              assert.equal(a, 18, "Iaijutsu 2 + Void 2: 4k2");
              assert.equal(b, 18, "Iaijutsu 1 + Void 2: 3k2");
              assert.isNull(state().firstStrike, "a margin under 5 is a kharmic strike");

              await click(card, "[data-flow-action='roll'][data-duelist='0']");
              await waitFor(() => state().rolls.strike[0] !== null);
              await click(card, "[data-flow-action='roll'][data-duelist='1']");
              assert.isTrue(await waitFor(() => state().stage === "done"));
            } finally {
              stop();
            }
            const strike = game.messages.contents.findLast(
              m => m.type === "roll" && m.system.actorUuid === actor.uuid
            );
            assert.equal(strike.system.kind, "attack");
            assert.equal(strike.system.tn.effective, target.system.armorTn.current);
            assert.equal(
              strike.system.damage.label,
              "Katana",
              "the strike carries the sword's damage"
            );
            assert.include(strike.content, "check-damage", "5k3 of nines (27) hits Armor TN 20");
          })
        );

        // game-rules/60_bugei_skills.md, p.140
        it(
          "should give Iaijutsu Mastery +2k2 for the Assessment edge at Rank 7 and +5 on Focus from Rank 5",
          clean(async () => {
            const master = track(
              await createTestPC({
                name: "Combat iaijutsu master",
                system: { traits: { awa: 5, ref: 3 } }
              })
            );
            await master.createEmbeddedDocuments("Item", [createSkillData("Iaijutsu", 7, "ref")]);
            const target = await defender();
            const card = await startDuel(master, target);
            const state = () => card.getFlag(SYS_ID, "flow").state;
            const stop = autoAnswerRolls();
            try {
              await click(card, "[data-flow-action='roll'][data-duelist='0']");
              await waitFor(() => state().rolls.assessment[0] !== null);
              await click(card, "[data-flow-action='roll'][data-duelist='1']");
              await waitFor(() => state().stage === "focus");
              assert.deepEqual(state().focusBonus, [true, false], "54 against 27");
              assert.include(card.content, "+2k2");
              await click(card, "[data-flow-action='roll'][data-duelist='0']");
              await waitFor(() => state().rolls.focus[0] !== null);
            } finally {
              stop();
            }
            const focus = game.messages.contents.findLast(
              m => m.type === "roll" && m.system.actorUuid === master.uuid
            );
            const mods = focus.system.modifiers.map(m => [m.label, m.roll, m.keep, m.total]);
            assert.deepInclude(mods, [T("l5r4.ui.combat.duel.assessmentEdge"), 2, 2, 0]);
            assert.deepInclude(mods, [T("l5r4.ui.combat.duel.focusMastery"), 0, 0, 5]);
          })
        );

        // The Focus winner's Free Raises are offered in the Strike dialog, where one may lower the TN (#119)
        // game-rules/28_raises.md, p.79
        it(
          "should offer the Focus winner's Free Raises in the Strike dialog",
          clean(async function () {
            this.timeout(15_000);
            const master = track(
              await createTestPC({
                name: "Combat iaijutsu striker",
                system: { traits: { awa: 5, ref: 3 } }
              })
            );
            await master.createEmbeddedDocuments("Item", [createSkillData("Iaijutsu", 7, "ref")]);
            const target = await defender();
            const card = await startDuel(master, target);
            const state = () => card.getFlag(SYS_ID, "flow").state;
            const stop = autoAnswerRolls();
            try {
              for (const stage of ["assessment", "focus"]) {
                await click(card, "[data-flow-action='roll'][data-duelist='0']");
                await waitFor(() => state().rolls[stage][0] !== null);
                await click(card, "[data-flow-action='roll'][data-duelist='1']");
                await waitFor(() => state().stage !== stage);
              }
            } finally {
              stop();
            }
            // 11k4 of nines + 5 (41) against 3k2 (18): a margin of 23 is 3 Free Raises
            assert.equal(state().freeRaises, 3);
            let offered = null;
            Hooks.once("renderDialogV2", app => {
              const field = app.element.querySelector("[name='freeRaisesToTn']");
              offered = field ? Number(field.max) : 0;
              if (field) {
                field.value = String(offered);
              }
              app.element.querySelector('[data-action="ok"]').click();
            });
            await click(card, "[data-flow-action='roll'][data-duelist='0']");
            await waitFor(() => state().rolls.strike[0] !== null);
            assert.equal(offered, 3, "the dialog offers the 3 Free Raises");
            const strike = game.messages.contents.findLast(
              m => m.type === "roll" && m.system.actorUuid === master.uuid
            );
            assert.equal(strike.system.tn.freeRaisesToTN, 3, "spent on the TN");
          })
        );

        // The duelist a first strike hits may yield, which ends the duel; striking back stays their choice
        // (decision 18, #120)
        // game-rules/39_iaijutsu_dueling.md, p.87
        it(
          "should let the duelist the first strike hit yield, and end the duel",
          clean(async function () {
            this.timeout(15_000);
            const master = track(
              await createTestPC({
                name: "Combat iaijutsu first blood",
                system: { traits: { awa: 5, ref: 3 } }
              })
            );
            await master.createEmbeddedDocuments("Item", [createSkillData("Iaijutsu", 7, "ref")]);
            const target = await defender();
            const card = await startDuel(master, target);
            const state = () => card.getFlag(SYS_ID, "flow").state;
            const buttons = () =>
              [...card.content.matchAll(/data-flow-action="(\w+)"[^>]*data-duelist="(\d)"/g)].map(
                ([, action, i]) => `${action}:${i}`
              );
            const stop = autoAnswerRolls();
            try {
              for (const stage of ["assessment", "focus"]) {
                await click(card, "[data-flow-action='roll'][data-duelist='0']");
                await waitFor(() => state().rolls[stage][0] !== null);
                await click(card, "[data-flow-action='roll'][data-duelist='1']");
                await waitFor(() => state().stage !== stage);
              }
              assert.deepEqual(buttons(), ["roll:0"], "no yield before the first strike");
              // 10k3 of nines (27) against Armor TN 20
              await click(card, "[data-flow-action='roll'][data-duelist='0']");
              await waitFor(() => state().rolls.strike[0] !== null);
            } finally {
              stop();
            }
            assert.isTrue(state().rolls.strike[0].success, "the first strike hits");
            assert.sameMembers(buttons(), ["roll:1", "concede:1"], "strike back or yield");
            assert.include(card.content, F("l5r4.ui.combat.duel.yield", { name: target.name }));
            await click(card, "[data-flow-action='concede'][data-duelist='1']");
            assert.isTrue(await waitFor(() => state().stage === "done"), "the duel is over");
            assert.include(card.content, F("l5r4.ui.combat.duel.yielded", { name: target.name }));
            assert.deepEqual(buttons(), []);
          })
        );

        // A Technique's Focus-roll bonus reaches the Focus roll only (#118)
        // game-rules/51_crane_schools.md, p.109
        it(
          "should give a rule on duel:focus to the Focus roll and not to Assessment",
          clean(async function () {
            this.timeout(15_000);
            const { actor } = await attacker();
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Combat focus technique",
                type: "technique",
                system: {
                  rules: [
                    {
                      key: "RollModifier",
                      selector: "skill:iaijutsu",
                      roll: 1,
                      keep: 1,
                      predicate: ["duel:focus"],
                      label: "Combat focus bonus"
                    }
                  ]
                }
              }
            ]);
            const target = await defender();
            const card = await startDuel(actor, target);
            const state = () => card.getFlag(SYS_ID, "flow").state;
            const labelsOf = () =>
              game.messages.contents
                .findLast(m => m.type === "roll" && m.system.actorUuid === actor.uuid)
                .system.modifiers.map(m => m.label);
            const stop = autoAnswerRolls();
            try {
              await click(card, "[data-flow-action='roll'][data-duelist='0']");
              await waitFor(() => state().rolls.assessment[0] !== null);
              assert.notInclude(labelsOf(), "Combat focus bonus", "Assessment");
              await click(card, "[data-flow-action='roll'][data-duelist='1']");
              await waitFor(() => state().stage === "focus");
              await click(card, "[data-flow-action='roll'][data-duelist='0']");
              await waitFor(() => state().rolls.focus[0] !== null);
              assert.include(labelsOf(), "Combat focus bonus", "Focus");
            } finally {
              stop();
            }
          })
        );

        // The GM may let a Dazed character fight anyway (#223)
        // game-rules/41_conditional_effects.md, p.89
        it("should keep a Dazed character from a duel unless the GM allows it", async () => {
          const { actor } = await attacker();
          const target = await defender();
          await target.toggleStatusEffect("dazed", { active: true });
          const declined = await withGmAnswer(false, () => startDuel(actor, target));
          assert.isNull(declined.result, "declined");
          assert.include(declined.asked[0], F("l5r4.ui.combat.duel.dazed", { name: target.name }));
          const { result: card } = await withGmAnswer(true, () => startDuel(actor, target));
          assert.exists(card, "allowed");
          await card.delete();
        });
      });

      // game-rules/73_armor.md, p.198
      // game-rules/74_weapons.md, p.198-199
      describe("Armor", () => {
        it(
          "should ignore the target's armor with an Armor Piercing arrow and double it with a Flesh Cutter",
          clean(async () => {
            const { actor } = await attacker();
            const [bow] = await actor.createEmbeddedDocuments("Item", [
              createWeaponData("Combat yumi", 0, 0, {
                system: { isBow: true, str: 3, arrow: "armor", associatedSkill: "Kyujutsu" }
              })
            ]);
            const target = await defender({ armor: { bonus: 5, reduction: 3 } });
            assert.equal(target.system.armorTn.current, 25, "Reflexes 3: 20, light armor +5");
            const shoot = () =>
              rollCheck({
                actor,
                kind: "attack",
                label: "Shot",
                base: { roll: 6, keep: 4 },
                weapon: bow,
                target,
                tn: target.system.armorTn.current,
                askForOptions: false
              });
            const piercing = await shoot();
            assert.equal(piercing.system.tn.effective, 20, "Armor Piercing: 25 - 5");
            // The card lists every TN change it kept (roadmap/STAGE-18 decision 17, #115)
            assert.include(
              foundry.utils.parseHTML(piercing.content).textContent,
              `(${T("l5r4.ui.combat.arrowArmor.armor")} -5)`,
              "the card names the arrow's change"
            );
            // The dialog lists the arrow's change before the roll (#105)
            assert.deepInclude(
              getCheckContext(actor, { kind: "attack", weapon: bow, target }).tnModifiers,
              { label: T("l5r4.ui.combat.arrowArmor.armor"), value: -5, fromTarget: true },
              "the roll dialog shows the Armor Piercing change"
            );
            await bow.update({ "system.arrow": "flesh" });
            assert.equal((await shoot()).system.tn.effective, 30, "Flesh Cutter: 25 + 5");
          })
        );

        // game-rules/74_weapons.md, p.199
        it(
          "should need Strength 3 to wield a dai-kyu, which the GM may waive; +10 TN on foot, none mounted",
          clean(async () => {
            const archer = track(
              await createTestPC({ name: "Combat archer", system: { traits: { str: 2, ref: 3 } } })
            );
            const [daikyu] = await archer.createEmbeddedDocuments("Item", [
              createWeaponData("Combat dai-kyu", 0, 0, {
                system: {
                  isBow: true,
                  str: 4,
                  minStrength: 3,
                  tnOnFoot: 10,
                  associatedSkill: "Kyujutsu"
                }
              })
            ]);
            const target = await defender();
            const shoot = () =>
              rollCheck({
                actor: archer,
                kind: "attack",
                label: "Shot",
                base: { roll: 3, keep: 3 },
                weapon: daikyu,
                target,
                tn: target.system.armorTn.current,
                askForOptions: false
              });
            const answer = action =>
              new Promise(resolve =>
                Hooks.once("renderDialogV2", app => {
                  app.element.querySelector(`[data-action="${action}"]`).click();
                  resolve();
                })
              );
            let answered = answer("no");
            assert.isNull(await shoot(), "Strength 2 under 3: the GM declines");
            await answered;
            answered = answer("yes");
            const onFoot = await shoot();
            await answered;
            assert.equal(onFoot.system.tn.effective, 30, "Armor TN 20 + 10 on foot");
            await archer.update({ "system.traits.str": 3 });
            await archer.toggleStatusEffect("mounted", { active: true });
            assert.equal(
              (await shoot()).system.tn.effective,
              20,
              "mounted, Strength 3: no question"
            );
          })
        );

        // game-rules/74_weapons.md, p.199
        it(
          "should take -10 on a bow shot at a target in melee range, when the roller says so",
          clean(async () => {
            const { actor } = await attacker();
            const [bow] = await actor.createEmbeddedDocuments("Item", [
              createWeaponData("Combat yumi", 0, 0, {
                system: { isBow: true, str: 3, associatedSkill: "Kyujutsu" }
              })
            ]);
            const target = await defender();
            const shoot = choices => {
              const answered = answerCheckDialog(choices);
              return rollCheck({
                actor,
                kind: "attack",
                label: "Shot",
                base: { roll: 6, keep: 4 },
                weapon: bow,
                ranged: true,
                target,
                tn: target.system.armorTn.current
              }).then(async message => (await answered, message));
            };
            const label = T("l5r4.equipment.weapons.rangedInMelee");
            const index = getCheckContext(actor, {
              kind: "attack",
              weapon: bow,
              target
            }).modifiers.findIndex(m => m.label === label);
            assert.isAtLeast(index, 0, "offered, unticked");
            assert.equal((await shoot({})).rolls[0].total, 36, "6k4 of nines");
            assert.equal((await shoot({ [`modifier.${index}`]: true })).rolls[0].total, 26);
          })
        );

        // #149
        // game-rules/32_attack_and_defense.md, p.82
        it(
          "should take -10 on any ranged attack at a target in melee range, and none on a melee attack",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const label = T("l5r4.equipment.weapons.rangedInMelee");
            const index = getCheckContext(actor, {
              kind: "attack",
              weapon: katana,
              target
            }).modifiers.findIndex(m => m.label === label);
            assert.isAtLeast(index, 0, "offered for a weapon that is not a bow");
            const strike = choices => {
              const answered = answerCheckDialog({ [`modifier.${index}`]: true, ...choices });
              return rollCheck({
                actor,
                kind: "attack",
                label: "Thrown katana",
                base: { roll: 6, keep: 4 },
                weapon: katana,
                target,
                tn: target.system.armorTn.current
              }).then(async message => (await answered, message));
            };
            assert.equal((await strike({ isRanged: true })).rolls[0].total, 26, "thrown: -10");
            assert.equal((await strike({ isRanged: false })).rolls[0].total, 36, "melee: none");
          })
        );

        it(
          "should make riding armor's +4 into +12 on horseback",
          clean(async () => {
            const rider = await defender({ armor: { bonus: 4, reduction: 4 } });
            await rider.items
              .find(i => i.type === "armor")
              .update({ "system.armorType": "riding" });
            assert.equal(rider.system.armorTn.current, 24);
            await rider.toggleStatusEffect("mounted", { active: true });
            assert.equal(rider.system.armorTn.current, 32);
          })
        );

        // #152
        // game-rules/41_conditional_effects.md, p.89
        it(
          "should keep an NPC's armor when Grappled or Stunned sets its Armor TN to 5 + armor",
          clean(async () => {
            const npc = track(
              await createTestNPC({
                name: "Combat armored NPC",
                system: { armor: { armorTn: 18, bonus: 3, reduction: 1 } }
              })
            );
            assert.deepInclude(npc.system.armorTn, { base: 15, bonus: 3, current: 18 });
            for (const status of ["grappled", "stunned"]) {
              await npc.toggleStatusEffect(status, { active: true });
              assert.equal(npc.system.armorTn.current, 8, `${status}: 5 + 3 armor`);
              await npc.toggleStatusEffect(status, { active: false });
            }
            await npc.update({ "system.armor.bonus": 0 });
            await npc.toggleStatusEffect("grappled", { active: true });
            assert.equal(npc.system.armorTn.current, 5, "no armor entered: 5");
          })
        );
      });

      // game-rules/31_combat_round.md, p.81
      // game-rules/35_healing_wounds.md, p.84
      describe("NPC Initiative and healing", () => {
        // #30
        it(
          "should roll a new NPC's Initiative as Insight Rank 1 + Reflexes, keep Reflexes, with its modifiers",
          clean(async () => {
            const npc = track(
              await createTestNPC({ name: "Combat initiative", system: { traits: { ref: 3 } } })
            );
            assert.deepInclude(npc.system.initiative, { roll: 4, keep: 3 }, "(1 + 3)k3");
            await npc.update({ "system.initiative.rollMod": 1 });
            const combat = await foundry.documents.Combat.implementation.create({ scene: null });
            try {
              const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
                { actorId: npc.id }
              ]);
              assert.equal(
                combatant._getInitiativeFormula(),
                "5d10xa10k3",
                "the modifier is rolled"
              );
            } finally {
              await combat.delete();
            }
          })
        );

        // #30
        // game-rules/42_fear.md, p.90
        it(
          "should carry Fear's -Xk0 to the Initiative pool",
          clean(async () => {
            const npc = track(
              await createTestNPC({
                name: "Combat fear initiative",
                system: { traits: { ref: 3 } }
              })
            );
            await npc.toggleStatusEffect("feared", { active: true });
            await npc.effects.find(e => e.statuses.has("feared")).update({ "system.level": 2 });
            assert.deepInclude(npc.system.initiative, { roll: 2, keep: 3 }, "(1 + 3 - 2)k3");
          })
        );

        // #30
        it(
          "should roll the formula for an NPC stored with the old 2k2 default after the migration",
          clean(async () => {
            const npc = track(
              await createTestNPC({
                name: "Combat old initiative",
                system: { traits: { ref: 3 }, initiative: { roll: 2, keep: 2 } }
              })
            );
            assert.deepInclude(npc.system.initiative, { roll: 2, keep: 2 }, "the stored pool");
            await migrateNpcInitiative(npc);
            assert.deepInclude(npc.system.initiative, { roll: 4, keep: 3 });
          })
        );

        // #40
        it(
          "should heal an NPC 2 x Stamina + 1 on a long rest, counting it as Insight Rank 1",
          clean(async () => {
            const npc = track(
              await createTestNPC({
                name: "Combat rest",
                system: { traits: { sta: 3 }, suffered: 20 }
              })
            );
            assert.equal(npc.system.wounds.healRate, 7);
            await applyLongRest(npc);
            assert.equal(npc.system.suffered, 13);
          })
        );
      });

      describe("Stat block attacks", () => {
        it(
          "should store an NPC attack's stat block damage for the damage button",
          clean(async () => {
            const npc = track(await createTestNPC({ name: "Combat bandit" }));
            const hit = await rollPool({
              actor: npc,
              roll: 6,
              keep: 4,
              rollName: "Yari",
              rollType: "attack",
              askForOptions: false,
              damage: { label: "Yari", roll: 5, keep: 2, bonus: 1 }
            });
            assert.equal(hit.system.damage.label, "Yari");
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "5k2");
            assert.equal(damage.system.outcome.total, 19, "18 + 1");
          })
        );
      });
    },
    { displayName: "L5R4: Combat loop" }
  );
}
