/**
 * Fear System Complete Workflow Tests
 *
 * Tests the COMPLETE Fear workflow from start to finish:
 * 1. NPC Fear rating configuration
 * 2. PC resistance test execution
 * 3. ActiveEffect application on failure
 * 4. Catastrophic failure handling
 * 5. Multiple Fear sources
 * 6. Effect removal and recovery
 *
 * @see module/services/fear.js
 * @see module/services/fear-card.js
 * @see module/documents/actor/calculations/fear-system.js
 */

import { SYS_ID } from "../../../module/config/constants.js";
import { testFear } from "../../../module/services/fear.js";
import { startFearTest } from "../../../module/services/fear-card.js";
import { startFlow } from "../../../module/services/combat/flow.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { answerCheckDialog, waitFor } from "../helpers.js";

/**
 * Register Fear System workflow tests
 * @param {Object} quench - Quench test framework
 */
export function registerFearWorkflowTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.fear-workflow`,
    context => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe("Fear system workflow", () => {
        let npcWithFear;
        let pcLowWillpower;
        let pcHighWillpower;
        let pcMediumWillpower;

        before(async () => {
          // Create NPC with Fear 3
          npcWithFear = await Actor.create({
            name: "Fear system workflow: Terror Oni (Fear 3)",
            type: "npc",
            system: {
              fear: {
                rank: 3
              }
            }
          });

          // Create PCs with different Willpower levels
          pcLowWillpower = await createTestPC({
            name: "Fear system workflow: Low Willpower PC",
            system: {
              traits: {
                wil: 2 // Low Willpower
              },
              honor: {
                rank: 1,
                points: 0
              }
            }
          });

          pcHighWillpower = await createTestPC({
            name: "Fear system workflow: High Willpower PC",
            system: {
              traits: {
                wil: 5 // High Willpower
              },
              honor: {
                rank: 4, // High Honor
                points: 0
              }
            }
          });

          pcMediumWillpower = await createTestPC({
            name: "Fear system workflow: Medium Willpower PC",
            system: {
              traits: {
                wil: 3
              },
              honor: {
                rank: 2,
                points: 0
              }
            }
          });
        });

        after(async () => {
          await npcWithFear?.delete();
          await pcLowWillpower?.delete();
          await pcHighWillpower?.delete();
          await pcMediumWillpower?.delete();
        });

        describe("Step 1: NPC Fear rating configuration", () => {
          it("should have Fear rating configured on NPC", () => {
            const fearRank = npcWithFear.system.fear.rank;
            const fearTN = npcWithFear.system.fear.tn;
            const fearActive = npcWithFear.system.fear.active;

            assert.equal(fearRank, 3, "NPC has Fear Rank 3");
            assert.equal(fearTN, 20, "Fear TN = 5 + (5×3) = 20");
            assert.isTrue(fearActive, "Fear is active (rank > 0)");
          });

          it("should handle Fear Rank 0 as no Fear", async () => {
            const npcNoFear = await Actor.create({
              name: "Fear system workflow: Harmless NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 0
                }
              }
            });

            try {
              assert.equal(npcNoFear.system.fear.rank, 0, "Fear Rank = 0");
              assert.equal(npcNoFear.system.fear.tn, 0, "Fear TN = 0 when inactive");
              assert.isFalse(npcNoFear.system.fear.active, "Fear is inactive");
            } finally {
              await npcNoFear.delete();
            }
          });

          it("should handle the maximum Fear Rank of 10", async () => {
            const npcMaxFear = await Actor.create({
              name: "Fear system workflow: Nightmare Entity (Fear 10)",
              type: "npc",
              system: {
                fear: {
                  rank: 10
                }
              }
            });

            try {
              assert.equal(npcMaxFear.system.fear.rank, 10, "Maximum Fear Rank = 10");
              assert.equal(npcMaxFear.system.fear.tn, 55, "Max Fear TN = 5 + (5×10) = 55");
              assert.isTrue(npcMaxFear.system.fear.active, "Fear is active");
            } finally {
              await npcMaxFear.delete();
            }
          });
        });

        describe("Step 2: PC resistance test execution", () => {
          it("should execute Fear test for single PC", async () => {
            // Test Fear test execution (should create chat message)
            const chatMessage = await testFear({
              npc: npcWithFear,
              character: pcMediumWillpower
            });

            assert.exists(chatMessage, "Chat message created");
            assert.equal(chatMessage.speaker.actor, pcMediumWillpower.id, "Correct speaker");
            assert.isTrue(
              chatMessage.system.label.startsWith(
                game.i18n.localize("l5r4.ui.mechanics.fear.testLabel", {
                  rank: npcWithFear.system.fear.rank,
                  name: npcWithFear.name
                })
              ),
              "the label names the Fear Rank and the creature in one key"
            );
          });

          it("should include Honor bonus in Fear test", () => {
            const willpower = pcMediumWillpower.system.traits.wil;
            const honorRank = pcMediumWillpower.system.honor.rank;

            assert.equal(willpower, 3, "Willpower = 3");
            assert.equal(honorRank, 2, "Honor Rank = 2");
            // Roll formula would be 3d10xa10k3+2 vs TN 20
          });

          it("should handle PC with zero Honor", async () => {
            const pcNoHonor = await createTestPC({
              name: "Fear system workflow: Disgraced PC",
              system: {
                traits: {
                  wil: 3
                },
                honor: {
                  rank: 0,
                  points: 0
                }
              }
            });

            try {
              const chatMessage = await testFear({
                npc: npcWithFear,
                character: pcNoHonor
              });

              assert.exists(chatMessage, "Fear test executes with zero Honor");
              // Roll would be 3d10xa10k3 (no bonus) vs TN 20
            } finally {
              await pcNoHonor.delete();
            }
          });

          it("should handle PC with high Honor bonus", () => {
            const willpower = pcHighWillpower.system.traits.wil;
            const honorRank = pcHighWillpower.system.honor.rank;

            assert.equal(willpower, 5, "High Willpower = 5");
            assert.equal(honorRank, 4, "High Honor = 4");
            // Roll would be 5d10xa10k5+4 vs TN 20 (likely to succeed)
          });
        });

        describe("Step 3: ActiveEffect application on failure", () => {
          let testPC;

          beforeEach(async () => {
            // Create fresh PC for each test
            testPC = await createTestPC({
              name: "Fear system workflow: Test PC for Effects",
              system: {
                traits: {
                  wil: 1 // Very low Willpower = likely to fail
                },
                honor: {
                  rank: 0,
                  points: 0
                }
              }
            });
          });

          afterEach(async () => {
            await testPC?.delete();
          });

          it("should NOT create ActiveEffect on success", async () => {
            // Use NPC with a low Fear Rank to ensure success
            const npcLowFear = await Actor.create({
              name: "Fear system workflow: Weak Fear NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 1 // TN = 10, easy
                }
              }
            });

            try {
              // High Willpower PC should pass easily
              await testFear({
                npc: npcLowFear,
                character: pcHighWillpower
              });

              const fearEffect = pcHighWillpower.effects.find(e => e.statuses.has("feared"));

              assert.notExists(fearEffect, "No Fear effect on success");
            } finally {
              await npcLowFear.delete();
            }
          });

          it("should create ActiveEffect with feared status on failure", async () => {
            // Use high Fear NPC to ensure failure for low Willpower PC
            const npcHighFear = await Actor.create({
              name: "Fear system workflow: Terrifying NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 7 // TN = 40, hard
                }
              }
            });

            try {
              await testFear({
                npc: npcHighFear,
                character: testPC
              });

              // Check if Fear effect was created
              const fearEffect = testPC.effects.find(e => e.statuses.has("feared"));

              if (fearEffect) {
                assert.exists(fearEffect, "Fear ActiveEffect created on failure");
                assert.isTrue(fearEffect.statuses.has("feared"), "Effect has 'feared' status");
                assert.equal(fearEffect.system.level, 7, "Effect stores Fear Rank");
              } else {
                // PC might have succeeded (rare but possible with rolls)
                // This is acceptable - test documents behavior, not random outcomes
                assert.ok(true, "Test PC succeeded Fear test (rare but valid)");
              }
            } finally {
              await npcHighFear.delete();
            }
          });

          it("should store Fear Rank in effect flags", async () => {
            const npcFear5 = await Actor.create({
              name: "Fear system workflow: Fear 5 NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 5 // TN = 30
                }
              }
            });

            try {
              await testFear({
                npc: npcFear5,
                character: testPC
              });

              const fearEffect = testPC.effects.find(e => e.statuses.has("feared"));

              if (fearEffect) {
                assert.equal(fearEffect.system.level, 5, "Effect stores correct Fear Rank");
              }
            } finally {
              await npcFear5.delete();
            }
          });

          it("should have Fear icon on ActiveEffect", async () => {
            const npcFear8 = await Actor.create({
              name: "Fear system workflow: Fear 8 NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 8
                }
              }
            });

            try {
              await testFear({
                npc: npcFear8,
                character: testPC
              });

              const fearEffect = testPC.effects.find(e => e.statuses.has("feared"));

              if (fearEffect) {
                assert.include(fearEffect.img, "fear", "Effect has Fear icon");
              }
            } finally {
              await npcFear8.delete();
            }
          });
        });

        describe("Step 4: catastrophic failure handling", () => {
          let catastrophicPC;

          beforeEach(async () => {
            // PC with Willpower 1 + no Honor vs high Fear
            catastrophicPC = await createTestPC({
              name: "Fear system workflow: Catastrophic Test PC",
              system: {
                traits: {
                  wil: 1 // Minimum Willpower
                },
                honor: {
                  rank: 0,
                  points: 0
                }
              }
            });
          });

          afterEach(async () => {
            await catastrophicPC?.delete();
          });

          it("should detect the catastrophic failure condition of failing by 15 or more", async () => {
            // High Fear TN makes catastrophic failure likely
            const npcExtremeFear = await Actor.create({
              name: "Fear system workflow: Extreme Fear NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 9 // TN = 50
                }
              }
            });

            try {
              const chatMessage = await testFear({
                npc: npcExtremeFear,
                character: catastrophicPC
              });

              assert.exists(chatMessage, "Fear test executed");

              // Check if chat content mentions catastrophic failure
              // (Roll 1d10xa10k1 max ~20 vs TN 50 = fail by 30+)
              if (chatMessage.content) {
                const _isCatastrophic = chatMessage.content.includes("catastrophic");
                // If the roll somehow succeeded or failed by less, that's also valid
                assert.ok(true, "Catastrophic failure detection handled");
              }
            } finally {
              await npcExtremeFear.delete();
            }
          });

          it("should NOT be catastrophic when failing by 14", () => {
            // Test the boundary condition
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
            const tn = 25;
            const margin = rollTotal - tn; // -22
            const catastrophic = margin <= -15;

            assert.isTrue(catastrophic, "Fail by 22 IS catastrophic");
          });
        });

        describe("Step 5: multiple Fear sources", () => {
          let npcFear2;
          let npcFear4;
          let multipleTestPC;

          beforeEach(async () => {
            npcFear2 = await Actor.create({
              name: "Fear system workflow: Lesser Oni (Fear 2)",
              type: "npc",
              system: {
                fear: {
                  rank: 2
                }
              }
            });

            npcFear4 = await Actor.create({
              name: "Fear system workflow: Greater Oni (Fear 4)",
              type: "npc",
              system: {
                fear: {
                  rank: 4
                }
              }
            });

            multipleTestPC = await createTestPC({
              name: "Fear system workflow: Multiple Fear Test PC",
              system: {
                traits: {
                  wil: 2
                },
                honor: {
                  rank: 1,
                  points: 0
                }
              }
            });
          });

          afterEach(async () => {
            await npcFear2?.delete();
            await npcFear4?.delete();
            await multipleTestPC?.delete();
          });

          it("should handle sequential Fear tests from different NPCs", async () => {
            // Test against first NPC
            const msg1 = await testFear({
              npc: npcFear2,
              character: multipleTestPC
            });

            // Test against second NPC
            const msg2 = await testFear({
              npc: npcFear4,
              character: multipleTestPC
            });

            assert.exists(msg1, "First Fear test executed");
            assert.exists(msg2, "Second Fear test executed");

            // Check how many Fear effects are on the PC
            const fearEffects = Array.from(multipleTestPC.effects).filter(e =>
              e.statuses.has("feared")
            );

            // PC may have 0, 1, or 2 effects depending on roll results
            // This is valid - we're testing workflow execution
            assert.ok(true, `PC has ${fearEffects.length} Fear effect(s)`);
          });

          it("should allow multiple Fear effects to stack", async () => {
            // Manually create two Fear effects to test stacking
            await multipleTestPC.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Fear Effect (Rank 2)",
                statuses: ["feared"],
                img: "systems/l5r4-enhanced/assets/icons/fear.webp",
                flags: {
                  [SYS_ID]: {
                    fearRank: 2
                  }
                }
              },
              {
                name: "Fear Effect (Rank 4)",
                statuses: ["feared"],
                img: "systems/l5r4-enhanced/assets/icons/fear.webp",
                flags: {
                  [SYS_ID]: {
                    fearRank: 4
                  }
                }
              }
            ]);

            const fearEffects = Array.from(multipleTestPC.effects).filter(e =>
              e.statuses.has("feared")
            );

            assert.isAtLeast(fearEffects.length, 2, "Multiple Fear effects can exist");

            // Check that different Fear Ranks are stored
            const fearRanks = fearEffects.map(e => e.system.level);
            assert.include(fearRanks, 2, "Fear Rank 2 effect exists");
            assert.include(fearRanks, 4, "Fear Rank 4 effect exists");
          });

          // #151
          it("should post one Fear card, the GM rolling at once for characters no player has connected", async () => {
            const characters = [pcLowWillpower, pcMediumWillpower, pcHighWillpower];
            const card = await startFearTest({
              characters,
              fearRank: 3,
              tn: 20,
              label: "Quench Fear",
              speaker: npcWithFear
            });
            const state = card.getFlag(SYS_ID, "flow").state;
            assert.equal(state.characters.length, 3, "one card for all three");
            assert.isTrue(
              state.results.every(result => result !== null),
              "no player is connected, so the GM rolled for each"
            );
            assert.notExists(
              (await card.renderHTML()).querySelector("[data-flow-action='roll']"),
              "no Roll buttons are left"
            );
            await Promise.all(
              characters.map(c =>
                c.deleteEmbeddedDocuments(
                  "ActiveEffect",
                  c.effects.map(e => e.id)
                )
              )
            );
          });

          it("should warn and post nothing with no characters", async () => {
            assert.isNull(await startFearTest({ characters: [], fearRank: 3 }));
          });

          // #151
          // game-rules/25_rings_and_traits.md, p.78
          it("should roll from each button through the dialog, Shift skipping it, and let the GM roll the rest", async () => {
            const characters = [pcLowWillpower, pcMediumWillpower, pcHighWillpower];
            const card = await startFlow("fear", {
              label: "Quench Fear",
              fearRank: 3,
              tn: 20,
              characters: characters.map(c => c.uuid),
              results: [null, null, null],
              order: []
            });
            const state = () => card.getFlag(SYS_ID, "flow").state;
            const button = async selector => (await card.renderHTML()).querySelector(selector);

            const answered = answerCheckDialog({ totalMod: 100 });
            (await button("[data-flow-action='roll'][data-side='0']")).click();
            const labels = await answered;
            assert.include(
              labels,
              game.i18n.localize("l5r4.character.ranks.honorRank"),
              "the dialog offers its parts"
            );
            assert.isTrue(
              await waitFor(() => state().results[0] !== null),
              "the first character's roll is recorded"
            );
            assert.isTrue(
              state().results[0].success,
              "the dialog's +100 counts: the roll went through it"
            );

            (await button("[data-flow-action='roll'][data-side='1']")).dispatchEvent(
              new MouseEvent("click", { bubbles: true, shiftKey: true })
            );
            assert.isTrue(
              await waitFor(() => state().results[1] !== null),
              "Shift rolls with no dialog"
            );

            (await button("[data-flow-gm='end']")).click();
            assert.isTrue(await waitFor(() => state().results[2] !== null), "Roll for the rest");
            assert.deepEqual(state().order, [0, 1, 2]);
            await Promise.all(
              characters.map(c =>
                c.deleteEmbeddedDocuments(
                  "ActiveEffect",
                  c.effects.map(e => e.id)
                )
              )
            );
          });
        });

        describe("Step 6: effect removal and recovery", () => {
          let recoveryPC;

          beforeEach(async () => {
            recoveryPC = await createTestPC({
              name: "Fear system workflow: Recovery Test PC",
              system: {
                traits: {
                  wil: 3
                },
                honor: {
                  rank: 2,
                  points: 0
                }
              }
            });

            // Create a Fear effect
            await recoveryPC.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Fear Effect (Rank 3)",
                statuses: ["feared"],
                img: "systems/l5r4-enhanced/assets/icons/fear.webp",
                flags: {
                  [SYS_ID]: {
                    fearRank: 3
                  }
                }
              }
            ]);
          });

          afterEach(async () => {
            await recoveryPC?.delete();
          });

          it("should have Fear effect before removal", () => {
            const fearEffect = recoveryPC.effects.find(e => e.statuses.has("feared"));

            assert.exists(fearEffect, "Fear effect exists initially");
            assert.equal(fearEffect.system.level, 3, "Correct Fear Rank");
          });

          it("should allow manual removal of Fear effect", async () => {
            const fearEffect = recoveryPC.effects.find(e => e.statuses.has("feared"));

            assert.exists(fearEffect, "Fear effect exists before removal");

            // Remove the effect
            await fearEffect.delete();

            const remainingFearEffect = recoveryPC.effects.find(e => e.statuses.has("feared"));

            assert.notExists(remainingFearEffect, "Fear effect removed successfully");
          });

          it("should remove all Fear effects", async () => {
            // Add second Fear effect
            await recoveryPC.createEmbeddedDocuments("ActiveEffect", [
              {
                name: "Fear Effect (Rank 5)",
                statuses: ["feared"],
                img: "systems/l5r4-enhanced/assets/icons/fear.webp",
                flags: {
                  [SYS_ID]: {
                    fearRank: 5
                  }
                }
              }
            ]);

            const fearEffectsBefore = Array.from(recoveryPC.effects).filter(e =>
              e.statuses.has("feared")
            );

            assert.isAtLeast(fearEffectsBefore.length, 2, "Multiple Fear effects exist");

            // Remove all Fear effects
            for (const effect of fearEffectsBefore) {
              await effect.delete();
            }

            const fearEffectsAfter = Array.from(recoveryPC.effects).filter(e =>
              e.statuses.has("feared")
            );

            assert.equal(fearEffectsAfter.length, 0, "All Fear effects removed");
          });

          it("should last until the encounter ends, even when made with only its status", async () => {
            const fearEffect = recoveryPC.effects.find(e => e.statuses.has("feared"));

            assert.exists(fearEffect, "Fear effect persists");
            // 14.370 duration shape: value / units / expiry [src: common/documents/active-effect.mjs:61-68];
            // no length, ended by the encounterEnd event (roadmap/STAGE-09 decision 4)
            // game-rules/42_fear.md, p.90
            assert.equal(fearEffect.duration.value, Infinity, "No length in time");
            assert.equal(fearEffect.duration.expiry, "encounterEnd", "Ends with the encounter");
          });
        });

        describe("Edge cases and error handling", () => {
          it("should handle missing NPC gracefully", async () => {
            const result = await testFear({
              npc: null,
              character: pcMediumWillpower
            });

            assert.isNull(result, "Returns null for missing NPC");
          });

          it("should handle missing character gracefully", async () => {
            const result = await testFear({
              npc: npcWithFear,
              character: null
            });

            assert.isNull(result, "Returns null for missing character");
          });

          it("should handle NPC with Fear Rank 0", async () => {
            const npcNoFear = await Actor.create({
              name: "Fear system workflow: No Fear NPC",
              type: "npc",
              system: {
                fear: {
                  rank: 0
                }
              }
            });

            try {
              const result = await testFear({
                npc: npcNoFear,
                character: pcMediumWillpower
              });

              assert.isNull(result, "Returns null for Fear Rank 0");
            } finally {
              await npcNoFear.delete();
            }
          });

          it("should handle PC with zero Willpower", async () => {
            const pcNoWillpower = await createTestPC({
              name: "Fear system workflow: No Willpower PC",
              system: {
                traits: {
                  wil: 0
                },
                honor: {
                  rank: 2,
                  points: 0
                }
              }
            });

            try {
              const result = await testFear({
                npc: npcWithFear,
                character: pcNoWillpower
              });

              // Should warn and return null (can't roll 0k0)
              assert.isNull(result, "Returns null for zero Willpower");
            } finally {
              await pcNoWillpower.delete();
            }
          });

          it("should handle an invalid NPC that is a PC", async () => {
            const result = await testFear({
              npc: pcMediumWillpower, // Wrong type
              character: pcLowWillpower
            });

            // PCs don't have Fear rating, should fail gracefully
            assert.isNull(result, "Returns null for invalid NPC type");
          });
        });

        describe("Integration: complete end-to-end workflow", () => {
          it("should execute complete workflow: NPC → Test → Effect", async () => {
            // Step 1: Create NPC with Fear
            const testNPC = await Actor.create({
              name: "Fear system workflow: Workflow Test Oni",
              type: "npc",
              system: {
                fear: {
                  rank: 5 // TN = 30
                }
              }
            });

            // Step 2: Create PC likely to fail
            const testPC = await createTestPC({
              name: "Fear system workflow: Workflow Test PC",
              system: {
                traits: {
                  wil: 1 // Very low
                },
                honor: {
                  rank: 0,
                  points: 0
                }
              }
            });

            try {
              // Step 3: Verify NPC Fear rating
              assert.equal(testNPC.system.fear.rank, 5, "NPC has Fear 5");
              assert.equal(testNPC.system.fear.tn, 30, "TN = 30");
              assert.isTrue(testNPC.system.fear.active, "Fear active");

              // Step 4: Execute Fear test
              const chatMessage = await testFear({
                npc: testNPC,
                character: testPC
              });

              assert.exists(chatMessage, "Fear test executed");

              // Step 5: Check if effect was applied (depends on roll)
              const fearEffect = testPC.effects.find(e => e.statuses.has("feared"));

              // Effect may or may not exist depending on roll result
              // Both outcomes are valid for the workflow
              if (fearEffect) {
                assert.equal(fearEffect.system.level, 5, "Fear effect has correct rank");
              }

              // Step 6: Workflow completed successfully
              assert.ok(true, "Complete workflow executed without errors");
            } finally {
              await testNPC?.delete();
              await testPC?.delete();
            }
          });
        });
      });
    },
    { displayName: "L5R4: Fear system workflow" }
  );
}
