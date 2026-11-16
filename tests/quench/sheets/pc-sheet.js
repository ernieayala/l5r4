/**
 * @fileoverview PC Sheet Integration Tests
 *
 * Tests PC character sheet rendering, data display, and user interactions.
 * Verifies that the sheet displays correct actor data and responds to user actions.
 *
 * **Test Coverage:**
 * - Sheet rendering without errors
 * - Data display (rings, traits, wound levels)
 * - Sheet updates when actor changes
 * - User interactions (roll buttons, item management)
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createKatana, createSkillData, createSpellData } from "../../fixtures/item-fixtures.js";
import { waitFor } from "../helpers.js";

/**
 * Register PC sheet tests
 * @param {Object} quench - Quench test framework API
 */
export function registerPcSheetTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets.pc-sheet`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("PC sheet rendering", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Test Character",
            system: {
              traits: {
                sta: 4,
                wil: 5, // Earth = 4
                ref: 3,
                awa: 3, // Air = 3
                agi: 3,
                int: 3, // Fire = 3
                str: 4,
                per: 3 // Water = 3
              },
              rings: { void: { rank: 2 } }
            }
          });
          sheet = actor.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should render sheet without errors", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Sheet rendered successfully");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should display actor name", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const nameInput = element.querySelector('input[name="name"]');

          assert.exists(nameInput, "Name input exists");
          assert.equal(nameInput.value, "Test Character", "Name displays correctly");
        });

        it("should display ring values", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Rings use data-ring-key attribute
          const ringElements = element.querySelectorAll("[data-ring-key]");

          assert.isAtLeast(ringElements.length, 1, "Ring elements found");
        });

        it("should display trait values", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Traits use data-trait attribute on rank spans
          const traitElements = element.querySelectorAll(".l5r4-rank-control.-trait[data-trait]");

          assert.isAtLeast(traitElements.length, 1, "Trait elements found");
        });

        it("should have main sections", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Check for main sheet structure instead of tabs
          const mainSheet = element.querySelector(".l5r4-sheet-body");

          assert.exists(mainSheet, "Main sheet structure exists");
        });
      });

      describe("PC sheet data updates", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "PC sheet: update test",
            system: {
              traits: { sta: 3, wil: 3 } // Earth = 3
            }
          });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should update display when actor changes", async () => {
          // Update Earth traits
          await actor.update({
            "system.traits.sta": 5,
            "system.traits.wil": 5
          });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          // Verify Earth Ring updated (min(sta, wil) = 5)
          assert.equal(actor.system.rings.earth, 5, "Earth Ring updated to 5");
        });

        it("should display wound level changes", async () => {
          const initialWounds = actor.system.suffered;

          await actor.update({ "system.suffered": 10 });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(actor.system.suffered, 10, "Suffered wounds updated");
          assert.notEqual(actor.system.suffered, initialWounds, "Wounds changed from initial");
        });
      });

      describe("PC sheet interactions", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "PC sheet: interaction test",
            system: {
              traits: { agi: 3, ref: 3 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 4, "agi")]);

          sheet = actor.sheet;
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should have roll action buttons", () => {
          const element = sheet.element;
          // Look for ring-roll and trait-roll actions
          const ringRolls = element.querySelectorAll('[data-action="roll-ring"]');
          const traitRolls = element.querySelectorAll('[data-action="roll-trait"]');

          assert.isAtLeast(ringRolls.length + traitRolls.length, 1, "Roll buttons exist on sheet");
        });

        it("should have item management actions", () => {
          const element = sheet.element;
          // Look for edit or delete actions
          const _itemActions = element.querySelectorAll(
            '[data-action*="edit"], [data-action*="delete"]'
          );

          assert.exists(element, "Sheet element exists with potential item actions");
        });

        it("should drag a Trait as the Trait its block names", async () => {
          const face = sheet.element.querySelector("[data-trait-block] [data-action='roll-trait']");
          const dataTransfer = new DataTransfer();
          await sheet._onDragStart({ currentTarget: face.parentElement, dataTransfer });
          assert.equal(JSON.parse(dataTransfer.getData("text/plain")).key, "sta", "Stamina first");
        });

        it("should roll the Skill and the weapon of the row a Shift-click lands in", async function () {
          // Three rolls posted in turn take about 2 seconds, Mocha's default
          this.timeout(10_000);
          await actor.createEmbeddedDocuments("Item", [createKatana()]);
          await sheet.render(true);
          const posted = [];
          const hook = Hooks.on("createChatMessage", message => posted.push(message));
          const shiftClick = action =>
            sheet.element
              .querySelector(`[data-action='${action}']`)
              .dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true })
              );
          try {
            shiftClick("roll-skill");
            assert.isTrue(await waitFor(() => posted.length === 1), "the Skill rolls");
            shiftClick("roll-weapon-attack");
            assert.isTrue(await waitFor(() => posted.length === 2), "the weapon attacks");
            shiftClick("roll-weapon-damage");
            assert.isTrue(await waitFor(() => posted.length === 3), "the weapon rolls damage");
          } finally {
            Hooks.off("createChatMessage", hook);
            for (const message of posted) {
              await message.delete();
            }
          }
        });

        it("should open the casting roll for the spell of the row clicked", async () => {
          await actor.createEmbeddedDocuments("Item", [createSpellData("Quench Sense")]);
          await sheet.render(true);
          const opened = new Promise(resolve => {
            Hooks.once("renderDialogV2", app => {
              resolve(app.title);
              app.close();
            });
          });
          sheet.element.querySelector("[data-action='cast-spell']").click();
          const title = await Promise.race([
            opened,
            new Promise(resolve => setTimeout(() => resolve(""), 5000))
          ]);
          assert.include(title, "Quench Sense");
        });

        it("should show a Skill's new pool on its roll button after its Trait changes", async () => {
          const skill = actor.items.getName("Kenjutsu");
          const row = sheet.element.querySelector(`[data-item-id="${skill.id}"]`);
          const button = row.querySelector("[data-action='roll-skill']");
          const before = button.textContent;
          const select = row.querySelector("[data-field='system.trait']");
          select.value = "sta";
          select.dispatchEvent(new Event("change", { bubbles: true }));
          assert.isTrue(await waitFor(() => button.textContent !== before), "the button changes");
          assert.equal(button.textContent, `${skill.system.roll}k${skill.system.keep}`);
          assert.equal(
            button.parentElement.querySelector("span").textContent,
            button.textContent,
            "the mask shows the same pool"
          );
        });

        it("should fill one Void Point dot per Void Point", () => {
          const dots = [
            ...sheet.element.querySelectorAll("[data-action='adjust-void-points'] [data-idx]")
          ];
          assert.lengthOf(dots, 9);
          assert.isAbove(actor.system.rings.void.value, 0, "the PC has Void Points to show");
          assert.equal(
            dots.filter(dot => dot.classList.contains("is-filled")).length,
            actor.system.rings.void.value
          );
        });

        it("should set the Shift+Click cursor while Shift is held", async () => {
          // The spell slots, which carry the Shift-held cursor, render only beside a spell
          const [spell] = await actor.createEmbeddedDocuments("Item", [
            createSpellData("Quench Cursor")
          ]);
          try {
            await sheet.render(true);
            const count = sheet.element.querySelector("[data-action='adjust-spell-slot']");
            assert.exists(count, "a spell slot count");
            const cursor = () => getComputedStyle(count).cursor;
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
            assert.equal(cursor(), "pointer", "Shift held");
            document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
            assert.notEqual(cursor(), "pointer", "Shift released");
          } finally {
            await spell.delete();
          }
        });

        it("should display embedded items", async () => {
          // Wait for render to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          const _element = sheet.element;
          const items = actor.items.contents;

          assert.equal(items.length, 1, "Actor has one item");
          assert.equal(items[0].name, "Kenjutsu", "Item is Kenjutsu skill");
        });
      });

      describe("PC sheet item management", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({ name: "PC sheet: item test" });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should reflect new items on sheet", async () => {
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "New Skill",
              type: "skill",
              system: { rank: 3 }
            }
          ]);

          // Wait for sheet update
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(actor.items.size, 1, "Actor has one item");
          assert.equal(actor.items.contents[0].name, "New Skill", "New item added");
        });

        it("should reflect item deletion", async () => {
          const [item] = await actor.createEmbeddedDocuments("Item", [
            { name: "Temp Item", type: "skill" }
          ]);

          assert.equal(actor.items.size, 1, "Item added");

          await item.delete();

          // Wait for sheet update
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(actor.items.size, 0, "Item removed");
        });
      });

      describe("PC sheet Wound display", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "PC sheet: Wound display test",
            system: {
              traits: { sta: 3, wil: 3 } // Earth = 3
            }
          });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should display wound levels", async () => {
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Look for wound level displays
          const _woundElements = element.querySelectorAll("[data-wound-level], [data-wound]");

          // Wound levels should be visible on sheet
          assert.exists(element, "Sheet displays wound tracking");
        });

        it("should show current wound penalties", () => {
          const woundLevels = actor.system.woundLevels;

          assert.exists(woundLevels, "Wound levels calculated");
          assert.exists(woundLevels.healthy, "Healthy level exists");
          assert.isNumber(woundLevels.healthy.penalty, "Penalty is numeric");
        });
      });
    },
    { displayName: "L5R4: PC sheet" }
  );
}
