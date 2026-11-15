/**
 * @module config/browser
 * @description The compendium browser's tabs and filters (roadmap/STAGE-15). A tab lists the entries of its document
 * and item types from every system pack and world compendium the user can see. A filter reads one field of the
 * pack index; a select filter offers the values its tab's entries hold, labeled through `labels` when it has them.
 */

import {
  ADVANTAGE_TYPES,
  ARMOR_TYPES,
  KIHO_TYPES,
  RING_LABELS,
  SIZES,
  SKILL_TYPES,
  TRAITS
} from "./localization.js";

const freeze = Object.freeze;

/**
 * @typedef {object} BrowserFilter
 * @property {string} path    The index field it reads; `folderName` is the entry's folder in its pack
 * @property {"select"|"contains"|"bool"} kind
 * @property {string} label   Localization key of its name
 * @property {Record<string, string>} [labels]  Value to localization key
 * @property {string} [labelPrefix]             Localization key prefix of each value
 * @property {boolean} [numeric]                Its values sort as numbers
 */

/**
 * Every filter, by id.
 * @type {Readonly<Record<string, BrowserFilter>>}
 */
export const BROWSER_FILTERS = freeze({
  type: {
    path: "type",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.type",
    labelPrefix: "TYPES.Item."
  },
  folder: {
    path: "folderName",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.folder"
  },
  skillType: {
    path: "system.type",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.skillType",
    labels: SKILL_TYPES
  },
  trait: {
    path: "system.trait",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.trait",
    labels: TRAITS
  },
  advantageType: {
    path: "system.type",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.advantageType",
    labels: ADVANTAGE_TYPES
  },
  cost: {
    path: "system.cost",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.cost",
    numeric: true
  },
  ring: {
    path: "system.ring",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.ring",
    labels: RING_LABELS
  },
  mastery: {
    path: "system.mastery",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.mastery",
    numeric: true
  },
  keyword: {
    path: "system.keywords",
    kind: "contains",
    label: "l5r4.apps.compendiumBrowser.filters.keyword"
  },
  maho: { path: "system.maho", kind: "bool", label: "l5r4.apps.compendiumBrowser.filters.maho" },
  kihoType: {
    path: "system.type",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.kihoType",
    labels: KIHO_TYPES
  },
  size: {
    path: "system.size",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.size",
    labels: SIZES
  },
  armorType: {
    path: "system.armorType",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.armorType",
    labels: ARMOR_TYPES
  },
  page: {
    path: "system.source.page",
    kind: "select",
    label: "l5r4.apps.compendiumBrowser.filters.page",
    numeric: true
  }
});

/**
 * @typedef {object} BrowserTab
 * @property {string} id
 * @property {"Item"|"Actor"} documentName
 * @property {string[]} types    The document types it lists
 * @property {string[]} filters  Ids in BROWSER_FILTERS, shown in this order
 */

/**
 * The tabs, in order.
 * @type {ReadonlyArray<BrowserTab>}
 */
export const BROWSER_TABS = freeze([
  {
    id: "schools",
    documentName: "Item",
    types: ["school", "technique"],
    filters: ["type", "folder", "page"]
  },
  { id: "skills", documentName: "Item", types: ["skill"], filters: ["skillType", "trait", "page"] },
  {
    id: "advantages",
    documentName: "Item",
    types: ["advantage", "disadvantage"],
    filters: ["type", "advantageType", "cost", "page"]
  },
  {
    id: "spells",
    documentName: "Item",
    types: ["spell"],
    filters: ["ring", "mastery", "keyword", "maho", "page"]
  },
  { id: "kata", documentName: "Item", types: ["kata"], filters: ["ring", "mastery", "page"] },
  {
    id: "kiho",
    documentName: "Item",
    types: ["kiho", "tattoo"],
    filters: ["type", "ring", "mastery", "kihoType", "page"]
  },
  {
    id: "equipment",
    documentName: "Item",
    types: ["weapon", "bow", "armor", "commonItem"],
    filters: ["type", "folder", "size", "keyword", "armorType", "page"]
  },
  {
    id: "clans",
    documentName: "Item",
    types: ["clan", "family"],
    filters: ["type", "folder", "page"]
  },
  { id: "creatures", documentName: "Actor", types: ["npc"], filters: ["folder", "page"] }
]);

/**
 * Index fields a row shows beyond its filters' fields: the book it cites, a weapon's DR, armor's Armor TN bonus and
 * Reduction.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const BROWSER_ROW_FIELDS = freeze({
  Item: freeze([
    "system.source.book",
    "system.damageRoll",
    "system.damageKeep",
    "system.isBow",
    "system.bonus",
    "system.reduction"
  ]),
  Actor: freeze(["system.source.book"])
});
