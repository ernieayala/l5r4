/**
 * @module documents/item/preparation/base-data
 * @description What L5R4Item's `prepareBaseData` does, before Active Effects and derived data: a bow's Strength and
 * arrow defaults, the item type's default icon in place of core's bag icon, and every rich text field as a string,
 * so the sheets' editors and templates never read null.
 */

import { DEFAULT_ICONS } from "../../../config/item-types.js";

/**
 * Prepare an item's base data. A bow gets Strength 0 and the Willow Leaf arrow when they are unset (bow-damage.js
 * reads both); an item with no image or core's bag icon takes its type's default icon, a bow the bow icon; and the
 * rich text fields become strings. Changes `item.system` and `item.img` in place.
 * @param {L5R4Item} item - The item document being prepared
 */
export function prepareItemBaseData(item) {
  const sys = (item.system ??= {});
  const type = item.type;

  // Initialize bow weapon properties per core Weapons rules (bow strength + arrow damage)
  if (type === "weapon" && sys.isBow) {
    if (sys.str == null) {
      sys.str = 0;
    } // Bow strength rating (0-4, added to arrow damage roll)
    if (sys.arrow == null) {
      sys.arrow = "willow";
    } // Arrow type key (see ARROW_MODS in config/game-mechanics.js)
  }

  // Normalize item icon: assign type-specific default if using Foundry's generic bag icon.
  // Handles bow weapons specially (type='weapon' but isBow=true uses bow icon).
  // Coordinates with onItemPreCreate() for initial assignment during item creation.
  if (!item.img || typeof item.img !== "string" || item.img === "icons/svg/item-bag.svg") {
    const isBow = type === "weapon" && sys.isBow;
    const iconType = isBow ? "bow" : type;
    item.img = DEFAULT_ICONS[iconType] ?? "icons/svg/item-bag.svg";
  }

  prepareRichTextFields(sys, type);
}

/**
 * Make an item's rich text fields strings, an absent one empty, so the ProseMirror editors in item sheets never
 * get null. Every type has description, specialRules, demands, notes, and text; a spell also effect and
 * raiseEffects; a weapon or armor special; a kata, kiho, or tattoo effect; a technique effect, benefit, and drawback.
 * @param {object} sys - The item's system data object (item.system)
 * @param {string} type - The item type (weapon, spell, armor, etc.)
 */
function prepareRichTextFields(sys, type) {
  const toStringFields = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] == null) {
        obj[k] = "";
      } else if (typeof obj[k] !== "string") {
        obj[k] = String(obj[k]);
      }
    }
  };

  toStringFields(sys, ["description", "specialRules", "demands", "notes", "text"]);

  switch (type) {
    case "spell":
      toStringFields(sys, ["effect", "raiseEffects"]);
      break;
    case "weapon":
    case "armor":
      toStringFields(sys, ["special"]);
      break;
    case "kata":
    case "kiho":
    case "tattoo":
      toStringFields(sys, ["effect"]);
      break;
    case "technique":
      toStringFields(sys, ["effect", "benefit", "drawback"]);
      break;
  }
}
