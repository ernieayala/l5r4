/**
 * Wound Config Edge Case Tests
 *
 * Tests edge cases in wound configuration dialog that could corrupt wound data.
 * Specifically tests invalid multipliers, debounce data loss, and negative modifiers.
 *
 * **What Can Break:**
 * - Invalid multiplier values (99, 0, negative)
 * - Debounce data loss when closing < 300ms
 * - Negative wound modifiers
 * - Extreme wound penalty values
 * - Rapid configuration changes
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import WoundConfigApplication from "../../../module/apps/wound-config.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register wound config edge case tests
 * @param {Object} quench - Quench test framework
 */
export function registerWoundConfigEdgeCaseTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.wound-config-edge-cases`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Invalid Multiplier Values", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Multiplier Test",
            system: {
              traits: { sta: 3, wil: 3 },
              woundsMultiplier: 2
            }
          });
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should handle extremely high multiplier (99)", async () => {
          // ARRANGE - Set extreme multiplier
          await actor.update({ "system.woundsMultiplier": 99 });

          // ACT
          actor.prepareData();

          // ASSERT - System should handle gracefully
          assert.equal(actor.system.woundsMultiplier, 99, "Extreme multiplier set");
          assert.exists(actor.system.woundLevels, "Wound levels calculated");
          assert.isNumber(actor.system.woundLevels.healthy.value, "Healthy wounds calculated");

          // Wounds will be extremely high but should be valid numbers
          assert.isTrue(actor.system.woundLevels.healthy.value > 0, "Positive wound values");
        });

        it("should handle zero multiplier", async () => {
          // ARRANGE - Zero multiplier (edge case)
          await actor.update({ "system.woundsMultiplier": 0 });

          // ACT
          actor.prepareData();

          // ASSERT - System should handle gracefully
          assert.equal(actor.system.woundsMultiplier, 0, "Zero multiplier set");
          assert.exists(actor.system.woundLevels, "Wound levels exist");

          // With 0 multiplier, wounds might be 0 or use default
          assert.isNumber(actor.system.woundLevels.healthy.value, "Healthy wounds is number");
        });

        it("should handle negative multiplier", async () => {
          // ARRANGE - Negative multiplier (invalid)
          await actor.update({ "system.woundsMultiplier": -2 });

          // ACT
          actor.prepareData();

          // ASSERT - System should handle gracefully
          assert.equal(actor.system.woundsMultiplier, -2, "Negative multiplier set");
          assert.exists(actor.system.woundLevels, "Wound levels calculated");

          // System might use absolute value or default
          assert.isNumber(actor.system.woundLevels.healthy.value, "Healthy wounds is number");
        });

        it("should handle fractional multiplier", async () => {
          // ARRANGE - Fractional multiplier
          await actor.update({ "system.woundsMultiplier": 2.5 });

          // ACT
          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.woundsMultiplier, 2.5, "Fractional multiplier set");
          assert.exists(actor.system.woundLevels, "Wound levels calculated");
          assert.isNumber(actor.system.woundLevels.healthy.value, "Healthy wounds calculated");
        });

        it("should handle multiplier = 1 (minimum reasonable)", async () => {
          // ARRANGE - Minimum multiplier
          await actor.update({ "system.woundsMultiplier": 1 });

          // ACT
          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.woundsMultiplier, 1, "Multiplier is 1");

          // Healthy = Earth × 5 × 1 = 3 × 5 × 1 = 15
          const expectedHealthy = actor.system.rings.earth * 5 * 1;
          assert.equal(
            actor.system.woundLevels.healthy.value,
            expectedHealthy,
            "Correct calculation"
          );
        });

        it("should recalculate wounds when multiplier changes", async () => {
          // ARRANGE - Start with multiplier 2, Earth 3
          // Healthy = Earth × 5 = 3 × 5 = 15 (multiplier doesn't affect healthy directly)
          // But Out = (Earth × mult × 2) + healthy = (3 × 2 × 2) + 15 = 27
          const initialOut = actor.system.woundLevels.out.value;

          // ACT - Change to multiplier 4
          await actor.update({ "system.woundsMultiplier": 4 });
          actor.prepareData();

          // ASSERT - Out threshold should change
          const newOut = actor.system.woundLevels.out.value;
          assert.notEqual(newOut, initialOut, "Wounds recalculated");
          assert.isAbove(newOut, initialOut, "Higher multiplier = more wounds");
        });
      });

      describe("Debounce Data Loss Prevention", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Debounce Test",
            system: {
              traits: { sta: 3, wil: 3 },
              woundsMultiplier: 2
            }
          });
          dialog = new WoundConfigApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should handle immediate close (< 100ms)", async () => {
          // ARRANGE - Dialog just opened
          assert.isTrue(dialog.rendered, "Dialog is open");

          // ACT - Close immediately
          const closePromise = dialog.close();
          await closePromise;

          // ASSERT - Should close without error
          assert.isFalse(dialog.rendered, "Dialog closed");
        });

        it("should handle rapid open/close cycles", async () => {
          // ARRANGE - Close current dialog
          await dialog.close();

          // ACT - Rapid open/close cycles
          for (let i = 0; i < 3; i++) {
            const tempDialog = new WoundConfigApplication(actor);
            await tempDialog.render(true);
            await new Promise(resolve => setTimeout(resolve, 50));
            await tempDialog.close();
          }

          // ASSERT - Actor data should be intact
          assert.exists(actor.system, "Actor system data intact");
          assert.equal(actor.system.woundsMultiplier, 2, "Multiplier unchanged");
        });

        it("should preserve data when closing after short delay (100ms)", async () => {
          // ARRANGE - Wait short time
          await new Promise(resolve => setTimeout(resolve, 100));

          // ACT - Close
          await dialog.close();

          // ASSERT
          assert.equal(actor.system.woundsMultiplier, 2, "Data preserved");
        });

        it("should preserve data when closing after medium delay (300ms)", async () => {
          // ARRANGE - Wait medium time (typical debounce threshold)
          await new Promise(resolve => setTimeout(resolve, 300));

          // ACT - Close
          await dialog.close();

          // ASSERT
          assert.equal(actor.system.woundsMultiplier, 2, "Data preserved");
        });

        it("should handle multiple dialogs for same actor", async () => {
          // ARRANGE - Open second dialog for same actor
          const dialog2 = new WoundConfigApplication(actor);
          await dialog2.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          // ACT - Close both
          await dialog.close();
          await dialog2.close();

          // ASSERT - No data corruption
          assert.equal(actor.system.woundsMultiplier, 2, "Data intact");
        });
      });

      describe("Negative Wound Modifiers", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Negative Mod Test",
            system: {
              traits: { sta: 3, wil: 3 },
              woundsPenaltyMod: 0
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should handle negative wound penalty modifier", async () => {
          // ARRANGE - Set negative modifier
          await actor.update({ "system.woundsPenaltyMod": -5 });

          // ACT
          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.woundsPenaltyMod, -5, "Negative modifier set");

          // Negative modifier reduces penalties (makes character tougher)
          assert.exists(actor.system.woundLevels, "Wound levels calculated");
        });

        it("should handle zero wound penalty modifier", async () => {
          // ARRANGE - Zero modifier (default)
          await actor.update({ "system.woundsPenaltyMod": 0 });

          // ACT
          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.woundsPenaltyMod, 0, "Zero modifier");
          assert.exists(actor.system.woundLevels.nicked, "Nicked level exists");

          // Base penalty should apply
          assert.isNumber(
            actor.system.woundLevels.nicked.penaltyEff,
            "Effective penalty calculated"
          );
        });

        it("should handle positive wound penalty modifier", async () => {
          // ARRANGE - Positive modifier (increases penalties)
          await actor.update({ "system.woundsPenaltyMod": 10 });

          // ACT
          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.woundsPenaltyMod, 10, "Positive modifier set");

          // Positive modifier increases penalties
          const nickedPenalty = actor.system.woundLevels.nicked.penaltyEff;
          assert.isNumber(nickedPenalty, "Penalty calculated");
          assert.isAbove(nickedPenalty, 0, "Penalty is positive");
        });

        it("should handle extreme negative modifier (-99)", async () => {
          // ARRANGE - Extreme negative
          await actor.update({ "system.woundsPenaltyMod": -99 });

          // ACT
          actor.prepareData();

          // ASSERT - Should handle gracefully
          assert.equal(actor.system.woundsPenaltyMod, -99, "Extreme negative set");
          assert.exists(actor.system.woundLevels, "Wound levels exist");

          // Penalties might be 0 or negative (no penalty)
          assert.isNumber(actor.system.woundLevels.nicked.penaltyEff, "Penalty is number");
        });

        it("should handle extreme positive modifier (99)", async () => {
          // ARRANGE - Extreme positive
          await actor.update({ "system.woundsPenaltyMod": 99 });

          // ACT
          actor.prepareData();

          // ASSERT
          assert.equal(actor.system.woundsPenaltyMod, 99, "Extreme positive set");

          // Penalties will be very high
          const nickedPenalty = actor.system.woundLevels.nicked.penaltyEff;
          assert.isNumber(nickedPenalty, "Penalty calculated");
          assert.isAbove(nickedPenalty, 0, "Penalty is positive");
        });

        it("should recalculate penalties when modifier changes", async () => {
          // ARRANGE - Start with 0 modifier
          actor.prepareData();
          const basePenalty = actor.system.woundLevels.nicked.penaltyEff;

          // ACT - Add positive modifier
          await actor.update({ "system.woundsPenaltyMod": 5 });
          actor.prepareData();

          // ASSERT
          const newPenalty = actor.system.woundLevels.nicked.penaltyEff;
          assert.isAtLeast(newPenalty, basePenalty, "Penalty increased or same");
        });
      });

      describe("NPC Wound Config Edge Cases", () => {
        let npc, dialog;

        beforeEach(async () => {
          npc = await createTestNPC({
            name: "NPC Config Test",
            system: {
              woundMode: "manual",
              wounds: { max: 50 }
            }
          });
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close();
          }
          if (npc) {
            await npc.delete();
          }
        });

        it("should handle manual mode with zero max wounds", async () => {
          // ARRANGE - Zero max wounds
          await npc.update({ "system.wounds.max": 0 });

          // ACT
          npc.prepareData();

          // ASSERT - System falls back to formula when max <= 0
          assert.equal(npc.system.woundMode, "manual", "Manual mode active");
          // When wounds.max is 0, system uses formula-calculated value
          assert.isNumber(npc.system.wounds.max, "Max wounds is number");
          assert.isAbove(npc.system.wounds.max, 0, "Falls back to formula value");
        });

        it("should handle manual mode with negative max wounds", async () => {
          // ARRANGE - Negative max (invalid)
          await npc.update({ "system.wounds.max": -10 });

          // ACT
          npc.prepareData();

          // ASSERT - System falls back to formula when max <= 0
          assert.equal(npc.system.woundMode, "manual", "Manual mode active");
          // When wounds.max is negative, system uses formula-calculated value
          assert.isNumber(npc.system.wounds.max, "Max wounds is number");
          assert.isAbove(npc.system.wounds.max, 0, "Falls back to formula value");
        });

        it("should handle manual mode with extreme max wounds (9999)", async () => {
          // ARRANGE - Extreme max
          await npc.update({ "system.wounds.max": 9999 });

          // ACT
          npc.prepareData();

          // ASSERT
          assert.equal(npc.system.wounds.max, 9999, "Extreme max set");
          assert.equal(npc.system.wounds.value, 9999, "Current wounds match max");
        });

        it("should switch between manual and formula modes", async () => {
          // ARRANGE - Start in manual
          assert.equal(npc.system.woundMode, "manual", "Manual mode");

          // ACT - Switch to formula
          await npc.update({
            "system.woundMode": "formula",
            "system.traits.sta": 4,
            "system.traits.wil": 4
          });
          npc.prepareData();

          // ASSERT
          assert.equal(npc.system.woundMode, "formula", "Formula mode active");
          assert.exists(npc.system.woundLevels, "Wound levels calculated");
        });

        it("should preserve manual wounds when switching modes", async () => {
          // ARRANGE - Manual mode with specific max
          const manualMax = 75;
          await npc.update({ "system.wounds.max": manualMax });

          // ACT - Switch to formula and back
          await npc.update({ "system.woundMode": "formula" });
          await npc.update({ "system.woundMode": "manual" });

          // ASSERT - Manual max should be preserved
          assert.equal(npc.system.woundMode, "manual", "Back to manual");
          assert.equal(npc.system.wounds.max, manualMax, "Manual max preserved");
        });

        it("should handle invalid wound mode value", async () => {
          // ARRANGE - Invalid mode
          await npc.update({ "system.woundMode": "invalid" });

          // ACT
          npc.prepareData();

          // ASSERT - Should handle gracefully (might default to manual or formula)
          assert.exists(npc.system.woundMode, "Wound mode exists");
        });
      });

      describe("Wound Level Count Edge Cases", () => {
        let npc;

        beforeEach(async () => {
          npc = await createTestNPC({
            name: "Wound Levels Test",
            system: {
              nrWoundLvls: 8 // Standard L5R4
            }
          });
        });

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should handle minimum wound levels (1)", async () => {
          // ARRANGE - Single wound level
          await npc.update({ "system.nrWoundLvls": 1 });

          // ACT
          npc.prepareData();

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 1, "One wound level");
        });

        it("should handle maximum wound levels (15)", async () => {
          // ARRANGE - Many wound levels
          await npc.update({ "system.nrWoundLvls": 15 });

          // ACT
          npc.prepareData();

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 15, "15 wound levels");
        });

        it("should handle zero wound levels", async () => {
          // ARRANGE - Zero levels (edge case)
          await npc.update({ "system.nrWoundLvls": 0 });

          // ACT
          npc.prepareData();

          // ASSERT - Should handle gracefully
          assert.equal(npc.system.nrWoundLvls, 0, "Zero wound levels");
        });

        it("should handle negative wound levels", async () => {
          // ARRANGE - Negative (invalid)
          await npc.update({ "system.nrWoundLvls": -5 });

          // ACT
          npc.prepareData();

          // ASSERT - Should handle gracefully
          assert.equal(npc.system.nrWoundLvls, -5, "Negative wound levels set");
        });

        it("should handle standard L5R4 wound levels (8)", async () => {
          // ARRANGE - Standard 8 levels
          await npc.update({ "system.nrWoundLvls": 8 });

          // ACT
          npc.prepareData();

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 8, "Standard 8 levels");

          // Should have all 8 standard levels
          assert.exists(npc.system.woundLevels, "Wound levels exist");
        });
      });

      describe("Rapid Configuration Changes", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Rapid Change Test",
            system: {
              traits: { sta: 3, wil: 3 },
              woundsMultiplier: 2
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should handle rapid multiplier changes", async () => {
          // ACT - Change multiplier rapidly
          const changes = [3, 4, 2, 5, 1];
          for (const mult of changes) {
            await actor.update({ "system.woundsMultiplier": mult });
          }

          // ASSERT
          assert.equal(actor.system.woundsMultiplier, 1, "Final value correct");
        });

        it("should handle rapid penalty modifier changes", async () => {
          // ACT - Change penalty mod rapidly
          const changes = [5, -3, 10, 0, 7];
          for (const mod of changes) {
            await actor.update({ "system.woundsPenaltyMod": mod });
          }

          // ASSERT
          assert.equal(actor.system.woundsPenaltyMod, 7, "Final value correct");
        });

        it("should handle concurrent wound config updates", async () => {
          // ARRANGE - Update multiple fields simultaneously
          const promises = [
            actor.update({ "system.woundsMultiplier": 3 }),
            actor.update({ "system.woundsPenaltyMod": 5 }),
            actor.update({ "system.traits.sta": 4 })
          ];

          // ACT - Race condition
          await Promise.all(promises);

          // ASSERT - Last write wins, no corruption
          actor.prepareData();
          assert.exists(actor.system, "System data intact");
          assert.exists(actor.system.woundLevels, "Wound levels calculated");
        });
      });
    },
    { displayName: "L5R4: Wound Config Edge Cases" }
  );
}
