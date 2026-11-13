import { SYS_ID } from "../../module/config/constants.js";
import L5R4ItemSheet from "../../module/sheets/item-sheet.js";
import L5R4NpcSheet from "../../module/sheets/npc-sheet.js";
import L5R4PcSheet from "../../module/sheets/pc-sheet.js";
import { changeThroughSheet, cleanTest, settleChatNotifications } from "./helpers.js";

/**
 * Collect every `@import` rule reachable from the page's stylesheets. Stylesheets from another origin refuse
 * access to their rules, so those are skipped.
 * @returns {CSSImportRule[]}
 */
function importRules() {
  const rules = [];
  const walk = sheet => {
    let cssRules;
    try {
      cssRules = sheet.cssRules;
    } catch {
      return;
    }
    for (const rule of cssRules) {
      if (!(rule instanceof CSSImportRule)) {
        continue;
      }
      rules.push(rule);
      if (rule.styleSheet) {
        walk(rule.styleSheet);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    walk(sheet);
  }
  return rules;
}

/**
 * Batch `l5r4-enhanced.smoke`: the system loads from its v14 manifest, its stylesheet sits in the `system`
 * cascade layer, and every Actor and Item subtype creates, opens its system sheet (the only one offered, and
 * the default), and saves a rename through the sheet. Each create-and-edit test fails on a console error.
 * Documents created here are deleted after the batch.
 * @param {object} quench  The Quench API object.
 */
export function registerSmokeBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.smoke`,
    context => {
      const { describe, it, before, after, assert } = context;
      const clean = cleanTest(assert);
      const created = [];

      // A chat pop-up rejection from an earlier batch's cleanup would otherwise land in the first clean test
      before(async function () {
        this.timeout(10_000);
        await settleChatNotifications();
      });

      after(async () => {
        for (const doc of created) {
          await doc.delete();
        }
      });

      describe("System", () => {
        it("registers its config namespace and document classes", () => {
          assert.exists(CONFIG.l5r4?.rings, "CONFIG.l5r4.rings");
          assert.exists(CONFIG.l5r4?.traits, "CONFIG.l5r4.traits");
          assert.exists(CONFIG.l5r4?.statusEffects, "CONFIG.l5r4.statusEffects");
          assert.equal(CONFIG.Actor.documentClass.name, "L5R4Actor");
          assert.equal(CONFIG.Item.documentClass.name, "L5R4Item");
        });

        it("has the id and version of system.json", async () => {
          const manifest = await (await fetch(`systems/${SYS_ID}/system.json`)).json();
          assert.equal(game.system.id, manifest.id);
          assert.equal(game.system.version, manifest.version);
        });

        it("loads every manifest stylesheet in its cascade layer", () => {
          const rules = importRules();
          for (const style of game.system.styles) {
            const loaded = rules.some(
              rule => rule.layerName === style.layer && rule.href.includes(style.src)
            );
            assert.isTrue(loaded, `${style.src} imported in layer ${style.layer}`);
          }
        });
      });

      const sheetFor = { Actor: { pc: L5R4PcSheet, npc: L5R4NpcSheet }, Item: {} };
      for (const type of Object.keys(game.system.documentTypes.Item)) {
        sheetFor.Item[type] = L5R4ItemSheet;
      }

      for (const [documentName, types] of Object.entries(sheetFor)) {
        describe(`${documentName} subtypes`, () => {
          for (const [type, sheetClass] of Object.entries(types)) {
            it(`offers only the system sheet for ${type}, as the default`, () => {
              const { DocumentSheetConfig } = foundry.applications.apps;
              const { sheetClasses, defaultClass } = DocumentSheetConfig.getSheetClassesForSubType(
                documentName,
                type
              );
              const sheetId = `${SYS_ID}.${sheetClass.name}`;
              assert.deepEqual(Object.keys(sheetClasses), [sheetId]);
              assert.equal(defaultClass, sheetId);
            });

            it(
              `creates a ${type}, opens its sheet, and saves a rename`,
              clean(async () => {
                const cls = getDocumentClass(documentName);
                const doc = await cls.create({ name: `Smoke ${type}`, type });
                created.push(doc);

                const sheet = doc.sheet;
                assert.instanceOf(sheet, sheetClass);
                await sheet.render({ force: true });
                assert.isTrue(sheet.rendered);

                await changeThroughSheet(sheet, 'input[name="name"]', `Renamed ${type}`);
                assert.equal(doc.name, `Renamed ${type}`);
                await sheet.close();
              })
            );
          }
        });
      }
    },
    { displayName: "L5R4: Smoke" }
  );
}
