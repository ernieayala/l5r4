/**
 * @module setup/migrations/icons/icon-paths
 * @description Moves an item's or actor's image off a legacy PNG icon path to its WebP asset (icon-lookup.js), and an
 * actor's prototype token image with it.
 */
import { buildTokenIconUpdate, getMappedIconPath, getUpdatedIconPath } from "./icon-lookup.js";

/**
 * Move an item's image to its WebP replacement or its type's default icon, when the migration knows it (#180).
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function migrateItemIcon(item) {
  const nextImg = await getUpdatedIconPath(item, "Item");
  if (nextImg && nextImg !== item.img) {
    await item.update({ img: nextImg }, { diff: true, render: false });
  }
}

/**
 * Move an actor's image and its prototype token image off legacy PNG paths.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function migrateActorIcon(actor) {
  const updates = await buildTokenIconUpdate(actor);
  const nextImg = await getMappedIconPath(actor.img);
  if (nextImg && nextImg !== actor.img) {
    updates.img = nextImg;
  }
  if (Object.keys(updates).length > 0) {
    await actor.update(updates, { diff: true, render: false });
  }
}
