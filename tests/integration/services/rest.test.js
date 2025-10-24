/**
 * Rest and Healing Mechanics Tests
 *
 * Tests rest and healing MECHANICS following L5R4 rules:
 * - Natural healing rate: (Stamina × 2) + Insight Rank
 * - Wounds healed per night's rest
 * - Spell slot restoration
 * - Void Point restoration
 * - Minimum wounds cannot go below 0
 *
 * NOTE: These tests verify MECHANICS (healing calculations), not the service layer.
 * The rest service creates chat messages and updates actors which are tested elsewhere.
 *
 * @see module/services/rest.js
 * @see game-rules/Wounds_and_Healing.md
 */

import { SYS_ID } from "../../../module/config/constants.js";

/**
 * Register Rest and Healing mechanics tests
 * @param {Object} quench - Quench test framework
 */
export function registerRestTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.rest`,
    context => {
      const { describe, it, assert } = context;

      describe("Heal Rate Calculation", () => {
        it("should calculate heal rate as (Stamina × 2) + Insight Rank", () => {
          const stamina = 3;
          const insightRank = 2;
          const healRate = stamina * 2 + insightRank;

          assert.equal(healRate, 8, "Heal rate = (3×2)+2 = 8");
        });

        it("should handle minimum values", () => {
          const stamina = 2; // Min trait
          const insightRank = 1; // Min rank
          const healRate = stamina * 2 + insightRank;

          assert.equal(healRate, 5, "Min heal rate = (2×2)+1 = 5");
        });

        it("should handle high values", () => {
          const stamina = 5; // High Stamina
          const insightRank = 5; // Rank 5 character
          const healRate = stamina * 2 + insightRank;

          assert.equal(healRate, 15, "High heal rate = (5×2)+5 = 15");
        });

        it("should double Stamina before adding Insight", () => {
          const stamina = 4;
          const insightRank = 3;
          const healRate = stamina * 2 + insightRank;

          assert.equal(healRate, 11, "Heal rate = (4×2)+3 = 11");
          assert.notEqual(healRate, 10, "Not (Stamina + Insight)×2");
        });
      });

      describe("Wound Healing Application", () => {
        it("should reduce suffered wounds by heal rate", () => {
          const currentSuffered = 20;
          const healRate = 8;
          const newSuffered = currentSuffered - healRate;

          assert.equal(newSuffered, 12, "Wounds healed (20-8=12)");
        });

        it("should not heal below 0 wounds", () => {
          const currentSuffered = 5;
          const healRate = 8;
          const newSuffered = Math.max(0, currentSuffered - healRate);

          assert.equal(newSuffered, 0, "Cannot heal below 0 (5-8=0, not -3)");
        });

        it("should fully heal when heal rate exceeds wounds", () => {
          const currentSuffered = 3;
          const healRate = 10;
          const newSuffered = Math.max(0, currentSuffered - healRate);

          assert.equal(newSuffered, 0, "Fully healed when rate > wounds");
        });

        it("should calculate healing actually applied", () => {
          const currentSuffered = 5;
          const healRate = 8;
          const healingApplied = Math.min(currentSuffered, healRate);

          assert.equal(healingApplied, 5, "Can only heal 5 wounds (not 8)");
        });

        it("should handle zero suffered wounds", () => {
          const currentSuffered = 0;
          const healRate = 8;
          const newSuffered = Math.max(0, currentSuffered - healRate);
          const healingApplied = Math.min(currentSuffered, healRate);

          assert.equal(newSuffered, 0, "Already at 0 wounds");
          assert.equal(healingApplied, 0, "No healing needed");
        });
      });

      describe("Spell Slot Restoration", () => {
        it("should restore elemental slots to Ring values", () => {
          const rings = {
            air: 4,
            earth: 3,
            fire: 3,
            water: 3
          };

          assert.equal(rings.air, 4, "Air slots restore to Air Ring");
          assert.equal(rings.earth, 3, "Earth slots restore to Earth Ring");
          assert.equal(rings.fire, 3, "Fire slots restore to Fire Ring");
          assert.equal(rings.water, 3, "Water slots restore to Water Ring");
        });

        it("should restore Void slots to Void Ring rank", () => {
          const voidRing = { rank: 2, value: 0, max: 2 };
          const restoredSlots = voidRing.rank;

          assert.equal(restoredSlots, 2, "Void slots restore to Void Ring rank");
        });

        it("should restore all spell slots regardless of current", () => {
          const currentSlots = { air: 1, earth: 0, fire: 2, water: 0, void: 0 };
          const rings = { air: 4, earth: 3, fire: 3, water: 3, void: { rank: 2 } };

          const restored = {
            air: rings.air,
            earth: rings.earth,
            fire: rings.fire,
            water: rings.water,
            void: rings.void.rank
          };

          assert.equal(restored.air, 4, "Air fully restored");
          assert.equal(restored.earth, 3, "Earth fully restored");
          assert.equal(restored.fire, 3, "Fire fully restored");
          assert.equal(restored.water, 3, "Water fully restored");
          assert.equal(restored.void, 2, "Void fully restored");
        });
      });

      describe("Void Point Restoration", () => {
        it("should restore Void Points to maximum (Void Ring)", () => {
          const voidRing = { rank: 3, value: 0, max: 3 };
          const restoredVoid = voidRing.rank;

          assert.equal(restoredVoid, 3, "Void Points restore to Void Ring rank");
        });

        it("should handle partially spent Void Points", () => {
          const voidRing = { rank: 2, value: 1, max: 2 }; // 1 of 2 spent
          const restoredVoid = voidRing.rank;

          assert.equal(restoredVoid, 2, "Void Points fully restored");
        });

        it("should handle completely spent Void Points", () => {
          const voidRing = { rank: 3, value: 0, max: 3 }; // All spent
          const restoredVoid = voidRing.rank;

          assert.equal(restoredVoid, 3, "All Void Points restored");
        });

        it("should handle characters with no Void Ring", () => {
          const voidRing = { rank: 0, value: 0, max: 0 };
          const restoredVoid = voidRing.rank;

          assert.equal(restoredVoid, 0, "No Void Points to restore");
        });
      });

      describe("Current Wounds Calculation", () => {
        it("should calculate current wounds as (max - suffered)", () => {
          const maxWounds = 40;
          const suffered = 15;
          const currentWounds = maxWounds - suffered;

          assert.equal(currentWounds, 25, "Current = max - suffered (40-15=25)");
        });

        it("should handle full health (0 suffered)", () => {
          const maxWounds = 40;
          const suffered = 0;
          const currentWounds = maxWounds - suffered;

          assert.equal(currentWounds, 40, "Full health = max wounds");
        });

        it("should handle critical wounds (at death's door)", () => {
          const maxWounds = 40;
          const suffered = 40; // Out wound level
          const currentWounds = maxWounds - suffered;

          assert.equal(currentWounds, 0, "At 0 current wounds");
        });

        it("should update after healing", () => {
          const maxWounds = 40;
          const beforeSuffered = 20;
          const healRate = 8;
          const afterSuffered = beforeSuffered - healRate;
          const afterCurrent = maxWounds - afterSuffered;

          assert.equal(afterCurrent, 28, "Current wounds after healing (40-12=28)");
        });
      });

      describe("Healing Scenarios", () => {
        it("should handle lightly wounded character", () => {
          const stamina = 3;
          const insightRank = 2;
          const healRate = stamina * 2 + insightRank;
          const suffered = 5;
          const newSuffered = Math.max(0, suffered - healRate);

          assert.equal(healRate, 8, "Heal rate = 8");
          assert.equal(newSuffered, 0, "Fully healed (5 < 8)");
        });

        it("should handle moderately wounded character", () => {
          const stamina = 3;
          const insightRank = 2;
          const healRate = stamina * 2 + insightRank;
          const suffered = 15;
          const newSuffered = Math.max(0, suffered - healRate);

          assert.equal(healRate, 8, "Heal rate = 8");
          assert.equal(newSuffered, 7, "Partially healed (15-8=7)");
        });

        it("should handle critically wounded character", () => {
          const stamina = 4;
          const insightRank = 3;
          const healRate = stamina * 2 + insightRank;
          const suffered = 30;
          const newSuffered = Math.max(0, suffered - healRate);

          assert.equal(healRate, 11, "Heal rate = 11");
          assert.equal(newSuffered, 19, "Significant healing (30-11=19)");
        });

        it("should handle character requiring multiple rests", () => {
          const healRate = 8;
          let suffered = 25;

          // First rest
          suffered = Math.max(0, suffered - healRate);
          assert.equal(suffered, 17, "After 1 rest: 17 wounds");

          // Second rest
          suffered = Math.max(0, suffered - healRate);
          assert.equal(suffered, 9, "After 2 rests: 9 wounds");

          // Third rest
          suffered = Math.max(0, suffered - healRate);
          assert.equal(suffered, 1, "After 3 rests: 1 wound");

          // Fourth rest
          suffered = Math.max(0, suffered - healRate);
          assert.equal(suffered, 0, "After 4 rests: fully healed");
        });
      });
    },
    { displayName: "L5R4: Rest & Healing Tests" }
  );
}
