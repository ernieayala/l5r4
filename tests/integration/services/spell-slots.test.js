/**
 * Spell Slots Resource Management Integration Tests
 *
 * Tests L5R4 spell slot mechanics per Phase 4 requirements:
 * - Casting with no slots
 * - Fallback to Void slot
 * - Slot consumption before roll completes
 * - Slot count overflow (99)
 *
 * CRITICAL: These tests FIND BUGS, not validate working code.
 * Each test creates a specific failure condition to verify handling.
 *
 * @see module/services/dice/resources/spell-slot-manager.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  validateSpellSlot,
  spendElementalSlot,
  spendVoidSlot
} from "../../../module/services/dice/resources/spell-slot-manager.js";

/**
 * Register Spell Slots resource management tests
 * @param {Object} quench - Quench test framework
 */
export function registerSpellSlotsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.resources.spell-slots`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("4.2.1 Casting with No Slots", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Empty Slots Test",
            system: {
              spellSlots: {
                water: 0,
                air: 0,
                fire: 0,
                earth: 0,
                void: 0
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should fail validation when Fire slots are 0", () => {
          // ARRANGE: Actor with 0 Fire slots
          const validation = validateSpellSlot(actor, "fire", false);

          // ACT & ASSERT: Validation must fail
          assert.isFalse(validation.valid, "Validation fails with 0 slots");
          assert.equal(validation.current, 0, "Current slots is 0");
          assert.exists(validation.message, "Error message provided");
          assert.exists(validation.path, "Property path provided");
        });

        it("should prevent spending when Fire slots empty", async () => {
          // ARRANGE: 0 Fire slots
          assert.equal(actor.system.spellSlots.fire, 0);

          // ACT: Attempt to spend Fire slot
          const result = await spendElementalSlot(actor, "fire");

          // ASSERT: Spending fails
          assert.isFalse(result.success, "Spending fails");
          assert.equal(result.label, "", "No label returned");
          assert.exists(result.message, "Error message provided");

          // VERIFY: Slots unchanged
          assert.equal(actor.system.spellSlots.fire, 0, "Slots remain at 0");
        });

        it("should not go negative when attempting to spend from 0", async () => {
          // ARRANGE: 0 Water slots
          assert.equal(actor.system.spellSlots.water, 0);

          // ACT: Multiple spend attempts
          await spendElementalSlot(actor, "water");
          await spendElementalSlot(actor, "water");
          await spendElementalSlot(actor, "water");

          // ASSERT: Slots never go negative
          const finalValue = actor.system.spellSlots.water;
          assert.isAtLeast(finalValue, 0, "Slots never go negative");
        });

        it("should handle null slot value gracefully", async () => {
          // ARRANGE: Corrupt data - null Air slots
          await actor.update({ "system.spellSlots.air": null });

          // ACT: Attempt to spend
          const result = await spendElementalSlot(actor, "air");

          // ASSERT: Fails gracefully without crash
          assert.isFalse(result.success, "Spending fails gracefully");
          assert.exists(result.message, "Error message provided");
        });

        it("should handle undefined slot structure gracefully", async () => {
          // ARRANGE: Corrupt data - missing spellSlots structure
          await actor.update({ "system.spellSlots": null });

          // ACT: Attempt to validate
          const validation = validateSpellSlot(actor, "earth", false);

          // ASSERT: Fails gracefully without crash
          assert.isFalse(validation.valid, "Validation fails gracefully");
          assert.equal(validation.current, 0, "Defaults to 0");
        });

        it("should validate all elements when empty", () => {
          // ACT & ASSERT: All elements fail validation
          const elements = ["water", "air", "fire", "earth"];

          for (const element of elements) {
            const validation = validateSpellSlot(actor, element, false);
            assert.isFalse(validation.valid, `${element} validation fails`);
            assert.equal(validation.current, 0, `${element} slots are 0`);
          }
        });
      });

      describe("4.2.2 Fallback to Void Slot", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Void Slot Test",
            system: {
              spellSlots: {
                water: 0,
                air: 0,
                fire: 0,
                earth: 0,
                void: 2 // Has Void slots
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should validate Void slot when elemental slot empty", () => {
          // ARRANGE: Fire slots empty, Void slots available
          assert.equal(actor.system.spellSlots.fire, 0);
          assert.equal(actor.system.spellSlots.void, 2);

          // ACT: Validate Void slot
          const validation = validateSpellSlot(actor, "void", true);

          // ASSERT: Void slot validates
          assert.isTrue(validation.valid, "Void slot validates");
          assert.equal(validation.current, 2, "2 Void slots available");
          assert.equal(validation.path, "system.spellSlots.void", "Correct path");
        });

        it("should spend Void slot successfully", async () => {
          // ARRANGE: 2 Void slots
          assert.equal(actor.system.spellSlots.void, 2);

          // ACT: Spend Void slot
          const result = await spendVoidSlot(actor);

          // ASSERT: Spending succeeds
          assert.isTrue(result.success, "Spending succeeds");
          assert.include(result.label, "Void", "Label includes 'Void'");
          assert.isNull(result.message, "No error message");

          // VERIFY: Void slots decremented
          assert.equal(actor.system.spellSlots.void, 1, "Void slots decremented to 1");
        });

        it("should fail when both elemental and Void slots empty", async () => {
          // ARRANGE: Deplete Void slots
          await actor.update({ "system.spellSlots.void": 0 });

          // ACT: Attempt to spend Void slot
          const result = await spendVoidSlot(actor);

          // ASSERT: Spending fails
          assert.isFalse(result.success, "Spending fails");
          assert.exists(result.message, "Error message provided");
        });

        it("should allow multiple Void slot spends", async () => {
          // ARRANGE: 2 Void slots
          assert.equal(actor.system.spellSlots.void, 2);

          // ACT: Spend both
          const result1 = await spendVoidSlot(actor);
          const result2 = await spendVoidSlot(actor);

          // ASSERT: Both succeed
          assert.isTrue(result1.success, "First spend succeeds");
          assert.isTrue(result2.success, "Second spend succeeds");
          assert.equal(actor.system.spellSlots.void, 0, "Void slots depleted");
        });

        it("should fail third spend when only 2 Void slots", async () => {
          // ARRANGE: 2 Void slots
          assert.equal(actor.system.spellSlots.void, 2);

          // ACT: Attempt 3 spends
          await spendVoidSlot(actor);
          await spendVoidSlot(actor);
          const result3 = await spendVoidSlot(actor);

          // ASSERT: Third fails
          assert.isFalse(result3.success, "Third spend fails");
          assert.equal(actor.system.spellSlots.void, 0, "Void slots at 0");
        });

        it("should differentiate Void slot label from elemental", async () => {
          // ARRANGE: Set up elemental slots
          await actor.update({ "system.spellSlots.fire": 1 });

          // ACT: Spend elemental vs Void
          const elementalResult = await spendElementalSlot(actor, "fire");
          const voidResult = await spendVoidSlot(actor);

          // ASSERT: Labels differ
          assert.isTrue(elementalResult.success, "Elemental spend succeeds");
          assert.isTrue(voidResult.success, "Void spend succeeds");
          assert.notEqual(elementalResult.label, voidResult.label, "Labels differ");
          assert.include(voidResult.label, "Void", "Void label includes 'Void'");
        });
      });

      describe("4.2.3 Slot Consumption Before Roll Completes", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Race Condition Test",
            system: {
              spellSlots: {
                water: 1,
                air: 1,
                fire: 1,
                earth: 1,
                void: 1
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should prevent double-spend with Promise.all", async () => {
          // ARRANGE: Actor with 1 Fire slot
          assert.equal(actor.system.spellSlots.fire, 1);

          // ACT: Attempt simultaneous spending (race condition)
          const [result1, result2] = await Promise.all([
            spendElementalSlot(actor, "fire"),
            spendElementalSlot(actor, "fire")
          ]);

          // ASSERT: Only one succeeds
          const successCount = [result1.success, result2.success].filter(Boolean).length;
          assert.equal(successCount, 1, "Only one spend succeeds");

          // VERIFY: Slots are 0, not negative
          const finalValue = actor.system.spellSlots.fire;
          assert.equal(finalValue, 0, "Slots are 0 (not negative)");
        });

        it("should handle triple simultaneous spend attempts", async () => {
          // ARRANGE: 1 Water slot
          assert.equal(actor.system.spellSlots.water, 1);

          // ACT: Three simultaneous attempts
          const [r1, r2, r3] = await Promise.all([
            spendElementalSlot(actor, "water"),
            spendElementalSlot(actor, "water"),
            spendElementalSlot(actor, "water")
          ]);

          // ASSERT: Only one succeeds
          const successCount = [r1.success, r2.success, r3.success].filter(Boolean).length;
          assert.isAtMost(successCount, 1, "At most one spend succeeds");

          // VERIFY: Slots never negative
          const finalValue = actor.system.spellSlots.water;
          assert.isAtLeast(finalValue, 0, "Slots never negative");
        });

        it("should handle Void slot race condition", async () => {
          // ARRANGE: 1 Void slot
          assert.equal(actor.system.spellSlots.void, 1);

          // ACT: Simultaneous Void slot spends
          const [result1, result2] = await Promise.all([
            spendVoidSlot(actor),
            spendVoidSlot(actor)
          ]);

          // ASSERT: Only one succeeds
          const successCount = [result1.success, result2.success].filter(Boolean).length;
          assert.equal(successCount, 1, "Only one Void spend succeeds");

          // VERIFY: Void slots at 0
          assert.equal(actor.system.spellSlots.void, 0, "Void slots at 0");
        });

        it("should handle mixed element race conditions", async () => {
          // ARRANGE: 1 slot each
          assert.equal(actor.system.spellSlots.fire, 1);
          assert.equal(actor.system.spellSlots.water, 1);

          // ACT: Simultaneous different element spends
          const [fireResult, waterResult] = await Promise.all([
            spendElementalSlot(actor, "fire"),
            spendElementalSlot(actor, "water")
          ]);

          // ASSERT: Both succeed (different resources)
          assert.isTrue(fireResult.success, "Fire spend succeeds");
          assert.isTrue(waterResult.success, "Water spend succeeds");
          assert.equal(actor.system.spellSlots.fire, 0, "Fire slots depleted");
          assert.equal(actor.system.spellSlots.water, 0, "Water slots depleted");
        });

        it("should maintain data integrity after race condition", async () => {
          // ARRANGE: 1 Air slot
          assert.equal(actor.system.spellSlots.air, 1);

          // ACT: Race condition
          await Promise.all([spendElementalSlot(actor, "air"), spendElementalSlot(actor, "air")]);

          // ASSERT: Actor data structure intact
          assert.exists(actor.system.spellSlots, "Spell slots structure intact");
          assert.isNumber(actor.system.spellSlots.air, "Air value is number");
          assert.isAtLeast(actor.system.spellSlots.air, 0, "Air value valid");
        });
      });

      describe("4.2.4 Slot Count Overflow (99)", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Overflow Test",
            system: {
              spellSlots: {
                water: 99,
                air: 99,
                fire: 99,
                earth: 99,
                void: 99
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should validate slots at 99", () => {
          // ACT: Validate Fire slots at 99
          const validation = validateSpellSlot(actor, "fire", false);

          // ASSERT: Validates successfully
          assert.isTrue(validation.valid, "99 slots validates");
          assert.equal(validation.current, 99, "Current is 99");
        });

        it("should spend from 99 slots successfully", async () => {
          // ARRANGE: 99 Fire slots
          assert.equal(actor.system.spellSlots.fire, 99);

          // ACT: Spend one slot
          const result = await spendElementalSlot(actor, "fire");

          // ASSERT: Spending succeeds
          assert.isTrue(result.success, "Spending succeeds");
          assert.equal(actor.system.spellSlots.fire, 98, "Slots decremented to 98");
        });

        it("should handle very large slot counts", async () => {
          // ARRANGE: Set to 999
          await actor.update({ "system.spellSlots.water": 999 });

          // ACT: Validate and spend
          const validation = validateSpellSlot(actor, "water", false);
          const result = await spendElementalSlot(actor, "water");

          // ASSERT: Handles large numbers
          assert.isTrue(validation.valid, "Validates large number");
          assert.isTrue(result.success, "Spends from large number");
          assert.equal(actor.system.spellSlots.water, 998, "Decremented correctly");
        });

        it("should handle Number.MAX_SAFE_INTEGER", async () => {
          // ARRANGE: Set to max safe integer
          await actor.update({ "system.spellSlots.air": Number.MAX_SAFE_INTEGER });

          // ACT: Validate
          const validation = validateSpellSlot(actor, "air", false);

          // ASSERT: Validates (or handles gracefully)
          assert.exists(validation.valid, "Handles MAX_SAFE_INTEGER");
        });

        it("should handle overflow edge case", async () => {
          // ARRANGE: Set to max + 1 (overflow)
          const overflow = Number.MAX_SAFE_INTEGER + 1;
          await actor.update({ "system.spellSlots.earth": overflow });

          // ACT: Spend
          const result = await spendElementalSlot(actor, "earth");

          // ASSERT: Handles overflow gracefully
          assert.exists(result.success, "Handles overflow");
        });

        it("should handle Infinity slots", async () => {
          // ARRANGE: Set to Infinity
          await actor.update({ "system.spellSlots.void": Infinity });

          // ACT: Validate and spend
          const validation = validateSpellSlot(actor, "void", true);
          const result = await spendVoidSlot(actor);

          // ASSERT: Handles Infinity
          assert.exists(validation.valid, "Handles Infinity validation");
          assert.exists(result.success, "Handles Infinity spending");
        });
      });

      describe("Edge Cases: Spell Slot Validation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Validation Edge Cases",
            system: {
              spellSlots: {
                water: 2,
                air: 2,
                fire: 2,
                earth: 2,
                void: 2
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle invalid ring key", () => {
          // ACT: Validate invalid ring
          const validation = validateSpellSlot(actor, "invalid", false);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "Invalid ring fails");
          assert.exists(validation.message, "Error message provided");
        });

        it("should handle empty string ring key", () => {
          // ACT: Validate empty string
          const validation = validateSpellSlot(actor, "", false);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "Empty string fails");
        });

        it("should handle null ring key", () => {
          // ACT: Validate null ring
          const validation = validateSpellSlot(actor, null, false);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "Null ring fails");
        });

        it("should handle uppercase ring key", () => {
          // ACT: Validate uppercase (should normalize)
          const validation = validateSpellSlot(actor, "FIRE", false);

          // ASSERT: Normalizes and validates
          assert.isTrue(validation.valid, "Normalizes uppercase");
          assert.equal(validation.current, 2, "Finds correct slots");
        });

        it("should handle mixed case ring key", () => {
          // ACT: Validate mixed case
          const validation = validateSpellSlot(actor, "WaTeR", false);

          // ASSERT: Normalizes and validates
          assert.isTrue(validation.valid, "Normalizes mixed case");
          assert.equal(validation.current, 2, "Finds correct slots");
        });

        it("should handle string slot value", async () => {
          // ARRANGE: String value (form input)
          await actor.update({ "system.spellSlots.fire": "3" });

          // ACT: Validate
          const validation = validateSpellSlot(actor, "fire", false);

          // ASSERT: Coerces to number
          assert.isTrue(validation.valid, "Validates string as number");
          assert.equal(validation.current, 3, "Coerced to 3");
        });

        it("should handle negative slot value", async () => {
          // ARRANGE: Negative value (corrupt data)
          await actor.update({ "system.spellSlots.water": -1 });

          // ACT: Validate
          const validation = validateSpellSlot(actor, "water", false);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "Negative value fails");
        });

        it("should handle NaN slot value", async () => {
          // ARRANGE: NaN value
          await actor.update({ "system.spellSlots.air": NaN });

          // ACT: Validate
          const validation = validateSpellSlot(actor, "air", false);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "NaN fails validation");
          assert.equal(validation.current, 0, "Defaults to 0");
        });

        it("should handle null actor", () => {
          // ACT: Validate null actor
          const validation = validateSpellSlot(null, "fire", false);

          // ASSERT: Fails with message
          assert.isFalse(validation.valid, "Null actor fails");
          assert.equal(validation.current, 0, "Current is 0");
          assert.exists(validation.message, "Error message provided");
        });

        it("should handle undefined actor", () => {
          // ACT: Validate undefined actor
          const validation = validateSpellSlot(undefined, "earth", false);

          // ASSERT: Fails with message
          assert.isFalse(validation.valid, "Undefined actor fails");
          assert.equal(validation.current, 0, "Current is 0");
          assert.exists(validation.message, "Error message provided");
        });
      });
    },
    { displayName: "L5R4: Spell Slots Resource Management" }
  );
}
