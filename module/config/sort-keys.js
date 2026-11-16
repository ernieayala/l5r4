/**
 * @module config/sort-keys
 * @description The column heads of each item list's sort header (components/sort-header.md), and the sort keys
 * they give each list. One value feeds both the header partial (templates/actor/_partials/_sort-header.hbs) and the
 * sort code that checks a clicked or stored key, so a header never offers a key the sort refuses.
 */

/**
 * The column heads of each list, in column order, keyed by the list's sort scope (its `data-scope`). A head with a
 * `key` sorts the list by it and renders as a button; a head with only a `label` does not sort; a head with
 * neither is the spacer over the row controls column. `label` is an i18n key. Two heads may share a key: a
 * weapon's Attack and Damage both sort by damage (sort-header.md H4).
 *
 * @type {Readonly<Record<string, ReadonlyArray<{key?: string, label?: string}>>>}
 */
export const SORT_COLUMNS = Object.freeze({
  skills: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "rank", label: "l5r4.ui.common.rank" },
    { key: "trait", label: "l5r4.character.skills.properties.trait" },
    { key: "roll", label: "l5r4.ui.common.roll" },
    { key: "emphasis", label: "l5r4.character.skills.properties.emphasis" },
    {}
  ]),
  weapons: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "damage", label: "l5r4.ui.mechanics.combat.attack" },
    { key: "damage", label: "l5r4.ui.common.damage" },
    {}
  ]),
  armors: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "bonus", label: "l5r4.ui.common.bonus" },
    { key: "reduction", label: "l5r4.equipment.armor.reduction" },
    { key: "equipped", label: "l5r4.equipment.armor.equipped" },
    {}
  ]),
  items: Object.freeze([{ key: "name", label: "l5r4.ui.common.name" }]),
  spells: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "ring", label: "l5r4.ui.common.ring" },
    { key: "mastery", label: "l5r4.ui.sheets.mastery" },
    { label: "l5r4.magic.spells.cast" },
    {}
  ]),
  techniques: Object.freeze([{ key: "name", label: "l5r4.ui.common.name" }]),
  katas: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "ring", label: "l5r4.ui.common.ring" },
    { key: "mastery", label: "l5r4.ui.sheets.mastery" },
    {}
  ]),
  kihos: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "ring", label: "l5r4.ui.common.ring" },
    { key: "mastery", label: "l5r4.ui.sheets.mastery" },
    { key: "type", label: "l5r4.ui.common.type" },
    {}
  ]),
  tattoos: Object.freeze([{ key: "name", label: "l5r4.ui.common.name" }]),
  advantages: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "type", label: "l5r4.ui.common.type" },
    { key: "cost", label: "l5r4.ui.common.cost" }
  ]),
  disadvantages: Object.freeze([
    { key: "name", label: "l5r4.ui.common.name" },
    { key: "type", label: "l5r4.ui.common.type" },
    { key: "cost", label: "l5r4.ui.common.cost" }
  ]),
  npcAttacks: Object.freeze([
    { label: "l5r4.ui.common.name" },
    { label: "l5r4.ui.mechanics.combat.attack" },
    { label: "l5r4.ui.common.damage" },
    { label: "l5r4.ui.common.action" },
    { label: "l5r4.ui.common.type" },
    {}
  ]),
  xpLedger: Object.freeze([
    { label: "l5r4.ui.common.xp" },
    { label: "l5r4.character.experience.note" },
    {}
  ]),
  "xp-purchases": Object.freeze([
    { key: "note", label: "l5r4.character.experience.reason" },
    { key: "cost", label: "l5r4.character.experience.xpAmount" },
    { key: "type", label: "l5r4.ui.common.type" }
  ])
});

/**
 * The sort keys each list accepts: its heads' keys, each once, in column order. The first is the default sort. A
 * list whose heads do not sort (NPC attacks, the XP ledger) accepts none.
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const SORT_KEYS = Object.freeze(
  Object.fromEntries(
    Object.entries(SORT_COLUMNS).map(([scope, columns]) => [
      scope,
      Object.freeze([...new Set(columns.filter(column => column.key).map(column => column.key))])
    ])
  )
);
