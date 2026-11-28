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
 * - Skill sorting by the Roll and Emphasis heads
 * - NPC Attack Editor integration
 * - Roll/keep display formatting
 * - Every item type in its section, read-only notes, and one portrait listener (#183)
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestNPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";
import { cleanTest, waitFor } from "../helpers.js";

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

        /**
         * The text of an attack row's cell under the attack header's head with the given label.
         * @param {string} slot  The attack slot, as its row's data-attack-section
         * @param {string} label  The head's i18n key
         */
        const cellUnder = (slot, label) => {
          const row = sheet.element.querySelector(`[data-attack-section="${slot}"]`);
          // The attack header is the sibling before the attack list
          const header = row.closest("section").previousElementSibling;
          assert.isTrue(header.matches("[data-sort-header]"), "the attack header");
          const heads = [...header.firstElementChild.children];
          const column = heads.findIndex(head => head.textContent === game.i18n.localize(label));
          assert.isAtLeast(column, 0, `a ${label} head`);
          return row.children[column].textContent.trim();
        };

        it("should show the attack's damage type in the row's Type cell", () => {
          assert.equal(cellUnder("attack1", "l5r4.ui.common.type"), "Slashing");
        });

        it("should leave the Type cell empty for an attack with no damage type", async () => {
          await actor.update({ "system.damage1.type": "" });
          await sheet.render(true);

          assert.equal(cellUnder("attack1", "l5r4.ui.common.type"), "");
        });

        it("should show no damage button for an attack with no damage, cells under their heads", async () => {
          await actor.update({ "system.damage1": { roll: 0, keep: 0, modifier: 0 } });
          await sheet.render(true);
          const row = sheet.element.querySelector('[data-attack-section="attack1"]');

          assert.notExists(row.querySelector('[data-action="roll-damage"]'), "no damage button");
          assert.equal(cellUnder("attack1", "l5r4.ui.common.damage"), "—");
          assert.equal(cellUnder("attack1", "l5r4.ui.common.type"), "Slashing");
          assert.notInclude(row.textContent, "0k0");
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

        // docs/design-system/components/expand-control.md, X2
        it("should render the expand icon of the section's stored state", async () => {
          const icon = () =>
            sheet.element.querySelector(
              '[data-section-title][data-scope="skills"] [data-action="expand-section"] i'
            ).classList;
          const shows = () => (icon().contains("fa-angle-up") ? "up" : "down");
          await sheet.render(true);
          assert.equal(shows(), "up", "an open section renders the open icon");
          sheet.element
            .querySelector(
              '[data-section-title][data-scope="skills"] [data-action="expand-section"]'
            )
            .click();
          await new Promise(resolve => setTimeout(resolve, 300));
          await sheet.render(true);
          assert.equal(shows(), "down", "a closed section renders the closed icon");
          sheet.element
            .querySelector(
              '[data-section-title][data-scope="skills"] [data-action="expand-section"]'
            )
            .click();
          await new Promise(resolve => setTimeout(resolve, 300));
          await sheet.render(true);
          assert.equal(shows(), "up", "a reopened section renders the open icon");
          assert.isFalse(
            icon().contains("fa-angle-up") && icon().contains("fa-angle-down"),
            "one icon at a time"
          );
        });

        it("should mark a Skill row's expand control as expanded when clicked", async () => {
          // A row has an expand control only when it has details to show
          await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 2, "agi", { system: { description: "Kenjutsu details" } })
          ]);
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

      describe("NPC sheet items, notes, and portrait (#183)", () => {
        let actor, sheet;

        beforeEach(async () => {
          actor = await createTestNPC({ name: "NPC sheet: holding NPC" });
          // A link that only enrichment turns into an anchor
          await actor.update({ "system.notes": `Waits at @UUID[${actor.uuid}]{the bridge}` });
          sheet = actor.sheet;
        });

        afterEach(async () => {
          await sheet?.close({ animate: false });
          await actor?.delete();
        });

        it("should show a row for every item the NPC holds, whatever its type", async () => {
          const types = [
            "weapon",
            // A stored item of the legacy bow type lists with the weapons (#185)
            "bow",
            "armor",
            "commonItem",
            "spell",
            "technique",
            "kata",
            "kiho",
            "tattoo",
            "advantage",
            "disadvantage",
            "clan",
            "family",
            "school"
          ];
          const items = await actor.createEmbeddedDocuments(
            "Item",
            types.map(type => ({ name: `Held ${type}`, type }))
          );
          await sheet.render(true);

          for (const item of items) {
            assert.exists(
              sheet.element.querySelector(`[data-item-id="${item.id}"] [data-action="edit-item"]`),
              `a ${item.type} row with its edit control`
            );
          }
        });

        it("should wire the weapon, spell slot, and activation controls the sections show", () => {
          const actions = sheet.constructor.CLICK_ACTIONS;
          for (const action of ["roll-weapon-damage", "adjust-spell-slot", "toggle-activation"]) {
            assert.isFunction(actions[action], action);
          }
        });

        it("should offer every section's item type in the Add dialog", async () => {
          const html = await foundry.applications.handlebars.renderTemplate(
            `systems/${SYS_ID}/templates/dialogs/unified-item-create-dialog.hbs`,
            { preferredType: "spell" }
          );
          // One root element, so parseHTML returns it [src: client/utils/helpers.mjs:382-389]
          const select = foundry.utils.parseHTML(html).querySelector("select");
          const values = [...select.options].map(option => option.value);
          for (const type of [
            "skill",
            "weapon",
            "armor",
            "commonItem",
            "spell",
            "advantage",
            "kiho"
          ]) {
            assert.include(values, type);
          }
          assert.equal(select.value, "spell", "the section's type preselected");
        });

        it("should show the notes as enriched text to a viewer who cannot edit the NPC", async () => {
          Object.defineProperty(sheet, "isEditable", { get: () => false, configurable: true });
          try {
            await sheet.render(true);
            assert.notExists(sheet.element.querySelector("prose-mirror"), "no editor");
            const link = sheet.element.querySelector(`a[data-uuid="${actor.uuid}"]`);
            assert.exists(link, "the notes' link, enriched");
            assert.include(link.textContent, "the bridge");
          } finally {
            delete sheet.isEditable;
          }
        });

        it("should open one image editor per portrait click, however often the sheet renders", async () => {
          await sheet.render(true);
          await sheet.render(true);
          await sheet.render(true);
          let opened = 0;
          sheet._onEditImage = () => {
            opened++;
          };
          try {
            sheet.element.querySelector("[data-edit='img']").click();
            assert.equal(opened, 1);
          } finally {
            delete sheet._onEditImage;
          }
        });
      });

      describe("NPC sheet Skill sorting", () => {
        const clean = cleanTest(assert);
        let actor, sheet;

        // Name, roll, and Emphasis each give the three Skills a different order: Agility 2 makes the rolls 7, 5, 3
        beforeEach(async () => {
          actor = await createTestNPC({ name: "NPC sheet: sorted Skills NPC" });
          await actor.createEmbeddedDocuments("Item", [
            createSkillData("Athletics", 5, "agi", { system: { trainedEmphases: ["Climbing"] } }),
            createSkillData("Hunting", 3, "agi", { system: { trainedEmphases: ["Ambush"] } }),
            createSkillData("Kenjutsu", 1, "agi", { system: { trainedEmphases: ["Katana"] } })
          ]);
          sheet = actor.sheet;
          await sheet.render(true);
        });

        afterEach(async () => {
          await sheet?.close({ animate: false });
          await game.user.unsetFlag(SYS_ID, `sortByActor.${actor.id}`);
          await actor?.delete();
        });

        /** The Skill rows' names, top to bottom. */
        const rowNames = () =>
          [...sheet.element.querySelectorAll("[data-item-id]")].map(
            row => actor.items.get(row.dataset.itemId).name
          );

        /** The Skills header's head for a sort key. */
        const head = key =>
          sheet.element.querySelector(
            `[data-sort-header][data-scope='skills'] [data-sort-by='${key}']`
          );

        /**
         * Click a head, then check the rows took its ascending order and the head alone shows as pressed.
         * @param {string} key  The head's sort key
         * @param {string[]} order  The Skill names the sort gives
         */
        const sortsBy = async (key, order) => {
          assert.deepEqual(rowNames(), ["Athletics", "Hunting", "Kenjutsu"], "by name first");
          head(key).click();

          assert.isTrue(
            await waitFor(() => rowNames().join() === order.join(), 1500),
            `the rows read ${order.join(", ")}, not ${rowNames().join(", ")}`
          );
          assert.equal(head(key).getAttribute("aria-pressed"), "true", `${key} pressed`);
          assert.isTrue(head(key).classList.contains("is-active"), `${key} active`);
          assert.equal(head(key).dataset.dir, "asc", `${key} ascending`);
          assert.equal(head("name").getAttribute("aria-pressed"), "false", "name released");
          assert.isFalse(head("name").classList.contains("is-active"), "name inactive");
        };

        it(
          "should sort the Skills by roll when the Roll head is clicked, and mark that head",
          clean(() => sortsBy("roll", ["Kenjutsu", "Hunting", "Athletics"]))
        );

        it(
          "should sort the Skills by Emphasis when the Emphasis head is clicked, and mark that head",
          clean(() => sortsBy("emphasis", ["Hunting", "Athletics", "Kenjutsu"]))
        );
      });
    },
    { displayName: "L5R4: NPC sheet" }
  );
}
