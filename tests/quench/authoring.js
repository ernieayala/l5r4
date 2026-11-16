import { SYS_ID } from "../../module/config/constants.js";
import { createPurchasedItem, preparePurchase } from "../../module/services/purchase.js";
import { applyTrackChange, ledgerEntriesOf } from "../../module/services/ledger.js";
import { startNewSession } from "../../module/services/session.js";
import { updateActivation } from "../../module/services/effects/activation.js";
import { buildFolderTransfer, createImportedItems } from "../../module/services/item-transfer.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { rollHonor } from "../../module/services/dice/check/chat-actions.js";
import { getCheckContext } from "../../module/services/dice/check/collect.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createSchoolData, createSkillData } from "../fixtures/item-fixtures.js";
import {
  answerCheckDialog,
  buttonLabelsOf,
  changeThroughSheet,
  checkEffects,
  cleanTest,
  nextUpdate,
  settleChatNotifications,
  waitFor
} from "./helpers.js";

/** Every d10 shows 9 [src: client/dice/terms/dice.mjs:412], so no die explodes. */
const NINES = () => 0.15;

/**
 * Answer the next confirm dialog with Yes or No.
 * @param {"yes"|"no"} action
 * @returns {Promise<Record<string, string>>} The dialog's button labels by action
 */
function answerConfirm(action) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      const labels = buttonLabelsOf(app);
      app.element.querySelector(`[data-action="${action}"]`).click();
      resolve(labels);
    });
  });
}

/**
 * Registers the `authoring` batch (roadmap/STAGE-11): a School's grants and their removal, Techniques at rank-up,
 * prerequisites and choices at purchase, the rules editor on item and effect sheets with a rule reaching a roll,
 * the new rule keys in rolls and XP, the ledger and Honor Roll, the Taint, kata activation, and folder import and
 * export.
 * @param {object} quench  The Quench API object.
 */
export function registerAuthoringTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.authoring`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const worldItems = [];
      const folders = [];
      const posted = [];
      let hook;
      const track = actor => (actors.push(actor), actor);

      before(() => {
        hook = Hooks.on("createChatMessage", message => posted.push(message));
      });

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
        await Item.deleteDocuments(
          worldItems
            .splice(0)
            .filter(i => game.items.has(i.id))
            .map(i => i.id)
        );
        for (const folder of folders.splice(0)) {
          if (game.folders.has(folder.id)) {
            await folder.delete({ deleteSubfolders: true, deleteContents: true });
          }
        }
      });

      after(async function () {
        this.timeout(30_000);
        Hooks.off("createChatMessage", hook);
        await settleChatNotifications();
        for (const message of posted) {
          if (game.messages.has(message.id)) {
            await message.delete();
          }
        }
      });

      /**
       * Created documents by name: the server does not always return them in request order.
       * @param {foundry.abstract.Document[]} documents
       * @returns {Record<string, foundry.abstract.Document>}
       */
      const byName = documents => Object.fromEntries(documents.map(d => [d.name, d]));

      /** World items that a School grants: two Skills and two Techniques. */
      const schoolSet = async () => {
        const created = await Item.createDocuments([
          createSkillData("Kenjutsu", 0, "agi", { system: { type: "bugei" } }),
          createSkillData("Meditation", 0, "void", { system: { type: "low" } }),
          { name: "Quench Technique 1", type: "technique", system: { rank: 1 } },
          { name: "Quench Technique 2", type: "technique", system: { rank: 2 } }
        ]);
        worldItems.push(...created);
        const {
          Kenjutsu: kenjutsu,
          Meditation: meditation,
          "Quench Technique 1": tech1,
          "Quench Technique 2": tech2
        } = byName(created);
        const [school] = await Item.createDocuments([
          createSchoolData("Quench Bushi School", {
            system: {
              rules: [
                { key: "TraitAdjust", trait: "agi", value: 1 },
                { key: "GrantItem", uuid: kenjutsu.uuid },
                { key: "GrantItem", uuid: meditation.uuid, emphasis: "Void Recovery" },
                { key: "GrantItem", uuid: tech1.uuid, rank: 1 },
                { key: "GrantItem", uuid: tech2.uuid, rank: 2 }
              ]
            }
          })
        ]);
        worldItems.push(school);
        return { school, kenjutsu, meditation, tech1, tech2 };
      };

      const named = (actor, name) => actor.items.find(i => i.name === name);

      /** A PC with the School dropped on its sheet, its first grants done. */
      const schooled = async () => {
        const set = await schoolSet();
        const actor = track(await createTestPC({ name: "Character options: student" }));
        await createPurchasedItem(actor, set.school.toObject());
        await waitFor(() => named(actor, "Quench Technique 1") && named(actor, "Meditation"));
        return { actor, ...set };
      };

      // roadmap/STAGE-11 decisions 2 and 7
      // game-rules/48_character_creation_expanded.md, p.102
      // game-rules/49_improving_your_character.md, p.104
      describe("School grants", function () {
        // Grants run in the background, one after another; a School's take a few round trips
        this.timeout(15_000);

        it(
          "should grant a dropped School's Skills free and its Rank 1 Technique, with its Trait bonus",
          clean(async () => {
            const { actor } = await schooled();
            const kenjutsu = named(actor, "Kenjutsu");
            assert.deepInclude(kenjutsu.system, { rank: 1, freeRanks: 1, school: true });
            const meditation = named(actor, "Meditation");
            assert.deepEqual(meditation.system.trainedEmphases, ["Void Recovery"]);
            assert.equal(meditation.system.freeEmphasis, 1);
            assert.ok(named(actor, "Quench Technique 1"), "Rank 1 Technique at Insight Rank 1");
            assert.notOk(named(actor, "Quench Technique 2"), "Rank 2 waits");
            assert.equal(actor.system._derived.traitsEff.agi, 3, "the School's +1 Agility");
            assert.equal(actor.system._xp.spent, 0, "nothing granted costs XP");
          })
        );

        it(
          "should grant the next Technique on a rise in School Rank and say so",
          clean(async () => {
            const { actor } = await schooled();
            await actor.update({ "system.insight.autoCalculate": false, "system.insight.rank": 2 });
            assert.isTrue(await waitFor(() => Boolean(named(actor, "Quench Technique 2"))));
            assert.isTrue(
              await waitFor(() =>
                posted.some(
                  m => m.content.includes("Quench Technique 2") && m.content.includes("2")
                )
              ),
              "a chat note names the Technique"
            );
          })
        );

        it(
          "should take a removed School's grants back and keep a Skill with bought ranks",
          clean(async () => {
            const { actor } = await schooled();
            await named(actor, "Kenjutsu").update({ "system.rank": 3 });
            await named(actor, "Quench Bushi School").delete();
            assert.isTrue(
              await waitFor(
                () => !named(actor, "Meditation") && !named(actor, "Quench Technique 1")
              ),
              "granted items with nothing bought on them are gone"
            );
            const kenjutsu = named(actor, "Kenjutsu");
            assert.deepInclude(kenjutsu.system, { rank: 3, freeRanks: 0, school: false });
            assert.equal(actor.system._derived.traitsEff.agi, 2, "the Trait bonus went with it");
          })
        );

        it(
          "should not grant again a granted item the owner removes",
          clean(async () => {
            const { actor } = await schooled();
            await named(actor, "Kenjutsu").delete();
            const school = named(actor, "Quench Bushi School");
            await waitFor(
              () => school.getFlag(SYS_ID, "grants").find(r => r.itemId === null) !== undefined
            );
            await actor.update({ "system.honor.points": 1 });
            await new Promise(resolve => setTimeout(resolve, 300));
            assert.notOk(named(actor, "Kenjutsu"));
          })
        );
      });

      describe("Purchase: prerequisites and choices", () => {
        it(
          "should ask a GM to add an item whose prerequisites are not met",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: buyer" }));
            const data = {
              name: "Quench Kata",
              type: "kata",
              system: {
                rules: [
                  {
                    key: "Prerequisite",
                    label: "Kenjutsu 3",
                    requires: [{ gte: ["skill:kenjutsu", 3] }]
                  }
                ]
              }
            };
            let answered = answerConfirm("no");
            assert.isNull(await preparePurchase(actor, data), "the GM said no");
            const labels = await answered;
            assert.equal(labels.yes, game.i18n.localize("l5r4.ui.purchase.bypass"));
            assert.equal(labels.no, game.i18n.localize("l5r4.ui.common.cancel"));
            answered = answerConfirm("yes");
            assert.equal((await preparePurchase(actor, data)).name, "Quench Kata", "added anyway");
            await answered;
            await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 3)]);
            assert.equal(
              (await preparePurchase(actor, data)).name,
              "Quench Kata",
              "met: no question asked"
            );
          })
        );

        it(
          "should carry a choice made at purchase to the item's other rules",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: chooser" }));
            await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2)]);
            const labelled = new Promise(resolve =>
              Hooks.once("renderDialogV2", app =>
                resolve({ ...buttonLabelsOf(app), title: app.title })
              )
            );
            const answered = answerCheckDialog({ selection: "kenjutsu" });
            const data = await preparePurchase(actor, {
              name: "Quench Weapon Focus",
              type: "advantage",
              system: {
                rules: [
                  {
                    key: "ChoiceSet",
                    flag: "weapon",
                    options: [
                      { value: "kenjutsu", label: "Kenjutsu" },
                      { value: "kyujutsu", label: "Kyujutsu" }
                    ]
                  },
                  { key: "FreeRaise", selector: "skill:{choice:weapon}", value: 1 }
                ]
              }
            });
            await answered;
            const shown = await labelled;
            assert.equal(
              shown.ok,
              game.i18n.localize("l5r4.ui.purchase.makeChoice"),
              "the button names the choice"
            );
            assert.equal(
              shown.title,
              game.i18n.localize("l5r4.ui.purchase.choiceTitle", {
                item: "Quench Weapon Focus",
                prompt: game.i18n.localize("l5r4.ui.purchase.choose")
              }),
              "the title is one key naming the item and the question"
            );
            assert.equal(data.system.rules[0].selection, "kenjutsu");
            await actor.createEmbeddedDocuments("Item", [data]);
            assert.equal(
              getCheckContext(actor, { kind: "skill", skill: "kenjutsu" }).freeRaises,
              1
            );
          })
        );
      });

      describe("Rules editor", () => {
        it(
          "should carry a Technique's rule authored in the editor to its owner's roll",
          clean(async function () {
            this.timeout(15_000);
            const actor = track(await createTestPC({ name: "Character options: author" }));
            await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2)]);
            const [technique] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Way of the Blade", type: "technique" }
            ]);
            const sheet = technique.sheet;
            await sheet.render({ force: true });
            sheet.element.querySelector('[data-action="change-tab"][data-tab="rules"]').click();
            await sheet.render();
            sheet.element.querySelector("[data-rule-key]").value = "RollModifier";
            const added = nextUpdate(technique);
            sheet.element.querySelector('[data-action="create-rule"]').click();
            await added;
            await changeThroughSheet(sheet, '[name="rules.0.selector"]', "skill:kenjutsu");
            await changeThroughSheet(sheet, '[name="rules.0.roll"]', "1");
            assert.deepInclude(technique._source.system.rules[0], {
              key: "RollModifier",
              selector: "skill:kenjutsu",
              roll: 1
            });
            assert.isNull(
              sheet.element.querySelector("[data-rule-error]"),
              "the rule is valid as authored"
            );
            // A second rule (valid as added: selector "any") deleted again leaves the first
            sheet.element.querySelector("[data-rule-key]").value = "RollModifier";
            const second = nextUpdate(technique);
            sheet.element.querySelector('[data-action="create-rule"]').click();
            await second;
            await sheet.render();
            const removed = nextUpdate(technique);
            sheet.element
              .querySelector('[data-rule-index="1"] [data-action="delete-rule"]')
              .click();
            await removed;
            assert.deepEqual(
              technique._source.system.rules.map(rule => rule.selector),
              ["skill:kenjutsu"]
            );
            await sheet.close();

            assert.equal(checkEffects(actor, "skill", { skill: "kenjutsu" }).roll, 1);
            const message = await rollCheck({
              actor,
              kind: "skill",
              label: "Kenjutsu",
              base: { roll: 4, keep: 2 },
              skill: "kenjutsu",
              trait: "agi",
              askForOptions: false
            });
            assert.include(
              message.system.modifiers.map(m => m.label),
              "Quench Way of the Blade"
            );
            assert.equal(message.system.pool.roll, 5);
          })
        );

        it(
          "should show no error for a choice in a field with fixed values and keep it through a save",
          clean(async function () {
            this.timeout(15_000);
            const actor = track(await createTestPC({ name: "Character options: chooser" }));
            const [weakness] = await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench Weakness",
                type: "disadvantage",
                system: {
                  rules: [
                    { key: "ChoiceSet", flag: "trait", list: "traits", selection: "str" },
                    { key: "TraitAdjust", trait: "{choice:trait}", value: -1 }
                  ]
                }
              }
            ]);
            const sheet = weakness.sheet;
            await sheet.render({ force: true });
            sheet.element.querySelector('[data-action="change-tab"][data-tab="rules"]').click();
            await sheet.render();
            assert.isNull(
              sheet.element.querySelector("[data-rule-error]"),
              "no error over the rules"
            );
            assert.equal(
              sheet.element.querySelector('[name="rules.1.trait"]').value,
              "{choice:trait}"
            );
            await changeThroughSheet(sheet, '[name="rules.1.label"]', "edited");
            assert.deepInclude(weakness._source.system.rules[1], {
              trait: "{choice:trait}",
              label: "edited"
            });
            await sheet.close();
          })
        );

        it(
          "should give the Active Effect sheet a Rules tab that saves system.rules",
          clean(async function () {
            this.timeout(15_000);
            const actor = track(await createTestPC({ name: "Character options: effect author" }));
            const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Quench Blessing" }
            ]);
            const sheet = effect.sheet;
            assert.equal(sheet.constructor.name, "L5R4ActiveEffectConfig");
            await sheet.render({ force: true });
            sheet.changeTab("rules", "sheet");
            sheet.element.querySelector("[data-rule-key]").value = "Reduction";
            const added = nextUpdate(effect);
            sheet.element.querySelector('[data-action="create-rule"]').click();
            await added;
            await sheet.render();
            sheet.element.querySelector('[name="rules.0.value"]').value = "2";
            const saved = nextUpdate(effect);
            await sheet.submit();
            await saved;
            assert.deepInclude(effect._source.system.rules[0], { key: "Reduction", value: 2 });
            assert.equal(actor.system.armorTn.reduction, 2);
            await sheet.close();
          })
        );
      });

      describe("New rule keys in rolls and XP", () => {
        it(
          "should carry OpponentModifier, UnskilledAs, RaiseRule, and ActionCost to a check",
          clean(async () => {
            const attacker = track(
              await createTestPC({
                name: "Character options: attacker",
                system: { traits: { agi: 3 } }
              })
            );
            const target = track(await createTestPC({ name: "Character options: slippery" }));
            await target.createEmbeddedDocuments("Item", [
              {
                name: "Quench Evasive",
                type: "advantage",
                system: { rules: [{ key: "OpponentModifier", selector: "attack", roll: -1 }] }
              }
            ]);
            await attacker.createEmbeddedDocuments("Item", [
              createSkillData("Kyujutsu", 0, "ref", { system: { type: "bugei" } }),
              {
                name: "Quench Archer",
                type: "advantage",
                system: {
                  rules: [
                    { key: "UnskilledAs", selector: "skill-type:bugei", rank: 1 },
                    { key: "RaiseRule", selector: "attack", maneuver: "feint", cost: -1, cap: 1 },
                    { key: "ActionCost", selector: "attack", action: "simple" }
                  ]
                }
              }
            ]);
            assert.equal(checkEffects(attacker, "attack", { target }).roll, -1);
            const ctx = getCheckContext(attacker, { kind: "attack", skill: "kyujutsu" });
            assert.deepEqual(ctx.raises, { cap: 1, minimum: 0, maneuverCosts: { feint: -1 } });
            assert.equal(ctx.unskilledAs, 1);

            const message = await rollCheck({
              actor: attacker,
              kind: "attack",
              label: "Kyujutsu",
              base: { roll: 2, keep: 2 },
              skill: "kyujutsu",
              trait: "ref",
              unskilled: true,
              tn: 5,
              target: null,
              askForOptions: false
            });
            assert.isFalse(message.system.pool.unskilled, "counts as rank 1");
            assert.equal(message.system.pool.roll, 3);
            assert.isNotNull(message.system.pool.explode);
            assert.isTrue(message.system.notes.some(n => n.includes("Quench Archer")));
          })
        );

        it(
          "should price an Advantage with a Cost rule",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: discount" }));
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench Allies",
                type: "advantage",
                system: { cost: 4, rules: [{ key: "Cost", selector: "self", value: "@cost - 1" }] }
              },
              { name: "Quench Other", type: "advantage", system: { cost: 4 } }
            ]);
            assert.equal(actor.system._xp.breakdown.advantages, 7);
          })
        );
      });

      // roadmap/STAGE-11 decision 3
      // game-rules/43_honor.md, p.90-92
      describe("Ledger and Honor Roll", () => {
        it(
          "should size a change with a Ledger rule and log it in the ledger",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: sworn" }));
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench Oath",
                type: "advantage",
                system: {
                  rules: [
                    { key: "Ledger", track: "honor", direction: "loss", value: "@points * 2" }
                  ]
                }
              }
            ]);
            await applyTrackChange(actor, "honor", { points: -3, reason: "Quench breach" });
            assert.deepInclude(actor.system.honor, { rank: 1, points: 4 });
            const [entry] = ledgerEntriesOf(actor);
            assert.deepInclude(entry, {
              track: "honor",
              asked: -3,
              points: -6,
              reason: "Quench breach"
            });
          })
        );

        it(
          "should offer the Honor Roll on a failed roll once a session, and cost a Rank when it fails",
          clean(async function () {
            this.timeout(15_000);
            const enabled = game.settings.get(SYS_ID, "honorRoll");
            const uniform = CONFIG.Dice.randomUniform;
            await game.settings.set(SYS_ID, "honorRoll", true);
            CONFIG.Dice.randomUniform = NINES;
            try {
              const actor = track(
                await createTestPC({
                  name: "Character options: honorable",
                  system: { honor: { rank: 3 } }
                })
              );
              const failed = await rollCheck({
                actor,
                kind: "trait",
                label: "Agility",
                base: { roll: 2, keep: 2 },
                trait: "agi",
                tn: 100,
                askForOptions: false
              });
              assert.include(failed.content, 'data-action="honor-roll"');
              const reroll = await rollHonor(failed);
              assert.deepInclude(reroll.system.pool, { roll: 3, keep: 3 });
              assert.equal(reroll.system.honorRollOf, failed.id);
              assert.notInclude(reroll.content, 'data-action="honor-roll"');
              assert.isFalse(reroll.system.outcome.success);
              assert.equal(actor.system.honor.rank, 2, "a failed Honor Roll costs a Rank");
              assert.isNull(await rollHonor(failed), "once a session");

              await game.settings.set(SYS_ID, "session", game.settings.get(SYS_ID, "session") + 1);
              assert.ok(await rollHonor(failed), "a new session gives it back");
            } finally {
              CONFIG.Dice.randomUniform = uniform;
              await game.settings.set(SYS_ID, "honorRoll", enabled);
            }
          })
        );

        it(
          "should start a new session after the GM confirms, and say so in chat",
          clean(async () => {
            const session = game.settings.get(SYS_ID, "session");
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
            await Promise.all([answered, startNewSession()]);
            assert.include(question, game.i18n.localize("l5r4.ui.session.confirm"));
            assert.equal(labels.yes, game.i18n.localize("l5r4.ui.session.start"));
            assert.equal(labels.no, game.i18n.localize("l5r4.ui.common.cancel"));
            assert.equal(game.settings.get(SYS_ID, "session"), session + 1);
            assert.equal(
              foundry.utils.parseHTML(posted.at(-1).content).textContent,
              game.i18n.localize("l5r4.ui.session.started")
            );
          })
        );
      });

      describe("Honor Roll without Honor", () => {
        it(
          "should give a character with no Honor Rank no Honor Roll to make",
          clean(async () => {
            const enabled = game.settings.get(SYS_ID, "honorRoll");
            await game.settings.set(SYS_ID, "honorRoll", true);
            try {
              const actor = track(
                await createTestPC({
                  name: "Character options: dishonored",
                  system: { honor: { rank: 0, points: 0 } }
                })
              );
              const failed = await rollCheck({
                actor,
                kind: "trait",
                label: "Agility",
                base: { roll: 2, keep: 2 },
                trait: "agi",
                tn: 100,
                askForOptions: false
              });
              const before = game.messages.size;
              assert.isNull(await rollHonor(failed));
              assert.equal(game.messages.size, before, "no roll posted");
              assert.isUndefined(
                actor.getFlag(SYS_ID, "honorRollSession"),
                "the session's roll is kept"
              );
            } finally {
              await game.settings.set(SYS_ID, "honorRoll", enabled);
            }
          })
        );
      });

      // roadmap/STAGE-11 decision 5
      // game-rules/89_shadowlands_taint.md, p.277-279
      describe("Shadowlands Taint", () => {
        it(
          "should penalize social Skills at Level 3 and 4, and cost a Void Point at Level 4",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: tainted" }));
            await actor.createEmbeddedDocuments("Item", [
              createSkillData("Courtier", 1, "awa", { system: { social: true } }),
              createSkillData("Hunting", 1, "per", { system: { type: "low" } })
            ]);
            await actor.update({ "system.shadowTaint.rank": 3 });
            assert.equal(checkEffects(actor, "skill", { skill: "courtier" }).roll, -1);
            assert.equal(checkEffects(actor, "skill", { skill: "hunting" }).roll, 0);
            await actor.update({ "system.shadowTaint.rank": 4 });
            assert.equal(checkEffects(actor, "skill", { skill: "courtier" }).roll, -2);
            assert.equal(actor.system.rings.void.max, actor.system.rings.void.rank - 1);
          })
        );

        it(
          "should give +1k1 on a physical roll for a point of Taint when Embracing the Taint",
          clean(async () => {
            const actor = track(
              await createTestPC({
                name: "Character options: embrace",
                system: { shadowTaint: { rank: 1 } }
              })
            );
            const answered = answerCheckDialog({ embraceTaint: true });
            const message = await rollCheck({
              actor,
              kind: "trait",
              label: "Strength",
              base: { roll: 2, keep: 2 },
              trait: "str"
            });
            await answered;
            assert.deepInclude(message.system.pool, { roll: 3, keep: 3 });
            assert.deepInclude(actor.system.shadowTaint, { rank: 1, points: 1 });
            assert.equal(ledgerEntriesOf(actor).at(-1).track, "taint");
          })
        );
      });

      // roadmap/STAGE-11 decision 8
      // game-rules/86_kata.md, p.259
      // game-rules/87_kiho.md, p.261
      describe("Kata and kiho activation", () => {
        it(
          "should apply a kata's rules only while active, one kata at a time",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: stylist" }));
            const kata = (name, roll) => ({
              name,
              type: "kata",
              system: { rules: [{ key: "RollModifier", selector: "attack", roll }] }
            });
            const { "Quench Air Kata": air, "Quench Fire Kata": fire } = byName(
              await actor.createEmbeddedDocuments("Item", [
                kata("Quench Air Kata", 1),
                kata("Quench Fire Kata", 2)
              ])
            );
            assert.equal(checkEffects(actor, "attack").roll, 0, "owning is not executing");
            await updateActivation(actor, air);
            assert.equal(checkEffects(actor, "attack").roll, 1);
            await updateActivation(actor, fire);
            assert.isTrue(
              await waitFor(() => checkEffects(actor, "attack").roll === 2),
              "the second kata ends the first"
            );
            await updateActivation(actor, fire);
            assert.equal(checkEffects(actor, "attack").roll, 0);
          })
        );

        it(
          "should keep one kiho of each type active at a time, but any number of Martial kiho",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Character options: monk" }));
            const kiho = (name, type, roll) => ({
              name,
              type: "kiho",
              system: { type, rules: [{ key: "RollModifier", selector: "attack", roll }] }
            });
            const items = byName(
              await actor.createEmbeddedDocuments("Item", [
                kiho("Quench Inner A", "internal", 1),
                kiho("Quench Inner B", "internal", 2),
                kiho("Quench Fist A", "martial", 4),
                kiho("Quench Fist B", "martial", 8)
              ])
            );
            assert.equal(checkEffects(actor, "attack").roll, 0, "owning is not executing");
            await updateActivation(actor, items["Quench Inner A"]);
            await updateActivation(actor, items["Quench Inner B"]);
            assert.isTrue(
              await waitFor(() => checkEffects(actor, "attack").roll === 2),
              "the second Internal kiho ends the first"
            );
            await updateActivation(actor, items["Quench Fist A"]);
            await updateActivation(actor, items["Quench Fist B"]);
            assert.equal(checkEffects(actor, "attack").roll, 14, "both Martial kiho stay active");
            assert.sameMembers(
              actor.effects.map(e => e.system.group),
              ["kiho-internal", "", ""]
            );
          })
        );
      });

      // roadmap/STAGE-11 decision 4
      describe("Folder export and import", () => {
        it(
          "should export a folder's items and import them with their grants pointing at the copies",
          clean(async () => {
            const folder = await foundry.documents.Folder.implementation.create({
              name: "Quench Homebrew",
              type: "Item"
            });
            folders.push(folder);
            const [skill] = await Item.createDocuments([
              { ...createSkillData("Quench Swordplay", 0), folder: folder.id }
            ]);
            const [school] = await Item.createDocuments([
              createSchoolData("Quench Export School", {
                folder: folder.id,
                system: { rules: [{ key: "GrantItem", uuid: skill.uuid }] }
              })
            ]);

            // The export's content; exportItemFolder hands the same to the browser's download
            const payload = buildFolderTransfer(folder);
            assert.lengthOf(payload.items, 2);
            assert.equal(payload.folder, "Quench Homebrew");

            // Ownership from the exporting world names its users, not this world's
            const O = CONST.DOCUMENT_OWNERSHIP_LEVELS;
            for (const item of payload.items) {
              item.ownership = { default: O.OBSERVER, otherWorldUser01: O.OWNER };
            }

            // The new folder sits inside `folder`, so deleting that afterwards removes it too
            const imported = await createImportedItems(JSON.stringify(payload), folder);
            const copySchool = imported.find(i => i.type === "school");
            const copySkill = imported.find(i => i.type === "skill");
            assert.notEqual(copySchool.id, school.id);
            assert.equal(copySchool.system.rules[0].uuid, copySkill.uuid);
            assert.isUndefined(copySkill.getFlag(SYS_ID, "importedFrom"));
            for (const copy of imported) {
              assert.deepEqual(copy.ownership, { default: O.NONE, [game.user.id]: O.OWNER });
            }
          })
        );

        it(
          "should ask for a file when Import items is chosen on a folder's menu",
          clean(async () => {
            const folder = await foundry.documents.Folder.implementation.create({
              name: "Quench Menu Folder",
              type: "Item"
            });
            folders.push(folder);
            await ui.items.render({ force: true });
            const selector = `[data-folder-id="${folder.id}"] > header`;
            assert.isTrue(await waitFor(() => ui.items.element.querySelector(selector)));
            const entries = [];
            Hooks.callAll("getFolderContextOptions", ui.items, entries);
            const entry = entries.find(e => e.label === "l5r4.ui.transfer.import");
            const opened = new Promise(resolve => {
              Hooks.once("renderDialogV2", app => {
                resolve(app.title);
                app.close();
              });
            });
            entry.onClick(new PointerEvent("click"), ui.items.element.querySelector(selector));
            assert.equal(await opened, game.i18n.localize("l5r4.ui.transfer.import"));
          })
        );
      });
    },
    { displayName: "L5R4: Character options and rule authoring" }
  );
}
