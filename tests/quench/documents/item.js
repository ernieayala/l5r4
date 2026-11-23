/**
 * Item documents: creating Skill, weapon, and armor items, and adding and removing items on an actor.
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  createArmorData,
  createSkillData,
  createWeaponData
} from "../../fixtures/item-fixtures.js";

/**
 * Register the batch.
 * @param {object} quench - The Quench API
 */
export function registerItemTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.item`,
    context => {
      const { describe, it, assert, afterEach } = context;

      describe("Item creation", () => {
        let item;

        afterEach(async () => {
          if (item) {
            await item.delete();
            item = null;
          }
        });

        it("should create skill item", async () => {
          item = await Item.create(createSkillData("Kenjutsu", 3, "agi"));

          assert.exists(item, "Item created");
          assert.equal(item.type, "skill", "Item type is skill");
          assert.equal(item.system.rank, 3, "Skill rank set correctly");
        });

        it("should create weapon item", async () => {
          item = await Item.create(createWeaponData("Katana", 3, 2));

          assert.exists(item, "Item created");
          assert.equal(item.type, "weapon", "Item type is weapon");
        });

        it("should create armor item", async () => {
          item = await Item.create(createArmorData("Light Armor", 3, 1));

          assert.exists(item, "Item created");
          assert.equal(item.system.bonus, 3, "Armor bonus set");
        });
      });

      describe("Items on an actor", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should add skill to actor", async () => {
          actor = await createTestPC({ name: "Test Actor" });

          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Iaijutsu",
              type: "skill",
              system: { rank: 5 }
            }
          ]);

          assert.equal(actor.items.size, 1, "One item on actor");
          assert.equal(actor.items.contents[0].name, "Iaijutsu", "Correct skill added");
          assert.equal(actor.items.contents[0].system.rank, 5, "Skill rank preserved");
        });

        it("should add multiple items to actor", async () => {
          actor = await createTestPC({ name: "Multi-Item Actor" });

          await actor.createEmbeddedDocuments("Item", [
            { name: "Kenjutsu", type: "skill", system: { rank: 3 } },
            { name: "Katana", type: "weapon" },
            { name: "Light Armor", type: "armor" }
          ]);

          assert.equal(actor.items.size, 3, "Three items on actor");

          const skill = actor.items.find(i => i.type === "skill");
          const weapon = actor.items.find(i => i.type === "weapon");
          const armor = actor.items.find(i => i.type === "armor");

          assert.exists(skill, "Skill exists");
          assert.exists(weapon, "Weapon exists");
          assert.exists(armor, "Armor exists");
        });

        it("should remove item from actor", async () => {
          actor = await createTestPC({ name: "Removal Test" });

          const [createdItem] = await actor.createEmbeddedDocuments("Item", [
            { name: "Temporary Skill", type: "skill" }
          ]);

          assert.equal(actor.items.size, 1, "Item added");

          await createdItem.delete();

          assert.equal(actor.items.size, 0, "Item removed");
        });
      });
    },
    { displayName: "L5R4: Item document" }
  );
}
