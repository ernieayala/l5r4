/**
 * Actor Creation Race Condition Tests
 *
 * Tests that rapid concurrent actor creation doesn't corrupt data.
 * Specifically tests XP flag initialization and system data integrity.
 *
 * **What Can Break:**
 * - XP flags (xpManual, xpSpent, xpBase) not initialized correctly
 * - Race condition on rapid creation with Promise.all
 * - NPC vs PC initialization getting wrong fields
 * - Token configuration corruption
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";

/**
 * Register actor creation race condition tests
 * @param {Object} quench - Quench test framework
 */
export function registerActorCreationRaceConditionTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.actor-creation-race-conditions`,
    context => {
      const { describe, it, assert, afterEach } = context;

      describe("Rapid Actor Creation - Race Conditions", () => {
        let createdActors = [];

        afterEach(async () => {
          // Clean up all created actors
          for (const actor of createdActors) {
            if (actor) {
              await actor.delete();
            }
          }
          createdActors = [];
        });

        it("should handle 3 PCs created with Promise.all without flag corruption", async () => {
          // ARRANGE - Create 3 PCs simultaneously
          const createPromises = [
            Actor.create({
              name: "Concurrent PC 1",
              type: "pc",
              system: {
                traits: { ref: 3 },
                rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } }
              }
            }),
            Actor.create({
              name: "Concurrent PC 2",
              type: "pc",
              system: {
                traits: { ref: 3 },
                rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } }
              }
            }),
            Actor.create({
              name: "Concurrent PC 3",
              type: "pc",
              system: {
                traits: { ref: 3 },
                rings: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } }
              }
            })
          ];

          // ACT - Create all simultaneously
          createdActors = await Promise.all(createPromises);

          // ASSERT - Verify all actors created successfully
          assert.equal(createdActors.length, 3, "All 3 actors created");

          // Verify XP flag initialization on each actor
          for (let i = 0; i < createdActors.length; i++) {
            const actor = createdActors[i];
            assert.exists(actor, `Actor ${i + 1} exists`);

            // Check XP flags exist and are initialized
            const xpManual = actor.getFlag(SYS_ID, "xpManual");
            const xpSpent = actor.getFlag(SYS_ID, "xpSpent");
            const xpBase = actor.getFlag(SYS_ID, "xpBase");

            assert.exists(xpManual, `Actor ${i + 1}: xpManual flag exists`);
            assert.exists(xpSpent, `Actor ${i + 1}: xpSpent flag exists`);
            assert.exists(xpBase, `Actor ${i + 1}: xpBase flag exists`);

            // Verify flags are correct types (not corrupted)
            assert.isArray(xpManual, `Actor ${i + 1}: xpManual is array`);
            assert.isArray(xpSpent, `Actor ${i + 1}: xpSpent is array`);
            assert.isNumber(xpBase, `Actor ${i + 1}: xpBase is number`);

            // Verify system data integrity
            assert.exists(actor.system, `Actor ${i + 1}: system data exists`);
            assert.exists(actor.system.traits, `Actor ${i + 1}: traits exist`);
            assert.exists(actor.system.rings, `Actor ${i + 1}: rings exist`);
          }
        });

        it("should handle 5 NPCs created with Promise.all without corruption", async () => {
          // ARRANGE - Create 5 NPCs simultaneously
          const createPromises = Array.from({ length: 5 }, (_, i) =>
            Actor.create({
              name: `Concurrent NPC ${i + 1}`,
              type: "npc",
              system: {
                traits: { ref: 3 }
              }
            })
          );

          // ACT
          createdActors = await Promise.all(createPromises);

          // ASSERT
          assert.equal(createdActors.length, 5, "All 5 NPCs created");

          for (let i = 0; i < createdActors.length; i++) {
            const actor = createdActors[i];
            assert.exists(actor, `NPC ${i + 1} exists`);
            assert.equal(actor.type, "npc", `NPC ${i + 1} has correct type`);

            // NPCs should have system data
            assert.exists(actor.system, `NPC ${i + 1}: system data exists`);
            assert.exists(actor.system.traits, `NPC ${i + 1}: traits exist`);
          }
        });

        it("should handle mixed PC/NPC creation without type confusion", async () => {
          // ARRANGE - Create mix of PCs and NPCs simultaneously
          const createPromises = [
            Actor.create({ name: "PC 1", type: "pc", system: { rings: { void: { rank: 2 } } } }),
            Actor.create({ name: "NPC 1", type: "npc", system: { traits: { ref: 3 } } }),
            Actor.create({ name: "PC 2", type: "pc", system: { rings: { void: { rank: 2 } } } }),
            Actor.create({ name: "NPC 2", type: "npc", system: { traits: { ref: 3 } } })
          ];

          // ACT
          createdActors = await Promise.all(createPromises);

          // ASSERT
          assert.equal(createdActors.length, 4, "All 4 actors created");

          // Verify types didn't get confused
          assert.equal(createdActors[0].type, "pc", "First is PC");
          assert.equal(createdActors[1].type, "npc", "Second is NPC");
          assert.equal(createdActors[2].type, "pc", "Third is PC");
          assert.equal(createdActors[3].type, "npc", "Fourth is NPC");

          // Verify PCs have XP flags, NPCs don't need them
          const pc1XP = createdActors[0].getFlag(SYS_ID, "xpManual");
          const pc2XP = createdActors[2].getFlag(SYS_ID, "xpManual");

          assert.exists(pc1XP, "PC 1 has XP flags");
          assert.exists(pc2XP, "PC 2 has XP flags");
        });

        it("should handle rapid creation with complex system data", async () => {
          // ARRANGE - Create actors with complex nested data
          const createPromises = Array.from({ length: 3 }, (_, i) =>
            Actor.create({
              name: `Complex PC ${i + 1}`,
              type: "pc",
              system: {
                traits: {
                  sta: 3,
                  wil: 3,
                  ref: 4,
                  awa: 3,
                  agi: 3,
                  int: 3,
                  str: 3,
                  per: 3
                },
                rings: {
                  earth: 3,
                  air: 3,
                  fire: 3,
                  water: 3,
                  void: { rank: 2 }
                },
                wounds: {
                  healthy: { value: 15 },
                  nicked: { value: 21 }
                }
              }
            })
          );

          // ACT
          createdActors = await Promise.all(createPromises);

          // ASSERT
          assert.equal(createdActors.length, 3, "All complex actors created");

          for (const actor of createdActors) {
            // Verify complex data structure integrity
            assert.equal(actor.system.traits.ref, 4, "Reflexes correct");
            assert.equal(actor.system.rings.earth, 3, "Earth ring correct");
            assert.exists(actor.system.wounds, "Wounds structure exists");

            // Verify derived data calculated
            assert.exists(actor.system.armorTn, "Armor TN calculated");
            assert.isNumber(actor.system.armorTn.current, "Armor TN is number");
          }
        });

        it("should initialize prototypeToken correctly on concurrent creation", async () => {
          // ARRANGE
          const createPromises = Array.from({ length: 3 }, (_, i) =>
            Actor.create({
              name: `Token Test PC ${i + 1}`,
              type: "pc",
              system: { rings: { void: { rank: 2 } } }
            })
          );

          // ACT
          createdActors = await Promise.all(createPromises);

          // ASSERT
          for (const actor of createdActors) {
            assert.exists(actor.prototypeToken, "Prototype token exists");
            assert.equal(actor.prototypeToken.actorLink, true, "PC token is actor-linked");
          }
        });
      });

      describe("XP Flag Initialization Edge Cases", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should initialize XP flags even with empty system data", async () => {
          // ARRANGE & ACT - Create with minimal data
          actor = await Actor.create({
            name: "Minimal PC",
            type: "pc"
          });

          // ASSERT
          const xpManual = actor.getFlag(SYS_ID, "xpManual");
          const xpSpent = actor.getFlag(SYS_ID, "xpSpent");
          const xpBase = actor.getFlag(SYS_ID, "xpBase");

          assert.exists(xpManual, "xpManual initialized");
          assert.exists(xpSpent, "xpSpent initialized");
          assert.exists(xpBase, "xpBase initialized");

          assert.isArray(xpManual, "xpManual is array");
          assert.isArray(xpSpent, "xpSpent is array");
          assert.isNumber(xpBase, "xpBase is number");
        });

        it("should not corrupt XP flags when updating actor immediately after creation", async () => {
          // ARRANGE - Create actor
          actor = await Actor.create({
            name: "Update Test PC",
            type: "pc",
            system: { rings: { void: { rank: 2 } } }
          });

          const initialXP = actor.getFlag(SYS_ID, "xpManual");

          // ACT - Update immediately (potential race condition)
          await actor.update({ "system.traits.ref": 4 });

          // ASSERT
          const finalXP = actor.getFlag(SYS_ID, "xpManual");

          assert.deepEqual(finalXP, initialXP, "XP flags not corrupted by immediate update");
          assert.isArray(finalXP, "XP still an array");
        });

        it("should handle negative XP values without corruption", async () => {
          // ARRANGE - Create actor
          actor = await Actor.create({
            name: "Negative XP Test",
            type: "pc",
            system: { rings: { void: { rank: 2 } } }
          });

          // ACT - Add negative XP entry (disadvantages grant XP)
          await actor.setFlag(SYS_ID, "xpManual", [{ delta: -10, note: "Disadvantage" }]);

          // ASSERT
          const xpManual = actor.getFlag(SYS_ID, "xpManual");
          assert.isArray(xpManual, "xpManual is array");
          assert.equal(xpManual[0].delta, -10, "Negative XP stored correctly");
          assert.isNumber(xpManual[0].delta, "Delta is a number");
        });
      });
    },
    { displayName: "L5R4: Actor Creation Race Conditions" }
  );
}
