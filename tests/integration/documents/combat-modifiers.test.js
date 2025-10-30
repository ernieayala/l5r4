/**
 * Integration tests for combat modifiers (initiative and movement)
 *
 * Tests L5R4 combat modifier mechanics:
 * - Initiative roll/keep modifiers (rollMod, keepMod)
 * - Initiative total modifier (totalMod)
 * - Initiative void point bonus (+10)
 * - Movement multiplier and modifier
 * - PC vs NPC parity for all modifiers
 *
 * @module tests/integration/documents/combat-modifiers
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register combat modifiers integration tests
 */
export function registerCombatModifiersTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.integration.documents.combat-modifiers`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Combat Modifiers Integration Tests", () => {
        describe("PC Initiative Modifiers", () => {
          let pc;

          beforeEach(async () => {
            pc = await createTestPC({
              name: "Initiative Modifier Test PC",
              system: {
                rings: {
                  void: { rank: 2, value: 2 }
                },
                traits: { ref: 3 },
                insight: { rank: 2 },
                initiative: {
                  roll: 0,
                  keep: 0,
                  rollMod: 0,
                  keepMod: 0,
                  totalMod: 0,
                  useVoid: false
                }
              }
            });
          });

          afterEach(async () => {
            if (pc) {
              await pc.delete();
              pc = null;
            }
          });

          it("should calculate base initiative without modifiers", () => {
            // Base: (Insight Rank + Reflexes)k(Reflexes) = 5k3
            assert.equal(pc.system.initiative.roll, 5, "Base roll is Insight + Reflexes");
            assert.equal(pc.system.initiative.keep, 3, "Base keep is Reflexes");
          });

          it("should apply rollMod to initiative roll", async () => {
            await pc.update({ "system.initiative.rollMod": 2 });

            // Roll should be 5 + 2 = 7
            assert.equal(pc.system.initiative.roll, 7, "rollMod adds to base roll");
            assert.equal(pc.system.initiative.keep, 3, "keep unchanged");
          });

          it("should apply keepMod to initiative keep", async () => {
            await pc.update({ "system.initiative.keepMod": 1 });

            // Keep should be 3 + 1 = 4
            assert.equal(pc.system.initiative.roll, 5, "roll unchanged");
            assert.equal(pc.system.initiative.keep, 4, "keepMod adds to base keep");
          });

          it("should apply both rollMod and keepMod together", async () => {
            await pc.update({
              "system.initiative.rollMod": 2,
              "system.initiative.keepMod": 1
            });

            assert.equal(pc.system.initiative.roll, 7, "rollMod applied");
            assert.equal(pc.system.initiative.keep, 4, "keepMod applied");
          });

          it("should handle negative modifiers", async () => {
            await pc.update({
              "system.initiative.rollMod": -1,
              "system.initiative.keepMod": -1
            });

            assert.equal(pc.system.initiative.roll, 4, "Negative rollMod reduces roll");
            assert.equal(pc.system.initiative.keep, 2, "Negative keepMod reduces keep");
          });

          it("should store totalMod independently", async () => {
            await pc.update({ "system.initiative.totalMod": 5 });

            assert.equal(pc.system.initiative.totalMod, 5, "totalMod stored correctly");
            // totalMod is added to the final roll result, not to roll/keep dice
          });

          it("should track useVoid flag", async () => {
            await pc.update({ "system.initiative.useVoid": true });

            assert.isTrue(pc.system.initiative.useVoid, "useVoid flag set");
            // Void bonus (+10) is applied in the UI display and during actual rolls
          });

          it("should handle all modifiers together", async () => {
            await pc.update({
              "system.initiative.rollMod": 2,
              "system.initiative.keepMod": 1,
              "system.initiative.totalMod": 3,
              "system.initiative.useVoid": true
            });

            assert.equal(pc.system.initiative.roll, 7, "rollMod applied");
            assert.equal(pc.system.initiative.keep, 4, "keepMod applied");
            assert.equal(pc.system.initiative.totalMod, 3, "totalMod stored");
            assert.isTrue(pc.system.initiative.useVoid, "useVoid set");
            // Total displayed in UI would be: 7k4+13 (totalMod 3 + void 10)
          });
        });

        describe("NPC Initiative Modifiers", () => {
          let npc;

          beforeEach(async () => {
            npc = await createTestNPC({
              name: "Initiative Modifier Test NPC",
              system: {
                rings: {
                  void: { rank: 1 }
                },
                traits: { ref: 3 },
                initiative: {
                  roll: 5,
                  keep: 3,
                  rollMod: 0,
                  keepMod: 0,
                  totalMod: 0,
                  useVoid: false
                }
              }
            });
          });

          afterEach(async () => {
            if (npc) {
              await npc.delete();
              npc = null;
            }
          });

          it("should calculate base initiative without modifiers", () => {
            // Base: explicit roll/keep = 5k3
            assert.equal(npc.system.initiative.roll, 5, "Base roll from explicit value");
            assert.equal(npc.system.initiative.keep, 3, "Base keep from explicit value");
          });

          it("should apply rollMod to initiative roll", async () => {
            await npc.update({ "system.initiative.rollMod": 2 });

            // Roll should be 5 + 2 = 7
            assert.equal(npc.system.initiative.roll, 7, "rollMod adds to base roll");
            assert.equal(npc.system.initiative.keep, 3, "keep unchanged");
          });

          it("should apply keepMod to initiative keep", async () => {
            await npc.update({ "system.initiative.keepMod": 1 });

            // Keep should be 3 + 1 = 4
            assert.equal(npc.system.initiative.roll, 5, "roll unchanged");
            assert.equal(npc.system.initiative.keep, 4, "keepMod adds to base keep");
          });

          it("should apply both rollMod and keepMod together", async () => {
            await npc.update({
              "system.initiative.rollMod": 2,
              "system.initiative.keepMod": 1
            });

            assert.equal(npc.system.initiative.roll, 7, "rollMod applied");
            assert.equal(npc.system.initiative.keep, 4, "keepMod applied");
          });

          it("should fall back to Reflexes when base roll/keep are 0", async () => {
            await npc.update({
              "system.initiative.roll": 0,
              "system.initiative.keep": 0,
              "system.initiative.rollMod": 1,
              "system.initiative.keepMod": 1
            });

            // Should use Reflexes (3) as base, then add modifiers
            assert.equal(npc.system.initiative.roll, 4, "Reflexes + rollMod");
            assert.equal(npc.system.initiative.keep, 4, "Reflexes + keepMod");
          });

          it("should handle negative modifiers", async () => {
            await npc.update({
              "system.initiative.rollMod": -1,
              "system.initiative.keepMod": -1
            });

            assert.equal(npc.system.initiative.roll, 4, "Negative rollMod reduces roll");
            assert.equal(npc.system.initiative.keep, 2, "Negative keepMod reduces keep");
          });

          it("should store totalMod independently", async () => {
            await npc.update({ "system.initiative.totalMod": 5 });

            assert.equal(npc.system.initiative.totalMod, 5, "totalMod stored correctly");
          });

          it("should track useVoid flag", async () => {
            await npc.update({ "system.initiative.useVoid": true });

            assert.isTrue(npc.system.initiative.useVoid, "useVoid flag set");
          });

          it("should handle all modifiers together", async () => {
            await npc.update({
              "system.initiative.rollMod": 2,
              "system.initiative.keepMod": 1,
              "system.initiative.totalMod": 3,
              "system.initiative.useVoid": true
            });

            assert.equal(npc.system.initiative.roll, 7, "rollMod applied");
            assert.equal(npc.system.initiative.keep, 4, "keepMod applied");
            assert.equal(npc.system.initiative.totalMod, 3, "totalMod stored");
            assert.isTrue(npc.system.initiative.useVoid, "useVoid set");
          });
        });

        describe("PC Movement Modifiers", () => {
          let pc;

          beforeEach(async () => {
            pc = await createTestPC({
              name: "Movement Modifier Test PC",
              system: {
                traits: { str: 3, per: 3 }, // Water = min(str, per) = 3
                movement: {
                  multiplier: 1,
                  modifier: 0
                }
              }
            });
          });

          afterEach(async () => {
            if (pc) {
              await pc.delete();
              pc = null;
            }
          });

          it("should calculate base movement without modifiers", () => {
            // Water Ring 3: Free 15, Simple 30, Max 60
            assert.equal(pc.system.movement.freeAction, 15, "Free action: Water × 5");
            assert.equal(pc.system.movement.simpleAction, 30, "Simple action: Water × 10");
            assert.equal(pc.system.movement.maximum, 60, "Maximum: Water × 20");
          });

          it("should apply multiplier to all movement values", async () => {
            await pc.update({ "system.movement.multiplier": 2 });

            // Water 3 × multiplier 2: Free 30, Simple 60, Max 120
            assert.equal(pc.system.movement.freeAction, 30, "Free action with multiplier");
            assert.equal(pc.system.movement.simpleAction, 60, "Simple action with multiplier");
            assert.equal(pc.system.movement.maximum, 120, "Maximum with multiplier");
          });

          it("should apply modifier to all movement values", async () => {
            await pc.update({ "system.movement.modifier": 5 });

            // Water 3 + modifier 5: Free 20, Simple 35, Max 65
            assert.equal(pc.system.movement.freeAction, 20, "Free action with modifier");
            assert.equal(pc.system.movement.simpleAction, 35, "Simple action with modifier");
            assert.equal(pc.system.movement.maximum, 65, "Maximum with modifier");
          });

          it("should apply both multiplier and modifier together", async () => {
            await pc.update({
              "system.movement.multiplier": 2,
              "system.movement.modifier": 10
            });

            // (Water 3 × multiplier 2) + modifier 10: Free 40, Simple 70, Max 130
            assert.equal(pc.system.movement.freeAction, 40, "Free with both modifiers");
            assert.equal(pc.system.movement.simpleAction, 70, "Simple with both modifiers");
            assert.equal(pc.system.movement.maximum, 130, "Maximum with both modifiers");
          });

          it("should handle negative modifiers", async () => {
            await pc.update({ "system.movement.modifier": -5 });

            // Water 3 - 5: Free 10, Simple 25, Max 55
            assert.equal(pc.system.movement.freeAction, 10, "Free with negative modifier");
            assert.equal(pc.system.movement.simpleAction, 25, "Simple with negative modifier");
            assert.equal(pc.system.movement.maximum, 55, "Maximum with negative modifier");
          });

          it("should handle fractional multipliers", async () => {
            await pc.update({ "system.movement.multiplier": 0.5 });

            // Water 3 × 0.5: Free 7.5, Simple 15, Max 30
            assert.equal(pc.system.movement.freeAction, 7.5, "Free with fractional multiplier");
            assert.equal(pc.system.movement.simpleAction, 15, "Simple with fractional multiplier");
            assert.equal(pc.system.movement.maximum, 30, "Maximum with fractional multiplier");
          });
        });

        describe("NPC Movement Modifiers", () => {
          let npc;

          beforeEach(async () => {
            npc = await createTestNPC({
              name: "Movement Modifier Test NPC",
              system: {
                traits: { str: 4, per: 4 }, // Water = min(str, per) = 4
                movement: {
                  multiplier: 1,
                  modifier: 0
                }
              }
            });
          });

          afterEach(async () => {
            if (npc) {
              await npc.delete();
              npc = null;
            }
          });

          it("should calculate base movement without modifiers", () => {
            // Water Ring 4: Free 20, Simple 40, Max 80
            assert.equal(npc.system.movement.freeAction, 20, "Free action: Water × 5");
            assert.equal(npc.system.movement.simpleAction, 40, "Simple action: Water × 10");
            assert.equal(npc.system.movement.maximum, 80, "Maximum: Water × 20");
          });

          it("should apply multiplier to all movement values", async () => {
            await npc.update({ "system.movement.multiplier": 2 });

            // Water 4 × multiplier 2: Free 40, Simple 80, Max 160
            assert.equal(npc.system.movement.freeAction, 40, "Free action with multiplier");
            assert.equal(npc.system.movement.simpleAction, 80, "Simple action with multiplier");
            assert.equal(npc.system.movement.maximum, 160, "Maximum with multiplier");
          });

          it("should apply modifier to all movement values", async () => {
            await npc.update({ "system.movement.modifier": 10 });

            // Water 4 + modifier 10: Free 30, Simple 50, Max 90
            assert.equal(npc.system.movement.freeAction, 30, "Free action with modifier");
            assert.equal(npc.system.movement.simpleAction, 50, "Simple action with modifier");
            assert.equal(npc.system.movement.maximum, 90, "Maximum with modifier");
          });

          it("should apply both multiplier and modifier together", async () => {
            await npc.update({
              "system.movement.multiplier": 1.5,
              "system.movement.modifier": 5
            });

            // (Water 4 × multiplier 1.5) + modifier 5: Free 35, Simple 65, Max 125
            assert.equal(npc.system.movement.freeAction, 35, "Free with both modifiers");
            assert.equal(npc.system.movement.simpleAction, 65, "Simple with both modifiers");
            assert.equal(npc.system.movement.maximum, 125, "Maximum with both modifiers");
          });

          it("should handle negative modifiers", async () => {
            await npc.update({ "system.movement.modifier": -10 });

            // Water 4 - 10: Free 10, Simple 30, Max 70
            assert.equal(npc.system.movement.freeAction, 10, "Free with negative modifier");
            assert.equal(npc.system.movement.simpleAction, 30, "Simple with negative modifier");
            assert.equal(npc.system.movement.maximum, 70, "Maximum with negative modifier");
          });
        });

        describe("PC vs NPC Parity", () => {
          let pc, npc;

          beforeEach(async () => {
            pc = await createTestPC({
              name: "Parity Test PC",
              system: {
                rings: {
                  void: { rank: 2, value: 2 }
                },
                traits: { ref: 3, str: 3, per: 3 }, // Water = min(str, per) = 3
                insight: { rank: 2 },
                initiative: {
                  rollMod: 1,
                  keepMod: 1,
                  totalMod: 2,
                  useVoid: false
                },
                movement: {
                  multiplier: 2,
                  modifier: 5
                }
              }
            });

            npc = await createTestNPC({
              name: "Parity Test NPC",
              system: {
                rings: {
                  void: { rank: 2 }
                },
                traits: { ref: 3, str: 3, per: 3 }, // Water = min(str, per) = 3
                initiative: {
                  roll: 5, // Match PC's base (Insight 2 + Reflexes 3)
                  keep: 3, // Match PC's Reflexes
                  rollMod: 1,
                  keepMod: 1,
                  totalMod: 2,
                  useVoid: false
                },
                movement: {
                  multiplier: 2,
                  modifier: 5
                }
              }
            });
          });

          afterEach(async () => {
            if (pc) {
              await pc.delete();
            }
            if (npc) {
              await npc.delete();
            }
          });

          it("should have identical initiative with same modifiers", () => {
            assert.equal(
              pc.system.initiative.roll,
              npc.system.initiative.roll,
              "Same initiative roll"
            );
            assert.equal(
              pc.system.initiative.keep,
              npc.system.initiative.keep,
              "Same initiative keep"
            );
            assert.equal(
              pc.system.initiative.totalMod,
              npc.system.initiative.totalMod,
              "Same initiative totalMod"
            );
          });

          it("should have identical movement with same modifiers", () => {
            assert.equal(
              pc.system.movement.freeAction,
              npc.system.movement.freeAction,
              "Same free action movement"
            );
            assert.equal(
              pc.system.movement.simpleAction,
              npc.system.movement.simpleAction,
              "Same simple action movement"
            );
            assert.equal(
              pc.system.movement.maximum,
              npc.system.movement.maximum,
              "Same maximum movement"
            );
          });

          it("should both support useVoid flag", async () => {
            await pc.update({ "system.initiative.useVoid": true });
            await npc.update({ "system.initiative.useVoid": true });

            assert.isTrue(pc.system.initiative.useVoid, "PC useVoid set");
            assert.isTrue(npc.system.initiative.useVoid, "NPC useVoid set");
          });
        });
      });
    },
    { displayName: "L5R4: Combat Modifiers (Initiative & Movement)" }
  );
}
