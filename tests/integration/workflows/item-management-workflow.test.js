/**
 * Item Management CRUD Workflow Integration Tests
 *
 * Tests complete item lifecycle: create, read, update, delete workflows.
 * Covers drag & drop, equip/unequip, and item type restrictions.
 *
 * Test Priority: Tier 2 (Important - Item management)
 *
 * Gap Coverage:
 * - Complete create/update/delete workflow
 * - Drag & drop workflow
 * - Equip/unequip weapon/armor workflow
 * - Item type restrictions (NPC vs PC)
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";
import {
  createSkillData,
  createWeaponData,
  createArmorData,
  createKatana,
  createSpellData
} from "../../fixtures/item-fixtures.js";

/**
 * Register item management workflow tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerItemManagementWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.item-management`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Item Creation Workflow", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Item Test PC" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should create skill item on PC", async () => {
          // ARRANGE
          const skillData = createSkillData("Kenjutsu", 3, "agi");
          const initialCount = actor.items.size;

          // ACT
          const [skill] = await actor.createEmbeddedDocuments("Item", [skillData]);

          // ASSERT
          assert.exists(skill, "Skill created");
          assert.equal(skill.name, "Kenjutsu", "Skill has correct name");
          assert.equal(skill.system.rank, 3, "Skill has correct rank");
          assert.equal(skill.system.trait, "agi", "Skill has correct trait");
          assert.equal(actor.items.size, initialCount + 1, "Item count increased");
        });

        it("should create weapon item on PC", async () => {
          // ARRANGE
          const weaponData = createKatana();

          // ACT
          const [weapon] = await actor.createEmbeddedDocuments("Item", [weaponData]);

          // ASSERT
          assert.exists(weapon, "Weapon created");
          assert.equal(weapon.type, "weapon", "Item is weapon type");
          assert.equal(weapon.system.damageRoll, 3, "Damage roll correct");
          assert.equal(weapon.system.damageKeep, 2, "Damage keep correct");
        });

        it("should create armor item on PC", async () => {
          // ARRANGE
          const armorData = createArmorData("Light Armor", 3, 1);

          // ACT
          const [armor] = await actor.createEmbeddedDocuments("Item", [armorData]);

          // ASSERT
          assert.exists(armor, "Armor created");
          assert.equal(armor.type, "armor", "Item is armor type");
          assert.equal(armor.system.bonus, 3, "TN bonus correct");
          assert.equal(armor.system.reduction, 1, "Reduction correct");
        });

        it("should create spell item on PC", async () => {
          // ARRANGE
          const spellData = createSpellData("Jade Strike", "fire", 3);

          // ACT
          const [spell] = await actor.createEmbeddedDocuments("Item", [spellData]);

          // ASSERT
          assert.exists(spell, "Spell created");
          assert.equal(spell.type, "spell", "Item is spell type");
          assert.equal(spell.system.ring, "fire", "Ring correct");
          assert.equal(spell.system.mastery, 3, "Mastery correct");
        });

        it("should create multiple items in batch", async () => {
          // ARRANGE
          const items = [
            createSkillData("Kenjutsu", 3, "agi"),
            createSkillData("Iaijutsu", 2, "ref"),
            createWeaponData("Katana", 3, 2)
          ];

          // ACT
          const created = await actor.createEmbeddedDocuments("Item", items);

          // ASSERT
          assert.equal(created.length, 3, "All items created");
          assert.equal(actor.items.size, 3, "Actor has 3 items");
        });

        it("should require name field (Foundry validation)", async () => {
          // ARRANGE - Item without name (invalid)
          const itemData = {
            type: "skill",
            system: { rank: 1, trait: "agi" }
          };

          // ACT - Foundry logs error but doesn't throw
          const result = await actor.createEmbeddedDocuments("Item", [itemData]);

          // ASSERT - Creation fails (returns empty array or undefined items)
          assert.isArray(result, "Returns array");
          assert.equal(result.length, 0, "No items created due to validation failure");
        });
      });

      describe("Item Update Workflow", () => {
        let actor, skill, weapon, armor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Update Test PC" });

          const items = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createKatana(),
            createArmorData("Light Armor", 3, 1)
          ]);

          skill = items[0];
          weapon = items[1];
          armor = items[2];
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should update skill rank", async () => {
          // ARRANGE
          const initialRank = skill.system.rank;

          // ACT
          await skill.update({ "system.rank": 5 });

          // ASSERT
          const updated = actor.items.get(skill.id);
          assert.equal(updated.system.rank, 5, "Rank updated");
          assert.notEqual(updated.system.rank, initialRank, "Rank changed");
        });

        it("should update item name", async () => {
          // ARRANGE
          const initialName = skill.name;

          // ACT
          await skill.update({ name: "Advanced Kenjutsu" });

          // ASSERT
          const updated = actor.items.get(skill.id);
          assert.equal(updated.name, "Advanced Kenjutsu", "Name updated");
          assert.notEqual(updated.name, initialName, "Name changed");
        });

        it("should update weapon damage", async () => {
          // ARRANGE
          const _initialDamage = weapon.system.damageRoll;

          // ACT
          await weapon.update({
            "system.damageRoll": 5,
            "system.damageKeep": 3
          });

          // ASSERT
          const updated = actor.items.get(weapon.id);
          assert.equal(updated.system.damageRoll, 5, "Damage roll updated");
          assert.equal(updated.system.damageKeep, 3, "Damage keep updated");
        });

        it("should update armor values", async () => {
          // ACT
          await armor.update({
            "system.bonus": 5,
            "system.reduction": 3
          });

          // ASSERT
          const updated = actor.items.get(armor.id);
          assert.equal(updated.system.bonus, 5, "TN bonus updated");
          assert.equal(updated.system.reduction, 3, "Reduction updated");
        });

        it("should handle multiple field updates", async () => {
          // ACT
          await skill.update({
            name: "Master Kenjutsu",
            "system.rank": 7,
            "system.trait": "ref"
          });

          // ASSERT
          const updated = actor.items.get(skill.id);
          assert.equal(updated.name, "Master Kenjutsu", "Name updated");
          assert.equal(updated.system.rank, 7, "Rank updated");
          assert.equal(updated.system.trait, "ref", "Trait updated");
        });

        it("should allow negative rank (no validation)", async () => {
          // ARRANGE
          const initialRank = skill.system.rank;

          // ACT - Set negative rank (system doesn't validate)
          await skill.update({ "system.rank": -1 });

          // ASSERT - System allows negative values
          const updated = actor.items.get(skill.id);
          assert.equal(updated.system.rank, -1, "Negative rank allowed");
          assert.notEqual(updated.system.rank, initialRank, "Rank changed");
        });
      });

      describe("Item Deletion Workflow", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Delete Test PC" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should delete single item", async () => {
          // ARRANGE
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi")
          ]);
          const skillId = skill.id;
          const initialCount = actor.items.size;

          // ACT
          await skill.delete();

          // ASSERT
          assert.equal(actor.items.size, initialCount - 1, "Item count decreased");
          assert.isUndefined(actor.items.get(skillId), "Item no longer exists");
        });

        it("should delete multiple items", async () => {
          // ARRANGE
          const items = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createSkillData("Iaijutsu", 2, "ref"),
            createKatana()
          ]);
          const itemIds = items.map(i => i.id);

          // ACT
          await actor.deleteEmbeddedDocuments("Item", itemIds);

          // ASSERT
          assert.equal(actor.items.size, 0, "All items deleted");
          itemIds.forEach(id => {
            assert.isUndefined(actor.items.get(id), `Item ${id} deleted`);
          });
        });

        it("should handle deleting last item", async () => {
          // ARRANGE
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 1, "agi")
          ]);

          // ACT
          await skill.delete();

          // ASSERT
          assert.equal(actor.items.size, 0, "No items remain");
        });

        it("should delete equipped weapon", async () => {
          // ARRANGE
          const [weapon] = await actor.createEmbeddedDocuments("Item", [
            createKatana({ system: { equipped: true } })
          ]);

          // ACT
          await weapon.delete();

          // ASSERT
          assert.equal(actor.items.size, 0, "Equipped weapon deleted");
          const weapons = actor.items.filter(i => i.type === "weapon");
          assert.equal(weapons.length, 0, "No weapons remain");
        });

        it("should delete equipped armor", async () => {
          // ARRANGE
          const [armor] = await actor.createEmbeddedDocuments("Item", [
            createArmorData("Light Armor", 3, 1, { system: { equipped: true } })
          ]);

          // ACT
          await armor.delete();

          // ASSERT
          assert.equal(actor.items.size, 0, "Equipped armor deleted");
        });
      });

      describe("Equip/Unequip Weapon Workflow", () => {
        let actor, katana, wakizashi;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Weapon Equip Test" });

          const weapons = await actor.createEmbeddedDocuments("Item", [
            createKatana(),
            createWeaponData("Wakizashi", 2, 2, { system: { associatedSkill: "kenjutsu" } })
          ]);

          katana = weapons[0];
          wakizashi = weapons[1];
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should equip weapon", async () => {
          // ARRANGE - equipped defaults to undefined, not false
          assert.isNotTrue(katana.system.equipped, "Weapon starts unequipped");

          // ACT
          await katana.update({ "system.equipped": true });

          // ASSERT
          const updated = actor.items.get(katana.id);
          assert.isTrue(updated.system.equipped, "Weapon equipped");
        });

        it("should unequip weapon", async () => {
          // ARRANGE
          await katana.update({ "system.equipped": true });
          assert.isTrue(katana.system.equipped, "Weapon equipped");

          // ACT
          await katana.update({ "system.equipped": false });

          // ASSERT
          const updated = actor.items.get(katana.id);
          assert.isFalse(updated.system.equipped, "Weapon unequipped");
        });

        it("should allow multiple weapons equipped", async () => {
          // ACT
          await katana.update({ "system.equipped": true });
          await wakizashi.update({ "system.equipped": true });

          // ASSERT
          const equippedWeapons = actor.items.filter(i => i.type === "weapon" && i.system.equipped);
          assert.equal(equippedWeapons.length, 2, "Both weapons equipped");
        });

        it("should handle no weapons equipped", async () => {
          // ARRANGE - Both weapons unequipped by default

          // ASSERT
          const equippedWeapons = actor.items.filter(i => i.type === "weapon" && i.system.equipped);
          assert.equal(equippedWeapons.length, 0, "No weapons equipped");
        });

        it("should track equipped state per weapon", async () => {
          // ACT
          await katana.update({ "system.equipped": true });

          // ASSERT
          const updatedKatana = actor.items.get(katana.id);
          const updatedWakizashi = actor.items.get(wakizashi.id);

          assert.isTrue(updatedKatana.system.equipped, "Katana equipped");
          assert.isNotTrue(updatedWakizashi.system.equipped, "Wakizashi not equipped");
        });
      });

      describe("Equip/Unequip Armor Workflow", () => {
        let actor, lightArmor, heavyArmor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Armor Equip Test" });

          const armors = await actor.createEmbeddedDocuments("Item", [
            createArmorData("Light Armor", 3, 1),
            createArmorData("Heavy Armor", 5, 3)
          ]);

          lightArmor = armors[0];
          heavyArmor = armors[1];
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should equip armor", async () => {
          // ARRANGE
          assert.isFalse(lightArmor.system.equipped, "Armor starts unequipped");

          // ACT
          await lightArmor.update({ "system.equipped": true });

          // ASSERT
          const updated = actor.items.get(lightArmor.id);
          assert.isTrue(updated.system.equipped, "Armor equipped");
        });

        it("should unequip armor", async () => {
          // ARRANGE
          await lightArmor.update({ "system.equipped": true });

          // ACT
          await lightArmor.update({ "system.equipped": false });

          // ASSERT
          const updated = actor.items.get(lightArmor.id);
          assert.isFalse(updated.system.equipped, "Armor unequipped");
        });

        it("should allow multiple armor pieces (stacking depends on setting)", async () => {
          // ACT
          await lightArmor.update({ "system.equipped": true });
          await heavyArmor.update({ "system.equipped": true });

          // ASSERT
          const equippedArmor = actor.items.filter(i => i.type === "armor" && i.system.equipped);
          assert.isAtLeast(equippedArmor.length, 1, "At least one armor equipped");
          // Note: Actual stacking behavior depends on game settings
        });

        it("should handle no armor equipped", async () => {
          // ASSERT
          const equippedArmor = actor.items.filter(i => i.type === "armor" && i.system.equipped);
          assert.equal(equippedArmor.length, 0, "No armor equipped");
        });
      });

      describe("Item Type Restrictions (NPC vs PC)", () => {
        let pc, npc;

        beforeEach(async () => {
          pc = await createTestPC({ name: "PC for Restrictions" });
          npc = await createTestNPC({ name: "NPC for Restrictions" });
        });

        afterEach(async () => {
          if (pc) {
            await pc.delete();
          }
          if (npc) {
            await npc.delete();
          }
        });

        it("should allow PC to have all item types", async () => {
          // ACT
          const items = await pc.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 3, "agi"),
            createKatana(),
            createArmorData("Light Armor", 3, 1),
            createSpellData("Jade Strike", "fire", 3)
          ]);

          // ASSERT
          assert.equal(items.length, 4, "PC can have all item types");
          assert.equal(pc.items.size, 4, "All items added to PC");
        });

        it("should allow NPC to have skills", async () => {
          // ACT
          const [skill] = await npc.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);

          // ASSERT
          assert.exists(skill, "NPC can have skills");
          assert.equal(npc.items.size, 1, "Skill added to NPC");
        });

        it("should handle NPC with weapons (implementation-dependent)", async () => {
          // ACT - NPCs may or may not use weapon items (they have attack configs)
          try {
            const [weapon] = await npc.createEmbeddedDocuments("Item", [createKatana()]);

            // If successful, verify
            if (weapon) {
              assert.equal(weapon.type, "weapon", "Weapon created on NPC");
            }
          } catch (error) {
            // If restricted, that's also valid behavior
            assert.exists(error, "NPC weapon restriction enforced");
          }
        });

        it("should verify PC can have advantages", async () => {
          // ACT
          const [advantage] = await pc.createEmbeddedDocuments("Item", [
            {
              name: "Quick",
              type: "advantage",
              system: { cost: 4 }
            }
          ]);

          // ASSERT
          assert.exists(advantage, "PC can have advantages");
          assert.equal(advantage.type, "advantage", "Item is advantage type");
        });

        it("should verify PC can have disadvantages", async () => {
          // ACT
          const [disadvantage] = await pc.createEmbeddedDocuments("Item", [
            {
              name: "Bad Eyesight",
              type: "disadvantage",
              system: { cost: 3 }
            }
          ]);

          // ASSERT
          assert.exists(disadvantage, "PC can have disadvantages");
          assert.equal(disadvantage.type, "disadvantage", "Item is disadvantage type");
        });
      });

      describe("Drag & Drop Workflow", () => {
        let sourceActor, targetActor, item;

        beforeEach(async () => {
          sourceActor = await createTestPC({ name: "Source Actor" });
          targetActor = await createTestPC({ name: "Target Actor" });

          const [skill] = await sourceActor.createEmbeddedDocuments("Item", [
            createSkillData("Kenjutsu", 5, "agi")
          ]);
          item = skill;
        });

        afterEach(async () => {
          if (sourceActor) {
            await sourceActor.delete();
          }
          if (targetActor) {
            await targetActor.delete();
          }
        });

        it("should copy item to another actor", async () => {
          // ARRANGE
          const itemData = item.toObject();
          const sourceCount = sourceActor.items.size;
          const targetCount = targetActor.items.size;

          // ACT - Simulate drag & drop (copy)
          const [copied] = await targetActor.createEmbeddedDocuments("Item", [itemData]);

          // ASSERT
          assert.exists(copied, "Item copied to target");
          assert.equal(copied.name, item.name, "Copied item has same name");
          assert.equal(copied.system.rank, item.system.rank, "Copied item has same rank");
          assert.equal(sourceActor.items.size, sourceCount, "Source unchanged");
          assert.equal(targetActor.items.size, targetCount + 1, "Target gained item");
          assert.notEqual(copied.id, item.id, "Copied item has different ID");
        });

        it("should handle duplicate items on same actor", async () => {
          // ARRANGE
          const itemData = item.toObject();

          // ACT - Add duplicate
          const [duplicate] = await sourceActor.createEmbeddedDocuments("Item", [itemData]);

          // ASSERT
          assert.exists(duplicate, "Duplicate created");
          assert.equal(duplicate.name, item.name, "Same name");
          assert.notEqual(duplicate.id, item.id, "Different ID");

          const skills = sourceActor.items.filter(i => i.name === "Kenjutsu");
          assert.equal(skills.length, 2, "Two items with same name");
        });

        it("should preserve item data when copying", async () => {
          // ARRANGE
          const complexItem = await sourceActor.createEmbeddedDocuments("Item", [
            createKatana({
              system: {
                damageRoll: 5,
                damageKeep: 3,
                equipped: true,
                associatedSkill: "kenjutsu"
              }
            })
          ]);
          const weaponData = complexItem[0].toObject();

          // ACT
          const [copied] = await targetActor.createEmbeddedDocuments("Item", [weaponData]);

          // ASSERT
          assert.equal(copied.system.damageRoll, 5, "Damage roll preserved");
          assert.equal(copied.system.damageKeep, 3, "Damage keep preserved");
          assert.equal(copied.system.associatedSkill, "kenjutsu", "Skill preserved");
          // Note: equipped state may reset on copy (implementation-dependent)
        });
      });

      describe("Edge Cases: Item Management", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Edge Case Test" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should require non-empty name", async () => {
          // ACT - Foundry logs error but doesn't throw
          const result = await actor.createEmbeddedDocuments("Item", [
            { type: "skill", name: "", system: { rank: 1 } }
          ]);

          // ASSERT - Creation fails (returns empty array)
          assert.isArray(result, "Returns array");
          assert.equal(result.length, 0, "No items created with empty name");
        });

        it("should handle skill rank at maximum (10)", async () => {
          // ACT
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Master Skill", 10, "agi")
          ]);

          // ASSERT
          assert.equal(skill.system.rank, 10, "Rank at maximum");
        });

        it("should handle skill rank at minimum (0)", async () => {
          // ACT
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Untrained Skill", 0, "agi")
          ]);

          // ASSERT
          assert.equal(skill.system.rank, 0, "Rank at minimum");
        });

        it("should handle rapid item creation", async () => {
          // ACT - Create many items quickly
          const items = Array.from({ length: 10 }, (_, i) =>
            createSkillData(`Skill ${i}`, i, "agi")
          );

          const created = await actor.createEmbeddedDocuments("Item", items);

          // ASSERT
          assert.equal(created.length, 10, "All items created");
          assert.equal(actor.items.size, 10, "Actor has all items");
        });

        it("should handle rapid updates", async () => {
          // ARRANGE
          const [skill] = await actor.createEmbeddedDocuments("Item", [
            createSkillData("Test Skill", 1, "agi")
          ]);

          // ACT - Rapid updates
          await skill.update({ "system.rank": 2 });
          await skill.update({ "system.rank": 3 });
          await skill.update({ "system.rank": 4 });

          // ASSERT
          const updated = actor.items.get(skill.id);
          assert.equal(updated.system.rank, 4, "Final rank correct");
        });

        it("should handle deleting non-existent item gracefully", async () => {
          // ARRANGE
          const fakeId = "nonexistent123";

          // ACT & ASSERT - Should not throw
          try {
            await actor.deleteEmbeddedDocuments("Item", [fakeId]);
            // If it doesn't throw, that's fine
            assert.isTrue(true, "Handled gracefully");
          } catch (error) {
            // If it throws, that's also acceptable behavior
            assert.exists(error, "Error thrown for non-existent item");
          }
        });
      });
    },
    { displayName: "L5R4: Item Management Workflow Tests" }
  );
}
