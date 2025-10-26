/**
 * @fileoverview Trait and Family Bonus Integration Tests
 *
 * Tests the interaction between trait editing and family bonuses to prevent
 * regression of Issue #1 where traits changed unexpectedly during form submissions.
 *
 * **Bug Context (Issue #1):**
 * During playtesting, character stats changed without user input:
 * - Perception changed from 4 to 2 (skipping 3)
 * - Awareness changed from 4 to 3 (without clicking)
 * - Stats added unexpectedly with false XP expenditure display
 *
 * **Root Cause:**
 * PcTraitHandler.convertSubmitData() was called on every form submission even though
 * traits have no form inputs. This corrupted data by treating base trait values as
 * effective values and subtracting family bonuses again.
 *
 * **Test Coverage:**
 * - Traits remain stable during non-trait form submissions
 * - Family bonuses correctly applied without affecting base values
 * - Shift+Click trait adjustments work correctly with family bonuses
 * - Multiple form submission cycles don't corrupt trait data
 *
 * @see module/sheets/handlers/pc-trait-handler.js
 * @see module/sheets/pc-sheet.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register trait and family bonus integration tests
 * @param {Object} quench - Quench test framework API
 */
export function registerTraitFamilyBonusTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.traitFamilyBonus`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Trait Stability with Family Bonus", () => {
        let actor, sheet, familyItem;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Family Bonus Test",
            system: {
              traits: {
                sta: 2,
                wil: 2,
                str: 2, // Base trait: 2 (will be 3 with family bonus)
                per: 2,
                ref: 2,
                awa: 2,
                agi: 2,
                int: 2
              }
            }
          });

          // Embed family item on actor (required for Active Effects to transfer)
          const [embeddedFamily] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Hida Family",
              type: "family",
              system: {},
              effects: [
                {
                  name: "Hida Family Bonus",
                  transfer: true,
                  disabled: false,
                  changes: [
                    {
                      key: "system.traits.str",
                      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                      value: "1"
                    }
                  ]
                }
              ]
            }
          ]);

          familyItem = embeddedFamily;

          // Set flags for service to find family
          await actor.setFlag(SYS_ID, "familyItemUuid", familyItem.uuid);
          await actor.setFlag(SYS_ID, "familyName", "Hida");

          // Trigger derived data preparation to apply Active Effects
          actor.prepareDerivedData();

          sheet = actor.sheet;
        });

        afterEach(async () => {
          if (sheet?.rendered) {
            await sheet.close();
          }
          if (actor) {
            await actor.delete();
          }
          // familyItem is embedded, deleted with actor
        });

        it("should apply family bonus to effective trait value", () => {
          // Base trait value (stored)
          const baseStr = actor._source.system.traits.str;
          // Effective trait value (base + family bonus)
          const effStr = actor.system.traits.str;

          assert.equal(baseStr, 2, "Base Strength is 2 (stored value)");
          assert.equal(effStr, 3, "Effective Strength is 3 (includes +1 family bonus)");
        });

        it("should NOT change traits when editing wealth field", async () => {
          // Verify initial state
          const initialBase = actor._source.system.traits.str;
          const initialEff = actor.system.traits.str;

          assert.equal(initialBase, 2, "Initial base Strength is 2");
          assert.equal(initialEff, 3, "Initial effective Strength is 3");

          // Update wealth (simulates form submission of non-trait field)
          await actor.update({ "system.wealth.koku": 100 });

          // Wait for any re-renders or side effects
          await new Promise(resolve => setTimeout(resolve, 200));

          // CRITICAL: Traits should NOT change when editing unrelated fields
          const finalBase = actor._source.system.traits.str;
          const finalEff = actor.system.traits.str;

          assert.equal(finalBase, 2, "Base Strength still 2 (NOT corrupted)");
          assert.equal(finalEff, 3, "Effective Strength still 3 (NOT lost a point)");
        });

        it("should NOT change traits when editing notes field", async () => {
          const initialBase = actor._source.system.traits.str;

          await actor.update({ "system.notes": "Test notes" });
          await new Promise(resolve => setTimeout(resolve, 200));

          const finalBase = actor._source.system.traits.str;

          assert.equal(finalBase, initialBase, "Base trait unchanged after notes edit");
        });

        it("should NOT change traits when editing wounds field", async () => {
          const initialBase = actor._source.system.traits.str;

          await actor.update({ "system.suffered": 10 });
          await new Promise(resolve => setTimeout(resolve, 200));

          const finalBase = actor._source.system.traits.str;

          assert.equal(finalBase, initialBase, "Base trait unchanged after wounds edit");
        });

        it("should NOT corrupt traits after multiple form submissions", async () => {
          // Verify initial state
          assert.equal(actor._source.system.traits.str, 2, "Initial base is 2");

          // Simulate multiple form submissions
          await actor.update({ "system.wealth.koku": 50 });
          await new Promise(resolve => setTimeout(resolve, 100));

          await actor.update({ "system.notes": "Note 1" });
          await new Promise(resolve => setTimeout(resolve, 100));

          await actor.update({ "system.wealth.bu": 10 });
          await new Promise(resolve => setTimeout(resolve, 100));

          await actor.update({ "system.notes": "Note 2" });
          await new Promise(resolve => setTimeout(resolve, 100));

          // After multiple submissions, traits should remain stable
          const finalBase = actor._source.system.traits.str;
          const finalEff = actor.system.traits.str;

          assert.equal(finalBase, 2, "Base Strength still 2 after multiple updates");
          assert.equal(finalEff, 3, "Effective Strength still 3 after multiple updates");
        });
      });

      describe("Trait Adjustment with Family Bonus", () => {
        let actor, familyItem;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Trait Adjustment Test",
            system: {
              traits: {
                sta: 2,
                wil: 2,
                str: 2,
                per: 2,
                ref: 2,
                awa: 2, // Base: 2, Effective: 3 with family bonus
                agi: 2,
                int: 2
              }
            }
          });

          // Embed family item on actor (required for Active Effects to transfer)
          const [embeddedFamily] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Yasuki Family",
              type: "family",
              system: {},
              effects: [
                {
                  name: "Yasuki Family Bonus",
                  transfer: true,
                  disabled: false,
                  changes: [
                    {
                      key: "system.traits.awa",
                      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                      value: "1"
                    }
                  ]
                }
              ]
            }
          ]);

          familyItem = embeddedFamily;

          await actor.setFlag(SYS_ID, "familyItemUuid", familyItem.uuid);
          await actor.setFlag(SYS_ID, "familyName", "Yasuki");
          actor.prepareDerivedData();
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
          // familyItem is embedded, deleted with actor
        });

        it("should correctly increase trait with family bonus", async () => {
          // Initial: base 2 + family 1 = effective 3
          assert.equal(actor._source.system.traits.awa, 2, "Initial base Awareness is 2");
          assert.equal(actor.system.traits.awa, 3, "Initial effective Awareness is 3");

          // Increase base trait to 3 (simulates Shift+Click increase)
          await actor.update({ "system.traits.awa": 3 });
          await new Promise(resolve => setTimeout(resolve, 200));

          // Should be: base 3 + family 1 = effective 4
          assert.equal(actor._source.system.traits.awa, 3, "Base Awareness increased to 3");
          assert.equal(actor.system.traits.awa, 4, "Effective Awareness is 4 (3 base + 1 family)");
        });

        it("should correctly decrease trait with family bonus", async () => {
          // Start at base 3 + family 1 = effective 4
          await actor.update({ "system.traits.awa": 3 });
          await new Promise(resolve => setTimeout(resolve, 200));

          assert.equal(actor._source.system.traits.awa, 3, "Base Awareness is 3");

          // Decrease base trait to 2 (simulates Shift+Click decrease)
          await actor.update({ "system.traits.awa": 2 });
          await new Promise(resolve => setTimeout(resolve, 200));

          // Should be: base 2 + family 1 = effective 3
          assert.equal(actor._source.system.traits.awa, 2, "Base Awareness decreased to 2");
          assert.equal(actor.system.traits.awa, 3, "Effective Awareness is 3 (2 base + 1 family)");
        });
      });

      describe("Multiple Family Bonus Traits", () => {
        let actor, familyItem;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Multi Trait Test",
            system: {
              traits: {
                sta: 2,
                wil: 2,
                str: 2,
                per: 4, // No bonus
                ref: 2,
                awa: 2,
                agi: 2, // Has family bonus
                int: 2
              }
            }
          });

          // Embed family item on actor (required for Active Effects to transfer)
          const [embeddedFamily] = await actor.createEmbeddedDocuments("Item", [
            {
              name: "Test Family",
              type: "family",
              system: {},
              effects: [
                {
                  name: "Test Family Bonus",
                  transfer: true,
                  disabled: false,
                  changes: [
                    {
                      key: "system.traits.agi",
                      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                      value: "1"
                    }
                  ]
                }
              ]
            }
          ]);

          familyItem = embeddedFamily;

          await actor.setFlag(SYS_ID, "familyItemUuid", familyItem.uuid);
          actor.prepareDerivedData();
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
          // familyItem is embedded, deleted with actor
        });

        it("should only apply bonus to designated trait", () => {
          // Agility has bonus
          assert.equal(actor._source.system.traits.agi, 2, "Base Agility is 2");
          assert.equal(actor.system.traits.agi, 3, "Effective Agility is 3 (with bonus)");

          // Perception does not have bonus
          assert.equal(actor._source.system.traits.per, 4, "Base Perception is 4");
          assert.equal(actor.system.traits.per, 4, "Effective Perception is 4 (no bonus)");
        });

        it("should preserve non-bonused traits during form updates", async () => {
          const initialPerBase = actor._source.system.traits.per;
          const initialPerEff = actor.system.traits.per;

          await actor.update({ "system.wealth.koku": 200 });
          await new Promise(resolve => setTimeout(resolve, 200));

          // Non-bonused trait should remain completely stable
          assert.equal(
            actor._source.system.traits.per,
            initialPerBase,
            "Non-bonused base unchanged"
          );
          assert.equal(actor.system.traits.per, initialPerEff, "Non-bonused effective unchanged");
        });
      });

      describe("Edge Cases", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Edge Case Test",
            system: {
              traits: {
                sta: 2,
                wil: 2,
                str: 2,
                per: 2,
                ref: 2,
                awa: 2,
                agi: 2,
                int: 2
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should handle actors without family bonus", async () => {
          // No family bonus - all traits should remain at base values
          const initialBase = actor._source.system.traits.str;

          await actor.update({ "system.wealth.koku": 50 });
          await new Promise(resolve => setTimeout(resolve, 200));

          const finalBase = actor._source.system.traits.str;

          assert.equal(finalBase, initialBase, "Traits stable without family bonus");
        });

        it("should handle updating multiple fields simultaneously", async () => {
          const initialBase = actor._source.system.traits.str;

          await actor.update({
            "system.wealth.koku": 100,
            "system.wealth.bu": 50,
            "system.notes": "Test",
            "system.suffered": 5
          });

          await new Promise(resolve => setTimeout(resolve, 200));

          const finalBase = actor._source.system.traits.str;

          assert.equal(finalBase, initialBase, "Traits stable with multi-field update");
        });
      });
    },
    { displayName: "L5R4: Trait & Family Bonus Integration Tests" }
  );
}
