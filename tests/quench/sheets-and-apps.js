import { SYS_ID } from "../../module/config/constants.js";
import ArmorConfigApplication from "../../module/apps/armor-config.js";
import CombatConfigApplication from "../../module/apps/combat-config.js";
import ConditionManager from "../../module/apps/condition-manager.js";
import EmphasisManagerApplication from "../../module/apps/emphasis-manager.js";
import NpcAttackConfigApplication from "../../module/apps/npc-attack-config.js";
import WealthManagerApplication from "../../module/apps/wealth-manager.js";
import WoundConfigApplication from "../../module/apps/wound-config.js";
import XpManagerApplication from "../../module/apps/xp-manager.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import {
  createArmorData,
  createBow,
  createFamilyData,
  createKatana,
  createSchoolData,
  createSkillData,
  createSpellData
} from "../fixtures/item-fixtures.js";
import { changeThroughSheet, cleanTest, nextUpdate, settleChatNotifications } from "./helpers.js";

/** A test that opens, clicks through, and closes a window can take a few seconds per action. */
const SURFACE_TIMEOUT_MS = 120_000;

/** Actions skipped by the click-through: they close the window under test. */
const SKIPPED_ACTIONS = new Set(["close"]);

const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Close every window opened since `baseline` except `keep`, the way a user dismisses a dialog, until no new one
 * appears. A dismissed DialogV2 resolves its promise with null, so the action that opened it runs to its end.
 * @param {Set<object>} baseline  Windows open before the test.
 * @param {object} keep  The window under test.
 */
async function dismissNewWindows(baseline, keep) {
  for (let round = 0; round < 5; round++) {
    await settle(250);
    const opened = [...foundry.applications.instances.values()].filter(
      app => app.rendered && app !== keep && !baseline.has(app)
    );
    if (!opened.length) {
      return;
    }
    for (const app of opened) {
      await app.close({ animate: false });
    }
  }
}

/**
 * The window's own action elements: inside the window content, outside core's ProseMirror editor (its toolbar
 * entries are core actions).
 * @param {object} app  A rendered ApplicationV2.
 * @returns {HTMLElement[]}
 */
function actionElements(app) {
  const content = app.element.querySelector(".window-content") ?? app.element;
  return [...content.querySelectorAll("[data-action]")].filter(el => !el.closest("prose-mirror"));
}

/**
 * Run every action a window shows, once each, as a user would: click it (or change it, for a form control), then
 * right-click it, dismissing any window it opens. Frame controls (close, header menu) sit outside the window
 * content and are not touched.
 * @param {object} app  A rendered ApplicationV2.
 * @param {Set<object>} baseline  Windows open before the test.
 * @param {Set<string>} [skip]  Actions not to run.
 * @returns {Promise<string[]>}  The actions run.
 */
async function runEveryAction(app, baseline, skip = new Set()) {
  const find = action => actionElements(app).find(el => el.dataset.action === action);
  const actions = [...new Set(actionElements(app).map(el => el.dataset.action))].filter(
    action => !SKIPPED_ACTIONS.has(action) && !skip.has(action)
  );
  for (const action of actions) {
    if (!app.rendered) {
      break;
    }
    const el = find(action);
    if (!el) {
      continue;
    }
    if (el.matches("select, input:not([type='checkbox']), textarea")) {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.click();
    }
    await dismissNewWindows(baseline, app);
    const again = app.rendered && find(action);
    if (again) {
      again.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      await dismissNewWindows(baseline, app);
    }
  }
  return actions;
}

/**
 * Batch `l5r4-enhanced.sheets-and-apps` (roadmap Stage 6): the PC, NPC, and item sheets and the eight apps
 * render, save a field changed through their form, and run every action they show, with no console error or
 * warning and no unhandled rejection. Windows the actions open are dismissed.
 * @param {object} quench  The Quench API object.
 */
export function registerSheetsAndAppsBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets-and-apps`,
    context => {
      const { describe, it, before, after, assert } = context;
      const clean = cleanTest(assert);
      const created = [];
      const messages = [];
      let baseline;
      let hookId;
      let pc;
      let npc;

      before(async function () {
        this.timeout(SURFACE_TIMEOUT_MS);
        await settleChatNotifications();
        baseline = new Set(
          [...foundry.applications.instances.values()].filter(app => app.rendered)
        );
        hookId = Hooks.on("createChatMessage", message => messages.push(message));
        pc = await createTestPC({ name: "Sheets PC" });
        npc = await createTestNPC({ name: "Sheets NPC" });
        created.push(pc, npc);
        await pc.createEmbeddedDocuments("Item", [
          createSkillData("Kenjutsu", 2, "agi"),
          createKatana(),
          createBow(),
          createArmorData("Light Armor"),
          createSpellData("Sense"),
          createSchoolData("Sheets School"),
          createFamilyData("Sheets Family"),
          ...["advantage", "disadvantage", "kata", "kiho", "technique", "tattoo", "commonItem"].map(
            type => ({ name: `Sheets ${type}`, type })
          )
        ]);
        await npc.createEmbeddedDocuments("Item", [
          createSkillData("Jiujutsu", 2, "agi"),
          createKatana(),
          createSpellData("Sense")
        ]);
      });

      after(async function () {
        this.timeout(SURFACE_TIMEOUT_MS);
        Hooks.off("createChatMessage", hookId);
        await settleChatNotifications();
        for (const message of messages) {
          await message.delete();
        }
        for (const doc of created) {
          await doc.delete();
        }
      });

      describe("Sheets", () => {
        // An NPC's long rest heals nothing and warns that its heal rate is 0: issue #40, fixed in roadmap Stage 13
        const skipFor = { pc: new Set(), npc: new Set(["apply-healing"]) };

        for (const which of ["pc", "npc"]) {
          it(
            `${which} sheet renders, saves a renamed field, and runs every action`,
            clean(async function () {
              this.timeout(SURFACE_TIMEOUT_MS);
              const actor = which === "pc" ? pc : npc;
              const sheet = actor.sheet;
              await sheet.render({ force: true });
              await changeThroughSheet(sheet, 'input[name="name"]', `Renamed ${which}`);
              assert.equal(actor.name, `Renamed ${which}`);
              const actions = await runEveryAction(sheet, baseline, skipFor[which]);
              assert.isAbove(actions.length, 10, "actions found");
              await sheet.close({ animate: false });
            })
          );
        }

        for (const type of Object.keys(game.system.documentTypes.Item)) {
          it(
            `${type} item sheet renders, saves a renamed field, and runs every action`,
            clean(async function () {
              this.timeout(SURFACE_TIMEOUT_MS);
              const item = await Item.create({ name: `Sheets ${type}`, type });
              created.push(item);
              const sheet = item.sheet;
              await sheet.render({ force: true });
              await changeThroughSheet(sheet, 'input[name="name"]', `Renamed ${type}`);
              assert.equal(item.name, `Renamed ${type}`);
              await runEveryAction(sheet, baseline);
              await sheet.close({ animate: false });
            })
          );
        }
      });

      describe("Sheet fixes (issue #30, header controls)", () => {
        it(
          "lists each header control once",
          clean(async () => {
            for (const doc of [pc, npc]) {
              const actions = doc.sheet._getHeaderControls().map(control => control.action);
              assert.deepEqual(actions, [...new Set(actions)], doc.type);
            }
          })
        );

        it(
          "steps the Void Ring with its arrows on both sheets",
          clean(async () => {
            for (const actor of [pc, npc]) {
              await actor.update({ "system.rings.void.rank": 2 });
              const sheet = actor.sheet;
              await sheet.render({ force: true });
              let saved = nextUpdate(actor);
              sheet.element.querySelector('[data-action="void-ring-increase"]').click();
              await saved;
              assert.equal(actor.system.rings.void.rank, 3, `${actor.type} up`);
              await sheet.render();
              saved = nextUpdate(actor);
              sheet.element.querySelector('[data-action="void-ring-decrease"]').click();
              await saved;
              assert.equal(actor.system.rings.void.rank, 2, `${actor.type} down`);
              await sheet.close({ animate: false });
            }
          })
        );

        it(
          "removes an NPC attack after its confirmation, hides the empty slot, and adds into it",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const sheet = npc.sheet;
            await sheet.render({ force: true });
            const shown = () =>
              [...sheet.element.querySelectorAll("[data-attack-section]")].map(
                row => row.dataset.attackSection
              );
            assert.notInclude(shown(), "attack3", "a new NPC's empty third slot is hidden");

            const answered = new Promise(resolve =>
              Hooks.once("renderDialogV2", app => {
                app.element.querySelector('[data-action="yes"]').click();
                resolve();
              })
            );
            const saved = nextUpdate(npc);
            sheet.element
              .querySelector('[data-action="delete-attack"][data-attack-key="attack2"]')
              .click();
            await answered;
            await saved;
            assert.include(npc.system.attack2, { name: "", roll: 0, keep: 0 });
            assert.include(npc.system.damage2, { roll: 0, keep: 0 });
            await sheet.render();
            assert.notInclude(shown(), "attack2", "the cleared slot is hidden");

            const add = sheet.element.querySelector('[data-action="add-attack"]');
            assert.equal(add.dataset.attackKey, "attack2", "Add fills the first empty slot");
            add.click();
            await settle(500);
            const editor = [...foundry.applications.instances.values()].find(
              app => app instanceof NpcAttackConfigApplication && app.rendered
            );
            assert.equal(editor?.attackKey, "attack2");
            await editor.close({ animate: false });
            await sheet.close({ animate: false });
          })
        );

        it(
          "gives a light sheet in a dark interface the light Ring backdrop",
          clean(async () => {
            const themes = game.settings.get("core", "sheetThemes");
            const bodyHadDark = document.body.classList.contains("theme-dark");
            document.body.classList.add("theme-dark");
            document.body.classList.remove("theme-light");
            try {
              await game.settings.set("core", "sheetThemes", {
                ...themes,
                documents: { ...themes.documents, [pc.uuid]: "light" }
              });
              await pc.sheet.close({ animate: false });
              const sheet = new pc.sheet.constructor({ document: pc });
              await sheet.render({ force: true });
              assert.isTrue(sheet.element.classList.contains("theme-light"));
              const backdrop = getComputedStyle(
                sheet.element.querySelector(".ring-rank-earth"),
                "::before"
              );
              assert.include(backdrop.backgroundImage, "parchment");
              assert.equal(backdrop.backgroundColor, "rgba(0, 0, 0, 0)");
              await sheet.close({ animate: false });
            } finally {
              await game.settings.set("core", "sheetThemes", themes);
              if (!bodyHadDark) {
                document.body.classList.remove("theme-dark");
              }
            }
          })
        );
      });

      describe("Apps", () => {
        /**
         * Open an app, run `change` to change a field the way a user does, then run every action.
         * @param {object} app  An unrendered ApplicationV2.
         * @param {() => Promise<void>} change  Changes a field and waits for the save.
         */
        async function exercise(app, change) {
          await app.render({ force: true });
          await change(app);
          if (app.rendered) {
            await runEveryAction(app, baseline);
          }
          if (app.rendered) {
            await app.close({ animate: false });
          }
        }

        /** Change a named field and wait for the actor update the app makes. */
        const changeField = (actor, name, value) => async app => {
          const saved = nextUpdate(actor);
          const input = app.element.querySelector(`[name="${name}"]`);
          input.value = value;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          await saved;
        };

        it(
          "combat config saves a field and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(
              new CombatConfigApplication(pc),
              changeField(pc, "initiative.totalMod", "4")
            );
            assert.equal(pc.system.initiative.totalMod, 4);
          })
        );

        it(
          "armor config saves a field and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new ArmorConfigApplication(pc), changeField(pc, "armorTn.mod", "3"));
            assert.equal(pc.system.armorTn.mod, 3);
          })
        );

        it(
          "wound config saves a field and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new WoundConfigApplication(pc), changeField(pc, "woundsMod", "2"));
            assert.equal(pc.system.woundsMod, 2);
          })
        );

        it(
          "condition manager applies a checked condition and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new ConditionManager(pc), async app => {
              const checkboxes = app.element.querySelector("multi-checkbox");
              const applied = new Promise(resolve => Hooks.once("createActiveEffect", resolve));
              checkboxes.value = ["blinded"];
              checkboxes.dispatchEvent(new Event("change", { bubbles: true }));
              await applied;
            });
            assert.isTrue(pc.statuses.has("blinded"));
          })
        );

        it(
          "wealth manager adds money and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const koku = pc.system.wealth.koku;
            await exercise(new WealthManagerApplication(pc), async app => {
              const saved = nextUpdate(pc);
              app.element.querySelector('[name="add-amount"]').value = "5";
              app.element.querySelector('[name="add-denomination"]').value = "koku";
              app.element.querySelector('[data-action="add-money"]').click();
              await saved;
            });
            assert.isAtLeast(pc.system.wealth.koku, koku + 5);
          })
        );

        it(
          "XP manager adds an award and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new XpManagerApplication(pc), async app => {
              const saved = nextUpdate(pc);
              app.element.querySelector('[name="xp-amount"]').value = "10";
              app.element.querySelector('[name="xp-note"]').value = "Sheets award";
              app.element.querySelector('[data-action="xp-add-confirm"]').click();
              await saved;
            });
            const notes = (pc.getFlag(SYS_ID, "xpManual") ?? []).map(entry => entry.note);
            assert.include(notes, "Sheets award");
          })
        );

        it(
          "NPC attack config saves an attack and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const app = new NpcAttackConfigApplication(npc, "attack1");
            await app.render({ force: true });
            const saved = nextUpdate(npc);
            app.element.querySelector('[name="attack1.name"]').value = "Claw";
            app.element.querySelector('[data-action="save"]').click();
            await saved;
            assert.equal(npc.system.attack1.name, "Claw");
            const again = new NpcAttackConfigApplication(npc, "attack2");
            await exercise(again, async () => {});
          })
        );

        it(
          "emphasis manager saves a checked emphasis and runs every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const skill = pc.items.getName("Kenjutsu");
            const app = new EmphasisManagerApplication({ item: skill });
            await app.render({ force: true });
            const box = app.element.querySelector('input[type="checkbox"][name^="emphasis."]');
            const emphasis = box.name.slice("emphasis.".length);
            box.checked = !(skill.system.availableEmphases ?? []).includes(emphasis);
            const saved = nextUpdate(skill);
            app.element.querySelector('button[type="submit"]').click();
            await saved;
            assert.equal(skill.system.availableEmphases.includes(emphasis), box.checked);
            await exercise(new EmphasisManagerApplication({ item: skill }), async () => {});
          })
        );
      });
    },
    { displayName: "L5R4: Sheets and apps" }
  );
}
