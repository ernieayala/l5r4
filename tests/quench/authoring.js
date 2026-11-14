import { SYS_ID } from "../../module/config/constants.js";
import { BioItemHandler } from "../../module/sheets/handlers/bio-item-handler.js";
import { preparePurchase } from "../../module/services/purchase.js";
import { recordTrackChange, ledgerEntries } from "../../module/services/ledger.js";
import { toggleActivation } from "../../module/services/effects/activation.js";
import { folderTransfer, importItems } from "../../module/services/item-transfer.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { honorRoll } from "../../module/services/dice/check/chat-actions.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createSchoolData, createSkillData } from "../fixtures/item-fixtures.js";
import {
  answerCheckDialog,
  changeThroughSheet,
  checkEffects,
  cleanTest,
  nextUpdate,
  settleChatNotifications,
  waitFor
} from "./helpers.js";

/** Every d10 shows 9 (client/dice/terms/dice.mjs:412), so no die explodes. */
const NINES = () => 0.15;

/**
 * Answer the next confirm dialog with Yes or No.
 * @param {"yes"|"no"} action
 * @returns {Promise<void>}
 */
function answerConfirm(action) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      app.element.querySelector(`[data-action="${action}"]`).click();
      resolve();
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
export function registerAuthoringBatch(quench) {
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
        const actor = track(await createTestPC({ name: "Quench Student" }));
        await BioItemHandler.handleDrop({ actor }, set.school);
        await waitFor(() => named(actor, "Quench Technique 1") && named(actor, "Meditation"));
        return { actor, ...set };
      };

      describe("School grants (pp.102, 104; decisions 2, 7)", function () {
        // Grants run in the background, one after another; a School's take a few round trips
        this.timeout(15_000);

        it(
          "dropping a School grants its Skills free and its Rank 1 Technique, with its Trait bonus",
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
          "a rise in School Rank grants the next Technique and says so",
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
          "removing the School takes its grants back and keeps a Skill with bought ranks",
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
          "a granted item the owner removes is not granted again",
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
          "a GM is asked to add an item whose prerequisites are not met",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Buyer" }));
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
            await answered;
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
          "a choice made at purchase reaches the item's other rules",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Chooser" }));
            await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2)]);
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
            assert.equal(data.system.rules[0].selection, "kenjutsu");
            await actor.createEmbeddedDocuments("Item", [data]);
            assert.equal(collectCheck(actor, { kind: "skill", skill: "kenjutsu" }).freeRaises, 1);
          })
        );
      });

      describe("Rules editor", () => {
        it(
          "a Technique's rule authored in the editor reaches its owner's roll",
          clean(async function () {
            this.timeout(15_000);
            const actor = track(await createTestPC({ name: "Quench Author" }));
            await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2)]);
            const [technique] = await actor.createEmbeddedDocuments("Item", [
              { name: "Quench Way of the Blade", type: "technique" }
            ]);
            const sheet = technique.sheet;
            await sheet.render({ force: true });
            sheet.element.querySelector('[data-action="changeTab"][data-tab="rules"]').click();
            await sheet.render();
            sheet.element.querySelector("[data-rule-key]").value = "RollModifier";
            const added = nextUpdate(technique);
            sheet.element.querySelector('[data-action="rulesAdd"]').click();
            await added;
            await changeThroughSheet(sheet, '[name="rules.0.selector"]', "skill:kenjutsu");
            await changeThroughSheet(sheet, '[name="rules.0.roll"]', "1");
            assert.deepInclude(technique._source.system.rules[0], {
              key: "RollModifier",
              selector: "skill:kenjutsu",
              roll: 1
            });
            assert.isNull(
              sheet.element.querySelector(".rule-error"),
              "the rule is valid as authored"
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
          "the Active Effect sheet has a Rules tab that saves system.rules",
          clean(async function () {
            this.timeout(15_000);
            const actor = track(await createTestPC({ name: "Quench Effect Author" }));
            const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Quench Blessing" }
            ]);
            const sheet = effect.sheet;
            assert.equal(sheet.constructor.name, "L5R4ActiveEffectConfig");
            await sheet.render({ force: true });
            sheet.changeTab("rules", "sheet");
            sheet.element.querySelector("[data-rule-key]").value = "Reduction";
            const added = nextUpdate(effect);
            sheet.element.querySelector('[data-action="rulesAdd"]').click();
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
          "OpponentModifier, UnskilledAs, RaiseRule, and ActionCost reach a check",
          clean(async () => {
            const attacker = track(
              await createTestPC({ name: "Quench Attacker", system: { traits: { agi: 3 } } })
            );
            const target = track(await createTestPC({ name: "Quench Slippery" }));
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
            const ctx = collectCheck(attacker, { kind: "attack", skill: "kyujutsu" });
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
          "a Cost rule prices an Advantage",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Discount" }));
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

      describe("Ledger and Honor Roll (pp.90-92; decision 3)", () => {
        it(
          "a Ledger rule sizes a change, and the ledger logs it",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Sworn" }));
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
            await recordTrackChange(actor, "honor", -3, "Quench breach");
            assert.deepInclude(actor.system.honor, { rank: 1, points: 4 });
            const [entry] = ledgerEntries(actor);
            assert.deepInclude(entry, {
              track: "honor",
              asked: -3,
              points: -6,
              reason: "Quench breach"
            });
          })
        );

        it(
          "a failed roll offers the Honor Roll once a session, and failing it costs a Rank",
          clean(async function () {
            this.timeout(15_000);
            const enabled = game.settings.get(SYS_ID, "honorRoll");
            const uniform = CONFIG.Dice.randomUniform;
            await game.settings.set(SYS_ID, "honorRoll", true);
            CONFIG.Dice.randomUniform = NINES;
            try {
              const actor = track(
                await createTestPC({ name: "Quench Honorable", system: { honor: { rank: 3 } } })
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
              const reroll = await honorRoll(failed);
              assert.deepInclude(reroll.system.pool, { roll: 3, keep: 3 });
              assert.equal(reroll.system.honorRollOf, failed.id);
              assert.notInclude(reroll.content, 'data-action="honor-roll"');
              assert.isFalse(reroll.system.outcome.success);
              assert.equal(actor.system.honor.rank, 2, "a failed Honor Roll costs a Rank");
              assert.isNull(await honorRoll(failed), "once a session");

              await game.settings.set(SYS_ID, "session", game.settings.get(SYS_ID, "session") + 1);
              assert.ok(await honorRoll(failed), "a new session gives it back");
            } finally {
              CONFIG.Dice.randomUniform = uniform;
              await game.settings.set(SYS_ID, "honorRoll", enabled);
            }
          })
        );
      });

      describe("Honor Roll without Honor", () => {
        it(
          "a character with no Honor Rank has no Honor Roll to make",
          clean(async () => {
            const enabled = game.settings.get(SYS_ID, "honorRoll");
            await game.settings.set(SYS_ID, "honorRoll", true);
            try {
              const actor = track(
                await createTestPC({
                  name: "Quench Dishonored",
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
              assert.isNull(await honorRoll(failed));
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

      describe("Shadowlands Taint (pp.277-279; decision 5)", () => {
        it(
          "Level 3 and 4 penalize social Skills, and Level 4 costs a Void Point",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Tainted" }));
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
          "Embracing the Taint gives +1k1 on a physical roll for a point of Taint",
          clean(async () => {
            const actor = track(
              await createTestPC({ name: "Quench Embrace", system: { shadowTaint: { rank: 1 } } })
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
            assert.equal(ledgerEntries(actor).at(-1).track, "taint");
          })
        );
      });

      describe("Kata and kiho activation (pp.259, 261; decision 8)", () => {
        it(
          "a kata's rules apply only while active, one kata at a time",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Stylist" }));
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
            await toggleActivation(actor, air);
            assert.equal(checkEffects(actor, "attack").roll, 1);
            await toggleActivation(actor, fire);
            assert.isTrue(
              await waitFor(() => checkEffects(actor, "attack").roll === 2),
              "the second kata ends the first"
            );
            await toggleActivation(actor, fire);
            assert.equal(checkEffects(actor, "attack").roll, 0);
          })
        );

        it(
          "one kiho of each type is active at a time, but any number of Martial kiho",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Quench Monk" }));
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
            await toggleActivation(actor, items["Quench Inner A"]);
            await toggleActivation(actor, items["Quench Inner B"]);
            assert.isTrue(
              await waitFor(() => checkEffects(actor, "attack").roll === 2),
              "the second Internal kiho ends the first"
            );
            await toggleActivation(actor, items["Quench Fist A"]);
            await toggleActivation(actor, items["Quench Fist B"]);
            assert.equal(checkEffects(actor, "attack").roll, 14, "both Martial kiho stay active");
            assert.sameMembers(
              actor.effects.map(e => e.system.group),
              ["kiho-internal", "", ""]
            );
          })
        );
      });

      describe("Folder export and import (decision 4)", () => {
        it(
          "exports a folder's items and imports them with their grants pointing at the copies",
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
            const payload = folderTransfer(folder);
            assert.lengthOf(payload.items, 2);
            assert.equal(payload.folder, "Quench Homebrew");

            // Ownership from the exporting world names its users, not this world's
            const O = CONST.DOCUMENT_OWNERSHIP_LEVELS;
            for (const item of payload.items) {
              item.ownership = { default: O.OBSERVER, otherWorldUser01: O.OWNER };
            }

            // The new folder sits inside `folder`, so deleting that afterwards removes it too
            const imported = await importItems(JSON.stringify(payload), folder);
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
      });
    },
    { displayName: "L5R4: Character options and rule authoring" }
  );
}
