/**
 * @module config/sort-keys
 * @description The sort fields each item list on a character sheet offers, read by the sheets' sort controls. One
 * definition per sheet keeps PC and NPC sorting consistent and lets the sort controls be built from it.
 */

/**
 * Sort key configurations for PC (Player Character) sheets.
 * Each property maps an item collection to its sortable fields, in the order the sort controls present them.
 * A sheet checks a requested key against its list, as `PC_SORT_KEYS.weapons.includes(key)`.
 *
 * @type {Readonly<Record<string, Array<string>>>}
 * @constant
 * @property {Array<string>} armors - Armor sort fields: name, bonus, reduction, equipped
 * @property {Array<string>} weapons - Weapon sort fields: name, damage, size
 * @property {Array<string>} items - General item sort fields: name
 * @property {Array<string>} skills - Skill sort fields: name, rank, trait, roll, emphasis
 * @property {Array<string>} spells - Spell sort fields: name, ring, mastery, range, aoe, duration
 * @property {Array<string>} techniques - Technique sort fields: name
 * @property {Array<string>} technique - Single technique sort fields: name
 * @property {Array<string>} katas - Kata sort fields: name, ring, mastery
 * @property {Array<string>} kihos - Kiho sort fields: name, ring, mastery, type
 * @property {Array<string>} tattoos - Tattoo sort fields: name
 * @property {Array<string>} advantages - Advantage sort fields: name, type, cost
 * @property {Array<string>} disadvantages - Disadvantage sort fields: name, type, cost
 * @property {Array<string>} advDis - Combined advantages/disadvantages sort fields: name, type, cost, item
 */
export const PC_SORT_KEYS = Object.freeze({
  armors: ["name", "bonus", "reduction", "equipped"],
  weapons: ["name", "damage", "size"],
  items: ["name"],
  skills: ["name", "rank", "trait", "roll", "emphasis"],
  spells: ["name", "ring", "mastery", "range", "aoe", "duration"],
  techniques: ["name"],
  technique: ["name"],
  katas: ["name", "ring", "mastery"],
  kihos: ["name", "ring", "mastery", "type"],
  tattoos: ["name"],
  advantages: ["name", "type", "cost"],
  disadvantages: ["name", "type", "cost"],
  advDis: ["name", "type", "cost", "item"]
});

/**
 * Sort key configurations for NPC (Non-Player Character) sheets.
 * Simplified compared to PC sheets, focusing on essential fields.
 * Each property maps an item collection to its sortable fields.
 *
 * @type {Readonly<Record<string, Array<string>>>}
 * @constant
 * @property {Array<string>} weapons - Weapon sort fields: name, damage, size
 * @property {Array<string>} items - General item sort fields: name
 * @property {Array<string>} skills - Skill sort fields: name, rank, trait (no roll or emphasis)
 * @property {Array<string>} spells - Spell sort fields: name, ring, mastery (no range, aoe, duration)
 */
export const NPC_SORT_KEYS = Object.freeze({
  weapons: ["name", "damage", "size"],
  items: ["name"],
  skills: ["name", "rank", "trait"],
  spells: ["name", "ring", "mastery"]
});
