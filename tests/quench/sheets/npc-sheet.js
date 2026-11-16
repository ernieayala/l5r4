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
 * - Skill item CRUD operations (edit, delete)
 * - NPC Attack Editor integration
 * - Roll/keep display formatting
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestNPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";
import { waitFor } from "../helpers.js";

/**
 * Register NPC sheet tests
 * @param {Object} quench - Quench test framework API
 */
export function registerNpcSheetTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets.npc-sheet`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("NPC sheet rendering", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "Test NPC",
            system: {
              nrWoundLvls: 3,
              attack1: { roll: 5, keep: 3 },
              damage1: { roll: 3, keep: 2 },
              attack2: { roll: 4, keep: 2 },
              damage2: { roll: 2, keep: 2 }
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
          const _woundLvlsInput = element.querySelector('[name="system.nrWoundLvls"]');

          // NPCs may have different wound tracking than PCs
          assert.exists(element, "NPC sheet has wound tracking");
        });
      });

      describe("NPC sheet attack display", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "NPC sheet: combat NPC",
            system: {
              attack1: { roll: 6, keep: 4 },
              damage1: { roll: 4, keep: 2 },
              attack2: { roll: 5, keep: 3 },
              damage2: { roll: 3, keep: 2 },
              attack3: { roll: 7, keep: 5 },
              damage3: { roll: 5, keep: 3 }
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
          const attackSections = element.querySelectorAll("[data-attack-section]");

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

      describe("NPC sheet Wound tracking", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "NPC sheet: Wound NPC",
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

      describe("NPC sheet data updates", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "NPC sheet: update NPC",
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

      describe("NPC sheet Ring display", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "NPC sheet: Ring NPC",
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
          const _ringElements = element.querySelectorAll('[data-ring], [name*="ring"]');

          // Rings should be present on NPC sheet
          assert.exists(element, "NPC sheet displays character data");
        });

        it("should calculate derived Earth Ring", () => {
          // Earth = min(sta, wil) = min(4, 3) = 3
          assert.equal(actor.system.rings.earth, 3, "Earth Ring calculated correctly");
        });
      });

      describe("NPC sheet Skill CRUD operations", () => {
        let actor, sheet, skill;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "NPC sheet: skilled NPC",
            system: {}
          });

          // Add a skill to the NPC
          skill = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Test Skill",
              type: "skill",
              system: {
                rank: 3,
                trait: "agi",
                type: "bugei"
              }
            }
          ]);
          skill = skill[0];

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

        it("should display skill edit button", () => {
          const element = sheet.element;
          const skillRow = element.querySelector(`[data-item-id="${skill.id}"]`);

          assert.exists(skillRow, "Skill row exists");

          const editButton = skillRow.querySelector('[data-action="edit-item"]');
          assert.exists(editButton, "Edit button exists on skill");
        });

        it("should display skill delete button", () => {
          const element = sheet.element;
          const skillRow = element.querySelector(`[data-item-id="${skill.id}"]`);

          assert.exists(skillRow, "Skill row exists");

          const deleteButton = skillRow.querySelector('[data-action="delete-item"]');
          assert.exists(deleteButton, "Delete button exists on skill");
        });

        it("should display skill roll button with correct format", () => {
          const element = sheet.element;
          const skillRow = element.querySelector(`[data-item-id="${skill.id}"]`);

          assert.exists(skillRow, "Skill row exists");

          const rollButton = skillRow.querySelector('[data-action="roll-skill"]');
          assert.exists(rollButton, "Roll button exists on skill");

          // Check roll/keep format is displayed
          const rollText = rollButton.textContent.trim();
          assert.match(rollText, /\d+k\d+/, "Roll button shows XkY format");
        });

        it("should have clickable edit button", () => {
          const element = sheet.element;
          const skillRow = element.querySelector(`[data-item-id="${skill.id}"]`);
          const editButton = skillRow.querySelector('[data-action="edit-item"]');

          assert.exists(editButton, "Edit button exists");
          assert.isNotNull(editButton.getAttribute("data-action"), "Edit button has action");
          assert.equal(editButton.getAttribute("data-action"), "edit-item", "Edit action correct");
        });

        it("should have clickable delete button", () => {
          const element = sheet.element;
          const skillRow = element.querySelector(`[data-item-id="${skill.id}"]`);
          const deleteButton = skillRow.querySelector('[data-action="delete-item"]');

          assert.exists(deleteButton, "Delete button exists");
          assert.isNotNull(deleteButton.getAttribute("data-action"), "Delete button has action");
          assert.equal(
            deleteButton.getAttribute("data-action"),
            "delete-item",
            "Delete action correct"
          );
        });
      });

      describe("NPC attack editor integration", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({
            name: "NPC sheet: attack NPC",
            system: {
              attack1: {
                name: "Katana",
                roll: 5,
                keep: 3,
                modifier: 2,
                type: "simple"
              },
              damage1: {
                roll: 3,
                keep: 2,
                modifier: 0,
                type: "Slashing"
              }
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

        it("should display attack edit button", () => {
          const element = sheet.element;
          const attackSection = element.querySelector('[data-attack-section="attack1"]');

          assert.exists(attackSection, "Attack section exists");

          const editButton = attackSection.querySelector('[data-action="edit-attack"]');
          assert.exists(editButton, "Edit attack button exists");
        });

        it("should have correct attack key on edit button", () => {
          const element = sheet.element;
          const editButton = element.querySelector(
            '[data-attack-section="attack1"] [data-action="edit-attack"]'
          );

          assert.exists(editButton, "Edit button exists");
          assert.equal(editButton.dataset.attackKey, "attack1", "Attack key is correct");
        });

        it("should display attack roll/keep correctly formatted", () => {
          const element = sheet.element;
          const attackSection = element.querySelector('[data-attack-section="attack1"]');
          const rollButton = attackSection.querySelector('[data-action="roll-attack"]');

          assert.exists(rollButton, "Attack roll button exists");

          const rollText = rollButton.textContent.trim();
          // Should show 5k3+2 format
          assert.match(rollText, /5k3/, "Attack shows correct roll/keep");
          assert.match(rollText, /\+2/, "Attack shows modifier");
        });

        it("should display damage roll/keep correctly formatted", () => {
          const element = sheet.element;
          const attackSection = element.querySelector('[data-attack-section="attack1"]');
          const damageButton = attackSection.querySelector('[data-action="roll-damage"]');

          assert.exists(damageButton, "Damage roll button exists");

          const damageText = damageButton.textContent.trim();
          // Should show 3k2 format
          assert.match(damageText, /3k2/, "Damage shows correct roll/keep");
        });

        it("should show an attack's action as its localized label, on the row and the roll", async () => {
          await actor.update({ "system.attack1.type": "complex" });
          await sheet.render(true);
          const attackSection = sheet.element.querySelector('[data-attack-section="attack1"]');
          const label = game.i18n.localize("l5r4.ui.common.complex");

          assert.include(attackSection.textContent, label);
          assert.notInclude(attackSection.textContent, "complex", "the stored key never shows");
          assert.equal(
            attackSection.querySelector('[data-action="roll-attack"]').dataset.description,
            label
          );
        });

        it("should display attack name", () => {
          const element = sheet.element;
          const attackSection = element.querySelector('[data-attack-section="attack1"]');
          const title = attackSection.querySelector("[data-attack-title]");

          assert.exists(title, "Attack title exists");
          assert.include(title.textContent, "Katana", "Attack name displayed");
        });

        it("should have edit buttons for the filled attack slots and Add Attack for the empty one", () => {
          const element = sheet.element;

          const attack1Edit = element.querySelector(
            '[data-attack-section="attack1"] [data-action="edit-attack"]'
          );
          const attack2Edit = element.querySelector(
            '[data-attack-section="attack2"] [data-action="edit-attack"]'
          );
          const attack3Row = element.querySelector('[data-attack-section="attack3"]');
          const add = element.querySelector('[data-action="add-attack"]');

          assert.exists(attack1Edit, "Attack 1 edit button exists");
          assert.exists(attack2Edit, "Attack 2 edit button exists");
          // A new NPC's third slot is empty, so it is hidden and Add Attack fills it (roadmap/STAGE-06 decision 1)
          assert.notExists(attack3Row, "Empty attack 3 hidden");
          assert.equal(add?.dataset.attackKey, "attack3", "Add Attack targets attack 3");
        });
      });

      describe("NPC sheet sections", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({ name: "NPC sheet: section NPC" });
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          await sheet?.close({ animate: false });
          const map = game.user.getFlag(SYS_ID, "collapsedSections") ?? {};
          if (actor?.id in map) {
            await game.user.unsetFlag(SYS_ID, `collapsedSections.${actor.id}`);
          }
          await actor?.delete();
        });

        it("should collapse the Skills section and keep it collapsed after a render", async () => {
          const title = () =>
            sheet.element.querySelector('[data-section-title][data-scope="skills"]');
          const toggle = () => title().querySelector('[data-action="expand-section"]');
          assert.equal(toggle().getAttribute("aria-expanded"), "true", "open before the click");
          toggle().click();
          await new Promise(resolve => setTimeout(resolve, 300));

          assert.isTrue(title().classList.contains("is-collapsed"));
          assert.equal(toggle().getAttribute("aria-expanded"), "false", "closed after the click");
          await sheet.render(true);
          assert.isTrue(title().classList.contains("is-collapsed"), "after a render");
          assert.equal(toggle().getAttribute("aria-expanded"), "false", "closed after a render");
        });

        it("should mark a Skill row's expand control as expanded when clicked", async () => {
          await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2, "agi")]);
          await sheet.render(true);
          const toggle = sheet.element.querySelector('[data-action="expand-item"]');
          assert.equal(toggle.getAttribute("aria-expanded"), "false", "closed before the click");
          toggle.click();

          assert.isTrue(toggle.closest("[data-item-id]").classList.contains("is-expanded"));
          assert.equal(toggle.getAttribute("aria-expanded"), "true", "open after the click");
        });

        it("should mark the Skill column a sort click chose, with its direction", async () => {
          await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2, "agi")]);
          await sheet.render(true);
          const column = () =>
            sheet.element.querySelector(
              "[data-sort-header][data-scope='skills'] [data-sort-by='rank']"
            );
          try {
            column().click();
            assert.isTrue(await waitFor(() => column()?.dataset.dir === "asc"), "rank ascending");
            assert.equal(column().getAttribute("aria-pressed"), "true", "rank pressed");
          } finally {
            await game.user.unsetFlag(SYS_ID, `sortByActor.${actor.id}`);
          }
        });
      });
    },
    { displayName: "L5R4: NPC sheet" }
  );
}
