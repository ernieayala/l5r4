import { SYS_ID } from "../../module/config/constants.js";
import { SkillRoll } from "../../module/services/dice/rolls/skill-roll.js";
import { FamilyBonusService } from "../../module/services/family-bonus-service.js";
import { buildXpHistory } from "../../module/services/xp/xp-calculator.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData } from "../fixtures/item-fixtures.js";
import { watchConsole } from "./helpers.js";

/** The text core appends to every compatibility warning (common/utils/logging.mjs:32-34). */
const DEPRECATION = /Deprecated since Version|Backwards-compatible support will be removed/;

/**
 * Batch `l5r4-enhanced.deprecations`: runs the common paths (document creation, every sheet, a skill roll, a
 * stance change, a family Trait bonus read by the bonus and XP code, an item chat card) with compatibility warnings scoped to this system's files, and fails
 * listing each distinct deprecated API it reached; that list is a checklist for Stages 2-6. Deprecated calls on
 * other paths (for example AppV1 `Dialog.confirm`) are not reached here. A warning core logs once per session and
 * already logged at load is not repeated here, so check the load-time console too.
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

      after(async () => {
        watch.stop();
        Hooks.off("createChatMessage", hookId);
        CONFIG.compatibility = compatibility;
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

        it("posts an item chat card", async () => {
          const item = await Item.create(createSkillData("Deprecations Card", 1, "agi"));
          created.push(item);
          await item.roll();
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
