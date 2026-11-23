/**
 * @module setup/migrations/icons/icon-paths
 * @description Updates legacy PNG icon paths to new WebP assets on world actors and items and on actors' embedded
 * items; compendium packs are pack-icon-paths.js.
 */
import { SYS_ID } from "../../../config/constants.js";
import { pluralKeyOf } from "../../../utils/localization.js";
import { buildTokenIconUpdate, getMappedIconPath, getUpdatedIconPath } from "./icon-lookup.js";

/**
 * Migrates legacy PNG icon paths to new WebP assets for world documents.
 *
 * Updates actor and item icons from old .png format to new .webp assets. Also updates
 * prototype token images for actors. Only runs if GM and migration setting enabled.
 * Displays notification with count of updated documents when complete.
 *
 * Idempotency: Icon migration is called from migrateWorld() which filters out already-migrated
 * documents, so this function only processes documents that haven't been migrated yet. This
 * prevents overwriting custom icons when forceMigration is triggered.
 *
 * World-only migration (compendiums are handled by migrateCompendiumIconPaths).
 *
 * @returns {Promise<void>}
 */
export async function migrateIconPaths() {
  if (!game.user?.isGM) {
    return;
  }
  const shouldRun = game.settings.get(SYS_ID, "runMigration");
  if (!shouldRun) {
    return;
  }

  const changed = (await migrateWorldActorIcons()) + (await migrateWorldItemIcons());

  ui.notifications?.info(
    game.i18n.localize(
      pluralKeyOf(game.i18n, changed, category => `l5r4.system.migration.iconsUpdated.${category}`),
      { count: changed }
    )
  );
}

/**
 * Migrates legacy PNG icon paths to new WebP assets for embedded items.
 *
 * Updates item icons for items embedded within actors. This handles items on actor sheets
 * that retain old icon paths even after world items have been migrated.
 *
 * @param {Document[]} docs - Array of Item documents (embedded items from actor.items.contents)
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateEmbeddedItemIcons(docs, label) {
  const itemDocs = docs.filter(doc => doc.documentName === "Item");
  if (itemDocs.length === 0) {
    return;
  }

  let migratedCount = 0;

  for (const item of itemDocs) {
    try {
      const nextImg = await getUpdatedIconPath(item, "Item");

      if (nextImg && nextImg !== item.img) {
        await item.update({ img: nextImg }, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate embedded item icon", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(`${SYS_ID} | Migrated ${migratedCount} embedded item icons (${label})`);
  }
}

/**
 * Migrate each world actor's icon and prototype token image.
 * @returns {Promise<number>} How many actors were updated
 */
async function migrateWorldActorIcons() {
  let changed = 0;
  for (const a of game.actors.contents) {
    const updates = {};

    const nextImg = await getMappedIconPath(a.img);
    if (nextImg && nextImg !== a.img) {
      updates.img = nextImg;
    }

    Object.assign(updates, await buildTokenIconUpdate(a));

    if (Object.keys(updates).length > 0) {
      try {
        await a.update(updates, { diff: true, render: false });
        changed++;
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update actor img", { id: a.id, err });
      }
    }
  }
  return changed;
}

/**
 * Migrate each world item's icon.
 * @returns {Promise<number>} How many items were updated
 */
async function migrateWorldItemIcons() {
  let changed = 0;
  for (const i of game.items.contents) {
    const nextImg = await getUpdatedIconPath(i, "Item");

    if (nextImg && nextImg !== i.img) {
      try {
        await i.update({ img: nextImg }, { diff: true, render: false });
        changed++;
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update item img", { id: i.id, err });
      }
    }
  }
  return changed;
}
