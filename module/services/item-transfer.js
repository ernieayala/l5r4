/**
 * @module services/item-transfer
 * @description Export a folder of Items, with their rules and effects, to one JSON file, and import such a file into
 * a new folder (roadmap/STAGE-11 decision 4). Rules that name an item in the same file name its imported copy. Items
 * from an older core version go through core's import migration
 * [src: client/documents/abstract/client-document.mjs:1025].
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { parseTransfer, buildRemappedRules, buildTransferPayload } from "../utils/item-transfer.js";

/**
 * The export file's content for the items in a folder and its subfolders, ids kept so rules can be rewritten on
 * import.
 * @param {Folder} folder - An Item folder
 * @returns {object}
 */
export function buildFolderTransfer(folder) {
  const folders = [folder, ...folder.getSubfolders(true)];
  const items = folders.flatMap(f => f.contents).map(item => item.toObject());
  return buildTransferPayload(folder.name, items, {
    system: game.system.version,
    core: game.version
  });
}

/**
 * Export the items in a folder and its subfolders to a JSON file the browser saves.
 * @param {Folder} folder - An Item folder
 * @returns {object} The exported content
 */
export function exportItemFolder(folder) {
  const payload = buildFolderTransfer(folder);
  const items = payload.items;
  foundry.utils.saveDataToFile(
    JSON.stringify(payload, null, 2),
    "application/json",
    `fvtt-l5r4-items-${folder.name.slugify()}.json`
  );
  ui.notifications?.info(
    F("l5r4.ui.transfer.exported", { count: items.length, folder: folder.name })
  );
  return payload;
}

/**
 * Import an export file's items into a new folder inside `parent`, named after the exported folder.
 * @param {string} text - The file's content
 * @param {Folder|null} parent
 * @returns {Promise<Item[]>} The imported items
 */
export async function createImportedItems(text, parent) {
  const transfer = parseTransfer(text);
  if (transfer.error) {
    ui.notifications?.error(T(`l5r4.ui.transfer.${transfer.error}`));
    return [];
  }
  const folder = await foundry.documents.Folder.implementation.create({
    name: transfer.folder || T("l5r4.ui.transfer.imported"),
    type: "Item",
    folder: parent?.id ?? null
  });

  // Each source keeps its old id in a flag: the created items are matched by it, not by order. fromCompendium
  // prepares the data as core's own JSON import does: no id or sort, and the other world's ownership cleared
  const sources = [];
  for (const source of transfer.items) {
    try {
      const doc = await Item.implementation.fromImport(source);
      const data = game.items.fromCompendium(doc);
      data.folder = folder.id;
      foundry.utils.setProperty(data, `flags.${SYS_ID}.importedFrom`, source._id ?? "");
      sources.push(data);
    } catch (err) {
      console.warn(`${SYS_ID} | Item "${source.name}" not imported: ${err.message}`);
    }
  }
  const created = await Item.implementation.createDocuments(sources);

  const uuidsById = Object.fromEntries(
    created.map(item => [item.getFlag(SYS_ID, "importedFrom"), item.uuid])
  );
  await Item.implementation.updateDocuments(
    created.map(item => ({
      _id: item.id,
      "system.rules": buildRemappedRules(item._source.system.rules, uuidsById),
      [`flags.${SYS_ID}.importedFrom`]: new foundry.data.operators.ForcedDeletion()
    }))
  );
  ui.notifications?.info(
    F("l5r4.ui.transfer.importedCount", { count: created.length, folder: folder.name })
  );
  return created;
}

/**
 * Add "Export items" and "Import items" to the context menu of Item folders, for the GM.
 * @param {foundry.applications.sidebar.DocumentDirectory} app
 * @param {object[]} entries - The folder context menu's entries, extended in place
 */
export function onGetFolderContextOptions(app, entries) {
  if (app.documentName !== "Item") {
    return;
  }
  const folderOf = header => fromUuidSync(header.closest("[data-folder-id]").dataset.uuid);
  entries.push(
    {
      label: "l5r4.ui.transfer.export",
      icon: "fa-solid fa-file-export",
      visible: () => game.user.isGM,
      onClick: (_event, header) => exportItemFolder(folderOf(header))
    },
    {
      label: "l5r4.ui.transfer.import",
      icon: "fa-solid fa-file-import",
      visible: () => game.user.isGM,
      onClick: (_event, header) => askItemImport(folderOf(header))
    }
  );
}

/**
 * Ask for an export file and import it into a new folder inside `parent`.
 * @param {Folder} parent
 * @returns {Promise<void>}
 */
async function askItemImport(parent) {
  const content = await foundry.applications.handlebars.renderTemplate(
    "templates/apps/import-data.hbs",
    { hint1: T("l5r4.ui.transfer.importHint"), hint2: "" }
  );
  const file = await foundry.applications.api.DialogV2.prompt({
    window: { title: T("l5r4.ui.transfer.import") },
    position: { width: 400 },
    content,
    ok: {
      label: T("l5r4.ui.transfer.import"),
      callback: (_event, button) => button.form.data.files[0] ?? null
    },
    rejectClose: false
  });
  if (file) {
    await createImportedItems(await foundry.utils.readTextFromFile(file), parent);
  }
}
