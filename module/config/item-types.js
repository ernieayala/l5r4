/**
 * @module config/item-types
 * @description The chat card template and the default icon of each item type, which L5R4Item exposes as
 * `L5R4Item.CHAT_CARD_TEMPLATES` and `L5R4Item.DEFAULT_ICONS`. The `bow` entries serve stored items of the old bow
 * type and weapons with `system.isBow`, which share the bow icon.
 */

import { PATHS } from "./constants.js";

/**
 * Chat card template paths by item type, read by `renderItemChatCard` (chat-cards.js). A `bow` posts the weapon
 * card.
 * @type {Readonly<Record<string, string>>}
 */
export const CHAT_CARD_TEMPLATES = Object.freeze({
  advantage: `${PATHS.templates}/cards/advantage-disadvantage.hbs`,
  armor: `${PATHS.templates}/cards/armor.hbs`,
  bow: `${PATHS.templates}/cards/weapon.hbs`,
  clan: `${PATHS.templates}/cards/commonItem.hbs`,
  disadvantage: `${PATHS.templates}/cards/advantage-disadvantage.hbs`,
  family: `${PATHS.templates}/cards/commonItem.hbs`,
  commonItem: `${PATHS.templates}/cards/commonItem.hbs`,
  kata: `${PATHS.templates}/cards/kata.hbs`,
  kiho: `${PATHS.templates}/cards/kiho.hbs`,
  school: `${PATHS.templates}/cards/commonItem.hbs`,
  skill: `${PATHS.templates}/cards/skill.hbs`,
  spell: `${PATHS.templates}/cards/spell.hbs`,
  tattoo: `${PATHS.templates}/cards/tattoo.hbs`,
  technique: `${PATHS.templates}/cards/technique.hbs`,
  weapon: `${PATHS.templates}/cards/weapon.hbs`
});

/**
 * Default icon paths by item type, given to an item created or prepared with core's bag icon
 * (`onItemPreCreate`, `prepareItemBaseData`). A weapon with `system.isBow` takes the `bow` icon.
 * @type {Readonly<Record<string, string>>}
 */
export const DEFAULT_ICONS = Object.freeze({
  advantage: `${PATHS.icons}/advantage.webp`,
  armor: `${PATHS.icons}/armor.webp`,
  bow: `${PATHS.icons}/bow.webp`,
  clan: `${PATHS.icons}/clan.webp`,
  disadvantage: `${PATHS.icons}/disadvantage.webp`,
  family: `${PATHS.icons}/family.webp`,
  commonItem: `${PATHS.icons}/item.webp`,
  kata: `${PATHS.icons}/kata.webp`,
  kiho: `${PATHS.icons}/kiho.webp`,
  school: `${PATHS.icons}/school.webp`,
  skill: `${PATHS.icons}/skill.webp`,
  spell: `${PATHS.icons}/spell.webp`,
  tattoo: `${PATHS.icons}/tattoo.webp`,
  technique: `${PATHS.icons}/technique.webp`,
  weapon: `${PATHS.icons}/weapon.webp`
});
