/**
 * Embedded Item Migration
 * Migrates all embedded items within actor documents.
 *
 * @module setup/migrations/actors/embedded-items
 */

import { applySchemaMapToDocs } from "../schema/apply.js";
import { migrateBowsToWeapons } from "../items/bow-to-weapon.js";
import { migrateSkillDefaults } from "../items/skill-defaults.js";
import { migrateEmphasisStringToArray } from "../items/emphasis.js";
import { migrateArmorTypes } from "../items/armor-types.js";
import { migrateFreeRaisesDefaults } from "../items/free-raises.js";
import { normalizeItems } from "../items/normalize.js";
import { migrateItemRules } from "../items/item-rules.js";
import { migrateEmbeddedItemIcons } from "../icons/icon-paths.js";

/**
 * Migrates all embedded items within an actor document.
 *
 * Applies all item-type migrations to embedded items (skills, equipment, weapons, etc.)
 * owned by an actor. Processes schema remapping, bow→weapon conversions, skill defaults,
 * icon updates, data normalization, and item mechanics into rules in sequence.
 *
 * @param {Actor} actor - Actor document containing embedded items to migrate
 * @param {string} labelPrefix - Context prefix for logging (e.g., "actor", "compendium-actor")
 * @returns {Promise<void>}
 */
export async function migrateActorEmbeddedItems(actor, labelPrefix) {
  await migrateEmbeddedItems(actor.items.contents, `${labelPrefix}:${actor.id}`);
}

/**
 * Applies every item-type migration to a list of an actor's items.
 *
 * @param {Item[]} items - Embedded items to migrate
 * @param {string} label - Context label for logging
 * @returns {Promise<void>}
 */
export async function migrateEmbeddedItems(items, label) {
  if (items.length === 0) {
    return;
  }

  await applySchemaMapToDocs(items, `${label}-items`);
  await migrateBowsToWeapons(items, `${label}-bow-migration`);
  await migrateSkillDefaults(items, `${label}-skill-defaults`);
  await migrateEmphasisStringToArray(items, `${label}-emphasis-migration`);
  await migrateArmorTypes(items, `${label}-armor-types`);
  await migrateFreeRaisesDefaults(items, `${label}-free-raises`);
  await migrateEmbeddedItemIcons(items, `${label}-icon-migration`);
  await normalizeItems(items, `${label}-items-norm`);
  await migrateItemRules(items, `${label}-item-rules`);
}
