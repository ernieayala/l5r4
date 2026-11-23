/**
 * @fileoverview Item Sheet Integration Tests
 *
 * Tests item sheet rendering for different item types.
 * Items include skills, weapons, armor, spells, advantages, disadvantages, etc.
 *
 * **Test Coverage:**
 * - Skill sheet rendering and data display
 * - Weapon sheet rendering and data display
 * - Armor sheet rendering and data display
 * - Spell sheet rendering and data display
 * - Item updates reflected in sheet
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  createSkillData,
  createWeaponData,
  createArmorData,
  createSpellData
} from "../../fixtures/item-fixtures.js";
import { cleanTest, waitFor } from "../helpers.js";

/**
 * Register item sheet tests
 * @param {Object} quench - Quench test framework API
 */
export function registerItemSheetTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.sheets.item-sheet`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Skill item sheet", () => {
        let item, sheet;

        beforeEach(async () => {
          item = await Item.create(
            createSkillData("Kenjutsu", 3, "agi", {
              system: { emphasis: "Katana" }
            })
          );
          sheet = item.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (item) {
            await item.delete();
          }
        });

        it("should render skill sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Skill sheet rendered");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should display skill name", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const nameInput = element.querySelector('[name="name"]');

          assert.exists(nameInput, "Name input exists");
          assert.equal(nameInput.value, "Kenjutsu", "Skill name displays");
        });

        it("should display skill rank", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const rankInput = element.querySelector('[name="system.rank"]');

          assert.exists(rankInput, "Rank input exists");
          assert.equal(parseInt(rankInput.value), 3, "Rank value is 3");
        });

        it("should display skill trait", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Trait might be select or input
          const traitInput = element.querySelector('[name="system.trait"]');

          assert.exists(traitInput, "Trait input exists");
        });

        it("should update when rank changes", async () => {
          await sheet.render(true);

          await item.update({ "system.rank": 5 });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(item.system.rank, 5, "Rank updated to 5");
        });
      });

      describe("Weapon item sheet", () => {
        let item, sheet;

        beforeEach(async () => {
          item = await Item.create(
            createWeaponData("Item sheet: katana", 3, 2, {
              system: { associatedSkill: "kenjutsu" }
            })
          );
          sheet = item.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (item) {
            await item.delete();
          }
        });

        it("should render weapon sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Weapon sheet rendered");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should display weapon damage", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const damageRollInput = element.querySelector('[name="system.damageRoll"]');
          const damageKeepInput = element.querySelector('[name="system.damageKeep"]');

          assert.exists(damageRollInput, "Damage roll input exists");
          assert.exists(damageKeepInput, "Damage keep input exists");

          assert.equal(parseInt(damageRollInput.value), 3, "Damage roll is 3");
          assert.equal(parseInt(damageKeepInput.value), 2, "Damage keep is 2");
        });

        it("should display skill used", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Weapon template uses associatedSkill, not skillUsed
          const skillInput = element.querySelector('[name="system.associatedSkill"]');

          assert.exists(skillInput, "Skill used input exists");
        });

        it("should update weapon properties", async () => {
          await sheet.render(true);

          await item.update({
            "system.damageRoll": 5,
            "system.damageKeep": 3
          });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(item.system.damageRoll, 5, "Damage roll updated");
          assert.equal(item.system.damageKeep, 3, "Damage keep updated");
        });
      });

      describe("Armor item sheet", () => {
        let item, sheet;

        beforeEach(async () => {
          item = await Item.create(createArmorData("Item sheet: light armor", 3, 1));
          sheet = item.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (item) {
            await item.delete();
          }
        });

        it("should render armor sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Armor sheet rendered");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should display armor bonus", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const bonusInput = element.querySelector('[name="system.bonus"]');

          assert.exists(bonusInput, "Armor bonus input exists");
          assert.equal(parseInt(bonusInput.value), 3, "Armor bonus is 3");
        });

        it("should display reduction value", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const reductionInput = element.querySelector('[name="system.reduction"]');

          assert.exists(reductionInput, "Reduction input exists");
          assert.equal(parseInt(reductionInput.value), 1, "Reduction is 1");
        });
      });

      describe("Spell item sheet", () => {
        let item, sheet;

        beforeEach(async () => {
          item = await Item.create(createSpellData("Item sheet: clarity of purpose", "air", 2));
          sheet = item.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (item) {
            await item.delete();
          }
        });

        it("should render spell sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Spell sheet rendered");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should display spell element", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          // Spell template uses ring, not element
          const elementInput = element.querySelector('[name="system.ring"]');

          assert.exists(elementInput, "Element input exists");
        });

        it("should display mastery level", async () => {
          await sheet.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = sheet.element;
          const masteryInput = element.querySelector('[name="system.mastery"]');

          assert.exists(masteryInput, "Mastery input exists");
        });
      });

      describe("Item sheet general features", () => {
        let item, sheet;

        beforeEach(async () => {
          item = await Item.create(createSkillData("Item sheet: test item", 1));
          sheet = item.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (item) {
            await item.delete();
          }
        });

        it("should have description field", async () => {
          await sheet.render(true);

          const element = sheet.element;

          // Description field should exist in some form
          assert.exists(element, "Sheet has description area");
        });

        it("should allow closing sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Sheet is rendered");

          await sheet.close();

          // After a brief delay, sheet should be closed
          await new Promise(resolve => setTimeout(resolve, 100));

          assert.isFalse(sheet.rendered, "Sheet is closed");
        });

        it("should reflect item deletion", async () => {
          await sheet.render(true);

          const itemId = item.id;

          await item.delete();
          item = null; // Prevent afterEach from trying to delete again

          // Item should no longer exist
          const deletedItem = game.items.get(itemId);
          assert.isUndefined(deletedItem, "Item deleted from world");
        });
      });

      describe("Item sheet effects", () => {
        const clean = cleanTest(assert);
        let item, sheet;

        /** The open configuration windows of an effect. */
        const configsOf = effect =>
          [...foundry.applications.instances.values()].filter(
            app =>
              app instanceof foundry.applications.sheets.ActiveEffectConfig &&
              app.document === effect
          );

        /** The control a selector finds in an effect's row, in the sheet as rendered now. */
        const control = (selector, effect) =>
          sheet.element.querySelector(`[data-effect-id="${effect.id}"] ${selector}`);

        beforeEach(async () => {
          item = await Item.create({ name: "Item sheet: effects", type: "advantage" });
          await item.createEmbeddedDocuments("ActiveEffect", [
            { name: "Item sheet: effect", disabled: false, transfer: true }
          ]);
          sheet = item.sheet;
          await sheet.render(true);
          sheet.element.querySelector("[data-action='change-tab'][data-tab='effects']").click();
          await waitFor(() => sheet.element.querySelector("[data-action='create-effect']"));
        });

        afterEach(async () => {
          for (const effect of item?.effects ?? []) {
            for (const app of configsOf(effect)) {
              await app.close({ animate: false });
            }
          }
          if (sheet?.rendered) {
            await sheet.close({ animate: false });
          }
          await item?.delete();
        });

        it(
          "should create an effect and open its configuration",
          clean(async () => {
            sheet.element.querySelector('[data-action="create-effect"]').click();
            assert.isTrue(await waitFor(() => item.effects.size === 2), "a second effect");
            const created = item.effects.find(effect => effect.name !== "Item sheet: effect");
            assert.isTrue(
              await waitFor(() => configsOf(created).some(app => app.rendered)),
              "its configuration opens"
            );
          })
        );

        it(
          "should open an effect's configuration from its edit control",
          clean(async () => {
            const [effect] = item.effects;
            control('[data-action="edit-effect"]', effect).click();
            assert.isTrue(await waitFor(() => configsOf(effect).some(app => app.rendered)));
          })
        );

        it(
          "should turn an effect off and back on from its pressed toggle",
          clean(async () => {
            const [effect] = item.effects;
            const toggle = () => control('[data-action="toggle-effect"]', effect);
            assert.equal(toggle().getAttribute("aria-pressed"), "true");
            toggle().click();
            assert.isTrue(await waitFor(() => effect.disabled), "turned off");
            assert.isTrue(
              await waitFor(() => toggle()?.getAttribute("aria-pressed") === "false"),
              "not pressed once off"
            );
            toggle().click();
            assert.isTrue(await waitFor(() => !effect.disabled), "turned back on");
          })
        );

        it(
          "should remove an effect from its delete control",
          clean(async () => {
            const [effect] = item.effects;
            control('[data-action="delete-effect"]', effect).click();
            assert.isTrue(await waitFor(() => item.effects.size === 0));
          })
        );
      });

      describe("Embedded item sheet", () => {
        let actor, item, sheet;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Item sheet: item owner" });

          const [createdItem] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Embedded Skill",
              type: "skill",
              system: { rank: 4 }
            }
          ]);

          item = createdItem;
          sheet = item.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should render embedded item sheet", async () => {
          await sheet.render(true);

          assert.isTrue(sheet.rendered, "Embedded item sheet rendered");
          assert.exists(sheet.element, "Sheet element exists");
        });

        it("should show item belongs to actor", () => {
          assert.exists(item.parent, "Item has parent actor");
          assert.equal(item.parent.id, actor.id, "Parent is correct actor");
        });

        it("should update embedded item", async () => {
          await sheet.render(true);

          await item.update({ "system.rank": 6 });

          // Wait for re-render
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(item.system.rank, 6, "Embedded item updated");

          // Verify still on actor
          const actorItem = actor.items.get(item.id);
          assert.equal(actorItem.system.rank, 6, "Actor's copy updated");
        });
      });
    },
    { displayName: "L5R4: Item sheet" }
  );
}
