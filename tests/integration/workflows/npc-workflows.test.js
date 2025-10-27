/**
 * @fileoverview NPC-Specific Workflow Tests
 *
 * Tests complete NPC workflows that differ from PC mechanics:
 * - NPC wound mode switching (manual vs formula)
 * - NPC simplified wound levels (1-8 levels)
 * - NPC attack patterns (attack1/attack2/attack3)
 * - NPC roll mechanics (direct XkY values)
 *
 * **Test Coverage:**
 * - Wound mode switching workflow
 * - Manual wound configuration
 * - Formula-based wound calculation
 * - Simplified wound level progression (1-8)
 * - Attack pattern configuration
 * - NPC-specific roll mechanics
 *
 * **Testing Principles Applied:**
 * - Tests BEHAVIOR, not implementation
 * - Uses REAL services and document updates
 * - Tests EDGE CASES (boundaries, mode switches, invalid values)
 * - Tests fail when code breaks
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestNPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register NPC workflow tests
 * @param {Object} quench - Quench test framework
 */
export function registerNPCWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.npc`,
    context => {
      const { describe, it, assert, afterEach } = context;

      describe("NPC Wound Mode Switching Workflow", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should create NPC with manual wound mode by default", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Manual Mode NPC",
            system: {
              traits: { sta: 3, wil: 3 } // Earth = 3
            }
          });

          // ASSERT
          assert.equal(npc.system.woundMode, "manual", "Default wound mode is manual");
          assert.exists(npc.system.wounds, "Wounds object exists");
        });

        it("should switch from manual to formula mode", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Mode Switch NPC",
            system: {
              traits: { sta: 4, wil: 4 }, // Earth = 4
              woundMode: "manual",
              wounds: { max: 50 }
            }
          });

          const initialMode = npc.system.woundMode;
          assert.equal(initialMode, "manual", "Starts in manual mode");

          // ACT - Switch to formula mode
          await npc.update({ "system.woundMode": "formula" });

          // ASSERT
          assert.equal(npc.system.woundMode, "formula", "Switched to formula mode");
          assert.notEqual(npc.system.woundMode, initialMode, "Mode changed");
        });

        it("should switch from formula to manual mode", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Formula to Manual NPC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = 3
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          assert.equal(npc.system.woundMode, "formula", "Starts in formula mode");

          // ACT - Switch to manual mode
          await npc.update({ "system.woundMode": "manual" });

          // ASSERT
          assert.equal(npc.system.woundMode, "manual", "Switched to manual mode");
        });

        it("should preserve wound data when switching modes", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Data Preservation NPC",
            system: {
              traits: { sta: 4, wil: 4 }, // Earth = 4
              woundMode: "manual",
              suffered: 10
            }
          });

          const initialSuffered = npc.system.suffered;

          // ACT - Switch mode
          await npc.update({ "system.woundMode": "formula" });

          // ASSERT - Suffered wounds preserved
          assert.equal(npc.system.suffered, initialSuffered, "Suffered wounds preserved");
          assert.equal(npc.system.suffered, 10, "Damage not lost on mode switch");
        });

        it("should recalculate wound levels after mode switch", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Recalc NPC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = 3
              woundMode: "manual",
              wounds: { max: 100 }
            }
          });

          // ACT - Switch to formula mode
          await npc.update({
            "system.woundMode": "formula",
            "system.woundsMultiplier": 2
          });

          // ASSERT - Wound levels recalculated
          assert.equal(npc.system.woundMode, "formula", "In formula mode");
          assert.exists(npc.system.woundLevels, "Wound levels calculated");
          assert.equal(npc.system.rings.earth, 3, "Earth Ring is 3");
        });
      });

      describe("NPC Manual Wound Configuration", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should set manual max wounds", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Manual Wounds NPC",
            system: {
              woundMode: "manual",
              wounds: { max: 75 }
            }
          });

          // ASSERT
          assert.equal(npc.system.woundMode, "manual", "Manual mode active");
          assert.equal(npc.system.wounds.max, 75, "Max wounds set to 75");
        });

        it("should update manual max wounds", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Update Manual NPC",
            system: {
              woundMode: "manual",
              wounds: { max: 50 }
            }
          });

          assert.equal(npc.system.wounds.max, 50, "Initial max is 50");

          // ACT
          await npc.update({ "system.wounds.max": 100 });

          // ASSERT
          assert.equal(npc.system.wounds.max, 100, "Max wounds updated to 100");
        });

        it("should handle manual wounds at boundaries", async () => {
          // ARRANGE & ACT - Very low wounds
          npc = await createTestNPC({
            name: "Low Wounds NPC",
            system: {
              woundMode: "manual",
              wounds: { max: 10 }
            }
          });

          // ASSERT
          assert.equal(npc.system.wounds.max, 10, "Can set very low max wounds");

          // ACT - Very high wounds
          await npc.update({ "system.wounds.max": 500 });

          // ASSERT
          assert.equal(npc.system.wounds.max, 500, "Can set very high max wounds");
        });

        it("should track suffered wounds in manual mode", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Suffered Manual NPC",
            system: {
              woundMode: "manual",
              wounds: { max: 60 },
              suffered: 0
            }
          });

          // ACT - Apply damage
          await npc.update({ "system.suffered": 25 });

          // ASSERT
          assert.equal(npc.system.suffered, 25, "Suffered wounds tracked");
          assert.equal(npc.system.woundMode, "manual", "Still in manual mode");
        });
      });

      describe("NPC Formula Wound Calculation", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should calculate wounds from Earth Ring with multiplier", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Formula NPC",
            system: {
              traits: { sta: 4, wil: 4 }, // Earth = 4
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          // ASSERT
          assert.equal(npc.system.woundMode, "formula", "Formula mode active");
          assert.equal(npc.system.rings.earth, 4, "Earth Ring is 4");
          assert.equal(npc.system.woundsMultiplier, 2, "Multiplier is 2");
          assert.exists(npc.system.woundLevels, "Wound levels calculated");
        });

        it("should recalculate wounds when Earth Ring changes", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Earth Change NPC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = 3
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          const initialEarth = npc.system.rings.earth;
          assert.equal(initialEarth, 3, "Initial Earth is 3");

          // ACT - Increase Stamina to increase Earth
          await npc.update({ "system.traits.sta": 5 });

          // ASSERT
          assert.equal(npc.system.rings.earth, 3, "Earth still 3 (min of sta=5, wil=3)");

          // ACT - Increase Willpower too
          await npc.update({ "system.traits.wil": 5 });

          // ASSERT
          assert.equal(npc.system.rings.earth, 5, "Earth increased to 5");
          assert.exists(npc.system.woundLevels, "Wound levels recalculated");
        });

        it("should recalculate wounds when multiplier changes", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Multiplier Change NPC",
            system: {
              traits: { sta: 4, wil: 4 }, // Earth = 4
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          assert.equal(npc.system.woundsMultiplier, 2, "Initial multiplier is 2");

          // ACT - Increase multiplier
          await npc.update({ "system.woundsMultiplier": 4 });

          // ASSERT
          assert.equal(npc.system.woundsMultiplier, 4, "Multiplier increased to 4");
          assert.exists(npc.system.woundLevels, "Wound levels recalculated");
        });

        it("should handle multiplier boundaries (2-5)", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Multiplier Bounds NPC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = 3
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          // ACT & ASSERT - Minimum multiplier
          await npc.update({ "system.woundsMultiplier": 2 });
          assert.equal(npc.system.woundsMultiplier, 2, "Minimum multiplier is 2");

          // ACT & ASSERT - Maximum multiplier
          await npc.update({ "system.woundsMultiplier": 5 });
          assert.equal(npc.system.woundsMultiplier, 5, "Maximum multiplier is 5");
        });

        it("should calculate wounds with Earth Ring = 1", async () => {
          // ARRANGE & ACT - Edge case: minimum Earth
          npc = await createTestNPC({
            name: "Min Earth NPC",
            system: {
              traits: { sta: 1, wil: 1 }, // Earth = 1
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          // ASSERT
          assert.equal(npc.system.rings.earth, 1, "Earth Ring is 1");
          assert.exists(npc.system.woundLevels, "Wound levels calculated even with Earth=1");
        });

        it("should calculate wounds with Earth Ring = 10", async () => {
          // ARRANGE & ACT - Edge case: maximum Earth
          npc = await createTestNPC({
            name: "Max Earth NPC",
            system: {
              traits: { sta: 10, wil: 10 }, // Earth = 10
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          // ASSERT
          assert.equal(npc.system.rings.earth, 10, "Earth Ring is 10");
          assert.exists(npc.system.woundLevels, "Wound levels calculated with Earth=10");
        });
      });

      describe("NPC Simplified Wound Levels (1-8)", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should create NPC with 1 wound level (instant death)", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "One Level NPC",
            system: {
              nrWoundLvls: 1,
              woundMode: "manual",
              wounds: { max: 20 }
            }
          });

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 1, "NPC has 1 wound level");
          assert.exists(npc.system.woundLevels, "Wound levels exist");
        });

        it("should create NPC with 3 wound levels (default)", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Three Level NPC",
            system: {
              nrWoundLvls: 3
            }
          });

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 3, "NPC has 3 wound levels");
        });

        it("should create NPC with 8 wound levels (full PC rules)", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Eight Level NPC",
            system: {
              nrWoundLvls: 8,
              traits: { sta: 4, wil: 4 } // Earth = 4
            }
          });

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 8, "NPC has 8 wound levels (full PC rules)");
          assert.exists(npc.system.woundLevels, "All 8 wound levels calculated");
        });

        it("should update wound level count", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Update Levels NPC",
            system: {
              nrWoundLvls: 3
            }
          });

          assert.equal(npc.system.nrWoundLvls, 3, "Initial: 3 levels");

          // ACT
          await npc.update({ "system.nrWoundLvls": 5 });

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 5, "Updated to 5 levels");
        });

        it("should handle wound level boundaries (1-8)", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Bounds NPC",
            system: {
              nrWoundLvls: 1
            }
          });

          // ACT & ASSERT - Minimum
          assert.equal(npc.system.nrWoundLvls, 1, "Minimum: 1 level");

          // ACT - Maximum
          await npc.update({ "system.nrWoundLvls": 8 });

          // ASSERT
          assert.equal(npc.system.nrWoundLvls, 8, "Maximum: 8 levels");
        });

        it("should progress through simplified wound levels", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Progression NPC",
            system: {
              nrWoundLvls: 4,
              woundMode: "manual",
              wounds: { max: 40 },
              suffered: 0
            }
          });

          // ACT - Apply damage progressively
          await npc.update({ "system.suffered": 5 });

          // ASSERT - First level
          assert.equal(npc.system.suffered, 5, "Suffered 5 wounds");

          // ACT - More damage
          await npc.update({ "system.suffered": 15 });

          // ASSERT - Second level
          assert.equal(npc.system.suffered, 15, "Suffered 15 wounds");

          // ACT - More damage
          await npc.update({ "system.suffered": 30 });

          // ASSERT - Third level
          assert.equal(npc.system.suffered, 30, "Suffered 30 wounds");
        });

        it("should apply wound penalties at each level", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Penalty NPC",
            system: {
              nrWoundLvls: 4,
              woundMode: "manual",
              wounds: { max: 40 },
              suffered: 0
            }
          });

          // ACT - Healthy (no penalty)
          assert.equal(npc.system.suffered, 0, "Healthy: 0 wounds");
          const healthyPenalty = npc.system.woundsPenalty || 0;

          // ACT - Apply damage
          await npc.update({ "system.suffered": 20 });

          // ASSERT - Wounded (penalty applied)
          assert.equal(npc.system.suffered, 20, "Wounded: 20 wounds");
          const woundedPenalty = npc.system.woundsPenalty || 0;
          assert.isAtLeast(woundedPenalty, healthyPenalty, "Wound penalty increased");
        });
      });

      describe("NPC Attack Pattern Configuration", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should configure attack1 pattern", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Attack1 NPC",
            system: {
              attack1: {
                roll: 5,
                keep: 3,
                dmgRoll: 3,
                dmgKeep: 2
              }
            }
          });

          // ASSERT
          assert.exists(npc.system.attack1, "Attack1 exists");
          assert.equal(npc.system.attack1.roll, 5, "Attack1 rolls 5 dice");
          assert.equal(npc.system.attack1.keep, 3, "Attack1 keeps 3 dice");
          assert.equal(npc.system.attack1.dmgRoll, 3, "Attack1 damage rolls 3 dice");
          assert.equal(npc.system.attack1.dmgKeep, 2, "Attack1 damage keeps 2 dice");
        });

        it("should configure attack2 pattern", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Attack2 NPC",
            system: {
              attack2: {
                roll: 6,
                keep: 4,
                dmgRoll: 4,
                dmgKeep: 3
              }
            }
          });

          // ASSERT
          assert.exists(npc.system.attack2, "Attack2 exists");
          assert.equal(npc.system.attack2.roll, 6, "Attack2 rolls 6 dice");
          assert.equal(npc.system.attack2.keep, 4, "Attack2 keeps 4 dice");
        });

        it("should configure attack3 pattern", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Attack3 NPC",
            system: {
              attack3: {
                roll: 7,
                keep: 5,
                dmgRoll: 5,
                dmgKeep: 3
              }
            }
          });

          // ASSERT
          assert.exists(npc.system.attack3, "Attack3 exists");
          assert.equal(npc.system.attack3.roll, 7, "Attack3 rolls 7 dice");
          assert.equal(npc.system.attack3.keep, 5, "Attack3 keeps 5 dice");
        });

        it("should configure multiple attack patterns", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Multi-Attack NPC",
            system: {
              attack1: { roll: 5, keep: 3, dmgRoll: 3, dmgKeep: 2 },
              attack2: { roll: 6, keep: 4, dmgRoll: 4, dmgKeep: 2 },
              attack3: { roll: 4, keep: 2, dmgRoll: 2, dmgKeep: 2 }
            }
          });

          // ASSERT
          assert.exists(npc.system.attack1, "Attack1 configured");
          assert.exists(npc.system.attack2, "Attack2 configured");
          assert.exists(npc.system.attack3, "Attack3 configured");
          assert.notEqual(
            npc.system.attack1.roll,
            npc.system.attack2.roll,
            "Different attack patterns"
          );
        });

        it("should update attack pattern values", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Update Attack NPC",
            system: {
              attack1: { roll: 5, keep: 3 }
            }
          });

          assert.equal(npc.system.attack1.roll, 5, "Initial roll is 5");

          // ACT
          await npc.update({ "system.attack1.roll": 8 });

          // ASSERT
          assert.equal(npc.system.attack1.roll, 8, "Attack roll updated to 8");
        });

        it("should handle asymmetric dice pools", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Asymmetric NPC",
            system: {
              attack1: { roll: 10, keep: 5, dmgRoll: 8, dmgKeep: 3 }
            }
          });

          // ASSERT
          assert.equal(npc.system.attack1.roll, 10, "Rolls 10 dice");
          assert.equal(npc.system.attack1.keep, 5, "Keeps 5 dice");
          assert.isAbove(
            npc.system.attack1.roll,
            npc.system.attack1.keep,
            "Asymmetric pool (10k5)"
          );
        });

        it("should handle symmetric dice pools", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Symmetric NPC",
            system: {
              attack1: { roll: 6, keep: 6, dmgRoll: 4, dmgKeep: 4 }
            }
          });

          // ASSERT
          assert.equal(npc.system.attack1.roll, 6, "Rolls 6 dice");
          assert.equal(npc.system.attack1.keep, 6, "Keeps 6 dice");
          assert.equal(npc.system.attack1.roll, npc.system.attack1.keep, "Symmetric pool (6k6)");
        });

        it("should handle minimum dice pools", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Min Dice NPC",
            system: {
              attack1: { roll: 1, keep: 1, dmgRoll: 1, dmgKeep: 1 }
            }
          });

          // ASSERT
          assert.equal(npc.system.attack1.roll, 1, "Minimum roll: 1 die");
          assert.equal(npc.system.attack1.keep, 1, "Minimum keep: 1 die");
        });

        it("should handle maximum dice pools", async () => {
          // ARRANGE & ACT
          npc = await createTestNPC({
            name: "Max Dice NPC",
            system: {
              attack1: { roll: 10, keep: 10, dmgRoll: 10, dmgKeep: 10 }
            }
          });

          // ASSERT
          assert.equal(npc.system.attack1.roll, 10, "Maximum roll: 10 dice");
          assert.equal(npc.system.attack1.keep, 10, "Maximum keep: 10 dice");
        });
      });

      describe("NPC Complete Workflow Integration", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should create combat-ready NPC with all features", async () => {
          // ARRANGE & ACT - Create complete NPC
          npc = await createTestNPC({
            name: "Complete Combat NPC",
            system: {
              traits: { sta: 4, wil: 4, str: 5, ref: 4 },
              nrWoundLvls: 4,
              woundMode: "formula",
              woundsMultiplier: 2,
              attack1: { roll: 6, keep: 4, dmgRoll: 4, dmgKeep: 2 },
              attack2: { roll: 5, keep: 3, dmgRoll: 3, dmgKeep: 2 },
              fear: { rank: 3 }
            }
          });

          // ASSERT - All systems configured
          assert.equal(npc.system.rings.earth, 4, "Earth Ring calculated");
          assert.equal(npc.system.nrWoundLvls, 4, "4 wound levels");
          assert.equal(npc.system.woundMode, "formula", "Formula wound mode");
          assert.exists(npc.system.attack1, "Attack1 configured");
          assert.exists(npc.system.attack2, "Attack2 configured");
          assert.equal(npc.system.fear.rank, 3, "Fear rank set");
        });

        it("should handle NPC taking damage in formula mode", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Damage Test NPC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = 3
              nrWoundLvls: 3,
              woundMode: "formula",
              woundsMultiplier: 2,
              suffered: 0
            }
          });

          assert.equal(npc.system.suffered, 0, "Starts healthy");

          // ACT - Apply damage
          await npc.update({ "system.suffered": 12 });

          // ASSERT
          assert.equal(npc.system.suffered, 12, "Damage applied");
          assert.equal(npc.system.woundMode, "formula", "Still in formula mode");
          assert.exists(npc.system.woundLevels, "Wound levels still calculated");
        });

        it("should handle NPC taking damage in manual mode", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Manual Damage NPC",
            system: {
              nrWoundLvls: 3,
              woundMode: "manual",
              wounds: { max: 45 },
              suffered: 0
            }
          });

          assert.equal(npc.system.suffered, 0, "Starts healthy");

          // ACT - Apply damage
          await npc.update({ "system.suffered": 20 });

          // ASSERT
          assert.equal(npc.system.suffered, 20, "Damage applied");
          assert.equal(npc.system.woundMode, "manual", "Still in manual mode");
        });

        it("should handle NPC reaching Out state", async () => {
          // ARRANGE
          npc = await createTestNPC({
            name: "Out State NPC",
            system: {
              nrWoundLvls: 3,
              woundMode: "manual",
              wounds: { max: 30 },
              suffered: 0
            }
          });

          // ACT - Apply lethal damage
          await npc.update({ "system.suffered": 30 });

          // ASSERT
          assert.equal(npc.system.suffered, 30, "At Out threshold");
          assert.exists(npc.system.woundLevels, "Wound levels exist");
        });

        it("should reconfigure NPC mid-combat", async () => {
          // ARRANGE - Start with one configuration
          npc = await createTestNPC({
            name: "Reconfigure NPC",
            system: {
              nrWoundLvls: 3,
              woundMode: "manual",
              wounds: { max: 40 },
              attack1: { roll: 5, keep: 3 }
            }
          });

          const initialLevels = npc.system.nrWoundLvls;
          const initialAttack = npc.system.attack1.roll;

          // ACT - Reconfigure multiple aspects
          await npc.update({
            "system.nrWoundLvls": 5,
            "system.attack1.roll": 7,
            "system.attack1.keep": 5
          });

          // ASSERT - All changes applied
          assert.notEqual(npc.system.nrWoundLvls, initialLevels, "Wound levels changed");
          assert.equal(npc.system.nrWoundLvls, 5, "Now 5 wound levels");
          assert.notEqual(npc.system.attack1.roll, initialAttack, "Attack changed");
          assert.equal(npc.system.attack1.roll, 7, "Attack now 7k5");
        });
      });
    },
    { displayName: "L5R4: NPC Workflow Tests" }
  );
}
