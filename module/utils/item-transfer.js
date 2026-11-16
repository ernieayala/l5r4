/**
 * @module utils/item-transfer
 * @description The file format for moving a folder of items with their rules between worlds (roadmap/STAGE-11
 * decision 4), and the rewrite that makes rules naming an item in the same file name its imported copy. No content
 * ships with the system (AUTOMATION.md §5): GMs move their own items.
 */

/** The `format` value of an export file. */
export const TRANSFER_FORMAT = "l5r4-enhanced.items";

/** The version of the file format. */
export const TRANSFER_VERSION = 1;

/**
 * An export file's content for a folder's items.
 * @param {string} folderName
 * @param {object[]} items - Item sources, ids kept so rules can be rewritten on import
 * @param {{system: string, core: string}} versions
 * @returns {object}
 */
export function buildTransferPayload(folderName, items, versions) {
  return {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    systemVersion: versions.system,
    coreVersion: versions.core,
    folder: folderName,
    items
  };
}

/**
 * Read an export file. The file is user input from another world, so its shape is checked before use.
 * @param {string} text
 * @returns {{folder: string, items: object[]}|{error: "invalidJson"|"notExport"}}
 */
export function parseTransfer(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "invalidJson" };
  }
  const isItem = item =>
    item !== null &&
    typeof item === "object" &&
    typeof item.name === "string" &&
    typeof item.type === "string";
  if (data?.format !== TRANSFER_FORMAT || !Array.isArray(data.items) || !data.items.every(isItem)) {
    return { error: "notExport" };
  }
  return { folder: typeof data.folder === "string" ? data.folder : "", items: data.items };
}

/**
 * Rewrite item uuids in rules: each world uuid `Item.<old id>` of an item in the file becomes the uuid of its imported
 * copy. A uuid inside another (an actor's `Actor.<id>.Item.<id>`) is left alone. A GrantItem naming
 * `Item.aaaaaaaaaaaaaaaa`, with that id mapped to `Item.bbbbbbbbbbbbbbbb`, comes back naming the new uuid.
 * @param {object[]} rules
 * @param {Record<string, string>} uuidsById - Old id to new uuid
 * @returns {object[]}
 */
export function buildRemappedRules(rules, uuidsById) {
  const text = JSON.stringify(rules ?? []).replace(
    /(?<![\w.])Item\.([A-Za-z0-9]{16})\b/g,
    (whole, id) => uuidsById[id] ?? whole
  );
  return JSON.parse(text);
}
