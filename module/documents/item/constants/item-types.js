/**
 * @module documents/item/constants/item-types
 * @description The chat card template and the default icon of each item type, which L5R4Item exposes as
 * `L5R4Item.CHAT_CARD_TEMPLATES` and `L5R4Item.DEFAULT_ICONS`. The `bow` entries serve stored items of the old bow
 * type and weapons with `system.isBow`, which share the bow icon.
 */

import { TEMPLATE } from "../../../config/templates.js";
import { iconPath } from "../../../config/icons.js";

/**
 * Chat card template paths by item type, read by `renderItemChatCard` (chat-cards.js). A `bow` posts the weapon
 * card.
 * @type {Readonly<Record<string, string>>}
 */
export const CHAT_CARD_TEMPLATES = Object.freeze({
  advantage: TEMPLATE("cards/advantage-disadvantage.hbs"),
  armor: TEMPLATE("cards/armor.hbs"),
  bow: TEMPLATE("cards/weapon.hbs"),
  clan: TEMPLATE("cards/commonItem.hbs"),
  disadvantage: TEMPLATE("cards/advantage-disadvantage.hbs"),
  family: TEMPLATE("cards/commonItem.hbs"),
  commonItem: TEMPLATE("cards/commonItem.hbs"),
  kata: TEMPLATE("cards/kata.hbs"),
  kiho: TEMPLATE("cards/kiho.hbs"),
  school: TEMPLATE("cards/commonItem.hbs"),
  skill: TEMPLATE("cards/skill.hbs"),
  spell: TEMPLATE("cards/spell.hbs"),
  tattoo: TEMPLATE("cards/tattoo.hbs"),
  technique: TEMPLATE("cards/technique.hbs"),
  weapon: TEMPLATE("cards/weapon.hbs")
});

/**
 * Default icon paths by item type, given to an item created or prepared with core's bag icon
 * (`handleItemPreCreate`, `prepareItemBaseData`). A weapon with `system.isBow` takes the `bow` icon.
 * @type {Readonly<Record<string, string>>}
 */
export const DEFAULT_ICONS = Object.freeze({
  advantage: iconPath("advantage.webp"),
  armor: iconPath("armor.webp"),
  bow: iconPath("bow.webp"),
  clan: iconPath("clan.webp"),
  disadvantage: iconPath("disadvantage.webp"),
  family: iconPath("family.webp"),
  commonItem: iconPath("item.webp"),
  kata: iconPath("kata.webp"),
  kiho: iconPath("kiho.webp"),
  school: iconPath("school.webp"),
  skill: iconPath("skill.webp"),
  spell: iconPath("spell.webp"),
  tattoo: iconPath("tattoo.webp"),
  technique: iconPath("technique.webp"),
  weapon: iconPath("weapon.webp")
});
