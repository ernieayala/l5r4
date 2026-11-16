/**
 * @module utils/browser-filter
 * @description Filtering and sorting the compendium browser's entries (roadmap/STAGE-15). An entry is a pack index
 * row: `{ name, type, folderName, system }`. Pure; module/apps/compendium-browser.js reads the packs and renders.
 */

import { BROWSER_FILTERS, BROWSER_ROW_FIELDS, BROWSER_TABS } from "../config/browser.js";

/**
 * The value at a dotted path, or undefined.
 * @param {object} object
 * @param {string} path
 * @returns {*}
 */
export function valueAt(object, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);
}

/**
 * The index fields the browser reads beyond core's (name, type, img, folder): each filter's field in `system` and
 * the fields a row shows, for `CONFIG.<Document>.compendiumIndexFields`.
 * @param {"Item"|"Actor"} documentName
 * @returns {string[]}
 */
export function browserIndexFields(documentName) {
  const ids = BROWSER_TABS.filter(tab => tab.documentName === documentName).flatMap(
    tab => tab.filters
  );
  const paths = ids.map(id => BROWSER_FILTERS[id].path).filter(path => path.startsWith("system."));
  return [...new Set([...paths, ...BROWSER_ROW_FIELDS[documentName]])];
}

/**
 * A row's key numbers, as a phrase: a weapon's DR, armor's Armor TN bonus and Reduction, a spell's Ring and Mastery
 * Level; null for other entries.
 * @param {object} entry
 * @returns {{key: string, data: object}|null}
 */
export function entryNumbers(entry) {
  const system = entry.system ?? {};
  if (entry.type === "armor") {
    return {
      key: "l5r4.apps.compendiumBrowser.numbers.armor",
      data: { bonus: system.bonus ?? 0, reduction: system.reduction ?? 0 }
    };
  }
  if (entry.type === "spell") {
    const ring =
      system.ring === "all" ? "l5r4.ui.common.all" : `l5r4.ui.mechanics.rings.${system.ring}`;
    return {
      key: "l5r4.apps.compendiumBrowser.numbers.spell",
      data: { ring: { key: ring, data: {} }, mastery: system.mastery ?? 1 }
    };
  }
  if ((entry.type === "weapon" || entry.type === "bow") && !system.isBow) {
    return {
      key: "l5r4.apps.compendiumBrowser.numbers.weapon",
      data: { pool: `${system.damageRoll ?? 0}k${system.damageKeep ?? 0}` }
    };
  }
  return null;
}

/**
 * The values a select filter offers: the distinct values its entries hold, blank ones left out, sorted.
 * @param {object[]} entries
 * @param {string} filterId
 * @returns {string[]}
 */
export function filterOptions(entries, filterId) {
  const filter = BROWSER_FILTERS[filterId];
  const values = new Set();
  for (const entry of entries) {
    const value = valueAt(entry, filter.path);
    if (value !== undefined && value !== null && value !== "") {
      values.add(String(value));
    }
  }
  const compare = filter.numeric ? (a, b) => Number(a) - Number(b) : (a, b) => a.localeCompare(b);
  return [...values].sort(compare);
}

/**
 * The entries a tab shows: its types, the name search, and every filter's choice, sorted by name.
 * @param {object[]} entries
 * @param {BrowserTab} tab
 * @param {{search?: string, choices?: Record<string, string>}} state
 * @returns {object[]}
 */
export function filterEntries(entries, tab, { search = "", choices = {} } = {}) {
  const needle = search.toLowerCase().trim();
  return entries
    .filter(entry => tab.types.includes(entry.type))
    .filter(entry => !needle || entry.name.toLowerCase().includes(needle))
    .filter(entry => tab.filters.every(id => passes(entry, BROWSER_FILTERS[id], choices[id])))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Whether an entry passes one filter. A blank choice passes everything.
 * @param {object} entry
 * @param {BrowserFilter} filter
 * @param {string} choice
 * @returns {boolean}
 */
function passes(entry, filter, choice) {
  if (choice === undefined || choice === null || choice === "") {
    return true;
  }
  const value = valueAt(entry, filter.path);
  switch (filter.kind) {
    case "contains":
      return String(value ?? "")
        .toLowerCase()
        .includes(String(choice).toLowerCase().trim());
    case "bool":
      return Boolean(value) === (choice === "true");
    default:
      return String(value ?? "") === String(choice);
  }
}
