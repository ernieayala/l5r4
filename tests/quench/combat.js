import { SYS_ID } from "../../module/config/constants.js";
import { F } from "../../module/utils/localization.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { SimpleRoll } from "../../module/services/dice/rolls/simple-roll.js";
import { rollDamageFromAttack, applyDamage } from "../../module/services/combat/damage.js";
import { rollContest } from "../../module/services/combat/contest.js";
import { startGrapple } from "../../module/services/combat/grapple.js";
import { startDuel } from "../../module/services/combat/duel.js";
import { guard } from "../../module/services/combat/guard.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createArmorData, createSkillData, createWeaponData } from "../fixtures/item-fixtures.js";
import {
  answerCheckDialog,
  autoAnswerRolls,
  cleanTest,
  settleChatNotifications,
  waitFor
} from "./helpers.js";

/** Every d10 shows 9: a face is ceil((1 - u) × 10) (client/dice/terms/dice.mjs:412), so no die explodes. */
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
export function registerCombatBatch(quench) {
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
       * Attacks roll 6k4 = 36; the katana's damage is 6k2 = 18. The Void Ring caps declared Raises (p.79).
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

      describe("Attack to Wounds (pp.82, 78)", () => {
        it(
          "a hit's damage lands on its target through Reduction; Void takes back 10; undo restores",
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

        it(
          "damage past Out marks the target Dead; undo lifts it (decision 4)",
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
          "a miss has no damage button",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const miss = await attack(actor, katana, target, { tn: 40 });
            assert.isFalse(miss.system.outcome.success);
            assert.notInclude(miss.content, "check-damage");
          })
        );
      });

      describe("Damage sources (pp.198, 319-320)", () => {
        it(
          "Invulnerability turns damage into one Wound unless the weapon's DamageSource is jade",
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
          "a weapon's DamageSource is scoped to that weapon",
          clean(async () => {
            const { actor } = await attacker([{ key: "DamageSource", tags: ["jade"] }]);
            const unarmed = await SimpleRoll({
              actor,
              diceRoll: 3,
              diceKeep: 1,
              rollName: "Unarmed",
              rollType: "damage",
              askForOptions: false
            });
            assert.deepEqual(unarmed.system.sources, []);
          })
        );

        it(
          "Spirit halves after Reduction, rounding down; a Reduction exception skips its part",
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

      describe("Maneuvers (pp.86-87)", () => {
        it(
          "declared Raises left over are Increased Damage, +1k0 each",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 2 });
            assert.equal(hit.system.maneuvers.increasedDamage, 2);
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "8k2");
          })
        );

        it(
          "Feint adds half the margin over the raised TN, rounded down (decision 2)",
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

        it(
          "maneuvers the Raises cannot pay for stop the roll",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const before = game.messages.size;
            const none = await attack(actor, katana, target, {
              raises: 1,
              "maneuver.disarm": true
            });
            assert.isNull(none);
            assert.equal(game.messages.size, before);
          })
        );

        it(
          "Free Raises pay for a maneuver before declared Raises",
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

        it(
          "Disarm: 2k1 damage without Strength, and the winner of Contested Strength disarms",
          clean(async () => {
            const { actor, katana } = await attacker([], 3);
            const target = await defender();
            const hit = await attack(actor, katana, target, { raises: 3, "maneuver.disarm": true });
            assert.isTrue(hit.system.outcome.success);
            assert.include(hit.content, "combat-contest");
            const damage = await rollDamageFromAttack(hit, { askForOptions: false });
            assert.equal(`${damage.system.pool.roll}k${damage.system.pool.keep}`, "2k1");
            const stop = autoAnswerRolls();
            try {
              await rollContest(hit);
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

        it(
          "Knockdown: winning Contested Strength knocks the target Prone",
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

        it(
          "Knockdown against four legs costs 4 Raises",
          clean(async () => {
            const { actor, katana } = await attacker();
            const target = await defender();
            const short = await attack(actor, katana, target, {
              raises: 3,
              "maneuver.knockdown": true,
              "maneuver.fourLegged": true
            });
            assert.isNull(short);
          })
        );

        it(
          "Called Shot and Extra Attack post their notes for the GM (decision 1)",
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

        it(
          "Guard: the ward's Armor TN rises 10 and the guard's falls 5 (p.87)",
          clean(async () => {
            const { actor } = await attacker();
            const ward = await defender();
            const [guardTN, wardTN] = [actor.system.armorTn.current, ward.system.armorTn.current];
            assert.isTrue(await guard(actor, ward));
            assert.equal(actor.system.armorTn.current, guardTN - 5);
            assert.equal(ward.system.armorTn.current, wardTN + 10);
          })
        );
      });

      describe("Grapple (pp.88-89)", () => {
        it(
          "the attack ignores armor; control, then a Throw, ends it with the target Prone",
          clean(async () => {
            const { actor } = await attacker();
            const target = await defender({ armor: { bonus: 5, reduction: 0 } });
            const hit = await grappleAttack(actor, target);
            assert.equal(hit.system.tn.effective, 20, "Armor TN 25 without the armor's 5");
            assert.include(hit.content, "grapple-start");
            assert.notInclude(hit.content, "check-damage", "starting a grapple deals no damage");

            const card = await startGrapple(hit);
            assert.isTrue(actor.statuses.has("grappled") && target.statuses.has("grappled"));
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
          "Hit rolls unarmed damage, Strength k1, against the other side",
          clean(async () => {
            const { actor } = await attacker();
            const target = await defender();
            const card = await startGrapple(await grappleAttack(actor, target));
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

        it(
          "a weapon grapple hits with the weapon's damage; losing control gives two Free Raises to Disarm (p.89)",
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

      describe("Iaijutsu duel (pp.87-88)", () => {
        it(
          "Assessment, Focus, and Strike in order; the Focus winner strikes first",
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
      });

      describe("Stat block attacks (fix: NPC Apply buttons)", () => {
        it(
          "an NPC attack stores its stat block's damage for the damage button",
          clean(async () => {
            const npc = track(await createTestNPC({ name: "Combat bandit" }));
            const hit = await SimpleRoll({
              actor: npc,
              diceRoll: 6,
              diceKeep: 4,
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
    { displayName: "L5R4: Combat loop (Stage 10)" }
  );
}
