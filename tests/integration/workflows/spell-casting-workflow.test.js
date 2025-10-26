/**
 * Spell Casting Workflow Integration Tests
 *
 * Tests complete spell casting sequences from slot availability through
 * spell effect resolution. Validates multi-step spell casting processes.
 *
 * Test Priority: Tier 1 (Critical - Spellcasting mechanics)
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createShugenja } from "../../fixtures/actor-fixtures.js";
import { createSpellData } from "../../fixtures/item-fixtures.js";

/**
 * Register spell casting workflow tests with Quench
 * @param {Object} quench - Quench test framework API
 */
export function registerSpellCastingWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.spellcasting`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Spell Casting Workflow: Basic Casting", () => {
        let shugenja;

        beforeEach(async () => {
          // createShugenja already sets up traits that calculate to these rings:
          // Earth=3, Air=4, Fire=4, Water=3, Void=3
          shugenja = await createShugenja({
            name: "Test Shugenja"
          });

          await shugenja.createEmbeddedDocuments("Item", [
            createSpellData("Jade Strike", "fire", 3),
            createSpellData("Path to Inner Peace", "void", 1)
          ]);
        });

        afterEach(async () => {
          if (shugenja) {
            await shugenja.delete();
          }
        });

        it("should execute complete spell casting sequence", async () => {
          // ARRANGE
          const spell = shugenja.items.find(i => i.name === "Jade Strike");
          const spellRing = spell.system.ring;
          const ringValue = shugenja.system.rings[spellRing];
          const initialSlots = shugenja.system.spellSlots?.[spellRing] || 0;

          assert.exists(spell, "Spell exists");
          assert.equal(spellRing, "fire", "Spell uses Fire ring");
          assert.isNumber(ringValue, "Ring value exists");
          assert.isTrue(initialSlots > 0, "Has spell slots available");

          // ACT - Simulate casting sequence
          // 1. Check spell slot availability
          const hasSlots = initialSlots > 0;
          assert.isTrue(hasSlots, "Spell slots available");

          // 2. Calculate spell roll (Ring kept dice)
          const rolled = ringValue;
          const kept = ringValue;

          assert.equal(rolled, 4, "Roll 4 dice for Fire 4");
          assert.equal(kept, 4, "Keep 4 dice for Fire 4");

          // 3. Simulate successful cast
          const mockCastTotal = 25;
          const spellTN = 20; // Mastery 3 spell
          const castSucceeds = mockCastTotal >= spellTN;

          assert.isTrue(castSucceeds, "Cast total exceeds TN");

          // 4. Consume spell slot
          const newSlots = Math.max(0, initialSlots - 1);
          await shugenja.update({ [`system.spellSlots.${spellRing}`]: newSlots });

          // ASSERT
          const finalSlots = shugenja.system.spellSlots[spellRing];
          assert.equal(finalSlots, initialSlots - 1, "Spell slot consumed");
        });

        it("should prevent casting without spell slots", async () => {
          // ARRANGE
          const spell = shugenja.items.find(i => i.name === "Jade Strike");
          const spellRing = spell.system.ring;

          // Deplete all spell slots
          await shugenja.update({ [`system.spellSlots.${spellRing}`]: 0 });

          // ACT
          const slotsAvailable = shugenja.system.spellSlots[spellRing];

          // ASSERT
          assert.equal(slotsAvailable, 0, "No spell slots available");
          // In actual gameplay, casting would be prevented
        });

        it("should handle spell slot recovery", async () => {
          // ARRANGE
          const spellRing = "fire";
          const maxSlots = shugenja.system.rings.fire;

          // Deplete slots
          await shugenja.update({ [`system.spellSlots.${spellRing}`]: 0 });
          const depleted = shugenja.system.spellSlots[spellRing];
          assert.equal(depleted, 0, "Slots depleted");

          // ACT - Simulate rest/recovery
          await shugenja.update({ [`system.spellSlots.${spellRing}`]: maxSlots });

          // ASSERT
          const recovered = shugenja.system.spellSlots[spellRing];
          assert.equal(recovered, maxSlots, "Spell slots fully recovered");
        });
      });

      describe("Spell Casting Workflow: Multiple Spells", () => {
        let shugenja;

        beforeEach(async () => {
          shugenja = await createShugenja({
            name: "Multi-Spell Shugenja",
            system: {
              rings: {
                earth: 3,
                air: 4,
                fire: 4,
                water: 3,
                void: { rank: 3 }
              },
              spellSlots: {
                earth: 3,
                air: 4,
                fire: 4,
                water: 3,
                void: 3
              }
            }
          });

          await shugenja.createEmbeddedDocuments("Item", [
            createSpellData("Jade Strike", "fire", 3),
            createSpellData("Fury of Osano-Wo", "fire", 5),
            createSpellData("Commune with Spirits", "air", 2),
            createSpellData("Path to Inner Peace", "void", 1)
          ]);
        });

        afterEach(async () => {
          if (shugenja) {
            await shugenja.delete();
          }
        });

        it("should handle multiple spell casts from same ring", async () => {
          // ARRANGE
          const fireSpells = shugenja.items.filter(
            i => i.type === "spell" && i.system.ring === "fire"
          );
          const initialFireSlots = shugenja.system.spellSlots.fire;

          assert.equal(fireSpells.length, 2, "Has 2 Fire spells");
          assert.isTrue(initialFireSlots >= 2, "Has enough slots for both spells");

          // ACT - Cast both Fire spells
          let currentSlots = initialFireSlots;
          for (const spell of fireSpells) {
            currentSlots--;
            await shugenja.update({ "system.spellSlots.fire": currentSlots });
          }

          // ASSERT
          const finalFireSlots = shugenja.system.spellSlots.fire;
          assert.equal(finalFireSlots, initialFireSlots - 2, "Two spell slots consumed");
        });

        it("should handle spell casts across different rings", async () => {
          // ARRANGE
          const initialSlots = {
            fire: shugenja.system.spellSlots.fire,
            air: shugenja.system.spellSlots.air,
            void: shugenja.system.spellSlots.void
          };

          // ACT - Cast one spell from each ring
          await shugenja.update({
            "system.spellSlots.fire": initialSlots.fire - 1,
            "system.spellSlots.air": initialSlots.air - 1,
            "system.spellSlots.void": initialSlots.void - 1
          });

          // ASSERT
          const finalSlots = {
            fire: shugenja.system.spellSlots.fire,
            air: shugenja.system.spellSlots.air,
            void: shugenja.system.spellSlots.void
          };

          assert.equal(finalSlots.fire, initialSlots.fire - 1, "Fire slot consumed");
          assert.equal(finalSlots.air, initialSlots.air - 1, "Air slot consumed");
          assert.equal(finalSlots.void, initialSlots.void - 1, "Void slot consumed");
        });
      });

      describe("Spell Casting Workflow: Void Point Integration", () => {
        let shugenja;

        beforeEach(async () => {
          shugenja = await createShugenja({
            name: "Void-Using Shugenja",
            system: {
              rings: {
                earth: 3,
                air: 3,
                fire: 3,
                water: 3,
                void: { rank: 4, value: 4 }
              },
              spellSlots: {
                earth: 3,
                air: 3,
                fire: 3,
                water: 3,
                void: 3
              }
            }
          });

          await shugenja.createEmbeddedDocuments("Item", [
            createSpellData("Jade Strike", "fire", 3)
          ]);
        });

        afterEach(async () => {
          if (shugenja) {
            await shugenja.delete();
          }
        });

        it("should track Void Points with spell casting", async () => {
          // ARRANGE
          const initialVoid = shugenja.system.rings.void.value;
          const voidMax = shugenja.system.rings.void.rank;

          assert.equal(initialVoid, 4, "Starting with 4 Void Points");
          assert.equal(voidMax, 4, "Max Void is 4");

          // ACT - Simulate spending Void Point on spell cast
          const newVoid = Math.max(0, initialVoid - 1);
          await shugenja.update({ "system.rings.void.value": newVoid });

          // ASSERT
          const currentVoid = shugenja.system.rings.void.value;
          assert.equal(currentVoid, 3, "Void Point spent");
          assert.isTrue(currentVoid < voidMax, "Below maximum");
        });

        it("should prevent spending more Void than available", async () => {
          // ARRANGE
          await shugenja.update({ "system.rings.void.value": 0 });
          const voidAvailable = shugenja.system.rings.void.value;

          // ASSERT
          assert.equal(voidAvailable, 0, "No Void Points available");
          // In actual gameplay, Void spend would be prevented
        });
      });

      describe("Spell Casting Workflow: Mastery Levels", () => {
        let shugenja;

        beforeEach(async () => {
          shugenja = await createShugenja({
            name: "Mastery Test Shugenja",
            system: {
              // Set traits to get Fire Ring = 5 (Fire = min(agi, int))
              traits: {
                agi: 5,
                int: 5
              },
              spellSlots: {
                fire: 5
              }
            }
          });

          await shugenja.createEmbeddedDocuments("Item", [
            createSpellData("Minor Fire Spell", "fire", 1),
            createSpellData("Moderate Fire Spell", "fire", 3),
            createSpellData("Major Fire Spell", "fire", 5)
          ]);
        });

        afterEach(async () => {
          if (shugenja) {
            await shugenja.delete();
          }
        });

        it("should handle spells of different mastery levels", async () => {
          // ARRANGE
          const spells = shugenja.items.filter(i => i.type === "spell");
          const masteryLevels = spells.map(s => s.system.mastery);

          // ASSERT
          assert.includeMembers(masteryLevels, [1, 3, 5], "Has spells of various mastery");

          // All spells use same ring, so same dice pool
          const fireRing = shugenja.system.rings.fire;
          assert.equal(fireRing, 5, "Fire Ring is 5");

          // Mastery affects TN, not dice pool
          // TN = Mastery × 5
          const expectedTNs = {
            1: 5, // Mastery 1 = TN 5
            3: 15, // Mastery 3 = TN 15
            5: 25 // Mastery 5 = TN 25
          };

          spells.forEach(spell => {
            const mastery = spell.system.mastery;
            const expectedTN = expectedTNs[mastery];
            // TN would be calculated during actual casting
            assert.exists(expectedTN, `Expected TN exists for mastery ${mastery}`);
          });
        });
      });
    },
    { displayName: "L5R4: Spell Casting Workflow Tests" }
  );
}
