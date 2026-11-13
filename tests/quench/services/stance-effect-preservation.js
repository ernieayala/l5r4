/**
 * Stance Effect Preservation Integration Tests
 *
 * Tests that stance changes do not overwrite or destroy existing Active Effect
 * changes (e.g., trait modifications). This was a critical bug where the effect
 * hydration code would overwrite any existing changes array with an empty array,
 * causing permanent trait modifications.
 *
 * Bug Context:
 * When stance effects are created (especially via token status icons or programmatic
 * creation), they might have Active Effect changes that modify actor properties like
 * traits. The hydration code in effect-lifecycle.js was unconditionally overwriting
 * the changes array with templateData.changes || [], which evaluated to [] since
 * stance templates don't define changes. This destroyed any existing modifications.
 *
 * @module tests/quench/services/stance-effect-preservation
 */

import { statusRules } from "../../../module/utils/rule-engine.js";
import { SYS_ID } from "../../../module/config/constants.js";
import { createTestPC } from "../../fixtures/actor-fixtures.js";
import { guardRolls } from "../helpers.js";

export function registerStanceEffectPreservationTests(quench) {
  quench.registerBatch(
    "l5r4-enhanced.integration.stance-effect-preservation",
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      // Taking the Full Defense Stance opens its roll dialog (p.84)
      guardRolls(context);

      describe("Stance Effect Changes Preservation", () => {
        let actor;

        beforeEach(async () => {
          // Create fresh test actor for each test to ensure complete isolation
          actor = await createTestPC({
            name: "Test Character - Stance Effects",
            system: {
              traits: {
                ref: 3,
                awa: 3,
                sta: 3,
                wil: 3,
                agi: 3,
                int: 3,
                str: 3,
                per: 3
              }
            }
          });
        });

        afterEach(async () => {
          // Delete actor after each test for complete cleanup
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should preserve Active Effect changes when hydrating stance effect", async () => {
          // ARRANGE - Ensure actor is fully prepared and get initial trait value
          actor.prepareData();
          const initialRef = actor.system.traits.ref;

          // Create Full Attack stance effect with a trait change
          // (simulating what might happen via token status icon or programmatic creation)
          const effectData = {
            name: "Full Attack Stance", // Valid name required by Foundry v13
            img: `systems/${SYS_ID}/assets/icons/full-attack-stance.webp`,
            statuses: ["fullAttackStance"],
            system: {
              changes: [
                {
                  key: "system.traits.ref",
                  type: "add",
                  value: 2
                }
              ]
            }
          };

          // ACT - Create the effect
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          // ASSERT - Effect should be created successfully
          // AND changes array should be preserved (the bug would have destroyed it)
          const effect = actor.effects.find(e => e.statuses.has("fullAttackStance"));

          assert.exists(effect, "Stance effect created");
          assert.equal(effect.name, "Full Attack Stance", "Effect name correct");
          assert.isNotEmpty(effect.img, "Effect img set");

          // CRITICAL: Changes array should still exist and contain the trait modification
          // The bug would have overwritten this with an empty array
          assert.equal(
            effect.system.changes.length,
            1,
            "Changes array preserved (bug would destroy this)"
          );
          assert.equal(effect.system.changes[0].key, "system.traits.ref", "Change key preserved");
          assert.equal(effect.system.changes[0].type, "add", "Change type preserved");
          assert.equal(effect.system.changes[0].value, 2, "Change value preserved");

          // That's it - we've verified the bug fix works
          // We don't need to verify Foundry applies the changes correctly
        });

        it("should not add empty changes array if effect has no changes", async () => {
          // ARRANGE - Create stance effect without any changes
          const effectData = {
            name: "Defense Stance", // Valid name required by Foundry v13
            img: `systems/${SYS_ID}/assets/icons/defence-stance.webp`,
            system: { rules: statusRules("defenseStance") },
            statuses: ["defenseStance"]
            // No changes array
          };

          // ACT
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          // ASSERT - Effect should be created without adding unnecessary changes
          const effect = actor.effects.find(e => e.statuses.has("defenseStance"));

          assert.exists(effect, "Stance effect created");
          assert.equal(effect.name, "Defense Stance", "Effect name correct");

          // Changes should remain empty since we didn't provide any
          // The fix ensures we don't add an empty array if template doesn't define changes
          assert.isTrue(
            !effect.system.changes || effect.system.changes.length === 0,
            "No changes array added unnecessarily"
          );
        });

        it("should not modify traits when changing between stances", async () => {
          // ARRANGE - Ensure actor is fully prepared and record initial trait values
          actor.prepareData();
          const initialTraits = {
            ref: actor.system.traits.ref,
            awa: actor.system.traits.awa,
            sta: actor.system.traits.sta,
            wil: actor.system.traits.wil,
            agi: actor.system.traits.agi,
            int: actor.system.traits.int,
            str: actor.system.traits.str,
            per: actor.system.traits.per
          };

          // ACT - Change stances multiple times
          // Full Attack
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Attack Stance",
              img: `systems/${SYS_ID}/assets/icons/full-attack-stance.webp`,
              statuses: ["fullAttackStance"],
              flags: {
                [SYS_ID]: {
                  stanceType: "fullAttack"
                }
              }
            }
          ]);

          actor.prepareData();
          let currentTraits = {
            ref: actor.system.traits.ref,
            awa: actor.system.traits.awa,
            sta: actor.system.traits.sta,
            wil: actor.system.traits.wil,
            agi: actor.system.traits.agi,
            int: actor.system.traits.int,
            str: actor.system.traits.str,
            per: actor.system.traits.per
          };

          // ASSERT - Traits unchanged after first stance
          assert.deepEqual(currentTraits, initialTraits, "Traits unchanged after Full Attack");

          // Remove Full Attack, add Defense
          const fullAttackEffect = actor.effects.find(e => e.statuses.has("fullAttackStance"));
          await actor.deleteEmbeddedDocuments("ActiveEffect", [fullAttackEffect.id]);

          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Defense Stance",
              img: `systems/${SYS_ID}/assets/icons/defence-stance.webp`,
              system: { rules: statusRules("defenseStance") },
              statuses: ["defenseStance"],
              flags: {
                [SYS_ID]: {
                  stanceType: "defense"
                }
              }
            }
          ]);

          actor.prepareData();
          currentTraits = {
            ref: actor.system.traits.ref,
            awa: actor.system.traits.awa,
            sta: actor.system.traits.sta,
            wil: actor.system.traits.wil,
            agi: actor.system.traits.agi,
            int: actor.system.traits.int,
            str: actor.system.traits.str,
            per: actor.system.traits.per
          };

          // ASSERT - Traits unchanged after stance change
          assert.deepEqual(currentTraits, initialTraits, "Traits unchanged after Defense");

          // Remove Defense, add Full Defense
          const defenseEffect = actor.effects.find(e => e.statuses.has("defenseStance"));
          await actor.deleteEmbeddedDocuments("ActiveEffect", [defenseEffect.id]);

          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Full Defense Stance",
              img: `systems/${SYS_ID}/assets/icons/full-defense-stance.webp`,
              statuses: ["fullDefenseStance"],
              flags: {
                [SYS_ID]: {
                  stanceType: "fullDefense"
                }
              }
            }
          ]);

          actor.prepareData();
          currentTraits = {
            ref: actor.system.traits.ref,
            awa: actor.system.traits.awa,
            sta: actor.system.traits.sta,
            wil: actor.system.traits.wil,
            agi: actor.system.traits.agi,
            int: actor.system.traits.int,
            str: actor.system.traits.str,
            per: actor.system.traits.per
          };

          // ASSERT - Traits unchanged after second stance change
          assert.deepEqual(currentTraits, initialTraits, "Traits unchanged after Full Defense");
        });

        it("should preserve multiple changes on a single effect", async () => {
          // ARRANGE - Ensure actor is fully prepared and get initial trait values
          actor.prepareData();
          const initialRef = actor.system.traits.ref;
          const initialAgi = actor.system.traits.agi;
          const initialStr = actor.system.traits.str;

          // Create effect with multiple trait modifications
          const effectData = {
            name: "Attack Stance", // Valid name required by Foundry v13
            img: `systems/${SYS_ID}/assets/icons/attack-stance.webp`,
            statuses: ["attackStance"],
            system: {
              changes: [
                {
                  key: "system.traits.ref",
                  type: "add",
                  value: 1
                },
                {
                  key: "system.traits.agi",
                  type: "add",
                  value: 1
                },
                {
                  key: "system.traits.str",
                  type: "add",
                  value: 2
                }
              ]
            }
          };

          // ACT
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          // ASSERT
          const effect = actor.effects.find(e => e.statuses.has("attackStance"));

          assert.equal(
            effect.system.changes.length,
            3,
            "All changes preserved (bug would destroy these)"
          );
          assert.equal(effect.system.changes[0].key, "system.traits.ref", "First change preserved");
          assert.equal(
            effect.system.changes[1].key,
            "system.traits.agi",
            "Second change preserved"
          );
          assert.equal(effect.system.changes[2].key, "system.traits.str", "Third change preserved");

          // That's it - we've verified all changes are preserved
          // We don't need to verify Foundry applies them correctly
        });
      });
    },
    { displayName: "L5R4: Stance Effect Preservation Tests" }
  );
}
