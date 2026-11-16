/**
 * @module setup/migrations
 * @description The world data migration that runs once per system version, from the `ready` hook, for a GM. It runs
 * each step in `module/setup/migrations/` over the world's actors and items, the actors' embedded items, unlinked
 * tokens' actor deltas, and every unlocked Actor and Item compendium: legacy field names remapped to the schema
 * (snake_case to camelCase), bows converted to weapons, NPC wounds and Initiative, missing defaults backfilled,
 * values normalized, item mechanics moved into rules, and icon paths moved from .png to .webp. Steps update with
 * `render: false`, read `_source`, keep a field that already holds a value, and catch per document or pack, so a
 * failure is logged and the rest still runs; a marker flag on each document makes a second run skip it.
 */
import { SYS_ID } from "../config/constants.js";
import { hasBeenMigrated, updateMigratedVersion } from "./migrations/utils/helpers.js";
import { applySchemaMapToDocs } from "./migrations/schema/apply.js";
import { migrateLegacyNpcWounds } from "./migrations/actors/npc-wounds.js";
import { migrateNpcInitiative } from "./migrations/actors/npc-initiative.js";
import { migrateActorEmbeddedItems } from "./migrations/actors/embedded-items.js";
import { deleteLegacyFields } from "./migrations/actors/cleanup.js";
import { migrateEffectFreeTraitBase } from "./migrations/actors/xp-free-trait-base.js";
import { migrateStatusEffectRules } from "./migrations/actors/status-effect-rules.js";
import { migrateUnlinkedTokens } from "./migrations/actors/unlinked-tokens.js";
import { migrateBowsToWeapons } from "./migrations/items/bow-to-weapon.js";
import { migrateSkillDefaults } from "./migrations/items/skill-defaults.js";
import { migrateEmphasisStringToArray } from "./migrations/items/emphasis.js";
import { migrateArmorTypes } from "./migrations/items/armor-types.js";
import { migrateFreeRaisesDefaults } from "./migrations/items/free-raises.js";
import { migrateWeaponSizes } from "./migrations/items/normalize.js";
import { migrateItemRules } from "./migrations/items/item-rules.js";
import {
  migrateIconPaths,
  migrateCompendiumIconPaths,
  migrateEmbeddedItemIcons
} from "./migrations/icons/icon-paths.js";

/**
 * Main migration orchestration function for system version updates.
 *
 * Executes all migration steps in sequence when system version changes. Processes world
 * documents first, then unlocked compendiums. Only runs for GM users. Handles both schema
 * transformations (field renames, type changes) and content migrations (wound systems,
 * icon paths, defaults).
 *
 * Idempotency: Uses migration markers (flags.l5r4-enhanced.migratedVersion) to track which
 * documents have been migrated. Skips already-migrated documents to prevent overwriting
 * manually-corrected data when forceMigration is triggered.
 *
 * Migration Execution Order:
 * 1. Schema field remapping (world actors/items)
 * 2. NPC wound system migration, and NPCs stored with the old 2k2 Initiative default roll the formula (world actors)
 * 3. Bow → weapon type conversion (world items)
 * 4. Skill default values backfill (world items)
 * 5. Armor type backfill (world items)
 * 6. Free Raises field backfill (world items)
 * 7. Icon path migration (world items) - PNG→WebP + default icon assignment
 * 8. Data normalization (world items)
 * 9. Item mechanics into rules: Family/School Trait bonus effects, Master of Blood (world items)
 * 10. Legacy field cleanup (world actors)
 * 11. Embedded item migrations (all world actors), item rules included
 * 12. Status effect rules: stances, conditions, and Fear made before the rule engine get rules, group, level, and
 *     ending event (world actors)
 * 13. Unlinked tokens: the items and effects in each token's actor delta, through steps 11 and 12
 * 14. Free Trait rank flags set for a rule bonus (world actors)
 * 15. Mark documents as migrated (world actors/items)
 * 16. Compendium migrations (unlocked packs only) - includes icon migration
 * 17. Icon path migrations (world actors + final compendium pass)
 *
 * Foundry VTT Integration:
 * - Called from system ready hook when version mismatch detected
 * - Uses game.actors.contents and game.items.contents for world documents
 * - Uses game.packs to iterate compendium packs
 * - Checks pack.metadata.locked to respect pack permissions.
 *
 * @param {string} fromVersion - Previous system version, logged when the icon migration fails
 * @param {string} toVersion - New system version to mark documents with after migration
 * @returns {Promise<void>}
 */
export async function migrateWorld(fromVersion, toVersion) {
  if (!game.user?.isGM) {
    return;
  }

  // Filter out already-migrated documents to ensure true idempotency
  const unmigratedActors = game.actors.contents.filter(doc => !hasBeenMigrated(doc, toVersion));
  const unmigratedItems = game.items.contents.filter(doc => !hasBeenMigrated(doc, toVersion));

  await applySchemaMapToDocs(unmigratedActors, "world-actors");
  await applySchemaMapToDocs(unmigratedItems, "world-items");

  await migrateLegacyNpcWounds(unmigratedActors, "world-legacy-npc-wounds");
  await migrateNpcInitiative(unmigratedActors, "world-npc-initiative");

  await migrateBowsToWeapons(unmigratedItems, "world-bow-migration");

  await migrateSkillDefaults(unmigratedItems, "world-skill-defaults");

  await migrateEmphasisStringToArray(unmigratedItems, "world-emphasis-migration");

  await migrateArmorTypes(unmigratedItems, "world-armor-types");

  await migrateFreeRaisesDefaults(unmigratedItems, "world-free-raises");

  await migrateEmbeddedItemIcons(unmigratedItems, "world-icon-migration");

  await migrateWeaponSizes(unmigratedItems, "world-items-norm");

  await migrateItemRules(unmigratedItems, "world-item-rules");

  await deleteLegacyFields(unmigratedActors, "world-actors-cleanup");

  for (const actor of unmigratedActors) {
    await migrateActorEmbeddedItems(actor, "actor");
  }

  await migrateStatusEffectRules(unmigratedActors, "world-status-effect-rules");

  // Unlinked tokens' own items and effects live in their actor deltas, which the steps above never reach
  await migrateUnlinkedTokens(
    game.scenes.contents.flatMap(scene => scene.tokens.contents),
    "world-unlinked-tokens"
  );

  // After the embedded items, because the Trait bonus is read from the actor's Family and School items
  await migrateEffectFreeTraitBase(unmigratedActors, "world-free-trait-base");

  // Mark all migrated documents with current version to prevent re-migration
  for (const doc of [...unmigratedActors, ...unmigratedItems]) {
    await updateMigratedVersion(doc, toVersion);
  }

  for (const pack of game.packs) {
    const docType = pack.metadata?.type ?? pack.documentName;
    if (docType !== "Actor" && docType !== "Item") {
      continue;
    }

    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) {
      console.warn(`${SYS_ID}`, "Skipping locked compendium", { collection: pack.collection });
      continue;
    }

    try {
      const docs = await pack.getDocuments();

      // Filter out already-migrated compendium documents
      const unmigratedDocs = docs.filter(doc => !hasBeenMigrated(doc, toVersion));

      if (unmigratedDocs.length === 0) {
        continue; // All documents in this pack already migrated
      }

      await applySchemaMapToDocs(unmigratedDocs, `pack:${pack.collection}`);

      if (docType === "Actor") {
        await migrateLegacyNpcWounds(unmigratedDocs, `pack-legacy-npc-wounds:${pack.collection}`);
        await migrateNpcInitiative(unmigratedDocs, `pack-npc-initiative:${pack.collection}`);
      }
      await migrateBowsToWeapons(unmigratedDocs, `pack-bow-migration:${pack.collection}`);
      await migrateSkillDefaults(unmigratedDocs, `pack-skill-defaults:${pack.collection}`);
      await migrateEmphasisStringToArray(
        unmigratedDocs,
        `pack-emphasis-migration:${pack.collection}`
      );
      await migrateArmorTypes(unmigratedDocs, `pack-armor-types:${pack.collection}`);
      await migrateFreeRaisesDefaults(unmigratedDocs, `pack-free-raises:${pack.collection}`);
      await migrateEmbeddedItemIcons(unmigratedDocs, `pack-icon-migration:${pack.collection}`);
      await migrateWeaponSizes(unmigratedDocs, `pack-norm:${pack.collection}`);
      await migrateItemRules(unmigratedDocs, `pack-item-rules:${pack.collection}`);

      if (docType === "Actor") {
        for (const actor of unmigratedDocs) {
          await migrateActorEmbeddedItems(actor, `compendium-actor:${pack.collection}`);
        }
        await migrateStatusEffectRules(
          unmigratedDocs,
          `pack-status-effect-rules:${pack.collection}`
        );
        await migrateEffectFreeTraitBase(unmigratedDocs, `pack-free-trait-base:${pack.collection}`);
      }

      // Mark compendium documents as migrated
      for (const doc of unmigratedDocs) {
        await updateMigratedVersion(doc, toVersion);
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap pack failed", { pack: pack.collection, error: e });
    }
  }

  try {
    await migrateIconPaths();
    await migrateCompendiumIconPaths();
  } catch (err) {
    console.warn(`${SYS_ID} | Migration failed`, { fromVersion, toVersion, error: err });
  }
}

// Re-export icon migration for external use
export { migrateIconPaths } from "./migrations/icons/icon-paths.js";
