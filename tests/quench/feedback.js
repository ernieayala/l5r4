import { SYS_ID } from "../../module/config/constants.js";
import { PcTraitHandler } from "../../module/sheets/handlers/pc-trait-handler.js";
import { TraitHandler } from "../../module/sheets/handlers/trait-handler.js";
import { VoidPointsHandler } from "../../module/sheets/handlers/void-points-handler.js";
import { PcAdjustmentHandler } from "../../module/sheets/handlers/pc-adjustment-handler.js";
import { RollHandler } from "../../module/sheets/handlers/roll-handler.js";
import { DragDropHandler } from "../../module/sheets/handlers/drag-drop-handler.js";
import { ItemCrudHandler } from "../../module/sheets/handlers/item-crud-handler.js";
import { getUnifiedItemOptions } from "../../module/services/chat.js";
import { openLedgerDialog } from "../../module/services/ledger.js";
import { askDisadvantageCap } from "../../module/services/xp/disadvantage-cap.js";
import { buildFolderTransfer, createImportedItems } from "../../module/services/item-transfer.js";
import { renderCheckCard } from "../../module/services/dice/check/card.js";
import { promptOf } from "../../module/services/effects/prompt-card.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData } from "../fixtures/item-fixtures.js";
import { cleanTest, waitFor } from "./helpers.js";

/** A click's event as a handler reads it. */
const clickEvent = ({ shiftKey = false } = {}) => ({
  shiftKey,
  ctrlKey: false,
  preventDefault: () => {},
  stopPropagation: () => {}
});

/** A button carrying the dataset a sheet control carries. */
const buttonWith = dataset => {
  const button = document.createElement("button");
  Object.assign(button.dataset, dataset);
  return button;
};

/**
 * The next dialog, once rendered: its form and its submit button.
 * @returns {Promise<{app: object, form: HTMLFormElement, ok: HTMLButtonElement}>}
 */
const nextDialog = () =>
  new Promise(resolve =>
    Hooks.once("renderDialogV2", app => {
      const form = app.element.querySelector("form");
      resolve({ app, form, ok: form.querySelector("[data-action='ok']") });
    })
  );

/** Set a dialog field as the user would type it. */
const typeInto = (field, text) => {
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
};

/**
 * Registers the `feedback` batch (#142): every action either visibly happens or says why it did not. A control at its
 * bound warns, a Shift-only control says to hold Shift, a dialog's submit waits with the reason until its input can
 * be used, a failed drop, delete, or import says so, an attack with no TN says why the card shows no hit, a changed
 * Ledger amount is told at once, and a Full Defense roll left unmade posts its card to roll later.
 * @param {object} quench  The Quench API object.
 */
export function registerFeedbackTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.feedback`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const notices = [];
      let notify;

      const track = actor => (actors.push(actor), actor);

      /** The notices shown since the test began, as `type: message`. */
      const shown = () => notices.map(({ type, message }) => `${type}: ${message}`);

      before(() => {
        notify = ui.notifications.notify;
        ui.notifications.notify = function (message, type, options = {}) {
          notices.push({ message, type });
          return notify.call(this, message, type, { ...options, console: false });
        };
      });

      after(() => {
        ui.notifications.notify = notify;
      });

      afterEach(async () => {
        notices.length = 0;
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      describe("Sheet controls that change nothing", () => {
        it(
          "should warn when a Trait is raised past its highest",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: agile" }));
            await actor.update({ "system.traits.agi": 9 });
            await PcTraitHandler.updateTraitRankUp(
              { actor },
              clickEvent(),
              buttonWith({ trait: "agi" })
            );
            assert.deepEqual(shown(), [
              `warning: ${game.i18n.localize("l5r4.ui.notifications.atLimit.highest", {
                name: game.i18n.localize("l5r4.ui.mechanics.traits.agi")
              })}`
            ]);
            assert.equal(actor._source.system.traits.agi, 9);
          })
        );

        it(
          "should say to hold Shift on a plain click of the Void Ring, and warn at its lowest",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: void" }));
            await actor.update({ "system.rings.void.rank": 0 });
            const voidName = game.i18n.localize("l5r4.ui.mechanics.rings.void");
            await TraitHandler.updateVoidRing({ actor }, clickEvent(), buttonWith({}), 1);
            await TraitHandler.updateVoidRing(
              { actor },
              clickEvent({ shiftKey: true }),
              buttonWith({}),
              -1
            );
            assert.deepEqual(shown(), [
              `info: ${game.i18n.localize("l5r4.ui.notifications.shiftToChange", { name: voidName })}`,
              `warning: ${game.i18n.localize("l5r4.ui.notifications.atLimit.lowest", { name: voidName })}`
            ]);
          })
        );

        it(
          "should warn when Void Points or a spell slot go below 0",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: spent" }));
            await actor.update({
              "system.rings.void.value": 0,
              "system.spellSlots.fire": 0
            });
            const sheet = { actor, element: document.createElement("div") };
            await VoidPointsHandler.updateVoidPoints(sheet, clickEvent(), -1);
            await PcAdjustmentHandler.updateSpellSlot(
              { actor },
              clickEvent(),
              buttonWith({ path: "system.spellSlots.fire" }),
              -1
            );
            const fire = game.i18n.localize("l5r4.ui.mechanics.rings.fire");
            assert.deepEqual(shown(), [
              `warning: ${game.i18n.localize("l5r4.ui.notifications.atLimit.lowest", {
                name: game.i18n.localize("l5r4.ui.mechanics.rings.voidPoints")
              })}`,
              `warning: ${game.i18n.localize("l5r4.ui.notifications.atLimit.lowest", {
                name: game.i18n.localize("l5r4.ui.sheets.spellSlotsName", { ring: fire })
              })}`
            ]);
          })
        );

        it(
          "should name the rank track a plain click or a click past its highest leaves as it was",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: honorable" }));
            await actor.update({ "system.honor": { rank: 10, points: 0 } });
            await actor.sheet.render({ force: true });
            try {
              const honor = actor.sheet.element.querySelector(
                "[data-action='adjust-rank-points'][data-key='honor']"
              );
              const name = honor.dataset.label;
              assert.equal(name, game.i18n.localize("l5r4.character.ranks.honorRank"));
              await PcAdjustmentHandler.updateRankPoints({ actor }, clickEvent(), honor, 1);
              await PcAdjustmentHandler.updateRankPoints(
                { actor },
                clickEvent({ shiftKey: true }),
                honor,
                1
              );
              assert.deepEqual(shown(), [
                `info: ${game.i18n.localize("l5r4.ui.notifications.shiftToChange", { name })}`,
                `warning: ${game.i18n.localize("l5r4.ui.notifications.atLimit.highest", { name })}`
              ]);
            } finally {
              await actor.sheet.close({ animate: false });
            }
          })
        );

        it(
          "should say a Skill with no Trait cannot roll, and why",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: traitless" }));
            const [skill] = await actor.createEmbeddedDocuments("Item", [
              createSkillData("Quench Traitless", 2, "quench-none")
            ]);
            assert.isUndefined(RollHandler.rollSkill(actor, skill, false));
            assert.deepEqual(shown(), [
              `warning: ${game.i18n.localize("l5r4.ui.notifications.skillNoTrait", {
                skill: "Quench Traitless"
              })}`
            ]);
          })
        );
      });

      describe("Dialogs wait for input they can use", () => {
        it(
          "should keep Add item disabled, with the reason, until the item has a name",
          clean(async () => {
            const opened = nextDialog();
            const asked = getUnifiedItemOptions("skill");
            const { form, ok } = await opened;
            assert.isTrue(ok.disabled);
            assert.equal(ok.dataset.tooltip, game.i18n.localize("l5r4.ui.sheets.nameRequired"));
            typeInto(form.elements.itemName, "Quench Named");
            assert.isFalse(ok.disabled);
            assert.notProperty(ok.dataset, "tooltip");
            ok.click();
            assert.deepEqual(await asked, { name: "Quench Named", type: "skill" });
          })
        );

        it(
          "should keep Record disabled until points are entered, then say a Ledger rule changed them",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: sworn" }));
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
            const opened = nextDialog();
            const recorded = openLedgerDialog(actor);
            const { form, ok } = await opened;
            form.elements.reason.value = "Quench breach";
            typeInto(form.elements.points, "");
            assert.isTrue(ok.disabled, "no points");
            assert.equal(ok.dataset.tooltip, game.i18n.localize("l5r4.ui.ledger.pointsRequired"));
            typeInto(form.elements.points, "0");
            assert.isTrue(ok.disabled, "0 points records nothing");
            form.elements.track.value = "honor";
            typeInto(form.elements.points, "-3");
            assert.isFalse(ok.disabled);
            ok.click();
            const entry = await recorded;
            assert.equal(entry.reason, "Quench breach", "the reason typed is kept");
            assert.deepEqual(shown(), [
              `warning: ${game.i18n.localize("l5r4.ui.ledger.changedByRules", {
                name: actor.name,
                track: game.i18n.localize("l5r4.ui.ledger.tracks.honor"),
                asked: -3,
                points: -6
              })}`
            ]);
          })
        );

        it(
          "should keep the Disadvantage cap's Set disabled until it holds a whole number of 0 or more",
          clean(async () => {
            const opened = nextDialog();
            const asked = askDisadvantageCap(10);
            const { form, ok } = await opened;
            const field = form.elements.disadvantageCap;
            assert.isFalse(ok.disabled, "the current cap is a number");
            typeInto(field, "");
            assert.isTrue(ok.disabled);
            assert.equal(
              ok.dataset.tooltip,
              game.i18n.localize("l5r4.apps.xpManager.disadvantageCapInvalid")
            );
            typeInto(field, "-2");
            assert.isTrue(ok.disabled);
            typeInto(field, "6");
            assert.isFalse(ok.disabled);
            ok.click();
            assert.equal(await asked, 6);
          })
        );
      });

      describe("Failures and choices made for the user are told", () => {
        it(
          "should say a dropped item that cannot be found was not added",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Feedback: dropped on" }));
            const added = await DragDropHandler.onItemDrop({ actor }, null, {
              type: "Item",
              uuid: "Item.quenchNoSuchItem"
            });
            assert.isFalse(added);
            assert.deepEqual(shown(), [
              `warning: ${game.i18n.localize("l5r4.ui.notifications.dropNotFound")}`
            ]);
          })
        );

        it("should say an item that could not be deleted was not", async () => {
          const actor = track(await createTestPC({ name: "Feedback: keeper" }));
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Quench Kept", 1)
          ]);
          const row = document.createElement("div");
          row.dataset.itemId = skill.id;
          const button = row.appendChild(document.createElement("button"));
          const remove = actor.deleteEmbeddedDocuments;
          const error = console.error;
          actor.deleteEmbeddedDocuments = () => Promise.reject(new Error("Quench: refused"));
          console.error = () => {};
          try {
            await ItemCrudHandler.deleteItem({ actor }, clickEvent({ shiftKey: true }), button);
          } finally {
            actor.deleteEmbeddedDocuments = remove;
            console.error = error;
          }
          assert.deepEqual(shown(), [
            `error: ${game.i18n.localize("l5r4.ui.notifications.deleteFailed", { name: "Quench Kept" })}`
          ]);
          assert.exists(actor.items.get(skill.id));
        });

        it(
          "should say why an attack with no TN shows no hit or miss",
          clean(async () => {
            const roll = await new Roll("5d10xa10k3").evaluate();
            const html = await renderCheckCard(
              {
                kind: "attack",
                label: "Katana",
                modifiers: [],
                notes: [],
                target: { uuid: "", name: "" },
                tn: { effective: null, raises: 0, freeRaises: 0, freeRaisesToTN: 0, modifiers: [] },
                outcome: { total: roll.total, success: null },
                maneuvers: { increasedDamage: 0 },
                conditions: []
              },
              roll
            );
            assert.include(html, game.i18n.localize("l5r4.ui.combat.attackNoTn"));
          })
        );

        it("should count the items an import could not create", async function () {
          this.timeout(10_000);
          const folder = await foundry.documents.Folder.implementation.create({
            name: "Quench Feedback Import",
            type: "Item"
          });
          try {
            await Item.createDocuments([
              { ...createSkillData("Quench Importable", 0), folder: folder.id }
            ]);
            const payload = buildFolderTransfer(folder);
            payload.items.push({ name: "Quench Unknown Kind", type: "quench-no-such-type" });
            const warn = console.warn;
            console.warn = () => {};
            let imported;
            try {
              imported = await createImportedItems(JSON.stringify(payload), folder);
            } finally {
              console.warn = warn;
            }
            assert.lengthOf(imported, 1);
            assert.deepEqual(shown(), [
              `warning: ${game.i18n.localize("l5r4.ui.transfer.importedSome", {
                count: 1,
                folder: "Quench Feedback Import",
                skipped: 1
              })}`
            ]);
          } finally {
            await folder.delete({ deleteSubfolders: true, deleteContents: true });
          }
        });

        it(
          "should post the Full Defense card when the stance's roll is not made",
          clean(async function () {
            this.timeout(10_000);
            const actor = track(await createTestPC({ name: "Feedback: defender" }));
            const opened = nextDialog();
            const taken = actor.toggleStatusEffect("fullDefenseStance", { active: true });
            const { app } = await opened;
            await app.close();
            await taken;
            const posted = () =>
              game.messages.contents.find(
                message =>
                  promptOf(message)?.kind === "fullDefense" &&
                  promptOf(message)?.actorUuid === actor.uuid
              );
            assert.isTrue(await waitFor(() => Boolean(posted())), "the card to roll it later");
            assert.isTrue(actor.statuses.has("fullDefenseStance"), "the stance stays");
          })
        );
      });
    },
    { displayName: "L5R4: Actions say what they did" }
  );
}
