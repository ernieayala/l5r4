/**
 * Emphasis XP Tracking Integration Tests
 *
 * Tests that emphasis XP calculation correctly uses trainedEmphases array
 * instead of the old emphasis string field. Verifies the fix for the emphasis
 * XP tracking bug where XP wasn't being calculated from checkbox selections.
 *
 * **What We're Testing:**
 * - preparePcExperience() reads from trainedEmphases array
 * - XP calculator reads from trainedEmphases array
 * - XP versioning detects trainedEmphases changes
 * - Free emphasis handling works with arrays
 * - Edge cases (null, undefined, empty array)
 *
 * @see module/documents/actor/calculations/xp-system.js
 * @see module/services/xp/xp-calculator.js
 * @see module/services/xp/xp-versioning.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { createSkillData } from "../../fixtures/item-fixtures.js";

/**
 * Register Emphasis XP Tracking integration tests
 * @param {Object} quench - Quench test framework
 */
export function registerEmphasisXpTrackingTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.emphasis-xp-tracking`,
    context => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe("preparePcExperience() with trainedEmphases array", () => {
        let actor;

        before(async () => {
          actor = await createTestPC({ name: "Test Character - Emphasis XP" });
        });

        after(async () => {
          await actor?.delete();
        });

        it("should calculate XP from trainedEmphases array", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3,
                trainedEmphases: ["Katana", "Wakizashi"],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );

          await actor.prepareDerivedData();

          const xpBreakdown = actor.system._xp?.breakdown;
          assert.exists(xpBreakdown, "XP breakdown should exist");

          // 2 emphases × 2 XP each = 4 XP
          // Plus skill ranks: (3 × 4) / 2 = 6 XP
          // Total: 10 XP
          const expectedSkillXP = 6 + 4;
          assert.equal(
            xpBreakdown.skills,
            expectedSkillXP,
            "Should calculate 4 XP from 2 emphases + 6 XP from skill ranks"
          );

          await skill?.delete();
        });

        it("should handle empty trainedEmphases array", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Iaijutsu", rank: 2 }),
              system: {
                rank: 2,
                trainedEmphases: [],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );

          await actor.prepareDerivedData();

          const xpBreakdown = actor.system._xp?.breakdown;
          // Only skill ranks: (2 × 3) / 2 = 3 XP
          const expectedSkillXP = 3;
          assert.equal(
            xpBreakdown.skills,
            expectedSkillXP,
            "Should calculate 0 XP from empty array + 3 XP from skill ranks"
          );

          await skill?.delete();
        });

        it("should handle undefined trainedEmphases gracefully", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kyujutsu", rank: 1 }),
              system: {
                rank: 1
                // trainedEmphases intentionally undefined
              }
            },
            { parent: actor }
          );

          await actor.prepareDerivedData();

          const xpBreakdown = actor.system._xp?.breakdown;
          // Only skill ranks: 1 XP
          assert.equal(
            xpBreakdown.skills,
            1,
            "Should handle undefined trainedEmphases without error"
          );

          await skill?.delete();
        });

        it("should respect freeEmphasis count", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3,
                trainedEmphases: ["Katana", "Wakizashi", "Nodachi"],
                freeEmphasis: 1 // First emphasis is free
              }
            },
            { parent: actor }
          );

          await actor.prepareDerivedData();

          const xpBreakdown = actor.system._xp?.breakdown;
          // 3 emphases - 1 free = 2 paid × 2 XP = 4 XP
          // Plus skill ranks: 6 XP
          // Total: 10 XP
          const expectedSkillXP = 6 + 4;
          assert.equal(
            xpBreakdown.skills,
            expectedSkillXP,
            "Should subtract freeEmphasis from total count"
          );

          await skill?.delete();
        });

        it("should handle freeEmphasis >= trainedEmphases length", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 2 }),
              system: {
                rank: 2,
                trainedEmphases: ["Katana"],
                freeEmphasis: 2 // More free than trained
              }
            },
            { parent: actor }
          );

          await actor.prepareDerivedData();

          const xpBreakdown = actor.system._xp?.breakdown;
          // 1 emphasis - 2 free = 0 paid × 2 XP = 0 XP (Math.max prevents negative)
          // Plus skill ranks: 3 XP
          const expectedSkillXP = 3;
          assert.equal(
            xpBreakdown.skills,
            expectedSkillXP,
            "Should not charge negative XP when freeEmphasis > trained count"
          );

          await skill?.delete();
        });

        it("should calculate XP for multiple skills with emphases", async () => {
          const skill1 = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3,
                trainedEmphases: ["Katana", "Wakizashi"],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );

          const skill2 = await Item.create(
            {
              ...createSkillData({ name: "Kyujutsu", rank: 2 }),
              system: {
                rank: 2,
                trainedEmphases: ["Yumi"],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );

          await actor.prepareDerivedData();

          const xpBreakdown = actor.system._xp?.breakdown;
          // Skill 1: 6 XP ranks + 4 XP emphases = 10 XP
          // Skill 2: 3 XP ranks + 2 XP emphasis = 5 XP
          // Total: 15 XP
          const expectedSkillXP = 15;
          assert.equal(
            xpBreakdown.skills,
            expectedSkillXP,
            "Should sum XP from multiple skills with emphases"
          );

          await skill1?.delete();
          await skill2?.delete();
        });
      });

      describe("XP Versioning with trainedEmphases", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "Test Character - Versioning" });
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should include trainedEmphases in version hash", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3,
                trainedEmphases: ["Katana"],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );

          // Import here to avoid circular dependency issues
          const { calculateXpDataVersion } = await import(
            "../../../module/services/xp/xp-versioning.js"
          );

          const version1 = calculateXpDataVersion(actor);
          assert.isNumber(version1, "Version should be a number");

          // Add another emphasis
          await skill.update({
            "system.trainedEmphases": ["Katana", "Wakizashi"]
          });

          const version2 = calculateXpDataVersion(actor);
          assert.notEqual(version1, version2, "Version should change when trainedEmphases changes");

          await skill?.delete();
        });

        it("should handle empty trainedEmphases array in version", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3,
                trainedEmphases: [],
                freeEmphasis: 0
              }
            },
            { parent: actor }
          );

          const { calculateXpDataVersion } = await import(
            "../../../module/services/xp/xp-versioning.js"
          );

          const version = calculateXpDataVersion(actor);
          assert.isNumber(version, "Should handle empty array without error");

          await skill?.delete();
        });

        it("should handle undefined trainedEmphases in version", async () => {
          const skill = await Item.create(
            {
              ...createSkillData({ name: "Kenjutsu", rank: 3 }),
              system: {
                rank: 3
                // trainedEmphases undefined
              }
            },
            { parent: actor }
          );

          const { calculateXpDataVersion } = await import(
            "../../../module/services/xp/xp-versioning.js"
          );

          const version = calculateXpDataVersion(actor);
          assert.isNumber(version, "Should handle undefined without error");

          await skill?.delete();
        });
      });
    },
    {
      displayName: "L5R4: Emphasis XP Tracking (trainedEmphases Array)"
    }
  );
}
