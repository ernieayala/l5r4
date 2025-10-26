/**
 * Embedded Item Migration
 * Migrates all embedded items within actor documents.
 *
 * @module setup/migrations/actors/embedded-items
 */

import { applySchemaMapToDocs } from "../schema/schema-apply.js";
import { migrateBowsToWeapons } from "../items/bow-to-weapon.js";
import { migrateSkillDefaults } from "../items/skill-defaults.js";
import { migrateEmphasisStringToArray } from "../items/emphasis.js";
import { migrateArmorTypes } from "../items/armor-types.js";
import { migrateFreeRaisesDefaults } from "../items/free-raises.js";
import { normalizeItems } from "../items/normalize.js";

/**
 * Migrates all embedded items within an actor document.
 *
 * Applies all item-type migrations to embedded items (skills, equipment, weapons, etc.)
 * owned by an actor. Processes schema remapping, bow→weapon conversions, skill defaults,
 * and data normalization in sequence.
 *
 * @param {Actor} actor - Actor document containing embedded items to migrate
 * @param {string} labelPrefix - Context prefix for logging (e.g., "actor", "compendium-actor")
 * @returns {Promise<void>}
 */
export async function migrateActorEmbeddedItems(actor, labelPrefix) {
  if (actor.items.size === 0) {
    return;
  }

  await applySchemaMapToDocs(actor.items.contents, `${labelPrefix}-items:${actor.id}`);
  await migrateBowsToWeapons(actor.items.contents, `${labelPrefix}-bow-migration:${actor.id}`);
  await migrateSkillDefaults(actor.items.contents, `${labelPrefix}-skill-defaults:${actor.id}`);
  await migrateEmphasisStringToArray(
    actor.items.contents,
    `${labelPrefix}-emphasis-migration:${actor.id}`
  );
  await migrateArmorTypes(actor.items.contents, `${labelPrefix}-armor-types:${actor.id}`);
  await migrateFreeRaisesDefaults(actor.items.contents, `${labelPrefix}-free-raises:${actor.id}`);
  await normalizeItems(actor.items.contents, `${labelPrefix}-items-norm:${actor.id}`);
}
