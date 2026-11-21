import { SYS_ID } from "../../module/config/constants.js";
import ArmorConfigApplication from "../../module/apps/armor-config.js";
import CombatConfigApplication from "../../module/apps/combat-config.js";
import ConditionManagerApplication from "../../module/apps/condition-manager.js";
import EmphasisManagerApplication from "../../module/apps/emphasis-manager.js";
import NpcAttackConfigApplication from "../../module/apps/npc-attack-config.js";
import WealthManagerApplication from "../../module/apps/wealth-manager.js";
import WoundConfigApplication from "../../module/apps/wound-config.js";
import XpManagerApplication from "../../module/apps/xp-manager.js";
import { ItemCrudHandler } from "../../module/sheets/handlers/item-crud-handler.js";
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
import {
  buttonLabelsOf,
  changeThroughSheet,
  cleanTest,
  nextUpdate,
  settleChatNotifications,
  waitFor
} from "./helpers.js";
import { EVERY_ACTION } from "./every-action.js";

/** A test that opens, clicks through, and closes a window can take a few seconds per action. */
const SURFACE_TIMEOUT_MS = 120_000;

/**
 * Actions skipped by the click-through: `close` closes the window under test; core's `editImage` opens a file picker
 * that errors when dismissed before its directory loads, so its own test opens and closes it (#76).
 */
const SKIPPED_ACTIONS = new Set(["close", "editImage"]);

/** Every action the click-through ran in this batch, checked against its coverage list at the end. */
const ran = new Set();

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
  // eslint-disable-next-line no-restricted-syntax -- core markup, the window frame [src: client/applications/api/application.mjs:861]
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
    ran.add(action);
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
export function registerSheetsAndAppsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets-and-apps`,
    context => {
      const { describe, it, before, after, assert } = context;
      const clean = cleanTest(assert);
      /** A window's title is its one title key, filled (docs/design-system/content/localization.md). */
      const assertTitle = (app, key, data) => {
        assert.isTrue(game.i18n.has(key), `${key} is defined`);
        assert.equal(app.title, game.i18n.localize(key, data));
      };
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
          // A row expands only when it has details, so the click-through needs one with a description
          createSkillData("Kenjutsu", 2, "agi", { system: { description: "Sheets details" } }),
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
            "should render the " + which + " sheet, save a renamed field, and run every action",
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
            "should render the " + type + " item sheet, save a renamed field, and run every action",
            clean(async function () {
              this.timeout(SURFACE_TIMEOUT_MS);
              const item = await Item.create({ name: `Sheets ${type}`, type });
              created.push(item);
              const sheet = item.sheet;
              await sheet.render({ force: true });
              assertTitle(sheet, "l5r4.ui.sheets.itemTitle", {
                item: `Sheets ${type}`,
                type: game.i18n.localize(`TYPES.Item.${type}`)
              });
              await changeThroughSheet(sheet, 'input[name="name"]', `Renamed ${type}`);
              assert.equal(item.name, `Renamed ${type}`);
              await runEveryAction(sheet, baseline);
              await sheet.close({ animate: false });
            })
          );
        }
      });

      describe("Sheet controls and themes", () => {
        // #30
        it(
          "should list each header control once",
          clean(async () => {
            for (const doc of [pc, npc]) {
              const actions = doc.sheet._getHeaderControls().map(control => control.action);
              assert.deepEqual(actions, [...new Set(actions)], doc.type);
            }
          })
        );

        // #76
        it(
          "should open the file picker from an item's image, as from an actor's",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const item = await Item.create({ name: "Sheets image", type: "skill" });
            created.push(item);
            await item.sheet.render({ force: true });
            const pickers = () =>
              [...foundry.applications.instances.values()].filter(
                app => app instanceof foundry.applications.apps.FilePicker && app.rendered
              );
            const open = pickers().length;
            item.sheet.element.querySelector('[data-action="editImage"]').click();
            assert.isTrue(await waitFor(() => pickers().length > open), "the picker opens");
            // Closing before the picker lists its directory errors in core, so it is left to finish first
            await new Promise(resolve => setTimeout(resolve, 1000));
            for (const picker of pickers()) {
              await picker.close({ animate: false });
            }
            await item.sheet.close({ animate: false });
          })
        );

        it(
          "should step the Void Ring with its arrows on both sheets",
          clean(async function () {
            // Two sheets, each rendered and saved twice: over Mocha's 2-second default in a full run
            this.timeout(SURFACE_TIMEOUT_MS);
            for (const actor of [pc, npc]) {
              await actor.update({ "system.rings.void.rank": 2 });
              const sheet = actor.sheet;
              await sheet.render({ force: true });
              let saved = nextUpdate(actor);
              sheet.element.querySelector('[data-action="increase-void-ring"]').click();
              await saved;
              assert.equal(actor.system.rings.void.rank, 3, `${actor.type} up`);
              await sheet.render();
              saved = nextUpdate(actor);
              sheet.element.querySelector('[data-action="decrease-void-ring"]').click();
              await saved;
              assert.equal(actor.system.rings.void.rank, 2, `${actor.type} down`);
              await sheet.close({ animate: false });
            }
          })
        );

        it(
          "should remove an NPC attack after its confirmation, hide the empty slot, and add into it",
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
                const labels = buttonLabelsOf(app);
                const text = app.element.querySelector("form").textContent;
                app.element.querySelector('[data-action="yes"]').click();
                resolve({ labels, text });
              })
            );
            const saved = nextUpdate(npc);
            sheet.element
              .querySelector('[data-action="delete-attack"][data-attack-key="attack2"]')
              .click();
            const { labels, text } = await answered;
            assert.equal(labels.yes, game.i18n.localize("l5r4.ui.common.delete"));
            assert.equal(labels.no, game.i18n.localize("l5r4.ui.common.cancel"));
            // docs/design-system/patterns/dialogs.md, rule 3: the confirmation states what is lost
            assert.include(text, game.i18n.localize("l5r4.ui.dialogs.deleteAttack.consequence"));
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

        // #79: docs/design-system/components/initiative-block.md C1-C4, armor-tn-block.md A4
        it(
          "should name the sidebar's stance, Void, and armor controls and sign a negative Initiative bonus",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            // The click-through may leave the Void mark on; the PC's pool shows its +10 then
            await pc.update({ "system.initiative.useVoid": true, "system.rings.void.rank": 2 });
            await npc.update({
              "system.initiative.totalMod": -2,
              "system.initiative.useVoid": false,
              "system.rings.void.rank": 2
            });
            for (const actor of [pc, npc]) {
              const sheet = actor.sheet;
              await sheet.render({ force: true });
              const named = selector =>
                sheet.element.querySelector(selector)?.getAttribute("aria-label");
              assert.equal(
                named('[data-action="apply-stance"]'),
                game.i18n.localize("l5r4.character.stance.current"),
                `${actor.type} stance`
              );
              assert.equal(
                named('[data-action="toggle-initiative-void"]'),
                game.i18n.localize("l5r4.ui.mechanics.rings.voidInitBoost"),
                `${actor.type} Initiative Void`
              );
              const section = sheet.element
                .querySelector('[data-action="apply-stance"]')
                .closest("section");
              const label = [...section.querySelectorAll("span")].find(
                span => span.textContent.trim() === game.i18n.localize("l5r4.ui.common.initiative")
              );
              const { roll, keep, totalMod } = actor.system.initiative;
              const bonus = actor.type === "npc" ? "-2" : `+${totalMod + 10}`;
              assert.equal(
                label.nextElementSibling.firstElementChild.textContent.trim(),
                `${roll}k${keep}${bonus}`,
                `${actor.type} pool`
              );
              await sheet.close({ animate: false });
            }
            const sheet = npc.sheet;
            await sheet.render({ force: true });
            for (const [field, key] of [
              ["system.armor.armorTn", "l5r4.ui.mechanics.wounds.armorTn"],
              ["system.armor.reduction", "l5r4.ui.mechanics.wounds.armorReduction"]
            ]) {
              assert.equal(
                sheet.element.querySelector(`input[name="${field}"]`).getAttribute("aria-label"),
                game.i18n.localize(key),
                field
              );
            }
            await sheet.close({ animate: false });
            await pc.sheet.render({ force: true });
            assert.equal(
              pc.sheet.element
                .querySelector('[data-action="toggle-armor-void"]')
                .getAttribute("aria-label"),
              game.i18n.localize("l5r4.ui.mechanics.rings.voidTnBoost")
            );
            await pc.sheet.close({ animate: false });
            await pc.update({ "system.initiative.useVoid": false });
            await npc.update({ "system.initiative.totalMod": 0 });
          })
        );

        // #79: grid.md G3, fear-block.md R3-R4, item-header.md E2, wound-track.md W1, W2, W4, W7
        it(
          "should name the Wounds, Fear, and name inputs and mark the current Wound Rank and signed penalties",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const localize = key => game.i18n.localize(key);
            await pc.update({ "system.suffered": 0 });
            await pc.sheet.render({ force: true });
            const el = pc.sheet.element;
            assert.equal(
              el.querySelector('input[name="system.suffered"]').getAttribute("aria-label"),
              localize("l5r4.ui.mechanics.wounds.suffered")
            );
            const track = el.querySelector('[role="table"]');
            assert.equal(track.getAttribute("aria-label"), localize("l5r4.ui.sheets.woundLevels"));
            assert.isNull(track.querySelector("input"), "the sheet track holds no inputs");
            const rows = [...track.querySelectorAll('[role="row"]')].slice(1);
            const current = rows.filter(row => row.getAttribute("aria-current") === "true");
            assert.deepEqual(current, [rows[0]], "Healthy is the one current rank");
            assert.exists(rows[0].querySelector("i[inert]"), "the current mark");
            const penalties = rows.map(row =>
              row.querySelectorAll('[role="cell"]')[1].textContent.trim()
            );
            assert.equal(penalties[0], "0", "Healthy's penalty is unsigned");
            assert.equal(penalties[1], `+${pc.system.woundLevels.nicked.penaltyEff}`, "Nicked");
            await pc.sheet.close({ animate: false });

            await npc.sheet.render({ force: true });
            const fear = npc.sheet.element.querySelector('input[name="system.fear.rank"]');
            assert.equal(fear.getAttribute("aria-label"), localize("l5r4.ui.mechanics.fear.rank"));
            assert.equal(
              fear.closest("section").querySelector("[data-section-title] h4").textContent.trim(),
              localize("l5r4.ui.mechanics.fear.title"),
              "the heading does not repeat the grid label"
            );
            await npc.sheet.close({ animate: false });

            const before = npc.system.woundMode;
            await npc.update({ "system.woundMode": "manual" });
            const app = new WoundConfigApplication(npc);
            await app.render({ force: true });
            try {
              const healthy = localize("l5r4.ui.mechanics.wounds.healthy");
              for (const [column, key] of [
                ["penalty", "penaltyOf"],
                ["value", "thresholdOf"],
                ["active", "activeOf"]
              ]) {
                assert.equal(
                  app.element
                    .querySelector(`input[name="manualWoundLevels.healthy.${column}"]`)
                    .getAttribute("aria-label"),
                  game.i18n.localize(`l5r4.ui.mechanics.wounds.${key}`, { rank: healthy }),
                  column
                );
              }
            } finally {
              await app.close({ animate: false });
              await npc.update({ "system.woundMode": before });
            }

            const item = await Item.create({ name: "Sheets header", type: "skill" });
            created.push(item);
            await item.sheet.render({ force: true });
            assert.equal(
              item.sheet.element.querySelector('input[name="name"]').getAttribute("aria-label"),
              localize("l5r4.ui.common.name")
            );
            await item.sheet.close({ animate: false });
          })
        );

        // #79: sort-header.md H1, H2, H4; spell-slots.md P1; form-field.md F1
        it(
          "should show the stored sort on render and name the spell slot and row controls",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const localize = (key, data) => game.i18n.localize(key, data);
            await game.user.unsetFlag(SYS_ID, `sortByActor.${pc.id}`);
            const sheet = pc.sheet;
            await sheet.render({ force: true });
            const head = (scope, key) =>
              sheet.element.querySelector(
                `[data-sort-header][data-scope="${scope}"] [data-sort-by="${key}"]`
              );
            try {
              const name = head("skills", "name");
              assert.equal(name.getAttribute("aria-pressed"), "true", "sorted by name on render");
              assert.equal(name.dataset.dir, "asc");
              assert.equal(name.dataset.tooltip, localize("l5r4.ui.common.sortedAscending"));
              assert.exists(name.querySelector("i[inert]"), "the direction icon");
              assert.equal(head("skills", "rank").getAttribute("aria-pressed"), "false");

              const keys = [
                ...sheet.element.querySelectorAll(
                  '[data-sort-header][data-scope="weapons"] [data-sort-by]'
                )
              ].map(button => button.dataset.sortBy);
              assert.deepEqual(keys, [...new Set(keys)], "no two weapon heads share a key");
              for (const dir of ["asc", "desc"]) {
                head("weapons", "attack").click();
                assert.isTrue(
                  await waitFor(() => head("weapons", "attack")?.dataset.dir === dir),
                  `attack ${dir}`
                );
              }
              assert.equal(
                head("weapons", "attack").dataset.tooltip,
                localize("l5r4.ui.common.sortedDescending")
              );
              assert.equal(head("weapons", "damage").getAttribute("aria-pressed"), "false");

              const water = sheet.element.querySelector(
                '[data-action="adjust-spell-slot"][data-path="system.spellSlots.water"]'
              );
              const slots = localize("l5r4.ui.sheets.spellSlotsOf", {
                ring: localize("l5r4.ui.mechanics.rings.water"),
                count: pc.system.spellSlots.water
              });
              assert.equal(water.getAttribute("aria-label"), slots);
              assert.equal(water.dataset.tooltip, slots);

              for (const [field, key] of [
                ["system.trait", "l5r4.character.skills.properties.trait"],
                ["system.equipped", "l5r4.equipment.armor.equipped"],
                ["system.arrow", "l5r4.equipment.weapons.arrow"]
              ]) {
                assert.equal(
                  sheet.element.querySelector(`[data-field="${field}"]`).getAttribute("aria-label"),
                  localize(key),
                  field
                );
              }
            } finally {
              await game.user.unsetFlag(SYS_ID, `sortByActor.${pc.id}`);
              await sheet.close({ animate: false });
            }
          })
        );

        // The dots name the maximum the character may hold: Taint Level 4 lowers it below the Void Ring (#122)
        // game-rules/89_shadowlands_taint.md, p.278
        it(
          "should name the Taint-lowered Void Point maximum on the dots",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const named = current =>
              game.i18n.localize("l5r4.ui.mechanics.rings.voidPointsValue", { current, max: 1 });
            await pc.update({
              "system.rings.void.rank": 2,
              "system.rings.void.value": 0,
              "system.shadowTaint.rank": 4
            });
            const sheet = pc.sheet;
            await sheet.render({ force: true });
            try {
              assert.equal(pc.system.rings.void.max, 1, "Void Ring 2, less 1 at Level 4");
              const dots = () => sheet.element.querySelector('[data-action="adjust-void-points"]');
              assert.equal(dots().getAttribute("aria-label"), named(0), "rendered");
              const saved = nextUpdate(pc);
              dots().click();
              await saved;
              assert.isTrue(
                await waitFor(() => dots().getAttribute("aria-label") === named(1)),
                "repainted"
              );
            } finally {
              await sheet.close({ animate: false });
              await pc.update({ "system.shadowTaint.rank": 0 });
            }
          })
        );

        // #79: void-point-dots.md V1, rank-control.md Q3 and the track's inert under-label
        it(
          "should render the Void Points filled and named, and name each rank arrow",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const localize = (key, data) => game.i18n.localize(key, data);
            await pc.update({ "system.rings.void.rank": 2, "system.rings.void.value": 1 });
            const sheet = pc.sheet;
            await sheet.render({ force: true });
            try {
              const dots = () => sheet.element.querySelector('[data-action="adjust-void-points"]');
              const filled = () =>
                [...dots().querySelectorAll("[data-idx]")]
                  .filter(dot => dot.classList.contains("is-filled"))
                  .map(dot => dot.dataset.idx);
              const named = current =>
                localize("l5r4.ui.mechanics.rings.voidPointsValue", { current, max: 2 });
              assert.deepEqual(filled(), ["1"], "filled by the template");
              assert.isTrue(
                [...dots().querySelectorAll("[data-idx]")].every(dot => dot.hasAttribute("inert"))
              );
              assert.equal(dots().getAttribute("aria-label"), named(1));
              assert.equal(dots().dataset.tooltip, named(1));

              const saved = nextUpdate(pc);
              dots().click();
              await saved;
              assert.isTrue(await waitFor(() => filled().length === 2), "repainted to 2");
              assert.equal(dots().getAttribute("aria-label"), named(2));

              const stamina = localize("l5r4.ui.mechanics.traits.sta");
              const arrow = action =>
                sheet.element
                  .querySelector(
                    `[data-action="${action}"]:not([data-trait]), [data-action="${action}"][data-trait="sta"]`
                  )
                  .getAttribute("aria-label");
              assert.equal(
                arrow("increase-trait"),
                localize("l5r4.ui.hints.increaseTrait", { trait: stamina })
              );
              assert.equal(
                arrow("decrease-trait"),
                localize("l5r4.ui.hints.decreaseTrait", { trait: stamina })
              );
              assert.equal(arrow("increase-void-ring"), localize("l5r4.ui.hints.increaseVoidRing"));
              assert.equal(arrow("decrease-void-ring"), localize("l5r4.ui.hints.decreaseVoidRing"));

              const honor = sheet.element.querySelector(
                '[data-action="adjust-rank-points"][data-key="honor"]'
              );
              assert.isTrue(
                honor.previousElementSibling.hasAttribute("inert"),
                "the copy under the face is inert"
              );

              // ring-trait-block.md: the disc is text, not a heading; the Void Points span the grid's own lines
              assert.equal(sheet.element.querySelector("[data-ring-disc='earth']").tagName, "SPAN");
              assert.equal(getComputedStyle(dots().parentElement).gridColumnEnd, "-1");
            } finally {
              await sheet.close({ animate: false });
            }
          })
        );

        // #79: tabs.md T2, patterns/sheets.md rules 1 and 4, expand-control.md X5
        it(
          "should name the item tabs, say an empty Bio, and expand only rows with details",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const actor = await createTestPC({ name: "Sheets empty Bio" });
            created.push(actor);
            await actor.createEmbeddedDocuments("Item", [
              createSkillData("Plain Skill", 1, "agi"),
              createSkillData("Told Skill", 1, "agi", { system: { description: "Told details" } }),
              createSkillData("Mastered Skill", 3, "agi", {
                system: { mastery3: "Mastered line", mastery5: "Rank 5 line" }
              }),
              createSkillData("Unmastered Skill", 2, "agi", { system: { mastery3: "Not yet" } }),
              createSpellData("Ranged Spell", "fire", 1, { system: { range: "50 feet" } }),
              createSkillData("School Skill", 1, "agi", { system: { school: true } })
            ]);
            const sheet = actor.sheet;
            await sheet.render({ force: true });
            const bio = sheet.element.querySelector('[data-section-title][data-scope="bio"]');
            assert.equal(
              bio.nextElementSibling.textContent.trim(),
              game.i18n.localize("l5r4.ui.sheets.noBio"),
              "one line in the empty list's place"
            );
            const row = name =>
              sheet.element.querySelector(`[data-item-id="${actor.items.getName(name).id}"]`);
            assert.isNull(row("Plain Skill").querySelector('[data-action="expand-item"]'));
            assert.exists(row("Told Skill").querySelector('[data-action="expand-item"]'));
            // A Mastery Ability reached, or a spell's range alone, is a detail too
            const mastered = row("Mastered Skill");
            assert.exists(mastered.querySelector('[data-action="expand-item"]'), "Mastery row");
            assert.include(mastered.textContent, "Mastered line");
            assert.notInclude(mastered.textContent, "Rank 5 line", "a rank not reached");
            assert.isNull(row("Unmastered Skill").querySelector('[data-action="expand-item"]'));
            const ranged = row("Ranged Spell");
            assert.exists(ranged.querySelector('[data-action="expand-item"]'), "range row");
            assert.include(ranged.textContent, "50 feet");
            // item-row.md: the School badge is painted in its row's text color, so it reads on every row
            const badge = row("School Skill").querySelector('[role="img"]');
            const badgeStyle = getComputedStyle(badge);
            assert.equal(
              badge.getAttribute("aria-label"),
              game.i18n.localize("l5r4.character.skills.properties.school")
            );
            const { width, height } = badge.getBoundingClientRect();
            assert.deepEqual([width, height], [16, 16], "its size in the name's flex row");
            assert.equal(badgeStyle.backgroundColor, badgeStyle.color, "the text color");
            assert.include(badgeStyle.maskImage, "school.webp", "the School image as its mask");
            await sheet.close({ animate: false });

            const item = actor.items.getName("Told Skill");
            await item.sheet.render({ force: true });
            const tablist = item.sheet.element.querySelector('[role="tablist"]');
            assert.equal(
              tablist.getAttribute("aria-label"),
              game.i18n.localize("l5r4.ui.sheets.tabs")
            );
            assert.equal(
              item.sheet.element.querySelectorAll('[role="tabpanel"]').length,
              tablist.querySelectorAll('[role="tab"]').length,
              "a panel for each tab"
            );
            await item.sheet.close({ animate: false });
          })
        );

        // #79: form-field.md F2; Stage 18 decision 6
        it(
          "should keep the header labels text and run their actions from buttons on a plain click",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            // The click-through may have switched the rank to typed in
            await pc.update({ "system.insight.autoCalculate": true });
            const sheet = pc.sheet;
            await sheet.render({ force: true });
            const header = () =>
              sheet.element.querySelector('[data-action="recalculate-sheet"]').closest("section");
            try {
              assert.lengthOf(
                header().querySelectorAll("h4 button, label button"),
                0,
                "no control inside a label"
              );
              const rankMode = () =>
                sheet.element.querySelector('[data-action="toggle-rank-mode"]');
              assert.equal(rankMode().getAttribute("aria-pressed"), "false", "computed");
              const saved = nextUpdate(pc);
              rankMode().click();
              await saved;
              assert.isFalse(pc.system.insight.autoCalculate, "typed in after a plain click");
              assert.isTrue(
                await waitFor(() => rankMode()?.getAttribute("aria-pressed") === "true"),
                "pressed"
              );
              assert.exists(
                sheet.element.querySelector('input[name="system.insight.rank"][aria-label]'),
                "the typed rank names itself"
              );

              const said = [];
              const info = ui.notifications.info;
              ui.notifications.info = (message, ...rest) => {
                said.push(message);
                return info.call(ui.notifications, message, ...rest);
              };
              try {
                sheet.element.querySelector('[data-action="recalculate-sheet"]').click();
                assert.isTrue(
                  await waitFor(() =>
                    said.includes(
                      game.i18n.localize("l5r4.ui.sheets.recalculated", { name: pc.name })
                    )
                  ),
                  "recalculated on a plain click"
                );
              } finally {
                delete ui.notifications.info;
              }
            } finally {
              await pc.update({ "system.insight.autoCalculate": true });
              await sheet.close({ animate: false });
            }
          })
        );

        it(
          "should give a light sheet in a dark interface the light Ring backdrop",
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
                sheet.element.querySelector("[data-ring-disc='earth']"),
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
          "should save a combat config field and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new CombatConfigApplication(pc), async app => {
              assertTitle(app, "l5r4.apps.combatConfig.titleFor", { name: pc.name });
              await changeField(pc, "initiative.totalMod", "4")(app);
            });
            assert.equal(pc.system.initiative.totalMod, 4);
          })
        );

        it(
          "should save an armor config field and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new ArmorConfigApplication(pc), async app => {
              assertTitle(app, "l5r4.apps.armorConfig.titleFor", { name: pc.name });
              await changeField(pc, "armorTn.mod", "3")(app);
            });
            assert.equal(pc.system.armorTn.mod, 3);
          })
        );

        it(
          "should save a wound config field and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new WoundConfigApplication(pc), async app => {
              assertTitle(app, "l5r4.apps.woundConfig.titleFor", { name: pc.name });
              await changeField(pc, "woundsMod", "2")(app);
            });
            assert.equal(pc.system.woundsMod, 2);
          })
        );

        it(
          "should apply a condition checked in the condition manager and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new ConditionManagerApplication(pc), async app => {
              assertTitle(app, "l5r4.apps.conditionManager.titleFor", { name: pc.name });
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
          "should add money in the wealth manager and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const koku = pc.system.wealth.koku;
            await exercise(new WealthManagerApplication(pc), async app => {
              assertTitle(app, "l5r4.apps.wealthManager.titleFor", { name: pc.name });
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
          "should add an award in the XP manager and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            await exercise(new XpManagerApplication(pc), async app => {
              assertTitle(app, "l5r4.apps.xpManager.titleFor", { name: pc.name });
              const saved = nextUpdate(pc);
              app.element.querySelector('[name="xp-amount"]').value = "10";
              app.element.querySelector('[name="xp-note"]').value = "Sheets award";
              app.element.querySelector('[data-action="add-xp"]').click();
              await saved;
            });
            const notes = (pc.getFlag(SYS_ID, "xpManual") ?? []).map(entry => entry.note);
            assert.include(notes, "Sheets award");
          })
        );

        it(
          "should save an attack in the NPC attack config and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const app = new NpcAttackConfigApplication(npc, "attack1");
            await app.render({ force: true });
            assertTitle(app, "l5r4.apps.npcAttackConfig.titleFor", { slot: "1" });
            const saved = nextUpdate(npc);
            app.element.querySelector('[name="attack1.name"]').value = "Claw";
            app.element.querySelector('[data-action="save-attack"]').click();
            await saved;
            assert.equal(npc.system.attack1.name, "Claw");
            const again = new NpcAttackConfigApplication(npc, "attack2");
            await exercise(again, async () => {});
          })
        );

        it(
          "should save an emphasis checked in the emphasis manager and run every action",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const skill = pc.items.getName("Kenjutsu");
            const app = new EmphasisManagerApplication({ item: skill });
            await app.render({ force: true });
            assertTitle(app, "l5r4.apps.emphasisManager.titleFor", { item: skill.name });
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

      describe("Buttons the click-through's fixtures do not show", () => {
        /** Answer the next DialogV2 with `answer(app)`; resolves once answered. */
        const answerDialog = answer =>
          new Promise(resolve =>
            Hooks.once("renderDialogV2", async app => {
              await answer(app);
              resolve();
            })
          );

        it(
          "should title the ledger dialog with the character's name in one key",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const sheet = pc.sheet;
            await sheet.render({ force: true });
            let title = "";
            const closed = answerDialog(async dialog => {
              title = dialog.title;
              await dialog.close({ animate: false });
            });
            sheet.element.querySelector('[data-action="open-ledger"]').click();
            await closed;
            await sheet.close({ animate: false });
            assertTitle({ title }, "l5r4.ui.ledger.titleFor", { name: pc.name });
          })
        );

        it(
          "should switch the wound mode in the NPC wound config on a change, as a keyboard choice makes",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const before = npc.system.woundMode;
            const next = before === "manual" ? "formula" : "manual";
            const app = new WoundConfigApplication(npc);
            await app.render({ force: true });
            try {
              const select = app.element.querySelector('select[name="woundMode"]');
              select.value = next;
              const saved = nextUpdate(npc);
              select.dispatchEvent(new Event("change", { bubbles: true }));
              await saved;
              assert.equal(npc.system.woundMode, next);
              // The mode decides which fields the window shows: formula mode has the Wound Ranks select
              const shown = await waitFor(
                () =>
                  Boolean(app.element.querySelector('select[name="nrWoundLvls"]')) ===
                  (next === "formula")
              );
              assert.isTrue(shown, "the window shows the new mode's fields");
            } finally {
              await app.close({ animate: false });
              await npc.update({ "system.woundMode": before });
            }
          })
        );

        it(
          "should set the Disadvantage cap and delete a manual award in the XP manager",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const actor = await createTestPC({ name: "Sheets XP" });
            created.push(actor);
            await actor.createEmbeddedDocuments("Item", [
              { name: "Sheets Doubt", type: "disadvantage", system: { cost: 4 } }
            ]);
            await actor.setFlag(SYS_ID, "xpManual", [
              { id: "sheetsaward", delta: 5, note: "Sheets award" }
            ]);
            const app = new XpManagerApplication(actor);
            await app.render({ force: true });
            try {
              let capLabels = {};
              const answered = answerDialog(dialog => {
                capLabels = buttonLabelsOf(dialog);
                dialog.element.querySelector("[data-field='disadvantage-cap']").value = "3";
                dialog.element.querySelector('[data-action="ok"]').click();
              });
              const capped = nextUpdate(actor);
              app.element.querySelector('[data-action="change-disadvantage-cap"]').click();
              await answered;
              await capped;
              assert.equal(actor.getFlag(SYS_ID, "disadvantageCap"), 3);
              assert.equal(
                capLabels.ok,
                game.i18n.localize("l5r4.apps.xpManager.setDisadvantageCap")
              );

              await app.render();
              const deleted = nextUpdate(actor);
              app.element
                .querySelector('[data-action="delete-xp-entry"][data-entry-id="sheetsaward"]')
                .click();
              await deleted;
              assert.deepEqual(actor.getFlag(SYS_ID, "xpManual"), []);
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "should leave the Disadvantage cap and manual XP to the GM in the XP manager",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const actor = await createTestPC({ name: "Sheets XP Player" });
            created.push(actor);
            await actor.createEmbeddedDocuments("Item", [
              { name: "Sheets Doubt", type: "disadvantage", system: { cost: 4 } }
            ]);
            const award = { id: "sheetsaward", delta: 5, note: "Sheets award" };
            await actor.setFlag(SYS_ID, "xpManual", [award]);
            const app = new XpManagerApplication(actor);
            // The GM runs Quench; the user instance's own getter stands in for a player's
            const asPlayer = () =>
              Object.defineProperty(game.user, "isGM", { configurable: true, get: () => false });
            const asGm = () => delete game.user.isGM;
            try {
              await app.render({ force: true });
              const gmButtons = ["add-xp", "change-disadvantage-cap", "delete-xp-entry"].map(
                action => app.element.querySelector(`[data-action="${action}"]`)
              );
              assert.isTrue(gmButtons.every(Boolean), "the GM sees every control");

              asPlayer();
              // A click on a control rendered for the GM still changes nothing for a player
              const baseline = new Set(foundry.applications.instances.values());
              for (const button of gmButtons) {
                button.click();
              }
              await settle(500);
              await dismissNewWindows(baseline, app);
              assert.deepEqual(actor.getFlag(SYS_ID, "xpManual"), [award]);
              assert.isUndefined(actor.getFlag(SYS_ID, "disadvantageCap"));

              await app.render({ force: true });
              for (const action of ["add-xp", "change-disadvantage-cap", "delete-xp-entry"]) {
                assert.notExists(app.element.querySelector(`[data-action="${action}"]`), action);
              }
              assert.notExists(app.element.querySelector("[data-field='xp-amount']"), "no amount");
              assert.include(app.element.textContent, award.note, "the award still shows");
            } finally {
              asGm();
              await app.close({ animate: false });
            }
          })
        );

        it(
          "should rename and delete a world custom emphasis in the emphasis manager",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const saved = game.settings.get(SYS_ID, "customEmphases");
            await game.settings.set(SYS_ID, "customEmphases", ["Sheets Custom"]);
            const app = new EmphasisManagerApplication({ item: pc.items.getName("Kenjutsu") });
            try {
              await app.render({ force: true });
              const renamed = answerDialog(dialog => {
                dialog.element.querySelector('[name="emphasisName"]').value = "Sheets Renamed";
                dialog.element.querySelector('[data-action="ok"]').click();
              });
              app.element
                .querySelector('[data-action="edit-emphasis"][data-emphasis-name="Sheets Custom"]')
                .click();
              await renamed;
              const customs = () => game.settings.get(SYS_ID, "customEmphases");
              assert.isTrue(await waitFor(() => customs().includes("Sheets Renamed")));

              await app.render();
              let question = "";
              let removeLabels = {};
              const deleted = answerDialog(dialog => {
                question = dialog.element.querySelector("form").textContent;
                removeLabels = buttonLabelsOf(dialog);
                dialog.element.querySelector('[data-action="yes"]').click();
              });
              app.element
                .querySelector(
                  '[data-action="delete-emphasis"][data-emphasis-name="Sheets Renamed"]'
                )
                .click();
              await deleted;
              assert.include(
                question,
                game.i18n.localize("l5r4.ui.dialogs.deleteEmphasis.content", {
                  emphasis: "Sheets Renamed"
                })
              );
              // docs/design-system/patterns/dialogs.md, rule 3: the confirmation states what is lost
              assert.include(
                question,
                game.i18n.localize("l5r4.ui.dialogs.deleteEmphasis.consequence")
              );
              assert.equal(removeLabels.yes, game.i18n.localize("l5r4.ui.common.delete"));
              assert.equal(removeLabels.no, game.i18n.localize("l5r4.ui.common.cancel"));
              assert.isTrue(await waitFor(() => !customs().includes("Sheets Renamed")));
            } finally {
              await app.close({ animate: false });
              await game.settings.set(SYS_ID, "customEmphases", saved);
            }
          })
        );

        it(
          "should add the item the create prompt names, and add nothing when the prompt is closed",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const actor = await createTestPC({ name: "Sheets create" });
            created.push(actor);
            const create = () =>
              ItemCrudHandler.create(
                { actor },
                new PointerEvent("click"),
                document.createElement("button")
              );
            let labels = {};
            const answered = answerDialog(dialog => {
              labels = buttonLabelsOf(dialog);
              dialog.element.querySelector('[name="itemName"]').value = "Sheets Lantern";
              dialog.element.querySelector('[data-action="ok"]').click();
            });
            const [item] = await create();
            await answered;
            assert.equal(labels.ok, game.i18n.localize("l5r4.ui.sheets.addItem"));
            assert.equal(item?.name, "Sheets Lantern", "the Add item button adds the named item");

            const count = actor.items.size;
            const closed = answerDialog(dialog => dialog.close());
            assert.deepEqual(await create(), [], "closing the prompt adds nothing");
            await closed;
            assert.equal(actor.items.size, count);
          })
        );

        it(
          "should remove an item after its confirmation's Remove button",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            const actor = await createTestPC({ name: "Sheets remove" });
            created.push(actor);
            const [item] = await actor.createEmbeddedDocuments("Item", [
              { name: "Sheets Doomed", type: "commonItem" }
            ]);
            const row = document.createElement("div");
            row.dataset.itemId = item.id;
            const button = row.appendChild(document.createElement("button"));
            let labels = {};
            let text = "";
            const answered = answerDialog(dialog => {
              labels = buttonLabelsOf(dialog);
              text = dialog.element.querySelector("form").textContent;
              dialog.element.querySelector('[data-action="yes"]').click();
            });
            await ItemCrudHandler.deleteItem({ actor }, new PointerEvent("click"), button);
            await answered;
            assert.equal(labels.yes, game.i18n.localize("l5r4.ui.common.delete"));
            assert.equal(labels.no, game.i18n.localize("l5r4.ui.common.cancel"));
            // docs/design-system/patterns/dialogs.md, rule 3: the confirmation states what is lost
            assert.include(text, game.i18n.localize("l5r4.ui.dialogs.deleteItem.consequence"));
            assert.isUndefined(actor.items.get(item.id), "the item is removed");
          })
        );

        it(
          "should test the selected characters from the NPC's Fear button",
          clean(async function () {
            this.timeout(SURFACE_TIMEOUT_MS);
            if (!canvas.scene) {
              this.skip();
            }
            const target = await createTestPC({ name: "Sheets Fear target" });
            created.push(target);
            const data = (await target.getTokenDocument({ x: 0, y: 0 })).toObject();
            const [token] = await canvas.scene.createEmbeddedDocuments("Token", [data]);
            const fearRank = npc.system.fear.rank;
            await npc.update({ "system.fear.rank": 2 });
            const posted = messages.length;
            try {
              await waitFor(() => token.object);
              token.object.control({ releaseOthers: true });
              await npc.sheet.render({ force: true });
              npc.sheet.element.querySelector('[data-action="test-fear"]').click();
              assert.isTrue(
                await waitFor(() =>
                  messages.slice(posted).some(m => m.speaker?.actor === target.id)
                ),
                "the selected character's Fear test posted"
              );
            } finally {
              canvas.tokens.releaseAll();
              await token.delete();
              await npc.sheet.close({ animate: false });
              await npc.update({ "system.fear.rank": fearRank });
            }
          })
        );
      });

      describe("Coverage list", () => {
        it("should run in the click-through exactly the actions every-action.js lists", () => {
          assert.deepEqual([...ran].sort(), [...EVERY_ACTION].sort());
        });
      });
    },
    { displayName: "L5R4: Sheets and apps" }
  );
}
