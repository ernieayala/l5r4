import { SYS_ID } from "../../module/config/constants.js";
import { rollSkill } from "../../module/services/dice/rolls/skill-roll.js";
import { rollPool } from "../../module/services/dice/rolls/simple-roll.js";
import { rollTrait } from "../../module/services/dice/rolls/trait-roll.js";
import { rollRing } from "../../module/services/dice/rolls/ring-roll.js";
import { rollWeaponDamage } from "../../module/services/dice/rolls/weapon-roll.js";
import { rollSpellCast } from "../../module/services/dice/rolls/spell-cast-roll.js";
import { rollMahoCast } from "../../module/services/dice/rolls/maho-cast-roll.js";
import { getCheckContext } from "../../module/services/dice/check/collect.js";
import {
  postContestedRoll,
  rollAgainKeepBetter,
  rollDamageFromMessage
} from "../../module/services/dice/check/chat-actions.js";
import { parseInlineFormula } from "../../module/services/chat.js";
import { applyEffect } from "../../module/services/effects/apply.js";
import { ledgerEntriesOf, applyTrackChange } from "../../module/services/ledger.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData, createWeaponData } from "../fixtures/item-fixtures.js";
import { answerCheckDialog, cleanTest, settleChatNotifications } from "./helpers.js";

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
export function registerRollPipelineTests(quench) {
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
            name: "Roll pipeline: swordsman",
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

      // game-rules/26_special_dice_rules.md, p.77
      describe("Roll & Keep dice", () => {
        /**
         * Evaluate a formula with the given faces in order: a draw r gives the face ceil((1 - r) x 10)
         * [src: client/dice/terms/dice.mjs:409-425].
         */
        const rollWith = async (formula, faces) => {
          const random = CONFIG.Dice.randomUniform;
          const queue = faces.map(face => 1 - face / 10 + 0.05);
          CONFIG.Dice.randomUniform = () => queue.shift() ?? 0.5;
          try {
            return await new foundry.dice.Roll(formula).evaluate();
          } finally {
            CONFIG.Dice.randomUniform = random;
          }
        };

        it("should explode each die into its own total before the highest are kept", async () => {
          // Two 10s; the first explodes into a 3 (13), the second into a 10 and a 9 (29). Keeping one die keeps 29;
          // keeping first and exploding after would keep a single 10 and reach 13
          const roll = await rollWith("2d10xa10k1", [10, 10, 3, 10, 9]);
          assert.equal(roll.total, 29);
          assert.deepEqual(
            roll.dice[0].results.map(r => [r.result, r.active]),
            [
              [13, false],
              [29, true]
            ],
            "one result per die, explosions added in"
          );
        });

        it("should explode on a weapon's lower value, each die on its own", async () => {
          // Explodes on 9: the 9 rolls again into a 4 (13), the 8 and 2 stay; keep 13 + 8
          const roll = await rollWith("3d10xa>=9k2", [9, 8, 2, 4]);
          assert.equal(roll.total, 21);
        });

        it("should explode a pool's formula before it keeps", () => {
          assert.equal(parseInlineFormula("7k3"), "7d10xa10k3+0");
        });
      });

      describe("Every roll type posts a roll message with its context", () => {
        // game-rules/29_types_of_rolls.md, p.79
        it(
          "should roll Skill + Trait and keep Trait on a Skill Roll",
          clean(async () => {
            const { actor } = await swordsman();
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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
            assert.equal(message.rolls[0].formula, "5d10xa10k3 + 0");
            assert.equal(message.system.outcome.total, message.rolls[0].total);
          })
        );

        // game-rules/29_types_of_rolls.md, p.80
        it(
          "should roll and keep the same rank on Trait, Ring, and plain rolls",
          clean(async () => {
            const { actor } = await swordsman();
            const trait = keep(
              await rollTrait({ actor, traitName: "ref", traitRank: 3, askForOptions: false })
            );
            const ring = keep(
              await rollRing({
                actor,
                ringName: "Air",
                ringRank: 3,
                ringKey: "air",
                askForOptions: false
              })
            );
            const plain = keep(
              await rollPool({
                actor,
                roll: 4,
                keep: 2,
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

        // game-rules/29_types_of_rolls.md, p.80
        it(
          "should cast at Ring + School Rank, keep Ring, against 5 + 5 × Mastery, spending a slot",
          clean(async () => {
            const { actor } = await swordsman();
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Spell", type: "spell", system: { ring: "fire", mastery: 1 } }
            ]);
            const fire = actor.system.rings.fire;
            const rank = actor.system.insight.rank;
            const slots = actor._source.system.spellSlots.fire;
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            assert.equal(message.system.kind, "spell");
            assert.equal(poolOf(message), `${fire + rank}k${fire}`);
            assert.equal(message.system.tn.base, 10);
            assert.equal(actor._source.system.spellSlots.fire, slots - 1);
          })
        );

        // game-rules/66_magic_and_spell_casting.md, p.163
        it(
          "should roll the Void Ring for a Void spell",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.update({ "system.rings.void.rank": 3, "system.spellSlots.void": 3 });
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Void Spell", type: "spell", system: { ring: "void", mastery: 1 } }
            ]);
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            assert.equal(poolOf(message), `${3 + actor.system.insight.rank}k3`);
          })
        );

        // game-rules/67_universal_spells.md, p.164-165
        it(
          "should cast a universal spell in the element the caster picks",
          clean(async () => {
            const { actor } = await swordsman();
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Sense", type: "spell", system: { ring: "all", mastery: 1 } }
            ]);
            const picked = new Promise(resolve =>
              Hooks.once("renderDialogV2", app => {
                app.element.querySelector("[name=element]").value = "water";
                app.element.querySelector('[data-action="ok"]').click();
                resolve();
              })
            );
            const slots = { ...actor._source.system.spellSlots };
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            await picked;
            const water = actor.system.rings.water;
            assert.equal(poolOf(message), `${water + actor.system.insight.rank}k${water}`);
            assert.equal(
              actor._source.system.spellSlots.water,
              slots.water - 1,
              "a Water slot spent"
            );
            assert.equal(actor._source.system.spellSlots.fire, slots.fire);
          })
        );

        // game-rules/66_magic_and_spell_casting.md, p.164
        it(
          "should ask the GM before a spell above the School Rank is cast",
          clean(async () => {
            const { actor } = await swordsman();
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Hard Spell", type: "spell", system: { ring: "fire", mastery: 3 } }
            ]);
            const answer = action =>
              new Promise(resolve =>
                Hooks.once("renderDialogV2", app => {
                  app.element.querySelector(`[data-action="${action}"]`).click();
                  resolve();
                })
              );
            let answered = answer("no");
            assert.isNull(await rollSpellCast({ actor, spell, showDialog: false }), "declined");
            await answered;
            answered = answer("yes");
            const message = keep(await rollSpellCast({ actor, spell, showDialog: false }));
            await answered;
            assert.equal(message.system.tn.base, 20, "cast anyway");
          })
        );

        it(
          "should add the School Rank and spend the chosen slot when a Ring Roll is cast as a spell",
          clean(async () => {
            const { actor } = await swordsman();
            const rank = actor.system.insight.rank;
            const voidSlots = actor._source.system.spellSlots.void;
            const answered = answerCheckDialog({ spellCasting: true, slot: "void" });
            const message = keep(
              await rollRing({
                actor,
                ringName: "Air",
                ringRank: 3,
                ringKey: "air",
                askForOptions: true
              })
            );
            await answered;
            assert.equal(poolOf(message), `${3 + rank}k3`);
            assert.equal(actor._source.system.spellSlots.void, voidSlots - 1);
          })
        );

        it(
          "should cast maho at Insight Rank + Ring, keep Ring, paying blood, with extra blood as Free Raises",
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
            const message = keep(await rollMahoCast({ actor, spell, showDialog: true }));
            await answered;
            assert.equal(message.system.kind, "maho");
            assert.equal(actor._source.system.suffered, 4, "blood cost 2 plus 2 extra");
            assert.equal(message.system.tn.freeRaises, 1);
          })
        );

        // game-rules/89_shadowlands_taint.md, p.275
        it(
          "should raise maho Taint to a new Rank at ten points, through the ledger",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.update({ "system.shadowTaint.points": 9 });
            const [spell] = await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench Maho",
                type: "spell",
                system: { ring: "earth", mastery: 2, maho: true }
              }
            ]);
            // Every die a 9: the cast succeeds
            const random = CONFIG.Dice.randomUniform;
            CONFIG.Dice.randomUniform = () => 0.15;
            try {
              keep(await rollMahoCast({ actor, spell, showDialog: false }));
            } finally {
              CONFIG.Dice.randomUniform = random;
            }
            assert.deepInclude(actor._source.system.shadowTaint, { rank: 1, points: 0 }, "9 + 1");
            assert.equal(ledgerEntriesOf(actor).at(-1).track, "taint");
          })
        );

        // game-rules/45_status.md, p.94-95
        it(
          "should let Status fall below 0",
          clean(async () => {
            const { actor } = await swordsman();
            await applyTrackChange(actor, "status", { points: -25, reason: "Quench" });
            assert.deepInclude(
              actor._source.system.status,
              { rank: -2, points: 5 },
              "1.0 - 2.5 = -1.5"
            );
          })
        );

        // game-rules/25_rings_and_traits.md, p.78
        // game-rules/29_types_of_rolls.md, p.80
        it(
          "should roll weapon damage as DR with Strength, Raises as Increased Damage, and no Void",
          clean(async () => {
            const { actor, katana } = await swordsman();
            const message = keep(
              await rollWeaponDamage({
                actor,
                weapon: katana,
                weaponName: katana.name,
                roll: katana.system.derivedDamageRoll,
                keep: katana.system.derivedDamageKeep,
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
        // AUTOMATION.md B1
        it(
          "should count a skill's bonus field once",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.items.getName("Kenjutsu").update({ "system.rollBonus": 1 });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            assert.equal(poolOf(message), "6k3");
          })
        );

        // AUTOMATION.md B2, B3
        // game-rules/36_stances.md, p.84
        it(
          "should give a skilled attack the skill's keep bonus and Full Attack +2k1 once",
          clean(async () => {
            const { actor, katana } = await swordsman();
            await actor.items.getName("Kenjutsu").update({ "system.keepBonus": 1 });
            await applyEffect(actor, "fullAttackStance");
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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

        // AUTOMATION.md B3
        it(
          "should give an NPC attack Full Attack +2k1 once",
          clean(async () => {
            const npc = track(await createTestNPC({ name: "Roll pipeline: NPC" }));
            await applyEffect(npc, "fullAttackStance");
            const message = keep(
              await rollPool({
                actor: npc,
                roll: 3,
                keep: 2,
                rollType: "attack",
                askForOptions: false
              })
            );
            assert.equal(poolOf(message), "5k3");
          })
        );

        // AUTOMATION.md B7
        // game-rules/28_raises.md, p.79
        it(
          "should cap Raises by the Void Ring, not the Void Points left",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.update({ "system.rings.void": { rank: 3, value: 0 } });
            const answered = answerCheckDialog({ tn: 10, raises: 3 });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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

        // AUTOMATION.md B7
        // game-rules/30_skill_rolls_expanded.md, p.80
        it(
          "should give an Unskilled Roll no Raises or Free Raises, and never explode its dice",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Lucky charm",
                type: "advantage",
                system: { rules: [{ key: "FreeRaise", selector: "any", value: 1 }] }
              }
            ]);
            const answered = answerCheckDialog({ tn: 10, void: true });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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

        // game-rules/25_rings_and_traits.md, p.78
        it(
          "should raise an Unskilled Skill to Rank 1 for a Void Point, so dice explode and Raises apply",
          clean(async () => {
            const { actor } = await swordsman();
            const before = actor._source.system.rings.void.value;
            const answered = answerCheckDialog({ tn: 10, voidSkill: true, raises: 1 });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
                skillRank: 0,
                skillName: "Athletics",
                skillTrait: "agi"
              })
            );
            await answered;
            assert.isFalse(message.system.pool.unskilled);
            assert.equal(poolOf(message), "4k3", "Agility 3 + Rank 1");
            assert.equal(message.system.pool.explode, 10);
            assert.equal(message.system.tn.raises, 1);
            assert.equal(actor._source.system.rings.void.value, before - 1, "one Void Point");
          })
        );

        // AUTOMATION.md B7
        // game-rules/25_rings_and_traits.md, p.78
        it(
          "should offer no Void Point on a damage roll",
          clean(async () => {
            const { actor, katana } = await swordsman();
            const before = actor._source.system.rings.void.value;
            const answered = answerCheckDialog({});
            const message = keep(
              await rollWeaponDamage({
                actor,
                weapon: katana,
                weaponName: katana.name,
                roll: 4,
                keep: 2
              })
            );
            const labels = await answered;
            assert.isFalse(message.system.voidPoint);
            assert.equal(actor._source.system.rings.void.value, before);
            assert.notInclude(labels.join(" "), "Void");
          })
        );

        // AUTOMATION.md B9
        it("should turn inline [[XkY]] into a Foundry formula through the same pool code", () => {
          assert.equal(parseInlineFormula("12k4+1"), "10d10xa10k5+1");
          assert.equal(parseInlineFormula("e5k2"), "5d10r1xa10k2+0");
          assert.equal(parseInlineFormula("u3k3"), "3d10k3+0");
          assert.isNull(parseInlineFormula("1d20"));
        });

        // AUTOMATION.md B9
        it(
          "should post a roll for a chat message of one [[XkY]]",
          clean(async () => {
            const created = new Promise(resolve => Hooks.once("createChatMessage", resolve));
            await ui.chat.processMessage("[[3k2]]");
            const message = keep(await created);
            assert.equal(message.rolls[0].formula, "3d10xa10k2 + 0");
          })
        );

        // AUTOMATION.md B11
        // #37
        it(
          "should explode damage dice on the weapon's Explodes on value",
          clean(async () => {
            const { actor, katana } = await swordsman();
            await katana.update({ "system.explodesOn": 9 });
            const message = keep(
              await rollWeaponDamage({
                actor,
                weapon: katana,
                weaponName: katana.name,
                roll: 4,
                keep: 2,
                askForOptions: false
              })
            );
            assert.equal(message.system.pool.explode, 9);
            assert.include(message.rolls[0].formula, "xa>=9");
          })
        );

        // game-rules/74_weapons.md, p.202
        it(
          "should add no Strength to a shuriken and never explode its damage dice",
          clean(async () => {
            const { actor } = await swordsman();
            const [shuriken] = await actor.createEmbeddedDocuments("Item", [
              createWeaponData("Quench Shuriken", 1, 1, {
                system: { addsStrength: false, explodes: false }
              })
            ]);
            assert.equal(shuriken.system.derivedDamageFormula, "1k1", "no Strength");
            const message = keep(
              await rollWeaponDamage({
                actor,
                weapon: shuriken,
                weaponName: shuriken.name,
                roll: shuriken.system.derivedDamageRoll,
                keep: shuriken.system.derivedDamageKeep,
                askForOptions: false
              })
            );
            assert.isNull(message.system.pool.explode);
            assert.notInclude(message.rolls[0].formula, "xa");
          })
        );

        // #41
        // game-rules/41_conditional_effects.md, p.89
        it(
          "should add Mounted +1k0 to a Skill attack against an unmounted target",
          clean(async () => {
            const { actor } = await swordsman();
            const target = track(await createTestNPC({ name: "Roll pipeline: target" }));
            await actor.toggleStatusEffect("mounted", { active: true });
            const ctx = getCheckContext(actor, {
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
            const mounted = getCheckContext(actor, {
              kind: "attack",
              skill: "kenjutsu",
              trait: "agi",
              target
            });
            assert.lengthOf(mounted.modifiers, 0);
          })
        );

        // #42
        it(
          "should keep its Trait bonuses on a Trait roll made without the dialog",
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
              await rollTrait({ actor, traitName: "ref", traitRank: 3, askForOptions: false })
            );
            assert.equal(poolOf(message), "4k3");
          })
        );
      });

      describe("Dialog choices", () => {
        it(
          "should list each modifier with a toggle, and add nothing for one switched off",
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
              await rollSkill({
                actor,
                traitRank: 3,
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

        // game-rules/25_rings_and_traits.md, p.78
        it(
          "should spend a Void Point for +1k1 and record it",
          clean(async () => {
            const { actor } = await swordsman();
            const before = actor._source.system.rings.void.value;
            const answered = answerCheckDialog({ void: true });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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

        // game-rules/58_skills_overview.md, p.133
        it(
          "should offer trained Emphases and re-roll 1s for the one chosen",
          clean(async () => {
            const { actor } = await swordsman();
            const answered = answerCheckDialog({ emphasis: "Katana" });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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

        // game-rules/28_raises.md, p.79
        it(
          "should spend Free Raises on the TN, 5 each",
          clean(async () => {
            const { actor } = await swordsman();
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Lucky charm",
                type: "advantage",
                system: { rules: [{ key: "FreeRaise", selector: "any", value: 2 }] }
              }
            ]);
            const answered = answerCheckDialog({ tn: 20, freeRaisesToTn: 1 });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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

        // Wound penalties raise the TN (roadmap/STAGE-08 decision 2)
        // game-rules/33_wounds.md, p.82
        it(
          "should add the Wound Rank's penalty to the TN, not to the total",
          clean(async () => {
            const { actor } = await swordsman();
            const healthy = actor.system.woundLevels.healthy.value;
            await actor.update({ "system.suffered": healthy + 1 });
            const penalty = actor.system.woundPenalty;
            assert.isAbove(penalty, 0);
            const answered = answerCheckDialog({ tn: 15 });
            const message = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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
          "should roll the weapon with the attack's Raises from a hit's damage button",
          clean(async () => {
            const { actor, katana } = await swordsman();
            const answered = answerCheckDialog({ tn: 5, raises: 1 });
            const attack = keep(
              await rollSkill({
                actor,
                traitRank: 3,
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
          "should keep the better total on a re-roll and point at the first roll",
          clean(async () => {
            const { actor } = await swordsman();
            const first = keep(
              await rollSkill({
                actor,
                traitRank: 3,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                askForOptions: false
              })
            );
            const second = keep(await rollAgainKeepBetter(first));
            assert.equal(second.system.rerollOf, first.id);
            assert.isAtLeast(second.system.outcome.total, first.system.outcome.total);
            assert.equal(poolOf(second), poolOf(first));
          })
        );

        // game-rules/29_types_of_rolls.md, p.80
        it(
          "should name the higher total in a contest, counting each Raise as -5",
          clean(async () => {
            const { actor } = await swordsman();
            const npc = track(await createTestNPC({ name: "Roll pipeline: rival" }));
            const mine = keep(
              await rollPool({
                actor,
                roll: 10,
                keep: 10,
                rollName: "Mine",
                askForOptions: false
              })
            );
            const theirs = keep(
              await rollPool({
                actor: npc,
                roll: 1,
                keep: 1,
                rollName: "Theirs",
                askForOptions: false
              })
            );
            const card = keep(await postContestedRoll(mine, theirs));
            assert.include(card.content, actor.name);
            assert.match(card.content, /wins/);
            assert.lengthOf(
              foundry.utils.parseHTML(card.content).querySelectorAll("li"),
              2,
              "one line per roll"
            );
          })
        );
      });
    },
    { displayName: "L5R4: Roll pipeline" }
  );
}
