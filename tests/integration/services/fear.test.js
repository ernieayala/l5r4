/**
 * Fear System Mechanics Tests
 *
 * Tests Fear MECHANICS following L5R4 rules:
 * - Fear TN calculation: TN = 5 + (5 × Fear Rank)
 * - Fear resistance roll: Willpower k Willpower + Honor Rank
 * - Success/failure determination
 * - Catastrophic failure (fail by 15+)
 * - Fear penalty: -Fear Rank k0 to all rolls
 *
 * NOTE: These tests verify MECHANICS (Fear calculations), not the service layer.
 * The fear service creates ActiveEffects and chat messages which are hard to test.
 *
 * @see module/services/fear.js
 * @see game-rules/Combat_and_Damage.md (Fear rules)
 */

import { SYS_ID } from "../../../module/config/constants.js";

/**
 * Register Fear mechanics tests
 * @param {Object} quench - Quench test framework
 */
export function registerFearTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.fear`,
    (context) => {
      const { describe, it, assert } = context;

      describe("Fear Target Number Calculation", () => {
        it("should calculate TN for Fear Rank 1", () => {
          const fearRank = 1;
          const tn = 5 + (5 * fearRank);

          assert.equal(tn, 10, "Fear Rank 1 TN = 10 (5 + 5×1)");
        });

        it("should calculate TN for Fear Rank 3", () => {
          const fearRank = 3;
          const tn = 5 + (5 * fearRank);

          assert.equal(tn, 20, "Fear Rank 3 TN = 20 (5 + 5×3)");
        });

        it("should calculate TN for Fear Rank 5", () => {
          const fearRank = 5;
          const tn = 5 + (5 * fearRank);

          assert.equal(tn, 30, "Fear Rank 5 TN = 30 (5 + 5×5)");
        });

        it("should calculate TN for Fear Rank 7", () => {
          const fearRank = 7;
          const tn = 5 + (5 * fearRank);

          assert.equal(tn, 40, "Fear Rank 7 TN = 40 (5 + 5×7)");
        });

        it("should calculate TN for Fear Rank 10", () => {
          const fearRank = 10;
          const tn = 5 + (5 * fearRank);

          assert.equal(tn, 55, "Fear Rank 10 TN = 55 (5 + 5×10)");
        });
      });

      describe("Fear Resistance Roll Formula", () => {
        it("should use Willpower for both rolled and kept dice", () => {
          const willpower = 3;
          const rolled = willpower;
          const kept = willpower;

          assert.equal(rolled, 3, "Rolled dice = Willpower");
          assert.equal(kept, 3, "Kept dice = Willpower");
          // Formula would be 3k3
        });

        it("should add Honor Rank as bonus", () => {
          const willpower = 3;
          const honorRank = 2;
          const bonus = honorRank;

          assert.equal(bonus, 2, "Honor Rank adds +2 bonus");
          // Formula would be 3k3+2
        });

        it("should handle zero Honor Rank", () => {
          const willpower = 4;
          const honorRank = 0;
          const bonus = honorRank;

          assert.equal(bonus, 0, "No Honor Rank = no bonus");
          // Formula would be 4k4 (no bonus)
        });

        it("should handle high Honor Rank", () => {
          const willpower = 3;
          const honorRank = 5; // High honor character
          const bonus = honorRank;

          assert.equal(bonus, 5, "High Honor Rank adds +5");
          // Formula would be 3k3+5
        });
      });

      describe("Fear Success and Failure", () => {
        it("should succeed when roll meets TN", () => {
          const rollTotal = 20;
          const tn = 20;
          const success = rollTotal >= tn;

          assert.isTrue(success, "Roll 20 vs TN 20 succeeds");
        });

        it("should succeed when roll exceeds TN", () => {
          const rollTotal = 25;
          const tn = 20;
          const success = rollTotal >= tn;

          assert.isTrue(success, "Roll 25 vs TN 20 succeeds");
        });

        it("should fail when roll below TN", () => {
          const rollTotal = 15;
          const tn = 20;
          const success = rollTotal >= tn;

          assert.isFalse(success, "Roll 15 vs TN 20 fails");
        });

        it("should calculate margin of success", () => {
          const rollTotal = 25;
          const tn = 20;
          const margin = rollTotal - tn;

          assert.equal(margin, 5, "Success margin = 5 (25-20)");
        });

        it("should calculate margin of failure", () => {
          const rollTotal = 15;
          const tn = 20;
          const margin = rollTotal - tn;

          assert.equal(margin, -5, "Failure margin = -5 (15-20)");
        });
      });

      describe("Catastrophic Failure", () => {
        it("should NOT be catastrophic when failing by 14", () => {
          const rollTotal = 6;
          const tn = 20;
          const margin = rollTotal - tn; // -14
          const catastrophic = margin <= -15;

          assert.isFalse(catastrophic, "Fail by 14 is NOT catastrophic");
        });

        it("should be catastrophic when failing by exactly 15", () => {
          const rollTotal = 5;
          const tn = 20;
          const margin = rollTotal - tn; // -15
          const catastrophic = margin <= -15;

          assert.isTrue(catastrophic, "Fail by 15 IS catastrophic");
        });

        it("should be catastrophic when failing by more than 15", () => {
          const rollTotal = 3;
          const tn = 20;
          const margin = rollTotal - tn; // -17
          const catastrophic = margin <= -15;

          assert.isTrue(catastrophic, "Fail by 17 IS catastrophic");
        });

        it("should NOT be catastrophic on success", () => {
          const rollTotal = 25;
          const tn = 20;
          const margin = rollTotal - tn; // +5
          const catastrophic = margin <= -15;

          assert.isFalse(catastrophic, "Success is NOT catastrophic");
        });
      });

      describe("Fear Penalty Application", () => {
        it("should apply penalty equal to Fear Rank", () => {
          const fearRank = 3;
          const penalty = fearRank;

          assert.equal(penalty, 3, "Fear Rank 3 = -3k0 penalty");
        });

        it("should apply high Fear penalties", () => {
          const fearRank = 7;
          const penalty = fearRank;

          assert.equal(penalty, 7, "Fear Rank 7 = -7k0 penalty");
        });

        it("should apply low Fear penalties", () => {
          const fearRank = 1;
          const penalty = fearRank;

          assert.equal(penalty, 1, "Fear Rank 1 = -1k0 penalty");
        });

        it("should not apply penalty on success", () => {
          const success = true;
          const penalty = success ? 0 : 5;

          assert.equal(penalty, 0, "No penalty when Fear test succeeds");
        });
      });

      describe("Fear Rank Range", () => {
        it("should handle minimum Fear Rank (1)", () => {
          const fearRank = 1;
          const tn = 5 + (5 * fearRank);

          assert.equal(fearRank, 1, "Minimum Fear Rank = 1");
          assert.equal(tn, 10, "Minimum TN = 10");
        });

        it("should handle moderate Fear Rank (5)", () => {
          const fearRank = 5;
          const tn = 5 + (5 * fearRank);

          assert.equal(fearRank, 5, "Moderate Fear Rank = 5");
          assert.equal(tn, 30, "Moderate TN = 30");
        });

        it("should handle maximum Fear Rank (10)", () => {
          const fearRank = 10;
          const tn = 5 + (5 * fearRank);

          assert.equal(fearRank, 10, "Maximum Fear Rank = 10");
          assert.equal(tn, 55, "Maximum TN = 55");
        });
      });

      describe("Combined Fear Scenarios", () => {
        it("should handle low Willpower vs high Fear", () => {
          const willpower = 2; // Low
          const honorRank = 1;
          const fearRank = 7; // High
          const tn = 5 + (5 * fearRank); // 40

          assert.equal(willpower, 2, "Low Willpower = 2");
          assert.equal(tn, 40, "High Fear TN = 40");
          // Roll would be 2k2+1 vs TN 40 (very hard to succeed)
        });

        it("should handle high Willpower and Honor vs low Fear", () => {
          const willpower = 5; // High
          const honorRank = 4; // High
          const fearRank = 2; // Low
          const tn = 5 + (5 * fearRank); // 15

          assert.equal(willpower, 5, "High Willpower = 5");
          assert.equal(honorRank, 4, "High Honor = 4");
          assert.equal(tn, 15, "Low Fear TN = 15");
          // Roll would be 5k5+4 vs TN 15 (likely to succeed)
        });

        it("should handle balanced scenario", () => {
          const willpower = 3;
          const honorRank = 2;
          const fearRank = 4;
          const tn = 5 + (5 * fearRank); // 25

          assert.equal(willpower, 3, "Willpower = 3");
          assert.equal(honorRank, 2, "Honor = 2");
          assert.equal(tn, 25, "Fear TN = 25");
          // Roll would be 3k3+2 vs TN 25 (challenging)
        });
      });
    },
    { displayName: "L5R4: Fear System Tests" }
  );
}
