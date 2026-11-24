import { SYS_ID } from "../../module/config/constants.js";
import { DIALOG_TEMPLATES } from "../../module/config/templates.js";
import { DIALOG_CLASS, askConfirm } from "../../module/services/dialog.js";
import { rollSkill } from "../../module/services/dice/rolls/skill-roll.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData, createWeaponData } from "../fixtures/item-fixtures.js";
import { cleanTest } from "./helpers.js";

/** A window height well under the attack dialog's fields, as on a 1366×768 laptop or smaller. */
const SHORT_HEIGHT = 400;

/**
 * Wait for the next system dialog to render, shrink its window, let core's autofocus run, and measure where its
 * parts sit; then close it.
 * @returns {Promise<object>} The measurements
 */
function measureNextDialog() {
  return new Promise(resolve =>
    Hooks.once("renderDialogV2", async app => {
      app.setPosition({ height: SHORT_HEIGHT });
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      const frame = app.element.getBoundingClientRect();
      const fields = app.element.querySelector("form > div");
      const button = app.element.querySelector("form > footer button").getBoundingClientRect();
      const windowContent = app.element.querySelector("section");
      resolve({
        classes: [...app.element.classList],
        fieldsOverflow: fields.scrollHeight - fields.clientHeight,
        fieldsScrollable: getComputedStyle(fields).overflowY,
        fieldsScrollTop: fields.scrollTop,
        windowScrollTop: windowContent.scrollTop,
        buttonInside: button.top >= frame.top && button.bottom <= frame.bottom
      });
      await app.close();
    })
  );
}

/**
 * Registers the `dialogs` batch: every dialog the system opens carries the l5r4-dialog class, and in a window shorter
 * than its fields the fields scroll, start at the top, and leave the footer button in view (#134,
 * docs/design-system/patterns/dialogs.md rule 8).
 * @param {object} quench  The Quench API object.
 */
export function registerDialogsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.dialogs`,
    context => {
      const { describe, it, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      describe("Long dialogs", () => {
        it(
          "should scroll an attack dialog's fields and keep Roll in view in a short window",
          clean(async function () {
            this.timeout(15_000);
            const actor = await createTestPC({ name: "Quench dialog attacker" });
            actors.push(actor);
            await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 3, "agi")]);
            const [katana] = await actor.createEmbeddedDocuments("Item", [
              createWeaponData("Quench Katana", 3, 2, { system: { associatedSkill: "Kenjutsu" } })
            ]);
            const measured = measureNextDialog();
            const roll = rollSkill({
              actor,
              rollType: "attack",
              weaponId: katana.id,
              skillName: "Kenjutsu",
              skillTrait: "agi",
              traitRank: 2,
              skillRank: 3
            });
            const result = await measured;
            assert.isNull(await roll, "closing the dialog cancels the roll");
            assert.include(result.classes, DIALOG_CLASS);
            assert.isAbove(result.fieldsOverflow, 0, "the fields are taller than the window");
            assert.equal(result.fieldsScrollable, "auto", "the fields scroll");
            assert.equal(result.fieldsScrollTop, 0, "opened at the top");
            assert.equal(result.windowScrollTop, 0, "the window itself does not scroll");
            assert.isTrue(result.buttonInside, "Roll stays inside the window");
          })
        );

        it(
          "should give a confirmation the system's dialog class",
          clean(async function () {
            // measureNextDialog waits two animation frames, which Chrome delays in an unfocused window
            this.timeout(15_000);
            const content = await foundry.applications.handlebars.renderTemplate(
              DIALOG_TEMPLATES.confirm,
              { question: "Quench", consequence: "Quench" }
            );
            const measured = measureNextDialog();
            const answer = askConfirm({
              window: { title: "l5r4.ui.common.roll" },
              content,
              rejectClose: false
            });
            const result = await measured;
            assert.isNull(await answer);
            assert.include(result.classes, DIALOG_CLASS);
            assert.isTrue(result.buttonInside);
          })
        );
      });
    },
    { displayName: "L5R4: Dialogs" }
  );
}
