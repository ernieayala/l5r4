/**
 * @module setup/migrations/icons/pack-icon-paths
 * @description Updates legacy PNG icon paths to new WebP assets in unlocked Actor and Item compendium packs.
 */
import { SYS_ID } from "../../../config/constants.js";
import { pluralKeyOf } from "../../../utils/localization.js";
import { buildTokenIconUpdate, getUpdatedIconPath } from "./icon-lookup.js";

/**
 * Migrates legacy PNG icon paths to new WebP assets in compendium packs.
 *
 * Updates actor and item icons within unlocked compendium packs. Skips locked packs to
 * avoid permission errors. Displays notification with count of updated documents when
 * complete. Runs apart from the world migration to handle compendium-specific loading.
 *
 * Foundry VTT Integration:
 * - Respects pack.metadata.locked status (skips locked compendia).
 * - Loads compendium documents via pack.getDocuments().
 * - Updates both document icons and actor prototype token images.
 *
 * @returns {Promise<void>}
 */
export async function migrateCompendiumIconPaths() {
  let changed = 0;
  const packs = game.packs?.contents ?? [];
  for (const pack of packs) {
    changed += await migratePackIcons(pack);
  }

  if (changed > 0) {
    ui.notifications?.info(
      game.i18n.localize(
        pluralKeyOf(
          game.i18n,
          changed,
          category => `l5r4.system.migration.compendiumIconsUpdated.${category}`
        ),
        { count: changed }
      )
    );
  }
}

/**
 * Migrate the icons of one unlocked Actor or Item pack; any other pack, or one whose documents fail to load, is
 * skipped.
 * @param {CompendiumCollection} pack
 * @returns {Promise<number>} How many documents were updated
 */
async function migratePackIcons(pack) {
  const docName = pack.documentName ?? pack.metadata?.type ?? pack.metadata?.documentName;
  if (docName !== "Actor" && docName !== "Item") {
    return 0;
  }

  const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
  if (isLocked) {
    return 0;
  }

  let docs;
  try {
    docs = await pack.getDocuments();
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to load compendium documents", {
      collection: pack.collection,
      err
    });
    return 0;
  }

  let changed = 0;
  for (const doc of docs) {
    changed += await migratePackDocumentIcon(doc, { docName, collection: pack.collection });
  }
  return changed;
}

/**
 * Migrate one pack document's icon, and an actor's prototype token image.
 * @param {Document} doc
 * @param {object} pack
 * @param {string} pack.docName - "Actor" or "Item"
 * @param {string} pack.collection - The pack's collection id, for the warning
 * @returns {Promise<number>} 1 when the document was updated, else 0
 */
async function migratePackDocumentIcon(doc, { docName, collection }) {
  const nextImg = await getUpdatedIconPath(doc, docName);
  const updates = {};

  if (nextImg && nextImg !== doc.img) {
    updates.img = nextImg;
  }

  if (docName === "Actor") {
    Object.assign(updates, await buildTokenIconUpdate(doc));
  }

  if (Object.keys(updates).length === 0) {
    return 0;
  }
  try {
    await doc.update(updates, { diff: true, render: false });
    return 1;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to update compendium doc img", {
      id: doc.id,
      collection,
      err
    });
    return 0;
  }
}
