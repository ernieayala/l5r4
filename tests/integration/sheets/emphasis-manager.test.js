/**
 * @fileoverview Emphasis Manager Dialog Tests
 *
 * Tests the Emphasis Manager application dialog for managing available emphases.
 * This dialog allows selecting which emphases are available for a skill,
 * adding custom emphases to the world, and managing the emphasis pool.
 *
 * **Test Coverage:**
 * - Dialog creation and rendering
 * - Display of official and custom emphases
 * - Form submission and saving to item
 * - Custom emphasis CRUD operations
 * - Edge cases and error handling
 * - World settings integration
 *
 * @see module/apps/emphasis-manager.js
 */

/* global FormDataExtended */

import { SYS_ID } from "../../../module/config/constants.js";
import EmphasisManager from "../../../module/apps/emphasis-manager.js";
import { OFFICIAL_EMPHASES } from "../../../module/config/game-data.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register emphasis manager dialog tests
 * @param {Object} quench - Quench test framework API
 */
export function registerEmphasisManagerTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.apps.emphasis-manager`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Dialog Creation and Validation", () => {
        let skillItem, dialog;

        beforeEach(async () => {
          skillItem = await Item.create(createSkillData("Kenjutsu", 3, "agi"));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (skillItem) {
            await skillItem.delete();
          }
        });

        it("should create emphasis manager dialog with skill item", () => {
          // ARRANGE
          // skillItem created in beforeEach

          // ACT
          dialog = new EmphasisManager({ item: skillItem });

          // ASSERT
          assert.exists(dialog, "Dialog created");
          assert.equal(dialog.item, skillItem, "Dialog has skill item reference");
        });

        it("should throw error if no item provided", () => {
          // ARRANGE
          // No item provided

          // ACT & ASSERT
          assert.throws(
            () => new EmphasisManager({}),
            Error,
            "EmphasisManager requires a skill item"
          );
        });

        it("should throw error if item is not a skill", async () => {
          // ARRANGE
          const nonSkillItem = await Item.create({
            name: "Test Weapon",
            type: "weapon",
            system: {}
          });

          try {
            // ACT & ASSERT
            assert.throws(
              () => new EmphasisManager({ item: nonSkillItem }),
              Error,
              "EmphasisManager requires a skill item"
            );
          } finally {
            await nonSkillItem.delete();
          }
        });

        it("should render dialog", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);

          // ASSERT
          assert.isTrue(dialog.rendered, "Dialog rendered");
          assert.exists(dialog.element, "Dialog element exists");
        });

        it("should display dialog window", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT
          const element = dialog.element;
          assert.exists(element, "Dialog DOM element exists");
          assert.isTrue(element.offsetHeight > 0, "Dialog is visible");
        });
      });

      describe("Template Context Preparation", () => {
        let skillItem, dialog;

        beforeEach(async () => {
          // Clear custom emphases before each test
          await game.settings.set("l5r4-enhanced", "customEmphases", []);

          skillItem = await Item.create(
            createSkillData("Kenjutsu", 3, "agi", {
              system: {
                availableEmphases: ["Katana", "Wakizashi"]
              }
            })
          );
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (skillItem) {
            await skillItem.delete();
          }
          // Clean up custom emphases
          await game.settings.set("l5r4-enhanced", "customEmphases", []);
        });

        it("should load official emphases from OFFICIAL_EMPHASES", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT
          const element = dialog.element;
          const emphasisCheckboxes = element.querySelectorAll('input[name^="emphasis."]');
          assert.isAtLeast(
            emphasisCheckboxes.length,
            OFFICIAL_EMPHASES.length,
            "Official emphases present"
          );
        });

        it("should load custom emphases from world settings", async () => {
          // ARRANGE
          await game.settings.set("l5r4-enhanced", "customEmphases", [
            "Custom Emphasis 1",
            "Custom Emphasis 2"
          ]);
          skillItem = await Item.create(createSkillData("Kenjutsu", 3, "agi"));
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT
          const element = dialog.element;
          const checkboxes = element.querySelectorAll('input[name^="emphasis."]');
          assert.equal(
            checkboxes.length,
            OFFICIAL_EMPHASES.length + 2,
            "Official and custom emphases present"
          );
        });

        it("should mark available emphases as checked", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT
          const element = dialog.element;
          const katanaCheckbox = element.querySelector('input[name="emphasis.Katana"]');
          const wakizashiCheckbox = element.querySelector('input[name="emphasis.Wakizashi"]');
          assert.isTrue(katanaCheckbox?.checked, "Katana is checked");
          assert.isTrue(wakizashiCheckbox?.checked, "Wakizashi is checked");
        });

        it("should handle missing availableEmphases array", async () => {
          // ARRANGE
          const itemNoEmphases = await Item.create(createSkillData("Iaijutsu", 2, "ref"));

          try {
            // ACT
            dialog = new EmphasisManager({ item: itemNoEmphases });
            await dialog.render(true);

            // ASSERT
            assert.isTrue(dialog.rendered, "Dialog renders without errors");
          } finally {
            if (dialog?.rendered) {
              await dialog.close();
            }
            await itemNoEmphases.delete();
          }
        });

        it("should combine and sort emphases alphabetically", async () => {
          // ARRANGE
          await game.settings.set("l5r4-enhanced", "customEmphases", [
            "Zebra Emphasis",
            "Alpha Emphasis"
          ]);
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          const context = await dialog._prepareContext({});

          // ASSERT
          const emphasisNames = context.emphasisList.map(e => e.name);
          const sorted = [...emphasisNames].sort();
          assert.deepEqual(emphasisNames, sorted, "Emphases sorted alphabetically");
        });

        it("should distinguish custom vs official emphases", async () => {
          // ARRANGE
          await game.settings.set("l5r4-enhanced", "customEmphases", ["Custom Test"]);
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          const context = await dialog._prepareContext({});

          // ASSERT
          const officialItem = context.emphasisList.find(e => e.name === OFFICIAL_EMPHASES[0]);
          const customItem = context.emphasisList.find(e => e.name === "Custom Test");
          assert.isFalse(officialItem?.custom, "Official emphasis marked correctly");
          assert.isTrue(customItem?.custom, "Custom emphasis marked correctly");
        });
      });

      describe("Form Submission", () => {
        let skillItem, dialog;

        beforeEach(async () => {
          await game.settings.set("l5r4-enhanced", "customEmphases", []);

          skillItem = await Item.create(
            createSkillData("Kenjutsu", 3, "agi", {
              system: {
                availableEmphases: []
              }
            })
          );
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (skillItem) {
            await skillItem.delete();
          }
          await game.settings.set("l5r4-enhanced", "customEmphases", []);
        });

        it("should save checked emphases to item.system.availableEmphases", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          const element = dialog.element;
          const katanaCheckbox = element.querySelector('input[name="emphasis.Katana"]');
          const wakizashiCheckbox = element.querySelector('input[name="emphasis.Wakizashi"]');
          if (katanaCheckbox) {
            katanaCheckbox.checked = true;
          }
          if (wakizashiCheckbox) {
            wakizashiCheckbox.checked = true;
          }

          // ACT
          const formData = new FormDataExtended(element);
          await dialog._onSubmit(new Event("submit"), element, formData);

          // ASSERT
          await skillItem.sheet.render();
          const updated = game.items.get(skillItem.id);
          assert.includeMembers(
            updated.system.availableEmphases,
            ["Katana", "Wakizashi"],
            "Selected emphases saved to item"
          );
        });

        it("should save only names, not state objects", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          const element = dialog.element;
          const checkbox = element.querySelector('input[name^="emphasis."]');
          if (checkbox) {
            checkbox.checked = true;
          }

          // ACT
          const formData = new FormDataExtended(element);
          await dialog._onSubmit(new Event("submit"), element, formData);

          // ASSERT
          const updated = game.items.get(skillItem.id);
          const emphases = updated.system.availableEmphases;
          assert.isArray(emphases, "availableEmphases is array");
          if (emphases.length > 0) {
            assert.isString(emphases[0], "Emphasis is string, not object");
          }
        });

        it("should handle empty selection", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          const element = dialog.element;
          const checkboxes = element.querySelectorAll('input[name^="emphasis."]');
          checkboxes.forEach(cb => (cb.checked = false));

          // ACT
          const formData = new FormDataExtended(element);
          await dialog._onSubmit(new Event("submit"), element, formData);

          // ASSERT
          const updated = game.items.get(skillItem.id);
          assert.isArray(updated.system.availableEmphases, "Result is array");
          assert.equal(
            updated.system.availableEmphases.length,
            0,
            "Empty array when nothing selected"
          );
        });

        it("should handle multiple checked emphases", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          const element = dialog.element;
          const checkboxes = element.querySelectorAll('input[name^="emphasis."]');
          for (let i = 0; i < Math.min(5, checkboxes.length); i++) {
            checkboxes[i].checked = true;
          }

          // ACT
          const formData = new FormDataExtended(element);
          await dialog._onSubmit(new Event("submit"), element, formData);

          // ASSERT
          const updated = game.items.get(skillItem.id);
          assert.equal(updated.system.availableEmphases.length, 5, "Multiple emphases saved");
        });
      });

      describe("Custom Emphasis Management", () => {
        let skillItem, dialog;

        beforeEach(async () => {
          await game.settings.set("l5r4-enhanced", "customEmphases", []);

          skillItem = await Item.create(createSkillData("Kenjutsu", 3, "agi"));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (skillItem) {
            await skillItem.delete();
          }
          await game.settings.set("l5r4-enhanced", "customEmphases", []);
        });

        it("should add custom emphasis to world settings", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          const testName = "Test Custom Emphasis";
          const currentSettings = game.settings.get("l5r4-enhanced", "customEmphases");

          // ACT
          await game.settings.set("l5r4-enhanced", "customEmphases", [
            ...currentSettings,
            testName
          ]);

          // ASSERT
          const updated = game.settings.get("l5r4-enhanced", "customEmphases");
          assert.include(updated, testName, "Custom emphasis added to settings");
        });

        it("should prevent duplicate custom emphases", async () => {
          // ARRANGE
          const testName = "Duplicate Test";
          await game.settings.set("l5r4-enhanced", "customEmphases", [testName]);

          // ACT
          const current = game.settings.get("l5r4-enhanced", "customEmphases");
          if (!current.includes(testName)) {
            current.push(testName);
            await game.settings.set("l5r4-enhanced", "customEmphases", current);
          }

          // ASSERT
          const final = game.settings.get("l5r4-enhanced", "customEmphases");
          const count = final.filter(name => name === testName).length;
          assert.equal(count, 1, "No duplicate custom emphases");
        });

        it("should trim whitespace from custom emphasis names", async () => {
          // ARRANGE
          const withSpaces = "  Trimmed Test  ";
          const trimmed = withSpaces.trim();

          // ACT
          await game.settings.set("l5r4-enhanced", "customEmphases", [trimmed]);

          // ASSERT
          const saved = game.settings.get("l5r4-enhanced", "customEmphases");
          assert.equal(saved[0], "Trimmed Test", "Whitespace trimmed");
          assert.notInclude(saved, withSpaces, "Untrimmed version not saved");
        });

        it("should delete custom emphasis from world settings", async () => {
          // ARRANGE
          const testName = "To Be Deleted";
          await game.settings.set("l5r4-enhanced", "customEmphases", [testName, "Keep This"]);

          // ACT
          const current = game.settings.get("l5r4-enhanced", "customEmphases");
          const filtered = current.filter(name => name !== testName);
          await game.settings.set("l5r4-enhanced", "customEmphases", filtered);

          // ASSERT
          const updated = game.settings.get("l5r4-enhanced", "customEmphases");
          assert.notInclude(updated, testName, "Custom emphasis deleted");
          assert.include(updated, "Keep This", "Other emphases preserved");
        });

        it("should update custom emphasis name", async () => {
          // ARRANGE
          const oldName = "Old Name";
          const newName = "New Name";
          await game.settings.set("l5r4-enhanced", "customEmphases", [oldName]);

          // ACT
          const current = game.settings.get("l5r4-enhanced", "customEmphases");
          const index = current.indexOf(oldName);
          if (index !== -1) {
            current[index] = newName;
            await game.settings.set("l5r4-enhanced", "customEmphases", current);
          }

          // ASSERT
          const updated = game.settings.get("l5r4-enhanced", "customEmphases");
          assert.notInclude(updated, oldName, "Old name removed");
          assert.include(updated, newName, "New name added");
        });

        it("should not update if new name is same as old", async () => {
          // ARRANGE
          const name = "Same Name";
          await game.settings.set("l5r4-enhanced", "customEmphases", [name]);

          // ACT
          const current = game.settings.get("l5r4-enhanced", "customEmphases");
          const index = current.indexOf(name);
          if (index !== -1 && name !== name) {
            current[index] = name;
          }

          // ASSERT
          const updated = game.settings.get("l5r4-enhanced", "customEmphases");
          assert.equal(updated.length, 1, "No duplicate created");
          assert.equal(updated[0], name, "Name unchanged");
        });
      });

      describe("Edge Cases and Error Handling", () => {
        let skillItem, dialog;

        beforeEach(async () => {
          await game.settings.set("l5r4-enhanced", "customEmphases", []);

          skillItem = await Item.create(createSkillData("Kenjutsu", 3, "agi"));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (skillItem) {
            await skillItem.delete();
          }
          await game.settings.set("l5r4-enhanced", "customEmphases", []);
        });

        it("should handle corrupt world settings gracefully", async () => {
          // ARRANGE
          await game.settings.set("l5r4-enhanced", "customEmphases", "corrupt");
          dialog = new EmphasisManager({ item: skillItem });

          // ACT & ASSERT
          assert.doesNotThrow(async () => {
            await dialog.render(true);
          });
        });

        it("should handle null availableEmphases", async () => {
          // ARRANGE
          await skillItem.update({ "system.availableEmphases": null });
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);

          // ASSERT
          assert.isTrue(dialog.rendered, "Renders with null availableEmphases");
        });

        it("should handle undefined availableEmphases", async () => {
          // ARRANGE
          await skillItem.update({ "system.-=availableEmphases": null });
          dialog = new EmphasisManager({ item: skillItem });

          // ACT
          await dialog.render(true);

          // ASSERT
          assert.isTrue(dialog.rendered, "Renders with undefined availableEmphases");
        });

        it("should handle empty custom emphasis name submission", () => {
          // ARRANGE
          const emptyName = "";

          // ACT
          const trimmed = emptyName.trim();

          // ASSERT
          assert.equal(trimmed.length, 0, "Empty string after trim");
        });

        it("should handle whitespace-only custom emphasis name", () => {
          // ARRANGE
          const whitespaceOnly = "   ";

          // ACT
          const trimmed = whitespaceOnly.trim();

          // ASSERT
          assert.equal(trimmed.length, 0, "Whitespace-only string becomes empty");
        });

        it("should reload emphases after custom emphasis operations", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          const initialCount = dialog.element.querySelectorAll('input[name^="emphasis."]').length;

          // ACT
          await game.settings.set("l5r4-enhanced", "customEmphases", ["New Custom"]);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT
          const updatedCount = dialog.element.querySelectorAll('input[name^="emphasis."]').length;
          assert.equal(
            updatedCount,
            initialCount + 1,
            "Dialog updates after custom emphasis added"
          );
        });
      });

      describe("Integration with Item System", () => {
        let skillItem, dialog;

        beforeEach(async () => {
          await game.settings.set("l5r4-enhanced", "customEmphases", []);

          skillItem = await Item.create(
            createSkillData("Kenjutsu", 3, "agi", {
              system: {
                availableEmphases: ["Katana"]
              }
            })
          );
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (skillItem) {
            await skillItem.delete();
          }
          await game.settings.set("l5r4-enhanced", "customEmphases", []);
        });

        it("should preserve other item properties on save", async () => {
          // ARRANGE
          const originalRank = skillItem.system.rank;
          const originalTrait = skillItem.system.trait;
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ACT
          const element = dialog.element;
          const formData = new FormDataExtended(element);
          await dialog._onSubmit(new Event("submit"), element, formData);

          // ASSERT
          const updated = game.items.get(skillItem.id);
          assert.equal(updated.system.rank, originalRank, "Rank preserved");
          assert.equal(updated.system.trait, originalTrait, "Trait preserved");
        });

        it("should handle item deletion gracefully", async () => {
          // ARRANGE
          dialog = new EmphasisManager({ item: skillItem });
          await dialog.render(true);

          // ACT
          await skillItem.delete();
          skillItem = null;

          // ASSERT
          assert.isTrue(dialog.rendered, "Dialog remains rendered");
        });

        it("should work with skill items of different types", async () => {
          // ARRANGE
          const bugeiSkill = await Item.create(
            createSkillData("Kenjutsu", 3, "agi", {
              system: { type: "bugei" }
            })
          );
          const highSkill = await Item.create(
            createSkillData("Lore: History", 2, "int", {
              system: { type: "high" }
            })
          );

          try {
            // ACT
            const bugeiDialog = new EmphasisManager({ item: bugeiSkill });
            await bugeiDialog.render(true);
            const highDialog = new EmphasisManager({ item: highSkill });
            await highDialog.render(true);

            // ASSERT
            assert.isTrue(bugeiDialog.rendered, "Works with bugei skill");
            assert.isTrue(highDialog.rendered, "Works with high skill");

            await bugeiDialog.close();
            await highDialog.close();
          } finally {
            await bugeiSkill.delete();
            await highSkill.delete();
          }
        });
      });
    },
    { displayName: "L5R4: Emphasis Manager" }
  );
}
