/**
 * @file Sort key configurations for character sheet item lists
 * @module config/sort-keys
 *
 * Defines the available sort fields for different item types on character sheets.
 * Used by sheet sorting controls to determine which columns can be sorted.
 *
 * Architectural Decision: Centralized sort key definitions ensure consistent
 * sorting behavior across PC and NPC sheets and enable dynamic sort UI generation.
 */

/**
 * Sort key configurations for PC (Player Character) sheets.
 * Each property maps an item collection to its sortable fields.
 * Fields appear in the order they should be presented in sort controls.
 *
 * @type {Object<string, Array<string>>}
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
 *
 * @example
 * // Generate sort dropdown options for skills:
 * // PC_SORT_KEYS.skills.forEach(key => {
 * //   html += `<option value="${key}">${game.i18n.localize(`l5r4.sort.${key}`)}</option>`;
 * // });
 *
 * @example
 * // Sort items by configured key:
 * // const sortKey = PC_SORT_KEYS.weapons[0]; // "name"
 * // items.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
 */
export const PC_SORT_KEYS = {
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
};

/**
 * Sort key configurations for NPC (Non-Player Character) sheets.
 * Simplified compared to PC sheets, focusing on essential fields.
 * Each property maps an item collection to its sortable fields.
 *
 * @type {Object<string, Array<string>>}
 * @constant
 * @property {Array<string>} weapons - Weapon sort fields: name, damage, size
 * @property {Array<string>} items - General item sort fields: name
 * @property {Array<string>} skills - Skill sort fields: name, rank, trait (no roll or emphasis)
 * @property {Array<string>} spells - Spell sort fields: name, ring, mastery (no range, aoe, duration)
 *
 * @example
 * // Check if field is sortable for NPC weapons:
 * // const isSortable = NPC_SORT_KEYS.weapons.includes(fieldName);
 */
export const NPC_SORT_KEYS = {
  weapons: ["name", "damage", "size"],
  items: ["name"],
  skills: ["name", "rank", "trait"],
  spells: ["name", "ring", "mastery"]
};
