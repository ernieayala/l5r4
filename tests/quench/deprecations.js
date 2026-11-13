import { SYS_ID } from "../../module/config/constants.js";
import { PcActionsHandler } from "../../module/sheets/handlers/pc-actions-handler.js";
import { SkillRoll } from "../../module/services/dice/rolls/skill-roll.js";
import { FamilyBonusService } from "../../module/services/family-bonus-service.js";
import { buildXpHistory } from "../../module/services/xp/xp-calculator.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData } from "../fixtures/item-fixtures.js";
import { settleChatNotifications, watchConsole } from "./helpers.js";

/** The text core appends to every compatibility warning (common/utils/logging.mjs:32-34). */
const DEPRECATION = /Deprecated since Version|Backwards-compatible support will be removed/;

/**
 * Clicks a button in the next DialogV2 to render, the way a user answers it.
 * @param {string} action  The button's action, such as "yes" or "no".
 * @returns {Promise<void>}  Resolves once the button is clicked.
 */
function answerNextDialog(action) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      app.element.querySelector(`[data-action="${action}"]`).click();
      resolve();
    });
  });
}

/**
 * Batch `l5r4-enhanced.deprecations`: runs the common paths (document creation, every sheet, a skill roll, a
 * stance change, a family Trait bonus read by the bonus and XP code, an item chat card in every message mode,
 * deleting an item from its sheet, and Void spent on Armor TN and on Initiative through their confirmations) with
 * compatibility warnings scoped to this system's files, and fails listing each distinct deprecated API it reached.
 * A warning core logs once per session and already logged at load is not repeated here, so check the load-time
 * console too.
 * @param {object} quench  The Quench API object.
 */
export function registerDeprecationsBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.deprecations`,
    context => {
      const { describe, it, before, after, assert } = context;
      const created = [];
      const messages = [];
      let compatibility;
      let watch;
      let hookId;

      before(() => {
        compatibility = CONFIG.compatibility;
        CONFIG.compatibility = {
          mode: CONST.COMPATIBILITY_MODES.WARNING,
          includePatterns: [new RegExp(`systems/${SYS_ID}/`)],
          excludePatterns: []
        };
        watch = watchConsole(["warn", "error"]);
        hookId = Hooks.on("createChatMessage", message => {
          if (message.isAuthor) {
            messages.push(message);
          }
        });
      });

      after(async function () {
        this.timeout(10_000);
        watch.stop();
        Hooks.off("createChatMessage", hookId);
        CONFIG.compatibility = compatibility;
        await settleChatNotifications();
        for (const doc of [...messages, ...created]) {
          await doc.delete();
        }
      });

      describe("Common paths", () => {
        it("creates every subtype and renders its sheet", async () => {
          const types = game.system.documentTypes;
          for (const [documentName, subtypes] of [
            ["Actor", types.Actor],
            ["Item", types.Item]
          ]) {
            for (const type of Object.keys(subtypes)) {
              const doc = await getDocumentClass(documentName).create({
                name: `Deprecations ${type}`,
                type
              });
              created.push(doc);
              await doc.sheet.render({ force: true });
              // Skips 14.370's close animation (about 1 s per sheet), which this inventory does not need.
              await doc.sheet.close({ animate: false });
            }
          }
        });

        it("rolls a skill without the options dialog", async () => {
          const actor = await createTestPC({ name: "Deprecations Roller" });
          created.push(actor);
          await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 3, "agi")]);
          await SkillRoll({
            actor,
            skillName: "kenjutsu",
            actorTrait: 2,
            skillRank: 3,
            skillTrait: "agi",
            askForOptions: false
          });
        });

        it("changes stance", async () => {
          const actor = await createTestNPC({ name: "Deprecations Stance" });
          created.push(actor);
          await actor.toggleStatusEffect("attackStance", { active: true });
          await actor.toggleStatusEffect("attackStance", { active: false });
        });

        it("applies a family Trait bonus and reads it back", async () => {
          const actor = await createTestPC({ name: "Deprecations Family" });
          created.push(actor);
          const [family] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Deprecations Family Item",
              type: "family",
              effects: [
                {
                  name: "Family bonus",
                  transfer: true,
                  system: { changes: [{ key: "system.traits.str", type: "add", value: 1 }] }
                }
              ]
            }
          ]);
          await actor.setFlag(SYS_ID, "familyItemUuid", family.uuid);
          FamilyBonusService.getBonusMap(actor);
          await buildXpHistory(actor);
          await actor.update({ "system.traits.str": 3 });
        });

        it("posts an item chat card in each message mode, with that mode's visibility", async () => {
          const item = await Item.create(createSkillData("Deprecations Card", 1, "agi"));
          created.push(item);
          const selected = game.settings.get("core", "messageMode");
          try {
            for (const mode of Object.keys(CONFIG.ChatMessage.modes)) {
              await game.settings.set("core", "messageMode", mode);
              const message = await item.roll();
              // The resolved mode depends on the speaker (In Character needs one), so expect it for the same speaker
              const expected = ChatMessage.applyMode({ speaker: message.speaker }, mode);
              assert.sameMembers(message.whisper, expected.whisper ?? [], `${mode}: whisper`);
              assert.equal(message.blind, expected.blind ?? false, `${mode}: blind`);
              if (expected.style !== undefined) {
                assert.equal(message.style, expected.style, `${mode}: style`);
              }
            }
          } finally {
            await game.settings.set("core", "messageMode", selected);
          }
        });

        it("deletes an item from the sheet after its confirmation", async () => {
          const actor = await createTestPC({ name: "Deprecations Delete" });
          created.push(actor);
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Deprecations Skill", 1, "agi")
          ]);
          await actor.sheet.render({ force: true });
          const control = actor.sheet.element.querySelector(
            `.item[data-item-id="${skill.id}"] [data-action="item-delete"]`
          );
          const answered = answerNextDialog("yes");
          const deleted = new Promise(resolve => Hooks.once("deleteItem", resolve));
          control.click();
          await answered;
          await deleted;
          await actor.sheet.close({ animate: false });
          assert.isUndefined(actor.items.get(skill.id), "item deleted");
        });

        it("spends Void on Armor TN and on Initiative after their confirmations", async () => {
          const actor = await createTestPC({ name: "Deprecations Void" });
          created.push(actor);
          const combat = await Combat.create({ scene: null, active: true });
          created.push(combat);
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id }
          ]);
          await combat.startCombat();

          let answered = answerNextDialog("yes");
          await PcActionsHandler.handleToggleArmorVoid({ actor }, null, { checked: true });
          await answered;
          assert.isTrue(actor.system.armorTn.useVoid, "Armor TN Void active");
          assert.equal(actor.system.rings.void.value, 1, "Void Points 2 - 1");

          await actor.update({ "system.initiative.useVoid": true });
          answered = answerNextDialog("yes");
          await combat.rollInitiative(combatant.id);
          await answered;
          assert.equal(actor.system.rings.void.value, 0, "Void Points 1 - 1");
          assert.isNumber(combatant.initiative, "Initiative rolled");
        });
      });

      describe("Inventory", () => {
        it(`calls no deprecated API from systems/${SYS_ID}/`, () => {
          const found = [
            ...new Set(watch.messages.filter(m => DEPRECATION.test(m)).map(m => m.split("\n")[0]))
          ];
          assert.deepEqual(found, [], "deprecated APIs reached by the paths above");
        });
      });
    },
    { displayName: "L5R4: Deprecated API inventory" }
  );
}
