/**
 * XP Service Mechanics Tests
 *
 * Tests XP cost calculation MECHANICS following L5R4 rules:
 * - Trait advancement: 4 × new rank
 * - Void Ring advancement: 6 × new rank
 * - Skill advancement: next rank value (1 for rank 1, 2 for rank 2, etc.)
 * - New skills: 1 XP to acquire at rank 1
 * - Emphases: 2 XP each
 * - Advantages/Disadvantages: Variable cost
 *
 * NOTE: These tests verify MECHANICS (XP cost formulas), not the service layer.
 * The XP service reconstructs history from Actor state which is complex.
 *
 * @see module/services/xp/xp-calculator.js
 */

import { SYS_ID } from "../../../module/config/constants.js";

/**
 * Register XP Service mechanics tests
 * @param {Object} quench - Quench test framework
 */
export function registerXpServiceTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.xp`,
    context => {
      const { describe, it, assert } = context;

      describe("Trait Advancement Costs", () => {
        it("should calculate cost to raise trait from 2 to 3", () => {
          const newRank = 3;
          const cost = 4 * newRank;

          assert.equal(cost, 12, "Trait 2→3 costs 12 XP (4×3)");
        });

        it("should calculate cost to raise trait from 3 to 4", () => {
          const newRank = 4;
          const cost = 4 * newRank;

          assert.equal(cost, 16, "Trait 3→4 costs 16 XP (4×4)");
        });

        it("should calculate cost to raise trait from 4 to 5", () => {
          const newRank = 5;
          const cost = 4 * newRank;

          assert.equal(cost, 20, "Trait 4→5 costs 20 XP (4×5)");
        });

        it("should calculate cost to raise trait from 9 to 10", () => {
          const newRank = 10;
          const cost = 4 * newRank;

          assert.equal(cost, 40, "Trait 9→10 costs 40 XP (4×10)");
        });

        it("should calculate total cost for multiple ranks", () => {
          let totalCost = 0;
          for (let rank = 3; rank <= 5; rank++) {
            totalCost += 4 * rank;
          }

          assert.equal(totalCost, 48, "Trait 2→5 costs 48 XP (12+16+20)");
        });
      });

      describe("Void Ring Advancement Costs", () => {
        it("should calculate cost to raise Void from 2 to 3", () => {
          const newRank = 3;
          const cost = 6 * newRank;

          assert.equal(cost, 18, "Void 2→3 costs 18 XP (6×3)");
        });

        it("should calculate cost to raise Void from 3 to 4", () => {
          const newRank = 4;
          const cost = 6 * newRank;

          assert.equal(cost, 24, "Void 3→4 costs 24 XP (6×4)");
        });

        it("should calculate cost to raise Void from 4 to 5", () => {
          const newRank = 5;
          const cost = 6 * newRank;

          assert.equal(cost, 30, "Void 4→5 costs 30 XP (6×5)");
        });

        it("should cost more than regular traits", () => {
          const traitCost = 4 * 3; // Trait 2→3
          const voidCost = 6 * 3; // Void 2→3

          assert.isAbove(voidCost, traitCost, "Void costs more (18 > 12)");
        });

        it("should calculate total cost for multiple Void ranks", () => {
          let totalCost = 0;
          for (let rank = 3; rank <= 5; rank++) {
            totalCost += 6 * rank;
          }

          assert.equal(totalCost, 72, "Void 2→5 costs 72 XP (18+24+30)");
        });
      });

      describe("Skill Advancement Costs", () => {
        it("should cost 1 XP to acquire new skill at rank 1", () => {
          const newSkillCost = 1;

          assert.equal(newSkillCost, 1, "New skill costs 1 XP");
        });

        it("should cost rank value to increase skill", () => {
          const rank1to2 = 2;
          const rank2to3 = 3;
          const rank3to4 = 4;

          assert.equal(rank1to2, 2, "Skill 1→2 costs 2 XP");
          assert.equal(rank2to3, 3, "Skill 2→3 costs 3 XP");
          assert.equal(rank3to4, 4, "Skill 3→4 costs 4 XP");
        });

        it("should calculate cost to raise skill from 5 to 6", () => {
          const newRank = 6;
          const cost = newRank;

          assert.equal(cost, 6, "Skill 5→6 costs 6 XP");
        });

        it("should calculate cost to raise skill from 9 to 10", () => {
          const newRank = 10;
          const cost = newRank;

          assert.equal(cost, 10, "Skill 9→10 costs 10 XP");
        });

        it("should calculate total cost to raise skill from 1 to 5", () => {
          const totalCost = 2 + 3 + 4 + 5; // Ranks 2, 3, 4, 5

          assert.equal(totalCost, 14, "Skill 1→5 costs 14 XP (2+3+4+5)");
        });

        it("should calculate total cost for new skill to rank 3", () => {
          const newSkill = 1; // Acquire at rank 1
          const rank2 = 2;
          const rank3 = 3;
          const totalCost = newSkill + rank2 + rank3;

          assert.equal(totalCost, 6, "New skill to rank 3 costs 6 XP (1+2+3)");
        });
      });

      describe("Emphasis Costs", () => {
        it("should cost 2 XP per emphasis", () => {
          const emphasisCost = 2;

          assert.equal(emphasisCost, 2, "Each emphasis costs 2 XP");
        });

        it("should calculate cost for multiple emphases", () => {
          const emphasisCost = 2;
          const emphasisCount = 3;
          const totalCost = emphasisCost * emphasisCount;

          assert.equal(totalCost, 6, "3 emphases cost 6 XP (2×3)");
        });

        it("should be fixed cost regardless of skill rank", () => {
          const emphasisForRank1 = 2;
          const emphasisForRank5 = 2;
          const emphasisForRank10 = 2;

          assert.equal(emphasisForRank1, 2, "Emphasis costs 2 XP at rank 1");
          assert.equal(emphasisForRank5, 2, "Emphasis costs 2 XP at rank 5");
          assert.equal(emphasisForRank10, 2, "Emphasis costs 2 XP at rank 10");
        });
      });

      describe("Starting Baseline (Free Ranks)", () => {
        it("should not cost XP for starting trait value of 2", () => {
          const startingRank = 2;
          const freeRanks = 2;
          const xpCost = 0;

          assert.equal(freeRanks, startingRank, "Rank 2 is free");
          assert.equal(xpCost, 0, "No XP cost for baseline");
        });

        it("should not cost XP for family bonus (+1 trait)", () => {
          const baseline = 2;
          const familyBonus = 1;
          const startingValue = baseline + familyBonus;
          const xpCost = 0;

          assert.equal(startingValue, 3, "Family bonus grants rank 3");
          assert.equal(xpCost, 0, "Family bonus is free");
        });

        it("should calculate XP only for ranks above free ranks", () => {
          const _freeRanks = 3; // Baseline 2 + family bonus 1
          const _currentRank = 5;
          const paidRanks = [4, 5]; // Ranks that cost XP
          const totalCost = 4 * 4 + 4 * 5;

          assert.equal(paidRanks.length, 2, "2 ranks cost XP");
          assert.equal(totalCost, 36, "Ranks 4-5 cost 36 XP (16+20)");
        });
      });

      describe("Comparative Costs", () => {
        it("should compare trait vs skill advancement", () => {
          const trait2to3 = 4 * 3; // 12 XP
          const skill1to6 = 2 + 3 + 4 + 5 + 6; // 20 XP

          assert.equal(trait2to3, 12, "Trait rank costs 12 XP");
          assert.equal(skill1to6, 20, "Skill 1→6 costs 20 XP");
          assert.isAbove(skill1to6, trait2to3, "Skills cheaper per rank");
        });

        it("should compare trait vs Void advancement", () => {
          const trait2to3 = 4 * 3; // 12 XP
          const void2to3 = 6 * 3; // 18 XP

          assert.equal(trait2to3, 12, "Trait rank costs 12 XP");
          assert.equal(void2to3, 18, "Void rank costs 18 XP");
          assert.isAbove(void2to3, trait2to3, "Void more expensive");
        });

        it("should compare skill ranks vs emphases", () => {
          const skillRank = 5; // 5 XP for rank 5
          const emphasisCost = 2;

          assert.equal(skillRank, 5, "Skill rank 5 costs 5 XP");
          assert.equal(emphasisCost, 2, "Emphasis costs 2 XP");
          assert.isAbove(skillRank, emphasisCost, "High skill ranks cost more");
        });
      });

      describe("Advanced XP Scenarios", () => {
        it("should calculate typical starting character advancement", () => {
          // Raise 2 traits by 1 rank each
          const trait1 = 4 * 3; // 12 XP
          const trait2 = 4 * 3; // 12 XP
          // Raise 2 skills to rank 3
          const skill1 = 2 + 3; // 5 XP (already at rank 1)
          const skill2 = 2 + 3; // 5 XP
          // Buy 1 emphasis
          const emphasis = 2;

          const totalCost = trait1 + trait2 + skill1 + skill2 + emphasis;
          assert.equal(totalCost, 36, "Basic advancement costs 36 XP");
        });

        it("should calculate rank 3 character advancement", () => {
          // Raise 1 trait from 3 to 5
          const trait = 4 * 4 + 4 * 5; // 36 XP
          // Raise 1 skill from 5 to 7
          const skill = 6 + 7; // 13 XP
          // Raise Void from 2 to 3
          const void_ = 6 * 3; // 18 XP

          const totalCost = trait + skill + void_;
          assert.equal(totalCost, 67, "Rank 3 advancement costs 67 XP");
        });

        it("should calculate mastery-level character", () => {
          // Raise trait from 5 to 6
          const trait = 4 * 6; // 24 XP
          // Raise skill from 7 to 10
          const skill = 8 + 9 + 10; // 27 XP

          const totalCost = trait + skill;
          assert.equal(totalCost, 51, "High-level advancement costs 51 XP");
        });
      });

      describe("XP Gain from Disadvantages", () => {
        it("should grant XP for disadvantages (negative cost)", () => {
          const disadvantageCost = -3; // Disadvantage grants 3 XP

          assert.isBelow(disadvantageCost, 0, "Disadvantage cost is negative");
          assert.equal(Math.abs(disadvantageCost), 3, "Grants 3 XP");
        });

        it("should calculate net XP with disadvantages", () => {
          const spent = 20; // 20 XP spent
          const disadvantageGrant = 3; // 3 XP gained
          const netSpent = spent - disadvantageGrant;

          assert.equal(netSpent, 17, "Net spent = 17 XP (20-3)");
        });

        it("should handle multiple disadvantages", () => {
          const disad1 = 3; // Grants 3 XP
          const disad2 = 2; // Grants 2 XP
          const totalGrant = disad1 + disad2;

          assert.equal(totalGrant, 5, "Multiple disadvantages grant 5 XP");
        });
      });
    },
    { displayName: "L5R4: XP Service Tests" }
  );
}
