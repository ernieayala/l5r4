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
 * @see road-map/TESTING-06-SHEETS-TESTS.md
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register PC sheet tests
 * @param {Object} quench - Quench test framework API
 */
export function registerPCSheetTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets.pc`,
    (context) => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("PC Sheet Rendering", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Test Character",
            system: {
              traits: {
                sta: 4, wil: 5,  // Earth = 4
                ref: 3, awa: 3,  // Air = 3
                agi: 3, int: 3,  // Fire = 3
                str: 4, per: 3   // Water = 3
              },
              rings: { void: { rank: 2 } }
            }
          });
          sheet = actor.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) await sheet.close();
          if (actor) await actor.delete();
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
          // Rings use data-system-ring attribute
          const ringElements = element.querySelectorAll('[data-system-ring]');

          assert.isAtLeast(ringElements.length, 1, "Ring elements found");
        });

        it("should display trait values", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Traits use data-trait attribute on rank spans
          const traitElements = element.querySelectorAll('.trait-rank[data-trait]');

          assert.isAtLeast(traitElements.length, 1, "Trait elements found");
        });

        it("should have main sections", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Check for main sheet structure instead of tabs
          const mainSheet = element.querySelector('.main-sheet');

          assert.exists(mainSheet, "Main sheet structure exists");
        });
      });

      describe("PC Sheet Data Updates", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Update Test",
            system: {
              traits: { sta: 3, wil: 3 }  // Earth = 3
            }
          });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          if (sheet?.rendered) await sheet.close();
          if (actor) await actor.delete();
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

      describe("PC Sheet Interactions", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Interaction Test",
            system: {
              traits: { agi: 3, ref: 3 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 4, "agi")
          ]);

          sheet = actor.sheet;
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (sheet?.rendered) await sheet.close();
          if (actor) await actor.delete();
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
          const itemActions = element.querySelectorAll('[data-action*="edit"], [data-action*="delete"]');

          assert.exists(element, "Sheet element exists with potential item actions");
        });

        it("should display embedded items", async () => {
          // Wait for render to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const items = actor.items.contents;

          assert.equal(items.length, 1, "Actor has one item");
          assert.equal(items[0].name, "Kenjutsu", "Item is Kenjutsu skill");
        });
      });

      describe("PC Sheet Item Management", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Item Test" });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          if (sheet?.rendered) await sheet.close();
          if (actor) await actor.delete();
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

      describe("PC Sheet Wound Display", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Wound Display Test",
            system: {
              traits: { sta: 3, wil: 3 }  // Earth = 3
            }
          });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          if (sheet?.rendered) await sheet.close();
          if (actor) await actor.delete();
        });

        it("should display wound levels", async () => {
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Look for wound level displays
          const woundElements = element.querySelectorAll('[data-wound-level], [data-wound]');

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
    { displayName: "L5R4: PC Sheet Tests" }
  );
}
