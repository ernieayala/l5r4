/**
 * L5R4 System Data Migrations
 *
 * Main orchestration module for system data migrations. Coordinates all migration steps
 * when the system version changes, ensuring backward compatibility with legacy data.
 *
 * Handles schema transformations and data migrations across system versions. Migrates both
 * world documents (actors, items) and compendium packs when the system is updated, ensuring
 * backward compatibility with legacy data structures from earlier system versions.
 *
 * Key Responsibilities:
 * - **Schema Migrations**: Transform legacy field names (snake_case → camelCase)
 * - **Type Migrations**: Convert deprecated item types (bow → weapon with isBow flag)
 * - **Wound System**: Migrate NPC wound modes, multipliers, and legacy wound_lvl structures
 * - **Icon Paths**: Update old .png icon paths to new .webp asset structure
 * - **Default Values**: Backfill missing fields with proper defaults
 * - **Data Normalization**: Ensure type consistency (strings → numbers, case normalization)
 *
 * Migration Lifecycle:
 * - Triggered by system version change via game.settings
 * - Runs once per version bump during Foundry ready hook
 * - Processes world actors/items first, then unlocked compendiums
 * - Includes embedded items within actors (equipment, skills, etc.)
 *
 * L5R4 Game Mechanics Migrated:
 * - **Wound Levels**: 8-rank system (Healthy → Out) with progressive TN penalties
 * - **Earth Multipliers**: Configurable lethality (×2 default, ×3/×4/×5 heroic)
 * - **Armor TN**: Legacy armor_tn → armorTn per (Reflexes × 5 + 5 + bonus) formula
 * - **Skill Defaults**: freeRanks and freeEmphasis for advancement tracking
 *
 * Foundry VTT Integration:
 * - Uses Document.update() with render: false for bulk performance (requires v13+)
 * - Accesses _source for pre-derived raw data when needed
 * - Handles FilePicker API differences between Foundry versions
 * - Respects compendium locked state (skips locked packs)
 * - Uses diff: false for type changes (full replacement required)
 *
 * Safety Notes:
 * - All migrations wrapped in try/catch to prevent cascade failures
 * - Logs failures to console with document context for manual review
 * - Non-destructive: preserves data when target fields already populated
 * - Idempotent: safe to run multiple times on same data
 *
 * @module setup/migrations
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html#update|Document.update API}
 */

import { SYS_ID } from "../config/constants.js";

// Migration utilities
import { hasBeenMigrated, markAsMigrated } from "./migrations/utils/helpers.js";

// Schema migrations
import { applySchemaMapToDocs } from "./migrations/schema/schema-apply.js";

// Actor migrations
import { migrateLegacyNpcWounds } from "./migrations/actors/npc-wounds.js";
import { migrateActorEmbeddedItems } from "./migrations/actors/embedded-items.js";
import { cleanupLegacyFields } from "./migrations/actors/cleanup.js";

// Item migrations
import { migrateBowsToWeapons } from "./migrations/items/bow-to-weapon.js";
import { migrateSkillDefaults } from "./migrations/items/skill-defaults.js";
import { migrateEmphasisStringToArray } from "./migrations/items/emphasis.js";
import { migrateArmorTypes } from "./migrations/items/armor-types.js";
import { migrateFreeRaisesDefaults } from "./migrations/items/free-raises.js";
import { normalizeItems } from "./migrations/items/normalize.js";

// Icon migrations
import { runIconPathMigration, migrateCompendiumIconPaths } from "./migrations/icons/icon-paths.js";

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
 * 2. NPC wound system migration (world actors)
 * 3. Bow → weapon type conversion (world items)
 * 4. Skill default values backfill (world items)
 * 5. Armor type backfill (world items)
 * 6. Free Raises field backfill (world items)
 * 7. Data normalization (world items)
 * 8. Legacy field cleanup (world actors)
 * 9. Embedded item migrations (all world actors)
 * 10. Mark documents as migrated (world actors/items)
 * 11. Compendium migrations (unlocked packs only)
 * 12. Icon path migrations (world + compendiums)
 *
 * Foundry VTT Integration:
 * - Called from system ready hook when version mismatch detected
 * - Uses game.actors.contents and game.items.contents for world documents
 * - Uses game.packs to iterate compendium packs
 * - Checks pack.metadata.locked to respect pack permissions
 *
 * @param {string} fromVersion - Previous system version (unused but kept for API compatibility)
 * @param {string} toVersion - New system version to mark documents with after migration
 * @returns {Promise<void>}
 * @async
 * @export
 */
export async function runMigrations(fromVersion, toVersion) {
  if (!game.user?.isGM) {
    return;
  }

  // Filter out already-migrated documents to ensure true idempotency
  const unmigratedActors = game.actors.contents.filter(doc => !hasBeenMigrated(doc, toVersion));
  const unmigratedItems = game.items.contents.filter(doc => !hasBeenMigrated(doc, toVersion));

  await applySchemaMapToDocs(unmigratedActors, "world-actors");
  await applySchemaMapToDocs(unmigratedItems, "world-items");

  await migrateLegacyNpcWounds(unmigratedActors, "world-legacy-npc-wounds");

  await migrateBowsToWeapons(unmigratedItems, "world-bow-migration");

  await migrateSkillDefaults(unmigratedItems, "world-skill-defaults");

  await migrateEmphasisStringToArray(unmigratedItems, "world-emphasis-migration");

  await migrateArmorTypes(unmigratedItems, "world-armor-types");

  await migrateFreeRaisesDefaults(unmigratedItems, "world-free-raises");

  await normalizeItems(unmigratedItems, "world-items-norm");

  await cleanupLegacyFields(unmigratedActors, "world-actors-cleanup");

  for (const actor of unmigratedActors) {
    await migrateActorEmbeddedItems(actor, "actor");
  }

  // Mark all migrated documents with current version to prevent re-migration
  for (const doc of [...unmigratedActors, ...unmigratedItems]) {
    await markAsMigrated(doc, toVersion);
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
      }
      await migrateBowsToWeapons(unmigratedDocs, `pack-bow-migration:${pack.collection}`);
      await migrateSkillDefaults(unmigratedDocs, `pack-skill-defaults:${pack.collection}`);
      await migrateEmphasisStringToArray(
        unmigratedDocs,
        `pack-emphasis-migration:${pack.collection}`
      );
      await migrateArmorTypes(unmigratedDocs, `pack-armor-types:${pack.collection}`);
      await migrateFreeRaisesDefaults(unmigratedDocs, `pack-free-raises:${pack.collection}`);
      await normalizeItems(unmigratedDocs, `pack-norm:${pack.collection}`);

      if (docType === "Actor") {
        for (const actor of unmigratedDocs) {
          await migrateActorEmbeddedItems(actor, `compendium-actor:${pack.collection}`);
        }
      }

      // Mark compendium documents as migrated
      for (const doc of unmigratedDocs) {
        await markAsMigrated(doc, toVersion);
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap pack failed", { pack: pack.collection, error: e });
    }
  }

  try {
    await runIconPathMigration();
    await migrateCompendiumIconPaths();
  } catch (err) {
    console.warn(`${SYS_ID} | Migration failed`, { fromVersion, toVersion, error: err });
  }
}

// Re-export icon migration for external use
export { runIconPathMigration } from "./migrations/icons/icon-paths.js";
