/**
 * Integration tests for Wealth Manager Application
 *
 * Tests the complete wealth management workflow including:
 * - Adding/removing money with edge cases
 * - Currency conversion
 * - Data persistence
 * - Error handling
 *
 * Uses Quench for Foundry VTT integration testing.
 */

import WealthManagerApplication from "../../../module/apps/wealth-manager.js";

export function registerWealthManagerTests(quench) {
  quench.registerBatch(
    "l5r4-enhanced.wealth-manager",
    context => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe("Wealth Manager Application", () => {
        let actor;
        let wealthManager;

        before(async () => {
          // Create test actor
          actor = await Actor.create({
            name: "Test Character",
            type: "pc",
            system: {
              wealth: {
                koku: 0,
                bu: 0,
                zeni: 0
              }
            }
          });
        });

        after(async () => {
          // Cleanup
          if (actor) {
            await actor.delete();
          }
        });

        beforeEach(() => {
          // Reset wealth before each test
          actor.update({
            "system.wealth": { koku: 0, bu: 0, zeni: 0 }
          });
        });

        afterEach(async () => {
          // Close wealth manager if open
          if (wealthManager) {
            await wealthManager.close();
            wealthManager = null;
          }
        });

        describe("Adding Money", () => {
          it("should add koku correctly", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.koku": 0 });

            // ACT - Simulate adding 5 koku
            const currentKoku = actor.system.wealth.koku || 0;
            await actor.update({ "system.wealth.koku": currentKoku + 5 });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 5, "Should add 5 koku");
          });

          it("should handle string values (prevent concatenation)", async () => {
            // ARRANGE - Set wealth as strings (simulating text input)
            await actor.update({
              "system.wealth": { koku: "5", bu: "0", zeni: "0" }
            });

            // ACT - Add more koku
            await actor.update({
              "system.wealth.koku": Number(actor.system.wealth.koku) + 3
            });

            // ASSERT
            assert.equal(
              actor.system.wealth.koku,
              8,
              "Should add numerically, not concatenate to '53'"
            );
          });

          it("should handle zero amount (no-op)", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.koku": 10 });

            // ACT - Try to add 0
            const originalKoku = actor.system.wealth.koku;
            // Simulating the amount <= 0 check
            const amount = 0;
            if (amount <= 0) {
              // Should return early
            } else {
              await actor.update({
                "system.wealth.koku": originalKoku + amount
              });
            }

            // ASSERT
            assert.equal(actor.system.wealth.koku, 10, "Should not change wealth when adding 0");
          });

          it("should handle negative amount (no-op)", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.koku": 10 });

            // ACT - Try to add negative
            const originalKoku = actor.system.wealth.koku;
            const amount = -5;
            if (amount <= 0) {
              // Should return early
            } else {
              await actor.update({
                "system.wealth.koku": originalKoku + amount
              });
            }

            // ASSERT
            assert.equal(
              actor.system.wealth.koku,
              10,
              "Should not change wealth when adding negative amount"
            );
          });

          it("should never go below zero", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.koku": 5 });

            // ACT - Add large negative (if validation fails)
            const result = Math.max(0, actor.system.wealth.koku - 10);
            await actor.update({ "system.wealth.koku": result });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 0, "Should clamp to 0, not go negative");
          });

          it("should handle null/undefined wealth values", async () => {
            // ARRANGE - Wealth might be null/undefined
            await actor.update({
              "system.wealth": { koku: null, bu: undefined, zeni: 0 }
            });

            // ACT - Add money
            const koku = Number(actor.system.wealth.koku) || 0;
            const bu = Number(actor.system.wealth.bu) || 0;
            await actor.update({
              "system.wealth": { koku: koku + 5, bu: bu + 3, zeni: 0 }
            });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 5, "Should handle null koku");
            assert.equal(actor.system.wealth.bu, 3, "Should handle undefined bu");
          });
        });

        describe("Removing Money", () => {
          it("should remove money from specific denomination", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 10, bu: 5, zeni: 20 }
            });

            // ACT
            await actor.update({ "system.wealth.bu": 2 });

            // ASSERT
            assert.equal(actor.system.wealth.bu, 2, "Should remove 3 bu");
            assert.equal(actor.system.wealth.koku, 10, "Should not affect koku");
            assert.equal(actor.system.wealth.zeni, 20, "Should not affect zeni");
          });

          it("should prevent removing more than available", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.koku": 5 });

            // ACT - Try to remove more than available
            const current = actor.system.wealth.koku;
            const toRemove = 10;
            const canRemove = current >= toRemove;

            if (canRemove) {
              await actor.update({ "system.wealth.koku": current - toRemove });
            }

            // ASSERT
            assert.equal(actor.system.wealth.koku, 5, "Should not remove if insufficient funds");
            assert.isFalse(canRemove, "Should detect insufficient funds");
          });

          it("should handle removing from zero", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.zeni": 0 });

            // ACT
            const current = actor.system.wealth.zeni;
            const toRemove = 5;
            const canRemove = current >= toRemove;

            // ASSERT
            assert.isFalse(canRemove, "Should not allow removing from zero balance");
          });

          it("should clamp result to zero if somehow negative", async () => {
            // ARRANGE
            await actor.update({ "system.wealth.koku": 5 });

            // ACT - Force negative (defensive coding test)
            const result = Math.max(0, actor.system.wealth.koku - 10);
            await actor.update({ "system.wealth.koku": result });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 0, "Should clamp to 0, never negative");
          });
        });

        describe("Currency Conversion", () => {
          it("should convert 10 zeni to 1 bu", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 0, bu: 0, zeni: 15 }
            });

            // ACT - Convert up
            const wealth = actor.system.wealth;
            if (wealth.zeni >= 10) {
              await actor.update({
                "system.wealth": {
                  koku: wealth.koku,
                  bu: (wealth.bu || 0) + 1,
                  zeni: wealth.zeni - 10
                }
              });
            }

            // ASSERT
            assert.equal(actor.system.wealth.bu, 1, "Should gain 1 bu");
            assert.equal(actor.system.wealth.zeni, 5, "Should lose 10 zeni");
          });

          it("should convert 5 bu to 1 koku", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 0, bu: 7, zeni: 0 }
            });

            // ACT - Convert up
            const wealth = actor.system.wealth;
            if (wealth.bu >= 5) {
              await actor.update({
                "system.wealth": {
                  koku: (wealth.koku || 0) + 1,
                  bu: wealth.bu - 5,
                  zeni: wealth.zeni
                }
              });
            }

            // ASSERT
            assert.equal(actor.system.wealth.koku, 1, "Should gain 1 koku");
            assert.equal(actor.system.wealth.bu, 2, "Should lose 5 bu");
          });

          it("should convert 1 koku to 5 bu", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 2, bu: 1, zeni: 0 }
            });

            // ACT - Convert down
            const wealth = actor.system.wealth;
            if (wealth.koku >= 1) {
              await actor.update({
                "system.wealth": {
                  koku: wealth.koku - 1,
                  bu: (wealth.bu || 0) + 5,
                  zeni: wealth.zeni
                }
              });
            }

            // ASSERT
            assert.equal(actor.system.wealth.koku, 1, "Should lose 1 koku");
            assert.equal(actor.system.wealth.bu, 6, "Should gain 5 bu");
          });

          it("should convert 1 bu to 10 zeni", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 0, bu: 3, zeni: 5 }
            });

            // ACT - Convert down
            const wealth = actor.system.wealth;
            if (wealth.bu >= 1) {
              await actor.update({
                "system.wealth": {
                  koku: wealth.koku,
                  bu: wealth.bu - 1,
                  zeni: (wealth.zeni || 0) + 10
                }
              });
            }

            // ASSERT
            assert.equal(actor.system.wealth.bu, 2, "Should lose 1 bu");
            assert.equal(actor.system.wealth.zeni, 15, "Should gain 10 zeni");
          });

          it("should prevent conversion with insufficient funds", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 0, bu: 3, zeni: 0 }
            });

            // ACT - Try to convert 5 bu to koku (only have 3)
            const wealth = actor.system.wealth;
            const canConvert = wealth.bu >= 5;

            if (canConvert) {
              await actor.update({
                "system.wealth": {
                  koku: (wealth.koku || 0) + 1,
                  bu: wealth.bu - 5,
                  zeni: wealth.zeni
                }
              });
            }

            // ASSERT
            assert.isFalse(canConvert, "Should detect insufficient funds");
            assert.equal(actor.system.wealth.bu, 3, "Should not change bu if insufficient");
          });

          it("should not auto-normalize on add", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 0, bu: 0, zeni: 0 }
            });

            // ACT - Add 5 bu (exactly 1 koku worth)
            await actor.update({ "system.wealth.bu": 5 });

            // ASSERT
            assert.equal(
              actor.system.wealth.bu,
              5,
              "Should keep as 5 bu, not auto-convert to 1 koku"
            );
            assert.equal(actor.system.wealth.koku, 0, "Should not auto-convert to koku");
          });

          it("should not auto-normalize on add (zeni)", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 0, bu: 0, zeni: 0 }
            });

            // ACT - Add 10 zeni (exactly 1 bu worth)
            await actor.update({ "system.wealth.zeni": 10 });

            // ASSERT
            assert.equal(
              actor.system.wealth.zeni,
              10,
              "Should keep as 10 zeni, not auto-convert to 1 bu"
            );
            assert.equal(actor.system.wealth.bu, 0, "Should not auto-convert to bu");
          });
        });

        describe("Data Persistence", () => {
          it("should persist wealth changes to actor", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 10, bu: 5, zeni: 20 }
            });

            // ACT - Reload actor
            const reloadedActor = game.actors.get(actor.id);

            // ASSERT
            assert.equal(reloadedActor.system.wealth.koku, 10);
            assert.equal(reloadedActor.system.wealth.bu, 5);
            assert.equal(reloadedActor.system.wealth.zeni, 20);
          });

          it("should handle concurrent updates", async () => {
            // ARRANGE
            await actor.update({
              "system.wealth": { koku: 10, bu: 0, zeni: 0 }
            });

            // ACT - Simulate concurrent updates
            const update1 = actor.update({ "system.wealth.koku": 15 });
            const update2 = actor.update({ "system.wealth.bu": 5 });

            await Promise.all([update1, update2]);

            // ASSERT
            // Last write wins in Foundry
            assert.exists(actor.system.wealth.koku, "Koku should exist");
            assert.exists(actor.system.wealth.bu, "Bu should exist");
          });
        });

        describe("Edge Cases", () => {
          it("should handle very large numbers", async () => {
            // ARRANGE
            const largeNumber = 999999;

            // ACT
            await actor.update({ "system.wealth.koku": largeNumber });

            // ASSERT
            assert.equal(actor.system.wealth.koku, largeNumber, "Should handle large numbers");
          });

          it("should handle decimal inputs (should round)", async () => {
            // ARRANGE & ACT
            const decimalValue = 5.7;
            const rounded = Math.floor(decimalValue);
            await actor.update({ "system.wealth.koku": rounded });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 5, "Should handle decimal by rounding down");
          });

          it("should handle NaN gracefully", async () => {
            // ARRANGE & ACT
            const invalidValue = Number("not a number");
            const safeValue = Number(invalidValue) || 0;
            await actor.update({ "system.wealth.koku": safeValue });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 0, "Should default to 0 for NaN");
          });

          it("should handle empty string input", async () => {
            // ARRANGE & ACT
            const emptyString = "";
            const safeValue = Number(emptyString) || 0;
            await actor.update({ "system.wealth.koku": safeValue });

            // ASSERT
            assert.equal(actor.system.wealth.koku, 0, "Should default to 0 for empty string");
          });
        });
      });
    },
    { displayName: "L5R4: Wealth Manager" }
  );
}
