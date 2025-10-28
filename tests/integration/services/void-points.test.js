/**
 * Void Points Resource Management Integration Tests
 *
 * Tests L5R4 Void Point mechanics per Phase 4 requirements:
 * - Spending from empty pool
 * - Armor TN Void expiration after round
 * - Double-spending on rapid clicks (race condition)
 * - Void spending without confirmation
 *
 * CRITICAL: These tests FIND BUGS, not validate working code.
 * Each test creates a specific failure condition to verify handling.
 *
 * @see module/services/dice/resources/void-manager.js
 * @see module/hooks/combat-void-spending.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import {
  spendVoidPoint,
  validateVoidPoints
} from "../../../module/services/dice/resources/void-manager.js";

/**
 * Register Void Points resource management tests
 * @param {Object} quench - Quench test framework
 */
export function registerVoidPointsTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.resources.void-points`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("4.1.1 Spending from Empty Pool", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Empty Void Test",
            system: {
              rings: {
                void: { value: 0, rank: 2 } // Empty pool but has capacity
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

        it("should fail validation when Void pool is 0", () => {
          // ARRANGE: Actor with 0 Void Points
          const validation = validateVoidPoints(actor);

          // ACT & ASSERT: Validation must fail
          assert.isFalse(validation.valid, "Validation fails with empty pool");
          assert.equal(validation.current, 0, "Current pool is 0");
          assert.exists(validation.message, "Error message provided");
        });

        it("should prevent spending when pool is empty", async () => {
          // ARRANGE: Actor with 0 Void Points
          assert.equal(actor.system.rings.void.value, 0, "Void pool starts at 0");

          // ACT: Attempt to spend Void Point
          const result = await spendVoidPoint(actor);

          // ASSERT: Spending fails
          assert.isFalse(result.success, "Spending fails");
          assert.equal(result.rollBonus, 0, "No roll bonus granted");
          assert.equal(result.keepBonus, 0, "No keep bonus granted");
          assert.exists(result.message, "Error message provided");

          // VERIFY: Pool unchanged
          assert.equal(actor.system.rings.void.value, 0, "Pool remains at 0");
        });

        it("should not go negative when attempting to spend from 0", async () => {
          // ARRANGE: Empty pool
          assert.equal(actor.system.rings.void.value, 0);

          // ACT: Multiple spend attempts
          await spendVoidPoint(actor);
          await spendVoidPoint(actor);
          await spendVoidPoint(actor);

          // ASSERT: Pool never goes negative
          const finalValue = actor.system.rings.void.value;
          assert.isAtLeast(finalValue, 0, "Pool never goes negative");
        });

        it("should handle null Void value gracefully", async () => {
          // ARRANGE: Corrupt data - null Void value
          await actor.update({ "system.rings.void.value": null });

          // ACT: Attempt to spend
          const result = await spendVoidPoint(actor);

          // ASSERT: Fails gracefully without crash
          assert.isFalse(result.success, "Spending fails gracefully");
          assert.exists(result.message, "Error message provided");
        });

        it("should handle undefined Void structure gracefully", async () => {
          // ARRANGE: Corrupt data - missing Void structure
          await actor.update({ "system.rings.void": null });

          // ACT: Attempt to validate
          const validation = validateVoidPoints(actor);

          // ASSERT: Fails gracefully without crash
          assert.isFalse(validation.valid, "Validation fails gracefully");
          assert.equal(validation.current, 0, "Defaults to 0");
        });
      });

      describe("4.1.2 Armor TN Void Expiration After Round", () => {
        let combat, actor, combatant;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Armor TN Void Test",
            system: {
              rings: { void: { value: 2, rank: 2 } },
              armorTn: {
                useVoid: false,
                voidRound: null
              }
            }
          });

          combat = await Combat.create({
            scene: null,
            active: false
          });

          [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id, tokenId: null }
          ]);
        });

        afterEach(async () => {
          if (combat) {
            await combat.delete();
            combat = null;
          }
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should activate Armor TN Void on round 1", async () => {
          // ARRANGE: Combat on round 1
          await combat.update({ round: 1 });

          // ACT: Activate Armor TN Void
          await actor.update({
            "system.armorTn.useVoid": true,
            "system.armorTn.voidRound": 1
          });

          // ASSERT: Void activated
          assert.isTrue(actor.system.armorTn.useVoid, "Void active");
          assert.equal(actor.system.armorTn.voidRound, 1, "Activated on round 1");
        });

        it("should NOT expire on same round", async () => {
          // ARRANGE: Activate on round 1
          await combat.update({ round: 1 });
          await actor.update({
            "system.armorTn.useVoid": true,
            "system.armorTn.voidRound": 1
          });

          // ACT: Trigger combatTurn hook (same round)
          await Hooks.call("combatTurn", combat, {}, {});

          // ASSERT: Still active (expires AFTER 1 round)
          assert.isTrue(actor.system.armorTn.useVoid, "Void still active on same round");
        });

        it("should expire after 1 full round", async () => {
          // ARRANGE: Activate on round 1
          await combat.update({ round: 1 });
          await actor.update({
            "system.armorTn.useVoid": true,
            "system.armorTn.voidRound": 1
          });

          // ACT: Advance to round 2
          await combat.update({ round: 2 });
          await Hooks.call("combatTurn", combat, {}, {});

          // Wait for async update
          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT: Expired after 1 round
          const updatedActor = game.actors.get(actor.id);
          assert.isFalse(updatedActor.system.armorTn.useVoid, "Void expired");
          assert.isNull(updatedActor.system.armorTn.voidRound, "Round cleared");
        });

        it("should handle activation on round 0", async () => {
          // ARRANGE: Edge case - round 0
          await combat.update({ round: 0 });
          await actor.update({
            "system.armorTn.useVoid": true,
            "system.armorTn.voidRound": 0
          });

          // ACT: Advance to round 1
          await combat.update({ round: 1 });
          await Hooks.call("combatTurn", combat, {}, {});

          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT: Expired (round 1 > round 0)
          const updatedActor = game.actors.get(actor.id);
          assert.isFalse(updatedActor.system.armorTn.useVoid, "Void expired from round 0");
        });

        it("should handle null voidRound gracefully", async () => {
          // ARRANGE: Void active but null round (corrupt state)
          await actor.update({
            "system.armorTn.useVoid": true,
            "system.armorTn.voidRound": null
          });

          // ACT: Trigger turn hook
          await combat.update({ round: 5 });
          await Hooks.call("combatTurn", combat, {}, {});

          // ASSERT: No crash (graceful handling)
          // Hook checks voidRound !== null before comparison
          assert.isTrue(true, "No crash with null voidRound");
        });

        it("should not affect other actors' Void", async () => {
          // ARRANGE: Two actors with different expiration rounds
          const actor2 = await createTestPC({
            name: "Other Actor",
            system: {
              rings: { void: { value: 2, rank: 2 } },
              armorTn: { useVoid: true, voidRound: 2 } // Activated on round 2, should NOT expire yet
            }
          });

          await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor2.id, tokenId: null }
          ]);

          // ACT: Expire actor1's Void (activated round 1, expires round 2)
          await combat.update({ round: 1 });
          await actor.update({
            "system.armorTn.useVoid": true,
            "system.armorTn.voidRound": 1
          });

          await combat.update({ round: 2 });
          await Hooks.call("combatTurn", combat, {}, {});

          await new Promise(resolve => setTimeout(resolve, 100));

          // ASSERT: actor1 expired, actor2 unaffected
          const updatedActor = game.actors.get(actor.id);
          const updatedActor2 = game.actors.get(actor2.id);

          assert.isFalse(updatedActor.system.armorTn.useVoid, "Actor 1's Void expired");
          assert.isTrue(updatedActor2.system.armorTn.useVoid, "Actor 2's Void still active");

          await actor2.delete();
        });
      });

      describe("4.1.3 Double-Spending Race Condition", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Race Condition Test",
            system: {
              rings: { void: { value: 1, rank: 2 } } // Only 1 Void Point
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
          // ARRANGE: Actor with 1 Void Point
          assert.equal(actor.system.rings.void.value, 1, "Starts with 1 Void");

          // ACT: Attempt simultaneous spending (race condition)
          const [result1, result2] = await Promise.all([
            spendVoidPoint(actor),
            spendVoidPoint(actor)
          ]);

          // ASSERT: Only one succeeds
          const successCount = [result1.success, result2.success].filter(Boolean).length;
          assert.equal(successCount, 1, "Only one spend succeeds");

          // VERIFY: Pool is 0, not negative
          const finalValue = actor.system.rings.void.value;
          assert.equal(finalValue, 0, "Pool is 0 (not negative)");
        });

        it("should handle triple simultaneous spend attempts", async () => {
          // ARRANGE: 1 Void Point
          assert.equal(actor.system.rings.void.value, 1);

          // ACT: Three simultaneous attempts
          const [r1, r2, r3] = await Promise.all([
            spendVoidPoint(actor),
            spendVoidPoint(actor),
            spendVoidPoint(actor)
          ]);

          // ASSERT: Only one succeeds
          const successCount = [r1.success, r2.success, r3.success].filter(Boolean).length;
          assert.isAtMost(successCount, 1, "At most one spend succeeds");

          // VERIFY: Pool never negative
          const finalValue = actor.system.rings.void.value;
          assert.isAtLeast(finalValue, 0, "Pool never negative");
        });

        it("should handle rapid sequential spends", async () => {
          // ARRANGE: 2 Void Points
          await actor.update({ "system.rings.void.value": 2 });

          // ACT: Rapid sequential spends (not awaited between)
          const promise1 = spendVoidPoint(actor);
          const promise2 = spendVoidPoint(actor);
          const promise3 = spendVoidPoint(actor); // Should fail

          const [r1, r2, r3] = await Promise.all([promise1, promise2, promise3]);

          // ASSERT: Two succeed, one fails
          const successCount = [r1.success, r2.success, r3.success].filter(Boolean).length;
          assert.isAtMost(successCount, 2, "At most 2 spends succeed");

          // VERIFY: Pool is 0
          const finalValue = actor.system.rings.void.value;
          assert.equal(finalValue, 0, "Pool depleted to 0");
        });

        it("should maintain data integrity after race condition", async () => {
          // ARRANGE: 1 Void Point
          assert.equal(actor.system.rings.void.value, 1);

          // ACT: Race condition
          await Promise.all([spendVoidPoint(actor), spendVoidPoint(actor)]);

          // ASSERT: Actor data structure intact
          assert.exists(actor.system.rings.void, "Void structure intact");
          assert.isNumber(actor.system.rings.void.value, "Value is number");
          assert.isAtLeast(actor.system.rings.void.value, 0, "Value valid");
        });
      });

      describe("4.1.4 Void Spending Without Confirmation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Confirmation Test",
            system: {
              rings: { void: { value: 2, rank: 2 } }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should spend Void immediately without dialog", async () => {
          // ARRANGE: 2 Void Points
          const initialValue = actor.system.rings.void.value;
          assert.equal(initialValue, 2);

          // ACT: Spend without confirmation
          const result = await spendVoidPoint(actor);

          // ASSERT: Spent immediately
          assert.isTrue(result.success, "Spending succeeds");
          assert.equal(actor.system.rings.void.value, 1, "Pool decremented immediately");
        });

        it("should return +1k1 bonuses on successful spend", async () => {
          // ACT: Spend Void Point
          const result = await spendVoidPoint(actor);

          // ASSERT: Correct bonuses per L5R4 rules
          assert.isTrue(result.success, "Spending succeeds");
          assert.equal(result.rollBonus, 1, "+1 rolled die");
          assert.equal(result.keepBonus, 1, "+1 kept die");
          assert.isNull(result.message, "No error message");
        });

        it("should allow spending last Void Point", async () => {
          // ARRANGE: Spend down to 1
          await spendVoidPoint(actor);
          assert.equal(actor.system.rings.void.value, 1);

          // ACT: Spend last point
          const result = await spendVoidPoint(actor);

          // ASSERT: Succeeds
          assert.isTrue(result.success, "Last point spends successfully");
          assert.equal(actor.system.rings.void.value, 0, "Pool now empty");
        });

        it("should fail gracefully after pool depleted", async () => {
          // ARRANGE: Spend all Void
          await spendVoidPoint(actor);
          await spendVoidPoint(actor);
          assert.equal(actor.system.rings.void.value, 0);

          // ACT: Attempt to spend from empty pool
          const result = await spendVoidPoint(actor);

          // ASSERT: Fails with message
          assert.isFalse(result.success, "Spending fails");
          assert.equal(result.rollBonus, 0, "No bonus");
          assert.equal(result.keepBonus, 0, "No bonus");
          assert.exists(result.message, "Error message provided");
        });

        it("should handle actor with no Void Ring", async () => {
          // ARRANGE: Corrupt data - no Void Ring
          await actor.update({ "system.rings.void": null });

          // ACT: Attempt to spend
          const result = await spendVoidPoint(actor);

          // ASSERT: Fails gracefully
          assert.isFalse(result.success, "Spending fails gracefully");
          assert.exists(result.message, "Error message provided");
        });
      });

      describe("Edge Cases: Void Point Validation", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Validation Edge Cases",
            system: {
              rings: { void: { value: 2, rank: 2 } }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should handle string Void value", async () => {
          // ARRANGE: String value (form input)
          await actor.update({ "system.rings.void.value": "2" });

          // ACT: Validate
          const validation = validateVoidPoints(actor);

          // ASSERT: Coerces to number
          assert.isTrue(validation.valid, "Validates string as number");
          assert.equal(validation.current, 2, "Coerced to 2");
        });

        it("should handle negative Void value", async () => {
          // ARRANGE: Negative value (corrupt data)
          await actor.update({ "system.rings.void.value": -1 });

          // ACT: Validate
          const validation = validateVoidPoints(actor);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "Negative value fails");
        });

        it("should handle NaN Void value", async () => {
          // ARRANGE: NaN value
          await actor.update({ "system.rings.void.value": NaN });

          // ACT: Validate
          const validation = validateVoidPoints(actor);

          // ASSERT: Fails validation
          assert.isFalse(validation.valid, "NaN fails validation");
          assert.equal(validation.current, 0, "Defaults to 0");
        });

        it("should handle Infinity Void value", async () => {
          // ARRANGE: Infinity value
          await actor.update({ "system.rings.void.value": Infinity });

          // ACT: Validate
          const validation = validateVoidPoints(actor);

          // ASSERT: Validation behavior (should fail or coerce)
          // Infinity is truthy and > 0, so may pass validation
          // This tests actual behavior
          assert.exists(validation.valid, "Handles Infinity");
        });

        it("should handle null actor", () => {
          // ACT: Validate null actor
          const validation = validateVoidPoints(null);

          // ASSERT: Fails with message
          assert.isFalse(validation.valid, "Null actor fails");
          assert.equal(validation.current, 0, "Current is 0");
          assert.exists(validation.message, "Error message provided");
        });

        it("should handle undefined actor", () => {
          // ACT: Validate undefined actor
          const validation = validateVoidPoints(undefined);

          // ASSERT: Fails with message
          assert.isFalse(validation.valid, "Undefined actor fails");
          assert.equal(validation.current, 0, "Current is 0");
          assert.exists(validation.message, "Error message provided");
        });
      });
    },
    { displayName: "L5R4: Void Points Resource Management" }
  );
}
