import { SYS_ID } from "../../module/config/constants.js";
import { SkillRoll } from "../../module/services/dice/rolls/skill-roll.js";
import { SimpleRoll } from "../../module/services/dice/rolls/simple-roll.js";
import { TraitRoll } from "../../module/services/dice/rolls/trait-roll.js";
import { RingRoll } from "../../module/services/dice/rolls/ring-roll.js";
import { WeaponRoll } from "../../module/services/dice/rolls/weapon-roll.js";
import { SpellCastRoll } from "../../module/services/dice/rolls/spell-cast-roll.js";
import { MahoCastRoll } from "../../module/services/dice/rolls/maho-cast-roll.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";
import {
  contestRolls,
  rerollKeepBetter,
  rollDamageFromMessage
} from "../../module/services/dice/check/chat-actions.js";
import { inlineFormula } from "../../module/services/chat.js";
import { getStanceEffectCreator } from "../../module/services/stance/core/effect-templates.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData, createWeaponData } from "../fixtures/item-fixtures.js";
import { cleanTest, settleChatNotifications } from "./helpers.js";

/**
 * Answer the next check dialog: set its fields, then click Roll.
 * @param {Record<string, string|boolean>} values  Field name to value; booleans set checkboxes
 * @returns {Promise<string[]>} Resolves with the dialog's modifier labels once it is answered
 */
function answerCheckDialog(values = {}) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      const form = app.element.querySelector("form") ?? app.element;
      const labels = [...app.element.querySelectorAll(".check-modifier-label")].map(e =>
        e.textContent.trim()
      );
      for (const [name, value] of Object.entries(values)) {
        const input = form.querySelector(`[name="${name}"]`);
        if (input.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
        }
      }
      app.element.querySelector('[data-action="ok"]').click();
      resolve(labels);
    });
  });
}

/**
 * The rolled and kept dice of a message's pool.
 * @param {ChatMessage} message
 * @returns {string} Such as "7k3"
 */
const poolOf = message => `${message.system.pool.roll}k${message.system.pool.keep}`;

/**
 * Registers the `roll-pipeline` batch: every roll type goes through L5R4Check and stores its context on a `roll`
 * message; the AUTOMATION.md bugs the pipeline fixes (B1-B3, B7, B9, B11) and #37, #41, #42 each have a case; the
 * dialog's choices (modifier toggles, Raises, Free Raises on the TN, Void, Emphasis) reach the roll; damage,
 * re-rolls, and contests rebuild from the stored context.
 * @param {object} quench  The Quench API object.
 */
export function registerRollPipelineBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.roll-pipeline`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const messages = [];
      const track = actor => (actors.push(actor), actor);
      const keep = message => (messages.push(message), message);

      before(async function () {
        this.timeout(30_000);
        await settleChatNotifications();
      });

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      after(async function () {
        this.timeout(30_000);
        await settleChatNotifications();
        for (const message of messages) {
          await message.delete();
        }
      });

      /**
       * A PC with Agility 3, Reflexes 3 (Air 3), Kenjutsu 2 (Katana Emphasis), and a katana tied to it.
       * @returns {Promise<{actor: Actor, katana: Item}>}
       */
      const swordsman = async (overrides = {}) => {
        const actor = track(
          await createTestPC({
            name: "Pipeline swordsman",
            system: { traits: { agi: 3, ref: 3, awa: 3 } },
            ...overrides
          })
        );
        await actor.createEmbeddedDocuments("Item", [
          createSkillData("Kenjutsu", 2, "agi", { system: { trainedEmphases: ["Katana"] } }),
          createWeaponData("Katana", 3, 2, { system: { associatedSkill: "Kenjutsu" } })
        ]);
        return { actor, katana: actor.items.find(i => i.type === "weapon") };
      };

      describe("Every roll type posts a roll message with its context", () => {
        it(
          "Skill Roll: (Skill + Trait)k(Trait) (p.79)",
          clean(async () => {
            const { actor } = await swordsman();
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            assert.equal(message.type, "roll");
            assert.equal(message.system.kind, "skill");
            assert.equal(poolOf(message), "5k3");
            assert.equal(message.system.actorUuid, actor.uuid);
            assert.equal(message.rolls[0].formula, "5d10k3x10 + 0");
            assert.equal(message.system.outcome.total, message.rolls[0].total);
          })
        );

        it(
          "Trait, Ring, and plain rolls roll and keep the same rank (p.80)",
          clean(async () => {
            const { actor } = await swordsman();
            const trait = keep(
              await TraitRoll({ actor, traitName: "ref", traitRank: 3, askForOptions: false })
            );
            const ring = keep(
              await RingRoll({
                actor,
                ringName: "Air",
                ringRank: 3,
                systemRing: "air",
                askForOptions: false
              })
            );
            const plain = keep(
              await SimpleRoll({
                actor,
                diceRoll: 4,
                diceKeep: 2,
                rollName: "Plain",
                askForOptions: false
              })
            );
            assert.deepEqual(
              [
                trait.system.kind,
                poolOf(trait),
                ring.system.kind,
                poolOf(ring),
                plain.system.kind,
                poolOf(plain)
              ],
              ["trait", "3k3", "ring", "3k3", "roll", "4k2"]
            );
          })
        );

        it(
          "Spell Casting Roll: (Ring + School Rank)k(Ring) against 5 + 5 × Mastery, spending a slot (p.80)",
          clean(async () => {
            const { actor } = await swordsman();
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Spell", type: "spell", system: { ring: "fire", mastery: 2 } }
            ]);
            const fire = actor.system.rings.fire;
            const rank = actor.system.insight.rank;
            const slots = actor._source.system.spellSlots.fire;
            const message = keep(await SpellCastRoll({ actor, spell, showDialog: false }));
            assert.equal(message.system.kind, "spell");
            assert.equal(poolOf(message), `${fire + rank}k${fire}`);
            assert.equal(message.system.tn.base, 15);
            assert.equal(actor._source.system.spellSlots.fire, slots - 1);
          })
        );

        it(
          "A Ring Roll cast as a spell adds the School Rank and spends the chosen slot",
          clean(async () => {
            const { actor } = await swordsman();
            const rank = actor.system.insight.rank;
            const voidSlots = actor._source.system.spellSlots.void;
            const answered = answerCheckDialog({ spellCasting: true, slot: "void" });
            const message = keep(
              await RingRoll({
                actor,
                ringName: "Air",
                ringRank: 3,
                systemRing: "air",
                askForOptions: true
              })
            );
            await answered;
            assert.equal(poolOf(message), `${3 + rank}k3`);
            assert.equal(actor._source.system.spellSlots.void, voidSlots - 1);
          })
        );

        it(
          "Maho: (Insight Rank + Ring)k(Ring), blood paid, extra blood as Free Raises",
          clean(async () => {
            const { actor } = await swordsman();
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench Maho",
                type: "spell",
                system: { ring: "earth", mastery: 1, maho: true }
              }
            ]);
            const answered = answerCheckDialog({ additionalBlood: 2 });
            const message = keep(await MahoCastRoll({ actor, spell, showDialog: true }));
            await answered;
            assert.equal(message.system.kind, "maho");
            assert.equal(actor._source.system.suffered, 4, "blood cost 2 plus 2 extra");
            assert.equal(message.system.tn.freeRaises, 1);
          })
        );

        it(
          "Weapon damage: DR with Strength, Raises as Increased Damage, no Void (p.78, p.80)",
          clean(async () => {
            const { actor, katana } = await swordsman();
            const message = keep(
              await WeaponRoll({
                actor,
                weapon: katana,
                weaponName: katana.name,
                diceRoll: katana.system.derivedDamageRoll,
                diceKeep: katana.system.derivedDamageKeep,
                attackRaises: 2,
                askForOptions: false
              })
            );
            assert.equal(message.system.kind, "damage");
            assert.equal(
              poolOf(message),
              `${katana.system.derivedDamageRoll + 2}k${katana.system.derivedDamageKeep}`
            );
            assert.isNull(message.system.tn.effective);
          })
        );
      });

      describe("Bugs the pipeline fixes", () => {
        it(
          "B1: a skill's bonus field counts once",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.items.getName("Kenjutsu").update({ "system.rollBonus": 1 });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            assert.equal(poolOf(message), "6k3");
          })
        );

        it(
          "B2 and B3: a skilled attack takes the skill's keep bonus and Full Attack +2k1 once (p.84)",
          clean(async () => {
            const { actor, katana } = await swordsman();
            await actor.items.getName("Kenjutsu").update({ "system.keepBonus": 1 });
            await actor.createEmbeddedDocuments("ActiveEffect", [
              getStanceEffectCreator("fullAttackStance")(actor)
            ]);
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                rollType: "attack",
                weaponId: katana.id,
                askForOptions: false
              })
            );
            assert.equal(poolOf(message), "7k5", "5k3 + 0k1 skill + 2k1 Full Attack");
          })
        );

        it(
          "B3: an NPC attack takes Full Attack +2k1 once",
          clean(async () => {
            const npc = track(await createTestNPC({ name: "Pipeline NPC" }));
            await npc.createEmbeddedDocuments("ActiveEffect", [
              getStanceEffectCreator("fullAttackStance")(npc)
            ]);
            const message = keep(
              await SimpleRoll({
                actor: npc,
                diceRoll: 3,
                diceKeep: 2,
                rollType: "attack",
                askForOptions: false
              })
            );
            assert.equal(poolOf(message), "5k3");
          })
        );

        it(
          "B7: Raises are capped by the Void Ring, not the Void Points left (p.79)",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.update({ "system.rings.void": { rank: 3, value: 0 } });
            const answered = answerCheckDialog({ tn: 10, raises: 3 });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.equal(message.system.tn.raises, 3);
            assert.equal(message.system.tn.effective, 25);
          })
        );

        it(
          "B7: an Unskilled Roll takes no Raises or Free Raises, and its dice never explode (p.80)",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.createEmbeddedDocuments("Item", [
              { name: "Lucky charm", type: "advantage", system: { freeRaises: 1 } }
            ]);
            const answered = answerCheckDialog({ tn: 10, void: true });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 0,
                skillName: "Athletics",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.isTrue(message.system.pool.unskilled);
            assert.isNull(message.system.pool.explode);
            assert.equal(poolOf(message), "4k4", "Void still adds +1k1 (decision 3)");
            assert.notInclude(message.rolls[0].formula, "x");
            assert.equal(message.system.tn.raises, 0);
            assert.equal(message.system.tn.freeRaises, 0);
          })
        );

        it(
          "B7: no Void Point on a damage roll (p.78)",
          clean(async () => {
            const { actor, katana } = await swordsman();
            const before = actor._source.system.rings.void.value;
            const answered = answerCheckDialog({});
            const message = keep(
              await WeaponRoll({
                actor,
                weapon: katana,
                weaponName: katana.name,
                diceRoll: 4,
                diceKeep: 2
              })
            );
            const labels = await answered;
            assert.isFalse(message.system.voidPoint);
            assert.equal(actor._source.system.rings.void.value, before);
            assert.notInclude(labels.join(" "), "Void");
          })
        );

        it("B9: inline [[XkY]] gives a Foundry formula through the same pool code", () => {
          assert.equal(inlineFormula("12k4+1"), "10d10k5x10+1");
          assert.equal(inlineFormula("e5k2"), "5d10r1k2x10+0");
          assert.equal(inlineFormula("u3k3"), "3d10k3+0");
          assert.isNull(inlineFormula("1d20"));
        });

        it(
          "B9: a chat message of one [[XkY]] posts a roll",
          clean(async () => {
            const created = new Promise(resolve => Hooks.once("createChatMessage", resolve));
            await ui.chat.processMessage("[[3k2]]");
            const message = keep(await created);
            assert.equal(message.rolls[0].formula, "3d10k2x10 + 0");
          })
        );

        it(
          "B11 and #37: damage dice explode on the weapon's Explodes on value",
          clean(async () => {
            const { actor, katana } = await swordsman();
            await katana.update({ "system.explodesOn": 9 });
            const message = keep(
              await WeaponRoll({
                actor,
                weapon: katana,
                weaponName: katana.name,
                diceRoll: 4,
                diceKeep: 2,
                askForOptions: false
              })
            );
            assert.equal(message.system.pool.explode, 9);
            assert.include(message.rolls[0].formula, "x>=9");
          })
        );

        it(
          "#41: Mounted +1k0 reaches a Skill attack against an unmounted target (p.89)",
          clean(async () => {
            const { actor } = await swordsman();
            const target = track(await createTestNPC({ name: "Pipeline target" }));
            await actor.toggleStatusEffect("mounted", { active: true });
            const ctx = collectCheck(actor, {
              kind: "attack",
              skill: "kenjutsu",
              trait: "agi",
              target
            });
            assert.deepInclude(
              ctx.modifiers.map(m => [m.roll, m.keep]),
              [1, 0]
            );
            await target.toggleStatusEffect("mounted", { active: true });
            const mounted = collectCheck(actor, {
              kind: "attack",
              skill: "kenjutsu",
              trait: "agi",
              target
            });
            assert.lengthOf(mounted.modifiers, 0);
          })
        );

        it(
          "#42: a Trait roll without the dialog keeps its Trait bonuses",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quick",
                type: "advantage",
                system: { rules: [{ key: "RollModifier", selector: "trait:ref", roll: 1 }] }
              }
            ]);
            const message = keep(
              await TraitRoll({ actor, traitName: "ref", traitRank: 3, askForOptions: false })
            );
            assert.equal(poolOf(message), "4k3");
          })
        );
      });

      describe("Dialog choices", () => {
        it(
          "lists each modifier with a toggle, and a modifier switched off adds nothing",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Sword saint",
                type: "advantage",
                system: {
                  rules: [
                    { key: "RollModifier", selector: "skill:kenjutsu", roll: 2, label: "Saint" }
                  ]
                }
              }
            ]);
            const answered = answerCheckDialog({ "modifier.0": false });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi"
              })
            );
            const labels = await answered;
            assert.include(labels, "Saint");
            assert.equal(poolOf(message), "5k3");
            assert.isFalse(message.system.modifiers.find(m => m.label === "Saint").enabled);
          })
        );

        it(
          "spends a Void Point for +1k1 and records it (p.78)",
          clean(async () => {
            const { actor } = await swordsman();
            const before = actor._source.system.rings.void.value;
            const answered = answerCheckDialog({ void: true });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.isTrue(message.system.voidPoint);
            assert.equal(poolOf(message), "6k4");
            assert.equal(actor._source.system.rings.void.value, before - 1);
          })
        );

        it(
          "offers trained Emphases and re-rolls 1s for the one chosen (p.133)",
          clean(async () => {
            const { actor } = await swordsman();
            const answered = answerCheckDialog({ emphasis: "Katana" });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.equal(message.system.emphasis, "Katana");
            assert.include(message.rolls[0].formula, "r1");
          })
        );

        it(
          "spends Free Raises on the TN, 5 each (p.79)",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.createEmbeddedDocuments("Item", [
              { name: "Lucky charm", type: "advantage", system: { freeRaises: 2 } }
            ]);
            const answered = answerCheckDialog({ tn: 20, freeRaisesToTN: 1 });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.equal(message.system.tn.freeRaises, 2);
            assert.equal(message.system.tn.freeRaisesToTN, 1);
            assert.equal(message.system.tn.effective, 15);
          })
        );

        it(
          "adds the Wound Rank's penalty to the TN, not to the total (decision 2, p.82)",
          clean(async () => {
            const { actor } = await swordsman();
            const healthy = actor.system.woundLevels.healthy.value;
            await actor.update({ "system.suffered": healthy + 1 });
            const penalty = actor.system.woundPenalty;
            assert.isAbove(penalty, 0);
            const answered = answerCheckDialog({ tn: 15 });
            const message = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.equal(message.system.tn.effective, 15 + penalty);
            assert.equal(message.system.tn.woundPenalty, penalty);
            assert.equal(message.system.pool.bonus, 0);
          })
        );
      });

      describe("Rebuilt from the stored context", () => {
        it(
          "a hit's damage button rolls the weapon with the attack's Raises",
          clean(async () => {
            const { actor, katana } = await swordsman();
            const answered = answerCheckDialog({ tn: 5, raises: 1 });
            const attack = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                rollType: "attack",
                weaponId: katana.id
              })
            );
            await answered;
            assert.equal(attack.system.weaponUuid, katana.uuid);
            const damage = keep(await rollDamageFromMessage(attack, { askForOptions: false }));
            assert.equal(damage.system.kind, "damage");
            assert.equal(
              poolOf(damage),
              `${katana.system.derivedDamageRoll + 1}k${katana.system.derivedDamageKeep}`
            );
          })
        );

        it(
          "a re-roll keeps the better total and points at the first roll",
          clean(async () => {
            const { actor } = await swordsman();
            const first = keep(
              await SkillRoll({
                actor,
                actorTrait: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            const second = keep(await rerollKeepBetter(first));
            assert.equal(second.system.rerollOf, first.id);
            assert.isAtLeast(second.system.outcome.total, first.system.outcome.total);
            assert.equal(poolOf(second), poolOf(first));
          })
        );

        it(
          "a contest names the higher total, counting each Raise as -5 (p.80)",
          clean(async () => {
            const { actor } = await swordsman();
            const npc = track(await createTestNPC({ name: "Pipeline rival" }));
            const mine = keep(
              await SimpleRoll({
                actor,
                diceRoll: 10,
                diceKeep: 10,
                rollName: "Mine",
                askForOptions: false
              })
            );
            const theirs = keep(
              await SimpleRoll({
                actor: npc,
                diceRoll: 1,
                diceKeep: 1,
                rollName: "Theirs",
                askForOptions: false
              })
            );
            const card = keep(await contestRolls(mine, theirs));
            assert.include(card.content, actor.name);
            assert.match(card.content, /wins/);
          })
        );
      });
    },
    { displayName: "L5R4: Roll pipeline" }
  );
}
