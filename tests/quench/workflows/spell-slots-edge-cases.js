/**
 * Spell Slots Edge Case Tests
 *
 * Tests edge cases in spell slot management that could break spellcasting. Slots are one number per Ring in
 * `system.spellSlots` (water, fire, earth, air, void), checked and spent through the casting path,
 * module/services/dice/check/spell-slots.js.
 *
 * **What Can Break:**
 * - Casting with no slots
 * - Falling back to a Void slot
 * - Concurrent slot spending
 * - Large slot counts
 * - Negative slot counts
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { getSlotStatus } from "../../../module/services/dice/check/spell-slots.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { spendCastSlot } from "../helpers.js";

/**
 * Register spell slots edge case tests
 * @param {Object} quench - Quench test framework
 */
export function registerSpellSlotsEdgeCaseTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.spell-slots-edge-cases`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Casting with no slots", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Spell slots edge cases: slot test",
            system: { traits: { int: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should refuse casting with zero spell slots", async () => {
          await actor.update({ "system.spellSlots.fire": 0 });

          assert.equal(actor.system.spellSlots.fire, 0, "Fire slots at 0");
          assert.isFalse(getSlotStatus(actor, "fire", "elemental").valid, "No Fire slot to spend");
          const result = await spendCastSlot(actor, "fire");
          assert.isFalse(result.success, "Spending fails");
          assert.equal(actor.system.spellSlots.fire, 0, "Still 0");
        });

        it("should fall back to a Void slot when element slots are empty", async () => {
          await actor.update({ "system.spellSlots.fire": 0, "system.spellSlots.void": 2 });

          assert.isFalse(getSlotStatus(actor, "fire", "elemental").valid, "Fire slots empty");
          assert.isTrue(getSlotStatus(actor, "fire", "void").valid, "Void slot available");
          const result = await spendCastSlot(actor, "void", { isVoid: true });
          assert.isTrue(result.success, "Void slot spent");
          assert.equal(actor.system.spellSlots.void, 1, "One Void slot left");
        });

        it("should refuse casting with no slots and no Void slots", async () => {
          await actor.update({ "system.spellSlots.fire": 0, "system.spellSlots.void": 0 });

          assert.isFalse(getSlotStatus(actor, "fire", "elemental").valid, "No Fire slots");
          assert.isFalse(getSlotStatus(actor, "fire", "void").valid, "No Void slots");
        });

        it("should treat a negative slot count as no slots", async () => {
          await actor.update({ "system.spellSlots.fire": -1 });

          assert.equal(actor.system.spellSlots.fire, -1, "Stored as given");
          const validation = getSlotStatus(actor, "fire", "elemental");
          assert.isFalse(validation.valid, "No slot to spend");
          assert.equal(validation.current, 0, "Reported as 0");
          const result = await spendCastSlot(actor, "fire");
          assert.isFalse(result.success, "Spending fails");
          assert.equal(actor.system.spellSlots.fire, -1, "Not decremented further");
        });
      });

      describe("Slot consumption timing", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Spell slots edge cases: slot timing",
            system: { traits: { int: 3 }, spellSlots: { fire: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should spend slots one after another", async () => {
          assert.equal(actor.system.spellSlots.fire, 3, "Starting with 3 slots");

          for (let i = 0; i < 3; i++) {
            assert.isTrue((await spendCastSlot(actor, "fire")).success, `Spend ${i + 1}`);
          }

          assert.equal(actor.system.spellSlots.fire, 0, "All slots consumed");
          assert.isFalse((await spendCastSlot(actor, "fire")).success, "Fourth spend fails");
        });

        it("should serialize concurrent slot spending", async () => {
          assert.equal(actor.system.spellSlots.fire, 3, "Starting with 3 slots");

          const results = await Promise.all([
            spendCastSlot(actor, "fire"),
            spendCastSlot(actor, "fire"),
            spendCastSlot(actor, "fire")
          ]);

          assert.isTrue(
            results.every(result => result.success),
            "Each spend succeeded"
          );
          assert.equal(actor.system.spellSlots.fire, 0, "Three slots spent, none lost");
        });

        it("should not spend below zero", async () => {
          await actor.update({ "system.spellSlots.fire": 1 });

          assert.isTrue((await spendCastSlot(actor, "fire")).success, "Last slot spent");
          assert.isFalse((await spendCastSlot(actor, "fire")).success, "Next spend fails");
          assert.equal(actor.system.spellSlots.fire, 0, "Stops at 0");
        });

        it("should restore slots", async () => {
          await actor.update({ "system.spellSlots.fire": 0 });
          await actor.update({ "system.spellSlots.fire": 3 });

          assert.equal(actor.system.spellSlots.fire, 3, "Slots restored");
        });
      });

      describe("Large slot counts", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Spell slots edge cases: overflow",
            system: { traits: { int: 3 } }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should store a slot count of 99", async () => {
          await actor.update({ "system.spellSlots.fire": 99 });

          assert.equal(actor.system.spellSlots.fire, 99, "High slot count stored");
          assert.isTrue((await spendCastSlot(actor, "fire")).success, "Spendable");
          assert.equal(actor.system.spellSlots.fire, 98, "Decremented");
        });

        it("should store a slot count of 999", async () => {
          await actor.update({ "system.spellSlots.fire": 999 });

          assert.equal(actor.system.spellSlots.fire, 999, "Extreme value stored");
        });
      });

      describe("Multiple element slots", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Spell slots edge cases: multiple elements",
            system: {
              traits: { int: 3 },
              spellSlots: { fire: 3, water: 2, earth: 1, air: 4 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should track all element slots independently", () => {
          const slots = actor.system.spellSlots;
          assert.equal(slots.fire, 3, "Fire slots correct");
          assert.equal(slots.water, 2, "Water slots correct");
          assert.equal(slots.earth, 1, "Earth slots correct");
          assert.equal(slots.air, 4, "Air slots correct");
        });

        it("should spend slots from different elements", async () => {
          await spendCastSlot(actor, "fire");
          await spendCastSlot(actor, "water");

          const slots = actor.system.spellSlots;
          assert.equal(slots.fire, 2, "Fire reduced");
          assert.equal(slots.water, 1, "Water reduced");
          assert.equal(slots.earth, 1, "Earth unchanged");
        });

        it("should cast from the one element with slots left", async () => {
          await actor.update({
            "system.spellSlots.fire": 0,
            "system.spellSlots.water": 0,
            "system.spellSlots.earth": 0
          });

          assert.equal(actor.system.spellSlots.air, 4, "Air slots remain");
          assert.isTrue(getSlotStatus(actor, "air", "elemental").valid, "Can cast Air");
          assert.isFalse(getSlotStatus(actor, "earth", "elemental").valid, "Cannot cast Earth");
        });
      });
    },
    { displayName: "L5R4: Spell slots edge cases" }
  );
}
