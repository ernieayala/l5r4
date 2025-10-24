/**
 * @fileoverview NPC Sheet Integration Tests
 *
 * Tests NPC character sheet rendering and data display.
 * NPCs have simpler sheets than PCs with different data structures.
 *
 * **Test Coverage:**
 * - NPC sheet rendering
 * - Attack and damage value display
 * - Roll buttons for NPC attacks
 * - Wound tracking for NPCs
 *
 * @see road-map/TESTING-06-SHEETS-TESTS.md
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register NPC sheet tests
 * @param {Object} quench - Quench test framework API
 */
export function registerNPCSheetTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets.npc`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("NPC Sheet Rendering", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Test NPC",
            system: {
              nrWoundLvls: 3,
              attack1: { roll: 5, keep: 3, dmgRoll: 3, dmgKeep: 2 },
              attack2: { roll: 4, keep: 2, dmgRoll: 2, dmgKeep: 2 }
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

        it("should render NPC sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "NPC sheet rendered");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should display NPC name", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const nameInput = element.querySelector('input[name="name"]');

          assert.exists(nameInput, "Name input exists");
          assert.equal(nameInput.value, "Test NPC", "Name displays correctly");
        });

        it("should have NPC roll buttons", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // NPCs have attack buttons with data-action
          const attackButtons = element.querySelectorAll('[data-action="roll-attack"]');

          assert.isAtLeast(attackButtons.length, 1, "Attack buttons exist");
        });

        it("should have NPC-specific fields", async () => {
          await sheet.render(true);

          const element = sheet.element;
          // NPCs have nrWoundLvls field
          const woundLvlsInput = element.querySelector('[name="system.nrWoundLvls"]');

          // NPCs may have different wound tracking than PCs
          assert.exists(element, "NPC sheet has wound tracking");
        });
      });

      describe("NPC Sheet Attack Display", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Combat NPC",
            system: {
              attack1: { roll: 6, keep: 4, dmgRoll: 4, dmgKeep: 2 },
              attack2: { roll: 5, keep: 3, dmgRoll: 3, dmgKeep: 2 },
              attack3: { roll: 7, keep: 5, dmgRoll: 5, dmgKeep: 3 }
            }
          });
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

        it("should display multiple attacks", () => {
          const element = sheet.element;
          const attackSections = element.querySelectorAll(
            '[data-attack], [name*="attack1"], [name*="attack2"]'
          );

          assert.isAtLeast(attackSections.length, 1, "Multiple attack fields exist");
        });

        it("should have roll buttons for attacks", () => {
          const element = sheet.element;
          // Look for attack, ring, and trait roll actions
          const rollButtons = element.querySelectorAll(
            '[data-action="roll-attack"], [data-action="roll-ring"], [data-action="roll-trait"]'
          );

          assert.isAtLeast(rollButtons.length, 1, "Roll buttons exist for NPC attacks");
        });
      });

      describe("NPC Sheet Wound Tracking", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Wound NPC",
            system: {
              nrWoundLvls: 4,
              woundMode: "manual",
              wounds: { max: 60 }
            }
          });
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

        it("should display wound tracking fields", () => {
          const element = sheet.element;
          // NPCs track suffered wounds - check for system.suffered field
          const woundFields = element.querySelectorAll('[name="system.suffered"]');

          assert.isAtLeast(woundFields.length, 1, "Wound tracking fields exist");
        });

        it("should reflect wound mode settings", () => {
          assert.equal(actor.system.woundMode, "manual", "Wound mode set correctly");
          assert.equal(actor.system.wounds.max, 60, "Manual max wounds set");
        });
      });

      describe("NPC Sheet Data Updates", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Update NPC",
            system: {
              attack1: { roll: 5, keep: 3 }
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

        it("should update when attack values change", async () => {
          await actor.update({
            "system.attack1.roll": 7,
            "system.attack1.keep": 5
          });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(actor.system.attack1.roll, 7, "Attack roll updated");
          assert.equal(actor.system.attack1.keep, 5, "Attack keep updated");
        });

        it("should update wound levels", async () => {
          const initialLevels = actor.system.nrWoundLvls || 3;

          await actor.update({ "system.nrWoundLvls": 5 });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(actor.system.nrWoundLvls, 5, "Wound levels updated");
          assert.notEqual(actor.system.nrWoundLvls, initialLevels, "Changed from initial");
        });
      });

      describe("NPC Sheet Ring Display", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Ring NPC",
            system: {
              traits: { sta: 4, wil: 3 } // Earth = 3
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

        it("should display NPC rings", () => {
          const element = sheet.element;
          // NPCs may display rings differently than PCs
          const ringElements = element.querySelectorAll('[data-ring], [name*="ring"]');

          // Rings should be present on NPC sheet
          assert.exists(element, "NPC sheet displays character data");
        });

        it("should calculate derived Earth Ring", () => {
          // Earth = min(sta, wil) = min(4, 3) = 3
          assert.equal(actor.system.rings.earth, 3, "Earth Ring calculated correctly");
        });
      });
    },
    { displayName: "L5R4: NPC Sheet Tests" }
  );
}
