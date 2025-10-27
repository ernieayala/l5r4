/**
 * @fileoverview NPC Attack Editor Integration Tests
 *
 * Tests the NPC Attack Editor application for editing attack and damage values.
 *
 * **Test Coverage:**
 * - Editor opens with correct data
 * - Form displays attack and damage fields
 * - Form submission updates actor correctly
 * - Form behavior (submitOnChange: false, closeOnSubmit: true)
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestNPC } from "../../fixtures/actor-fixtures.js";
import NpcAttackEditor from "../../../module/apps/npc-attack-editor.js";

/**
 * Register NPC Attack Editor tests
 * @param {Object} quench - Quench test framework API
 */
export function registerNPCAttackEditorTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.apps.npc-attack-editor`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("NPC Attack Editor Rendering", () => {
        let actor, editor;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Test NPC",
            system: {
              attack1: {
                name: "Katana",
                roll: 5,
                keep: 3,
                modifier: 2,
                type: "Slashing",
                action: "Simple"
              },
              damage1: {
                roll: 3,
                keep: 2,
                modifier: 0,
                type: "Slashing"
              }
            }
          });

          editor = new NpcAttackEditor({
            actor,
            attackKey: "attack1"
          });
        });

        afterEach(async () => {
          if (editor?.rendered) {
            await editor.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should render editor", async () => {
          await editor.render(true);

          assert.isTrue(editor.rendered, "Editor rendered");
          assert.exists(editor.element, "Editor element exists");
        });

        it("should have correct title", async () => {
          await editor.render(true);

          const title = editor.title;
          assert.include(title, "1", "Title includes attack number");
        });

        it("should display attack name field", async () => {
          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const nameInput = element.querySelector('[name="attack1.name"]');

          assert.exists(nameInput, "Attack name input exists");
          assert.equal(nameInput.value, "Katana", "Attack name displays correctly");
        });

        it("should display attack roll field", async () => {
          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const rollInput = element.querySelector('[name="attack1.roll"]');

          assert.exists(rollInput, "Attack roll input exists");
          assert.equal(Number(rollInput.value), 5, "Attack roll displays correctly");
        });

        it("should display attack keep field", async () => {
          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const keepInput = element.querySelector('[name="attack1.keep"]');

          assert.exists(keepInput, "Attack keep input exists");
          assert.equal(Number(keepInput.value), 3, "Attack keep displays correctly");
        });

        it("should display attack modifier field", async () => {
          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const modInput = element.querySelector('[name="attack1.modifier"]');

          assert.exists(modInput, "Attack modifier input exists");
          assert.equal(Number(modInput.value), 2, "Attack modifier displays correctly");
        });

        it("should display damage roll field", async () => {
          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const rollInput = element.querySelector('[name="damage1.roll"]');

          assert.exists(rollInput, "Damage roll input exists");
          assert.equal(Number(rollInput.value), 3, "Damage roll displays correctly");
        });

        it("should display damage keep field", async () => {
          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const keepInput = element.querySelector('[name="damage1.keep"]');

          assert.exists(keepInput, "Damage keep input exists");
          assert.equal(Number(keepInput.value), 2, "Damage keep displays correctly");
        });
      });

      describe("NPC Attack Editor Form Behavior", () => {
        let actor, editor;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Test NPC",
            system: {
              attack2: {
                name: "Wakizashi",
                roll: 4,
                keep: 2,
                modifier: 0,
                type: "Slashing",
                action: "Simple"
              },
              damage2: {
                roll: 2,
                keep: 2,
                modifier: 0,
                type: "Slashing"
              }
            }
          });

          editor = new NpcAttackEditor({
            actor,
            attackKey: "attack2"
          });

          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (editor?.rendered) {
            await editor.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should have submitOnChange set to false", () => {
          // Verify form doesn't auto-submit on field change
          const options = editor.constructor.DEFAULT_OPTIONS;
          assert.isFalse(
            options.form.submitOnChange,
            "submitOnChange is false to prevent premature closing"
          );
        });

        it("should have closeOnSubmit set to true", () => {
          // Verify form closes after successful submission
          const options = editor.constructor.DEFAULT_OPTIONS;
          assert.isTrue(options.form.closeOnSubmit, "closeOnSubmit is true to close after save");
        });

        it("should not close when field is changed", async () => {
          const element = editor.element;
          const nameInput = element.querySelector('[name="attack2.name"]');

          // Change the name field
          nameInput.value = "Short Sword";
          nameInput.dispatchEvent(new Event("change", { bubbles: true }));

          // Wait a bit to see if editor closes
          await new Promise(resolve => setTimeout(resolve, 200));

          // Editor should still be rendered (not closed)
          assert.isTrue(editor.rendered, "Editor remains open after field change");
        });
      });

      describe("NPC Attack Editor Data Updates", () => {
        let actor, editor;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Test NPC",
            system: {
              attack3: {
                name: "Yari",
                roll: 4,
                keep: 3,
                modifier: 1,
                type: "Piercing",
                action: "Simple"
              },
              damage3: {
                roll: 3,
                keep: 2,
                modifier: 2,
                type: "Piercing"
              }
            }
          });

          editor = new NpcAttackEditor({
            actor,
            attackKey: "attack3"
          });

          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (editor?.rendered) {
            await editor.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should update actor when form is submitted", async () => {
          const element = editor.element;

          // Change attack name
          const nameInput = element.querySelector('[name="attack3.name"]');
          nameInput.value = "Long Spear";

          // Change attack roll
          const rollInput = element.querySelector('[name="attack3.roll"]');
          rollInput.value = "6";

          // Submit the form (element itself is the form in ApplicationV2)
          element.requestSubmit();

          // Wait for update to process
          await new Promise(resolve => setTimeout(resolve, 300));

          // Verify actor was updated
          assert.equal(actor.system.attack3.name, "Long Spear", "Attack name updated");
          assert.equal(actor.system.attack3.roll, 6, "Attack roll updated");
        });

        it("should update damage values when form is submitted", async () => {
          const element = editor.element;

          // Change damage roll
          const rollInput = element.querySelector('[name="damage3.roll"]');
          rollInput.value = "4";

          // Change damage keep
          const keepInput = element.querySelector('[name="damage3.keep"]');
          keepInput.value = "3";

          // Submit the form (element itself is the form in ApplicationV2)
          element.requestSubmit();

          // Wait for update to process
          await new Promise(resolve => setTimeout(resolve, 300));

          // Verify actor was updated
          assert.equal(actor.system.damage3.roll, 4, "Damage roll updated");
          assert.equal(actor.system.damage3.keep, 3, "Damage keep updated");
        });

        it("should close editor after successful submission", async () => {
          const element = editor.element;

          // Make a change
          const nameInput = element.querySelector('[name="attack3.name"]');
          nameInput.value = "Modified";

          // Submit the form (element itself is the form in ApplicationV2)
          element.requestSubmit();

          // Wait for submission and close
          await new Promise(resolve => setTimeout(resolve, 400));

          // Editor should be closed
          assert.isFalse(editor.rendered, "Editor closed after submission");
        });
      });

      describe("NPC Attack Editor for Different Attack Slots", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Multi-Attack NPC",
            system: {
              attack1: { name: "Attack 1", roll: 5, keep: 3 },
              attack2: { name: "Attack 2", roll: 4, keep: 2 },
              attack3: { name: "Attack 3", roll: 6, keep: 4 },
              damage1: { roll: 3, keep: 2 },
              damage2: { roll: 2, keep: 2 },
              damage3: { roll: 4, keep: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should open editor for attack1", async () => {
          const editor = new NpcAttackEditor({
            actor,
            attackKey: "attack1"
          });

          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const nameInput = element.querySelector('[name="attack1.name"]');

          assert.exists(nameInput, "Attack1 name field exists");
          assert.equal(nameInput.value, "Attack 1", "Attack1 data loaded");

          await editor.close();
        });

        it("should open editor for attack2", async () => {
          const editor = new NpcAttackEditor({
            actor,
            attackKey: "attack2"
          });

          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const nameInput = element.querySelector('[name="attack2.name"]');

          assert.exists(nameInput, "Attack2 name field exists");
          assert.equal(nameInput.value, "Attack 2", "Attack2 data loaded");

          await editor.close();
        });

        it("should open editor for attack3", async () => {
          const editor = new NpcAttackEditor({
            actor,
            attackKey: "attack3"
          });

          await editor.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = editor.element;
          const nameInput = element.querySelector('[name="attack3.name"]');

          assert.exists(nameInput, "Attack3 name field exists");
          assert.equal(nameInput.value, "Attack 3", "Attack3 data loaded");

          await editor.close();
        });
      });
    },
    { displayName: "L5R4: NPC Attack Editor Tests" }
  );
}
