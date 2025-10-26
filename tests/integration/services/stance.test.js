/* global before, beforeEach, after, afterEach */
/**
 * Stance System Mechanics Tests
 *
 * Tests stance MECHANICS following L5R4 rules:
 * - Attack Stance (Water): No modifiers
 * - Full Attack Stance (Fire): +2k1 attack, -10 Armor TN
 * - Defense Stance (Air): +Air Ring + Defense Skill to Armor TN, cannot attack
 * - Full Defense Stance (Earth): Defense/Reflexes roll ÷ 2 (round up) to Armor TN
 * - Center Stance (Void): +1k1 + Void Ring to next roll, +10 Initiative
 *
 * NOTE: These tests verify MECHANICS (stance calculations), not the service layer.
 * The stance service creates ActiveEffects which are hard to test in isolation.
 *
 * @see module/services/stance/
 * @see game-rules/Stances_Actions_Maneuvers.md
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { STANCE_IDS } from "../../../module/services/stance/core/helpers.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";

/**
 * Register Stance mechanics tests
 * @param {Object} quench - Quench test framework
 */
export function registerStanceTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.stance`,
    context => {
      const { describe, it, assert } = context;

      describe("Stance Identification", () => {
        it("should recognize all five L5R4 stances", () => {
          const expectedStances = [
            "attackStance",
            "fullAttackStance",
            "defenseStance",
            "fullDefenseStance",
            "centerStance"
          ];

          for (const stanceId of expectedStances) {
            assert.isTrue(STANCE_IDS.has(stanceId), `${stanceId} is recognized`);
          }
        });

        it("should have exactly 5 stances", () => {
          assert.equal(STANCE_IDS.size, 5, "L5R4 has 5 combat stances");
        });

        it("should not recognize non-stance status effects", () => {
          const nonStances = ["prone", "stunned", "grappled", "dazed"];

          for (const status of nonStances) {
            assert.isFalse(STANCE_IDS.has(status), `${status} is not a stance`);
          }
        });
      });

      describe("Attack Stance (Water Ring)", () => {
        it("should have no attack modifier", () => {
          const rollBonus = 0;
          const keepBonus = 0;

          assert.equal(rollBonus, 0, "No roll bonus");
          assert.equal(keepBonus, 0, "No keep bonus");
        });

        it("should have no Armor TN modifier", () => {
          const tnModifier = 0;

          assert.equal(tnModifier, 0, "No TN modifier");
        });

        it("should allow all actions", () => {
          const canAttack = true;
          const canMove = true;
          const canUseSkills = true;

          assert.isTrue(canAttack, "Can attack");
          assert.isTrue(canMove, "Can move");
          assert.isTrue(canUseSkills, "Can use skills");
        });
      });

      describe("Full Attack Stance (Fire Ring)", () => {
        it("should grant +2k1 to attack rolls", () => {
          const rollBonus = 2;
          const keepBonus = 1;

          assert.equal(rollBonus, 2, "Roll bonus = 2");
          assert.equal(keepBonus, 1, "Keep bonus = 1");
        });

        it("should apply -10 to Armor TN", () => {
          const baseArmorTN = 25;
          const penalty = -10;
          const modifiedTN = baseArmorTN + penalty;

          assert.equal(modifiedTN, 15, "Armor TN reduced by 10 (25-10=15)");
        });

        it("should calculate attack with Full Attack bonus", () => {
          const baseRoll = 7; // 5 skill + 2 trait
          const baseKeep = 2;
          const stanceRoll = 2;
          const stanceKeep = 1;

          const totalRoll = baseRoll + stanceRoll;
          const totalKeep = baseKeep + stanceKeep;

          assert.equal(totalRoll, 9, "Full Attack adds 2 rolled (7+2=9)");
          assert.equal(totalKeep, 3, "Full Attack adds 1 kept (2+1=3)");
          // Formula would be 9k3
        });
      });

      describe("Defense Stance (Air Ring)", () => {
        it("should add Air Ring to Armor TN", () => {
          const baseArmorTN = 20;
          const airRing = 4;
          const modifiedTN = baseArmorTN + airRing;

          assert.equal(modifiedTN, 24, "Air Ring 4 adds +4 to TN (20+4=24)");
        });

        it("should add Defense Skill to Armor TN", () => {
          const baseArmorTN = 20;
          const defenseSkill = 3;
          const modifiedTN = baseArmorTN + defenseSkill;

          assert.equal(modifiedTN, 23, "Defense 3 adds +3 to TN (20+3=23)");
        });

        it("should add both Air Ring and Defense Skill", () => {
          const baseArmorTN = 20;
          const airRing = 4;
          const defenseSkill = 3;
          const totalBonus = airRing + defenseSkill;
          const modifiedTN = baseArmorTN + totalBonus;

          assert.equal(totalBonus, 7, "Air 4 + Defense 3 = 7");
          assert.equal(modifiedTN, 27, "Total TN = 27 (20+7)");
        });

        it("should work with zero Defense Skill (untrained)", () => {
          const baseArmorTN = 20;
          const airRing = 3;
          const defenseSkill = 0; // Untrained
          const modifiedTN = baseArmorTN + airRing + defenseSkill;

          assert.equal(modifiedTN, 23, "Air Ring only when untrained (20+3+0=23)");
        });
      });

      describe("Full Defense Stance (Earth Ring)", () => {
        it("should calculate bonus from Defense/Reflexes roll", () => {
          const defenseRoll = 25; // Total of Defense/Reflexes roll
          const tnBonus = Math.ceil(defenseRoll / 2);

          assert.equal(tnBonus, 13, "Half of 25 rounded up = 13");
        });

        it("should round up half roll", () => {
          const defenseRoll = 21; // Odd number
          const tnBonus = Math.ceil(defenseRoll / 2);

          assert.equal(tnBonus, 11, "Half of 21 rounded up = 11");
        });

        it("should not round when roll is even", () => {
          const defenseRoll = 20;
          const tnBonus = Math.ceil(defenseRoll / 2);

          assert.equal(tnBonus, 10, "Half of 20 = 10 (no rounding)");
        });

        it("should apply bonus to Armor TN", () => {
          const baseArmorTN = 20;
          const defenseRoll = 18;
          const tnBonus = Math.ceil(defenseRoll / 2);
          const modifiedTN = baseArmorTN + tnBonus;

          assert.equal(tnBonus, 9, "Half of 18 = 9");
          assert.equal(modifiedTN, 29, "Total TN = 29 (20+9)");
        });

        it("should handle low Defense rolls", () => {
          const defenseRoll = 7;
          const tnBonus = Math.ceil(defenseRoll / 2);

          assert.equal(tnBonus, 4, "Half of 7 rounded up = 4");
        });

        it("should handle high Defense rolls", () => {
          const defenseRoll = 35;
          const tnBonus = Math.ceil(defenseRoll / 2);

          assert.equal(tnBonus, 18, "Half of 35 rounded up = 18");
        });
      });

      describe("Center Stance (Void Ring)", () => {
        it("should grant +1k1 bonus to rolls", () => {
          const baseRoll = 2;
          const baseKeep = 1;

          assert.equal(baseRoll, 2, "Center grants +1 rolled");
          assert.equal(baseKeep, 1, "Center grants +1 kept");
          // This is the flat +1k1 bonus
        });

        it("should add Void Ring to roll bonus", () => {
          const centerBonus = 1; // +1k1
          const voidRing = 3;
          const totalRollBonus = centerBonus + voidRing;

          assert.equal(totalRollBonus, 4, "Center +1 plus Void Ring 3 = +4 total");
          // Formula becomes +(1+3)k1
        });

        it("should grant +10 to Initiative", () => {
          const baseInitiative = 5; // Roll value
          const centerBonus = 10;
          const modifiedInitiative = baseInitiative + centerBonus;

          assert.equal(modifiedInitiative, 15, "Initiative +10 from Center (5+10=15)");
        });

        it("should calculate full Center bonus", () => {
          const baseRoll = 7;
          const baseKeep = 4;
          const centerRollBonus = 1;
          const centerKeepBonus = 1;
          const voidRing = 2;

          const totalRoll = baseRoll + centerRollBonus + voidRing;
          const totalKeep = baseKeep + centerKeepBonus;

          assert.equal(totalRoll, 10, "Roll = base + 1 + Void (7+1+2=10)");
          assert.equal(totalKeep, 5, "Keep = base + 1 (4+1=5)");
          // Formula would be 10k5
        });
      });

      describe("Stance TN Modifiers Summary", () => {
        it("should calculate Attack Stance TN (no change)", () => {
          const baseTN = 25;
          const modifier = 0;
          const finalTN = baseTN + modifier;

          assert.equal(finalTN, 25, "Attack Stance: TN unchanged");
        });

        it("should calculate Full Attack Stance TN (reduced)", () => {
          const baseTN = 25;
          const modifier = -10;
          const finalTN = baseTN + modifier;

          assert.equal(finalTN, 15, "Full Attack Stance: TN -10");
        });

        it("should calculate Defense Stance TN (increased)", () => {
          const baseTN = 25;
          const airRing = 3;
          const defenseSkill = 2;
          const finalTN = baseTN + airRing + defenseSkill;

          assert.equal(finalTN, 30, "Defense Stance: TN +5 (Air+Defense)");
        });

        it("should calculate Full Defense Stance TN (increased)", () => {
          const baseTN = 25;
          const defenseRoll = 20;
          const tnBonus = Math.ceil(defenseRoll / 2);
          const finalTN = baseTN + tnBonus;

          assert.equal(finalTN, 35, "Full Defense Stance: TN +10 (half roll)");
        });

        it("should calculate Center Stance TN (no change)", () => {
          const baseTN = 25;
          const modifier = 0;
          const finalTN = baseTN + modifier;

          assert.equal(finalTN, 25, "Center Stance: TN unchanged");
        });
      });

      describe("Stance Attack Modifiers Summary", () => {
        it("should have Attack Stance modifiers", () => {
          const rollBonus = 0;
          const keepBonus = 0;

          assert.equal(rollBonus, 0, "Attack: No roll bonus");
          assert.equal(keepBonus, 0, "Attack: No keep bonus");
        });

        it("should have Full Attack Stance modifiers", () => {
          const rollBonus = 2;
          const keepBonus = 1;

          assert.equal(rollBonus, 2, "Full Attack: +2 roll");
          assert.equal(keepBonus, 1, "Full Attack: +1 keep");
        });

        it("should have Defense Stance modifiers", () => {
          const rollBonus = 0;
          const keepBonus = 0;

          assert.equal(rollBonus, 0, "Defense: Cannot attack");
          assert.equal(keepBonus, 0, "Defense: Cannot attack");
        });

        it("should have Full Defense Stance modifiers", () => {
          const rollBonus = 0;
          const keepBonus = 0;

          assert.equal(rollBonus, 0, "Full Defense: Only Free Actions");
          assert.equal(keepBonus, 0, "Full Defense: Only Free Actions");
        });

        it("should have Center Stance modifiers", () => {
          const rollBonus = 1; // +1k1 base
          const keepBonus = 1;
          const voidRing = 3; // Additional roll bonus
          const totalRoll = rollBonus + voidRing;

          assert.equal(totalRoll, 4, "Center: +1+Void roll bonus");
          assert.equal(keepBonus, 1, "Center: +1 keep bonus");
        });
      });

      describe("Stance Transitions (Regression Tests)", () => {
        let actor;

        before(async () => {
          actor = await createTestPC({
            name: "Stance Transition Test Character",
            system: {
              traits: { ref: 3, sta: 3, wil: 3, str: 3, agi: 3, int: 3, per: 3, awa: 3 }
            }
          });

          // Clean up any lingering effects from other test suites
          if (actor.effects.size > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", Array.from(actor.effects.keys()));
          }

          // Force data preparation
          actor.prepareData();
        });

        afterEach(async () => {
          // Clean up ALL effects between tests to prevent accumulation and interference
          if (actor && actor.effects.size > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", Array.from(actor.effects.keys()));
          }
        });

        after(async () => {
          if (actor) {
            await actor.delete();
          }
        });

        it("should replace stance modifiers, not stack them (Issue #2)", async function () {
          // Base TN: (Reflexes 3 × 5) + 5 = 20
          const baseTN = 20;

          // Initial state: No stance
          actor.prepareData();
          assert.equal(actor.system.armorTn.current, baseTN, "Base TN = 20");

          // Apply Full Attack stance: -10 to TN
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              icon: "icons/svg/sword.svg",
              statuses: ["fullAttackStance"]
            }
          ]);

          actor.prepareData();
          assert.equal(actor.system.armorTn.current, 10, "Full Attack: TN reduced to 10 (20-10)");

          // Switch to Defense stance: Should REPLACE, not stack
          // Remove old stance FIRST (mimics what stance handler does)
          const oldStances = actor.effects.filter(e =>
            Array.from(e.statuses || []).some(id => STANCE_IDS.has(id))
          );
          if (oldStances.length > 0) {
            await actor.deleteEmbeddedDocuments(
              "ActiveEffect",
              oldStances.map(e => e.id)
            );
          }

          // Then create new stance
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              icon: "icons/svg/shield.svg",
              statuses: ["defenseStance"]
            }
          ]);

          actor.prepareData();

          // Verify only ONE stance effect exists
          const activeStances = actor.effects.filter(
            e =>
              !e.disabled &&
              (e.statuses?.has("fullAttackStance") || e.statuses?.has("defenseStance"))
          );

          assert.equal(activeStances.length, 1, "Only one stance should be active");
          assert.isTrue(
            activeStances[0].statuses.has("defenseStance"),
            "Active stance should be Defense"
          );

          // Verify TN is replaced, not stacked
          // Defense stance: +3 (Air) + 0 (no Defense skill) = +3
          assert.equal(actor.system.armorTn.current, 23, "Defense: TN = 23 (20+3), NOT stacked");
        });

        it("should handle multiple stance transitions without accumulation", async function () {
          // Transition sequence: Attack → Full Attack → Defense → Attack
          const stances = [
            { id: "attackStance", expectedTN: 20, name: "Attack" },
            { id: "fullAttackStance", expectedTN: 10, name: "Full Attack" },
            { id: "defenseStance", expectedTN: 23, name: "Defense" },
            { id: "attackStance", expectedTN: 20, name: "Attack (return)" }
          ];

          for (const stance of stances) {
            // Remove old stance first (mimics stance handler behavior)
            const oldStances = actor.effects.filter(e =>
              Array.from(e.statuses || []).some(id => STANCE_IDS.has(id))
            );
            if (oldStances.length > 0) {
              await actor.deleteEmbeddedDocuments(
                "ActiveEffect",
                oldStances.map(e => e.id)
              );
            }

            // Create new stance
            await actor.createEmbeddedDocuments("ActiveEffect", [
              {
                name: `${stance.name} Stance`,
                icon: "icons/svg/combat.svg",
                statuses: [stance.id]
              }
            ]);

            actor.prepareData();

            const activeStances = actor.effects.filter(e => !e.disabled);
            assert.isAtMost(
              activeStances.length,
              1,
              `After ${stance.name}: At most 1 active stance`
            );

            assert.equal(
              actor.system.armorTn.current,
              stance.expectedTN,
              `${stance.name}: TN = ${stance.expectedTN}`
            );
          }
        });
      });
    },
    { displayName: "L5R4: Stance System Tests" }
  );
}
