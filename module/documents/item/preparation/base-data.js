/**
 * Item Base Data Preparation
 *
 * Initializes item base data during the Foundry Item DataModel lifecycle.
 * Runs in the prepareBaseData() phase, after _preCreate but before prepareDerivedData.
 *
 * Responsibilities:
 * - Initialize bow weapon properties (strength, arrow type) per core Weapons rules
 * - Normalize item icons (assign type-specific defaults, handle bow special case)
 * - Ensure rich text fields are strings for Handlebars template rendering
 *
 * Game Rules Integration:
 * - Bow mechanics: Implements bow strength and arrow type system from Weapons chapter
 * - Arrow damage calculation: Bow strength + arrow modifiers (see bow-damage.js)
 *
 * Foundry VTT Integration:
 * - Lifecycle: prepareBaseData() hook per Foundry v13+ Item DataModel
 * - Called from: L5R4Item.prepareBaseData() in item.js
 * - Runs: After item creation, before derived data computation
 * - Requires: Foundry v13+
 *
 * Consumers:
 * - item.js: Calls prepareItemBaseData() in prepareBaseData() lifecycle hook
 * - bow-damage.js: Relies on sys.str and sys.arrow being initialized
 * - Templates: Rely on rich text fields being strings for ProseMirror editors
 *
 * @module documents/item/preparation/base-data
 * @requires Foundry VTT v13+
 */

import { DEFAULT_ICONS } from "../constants/item-types.js";

/**
 * Prepares base data for L5R4 items during Foundry's prepareBaseData lifecycle phase.
 *
 * Initializes default values and normalizes data to ensure consistency:
 * 1. Bow weapons: Sets default strength (0) and arrow type ("willow" per Weapons rules)
 * 2. Item icons: Assigns type-specific defaults if using Foundry's generic icon
 * 3. Rich text: Ensures description/effect fields are strings for template rendering
 *
 * Bow Weapon Initialization:
 * Implements the bow damage system from core Weapons rules where bow strength
 * is added to arrow damage dice (e.g., Yumi strength 3 + Willow arrow 2k2 = 5k2).
 * Default arrow type is "willow" (Willow Leaf/Ya arrow with 2k2 base damage).
 * Valid arrow types defined in ARROW_MODS (config/game-data.js).
 *
 * Icon Normalization:
 * Items created without custom icons receive type-specific defaults from DEFAULT_ICONS.
 * Bow weapons (type='weapon' with isBow=true) use the bow icon instead of weapon icon.
 * Coordinates with handleItemPreCreate() for initial icon assignment.
 *
 * Rich Text Normalization:
 * Ensures fields used in ProseMirror editors are strings, not null/undefined.
 * Prevents template rendering errors when Handlebars processes item sheets.
 *
 * Foundry Lifecycle Context:
 * - Phase: prepareBaseData() - first preparation phase after item creation
 * - Timing: Runs after _preCreate, before prepareDerivedData
 * - Frequency: Every time item data is accessed (cached by Foundry)
 * - Side Effects: Mutates item.system and item.img directly
 *
 * @param {L5R4Item} item - The item document being prepared
 * @returns {void} Mutates the item parameter directly
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
    } // Arrow type key (see ARROW_MODS in config/game-data.js)
  }

  // Normalize item icon: assign type-specific default if using Foundry's generic bag icon.
  // Handles bow weapons specially (type='weapon' but isBow=true uses bow icon).
  // Coordinates with handleItemPreCreate() for initial assignment during item creation.
  if (!item.img || typeof item.img !== "string" || item.img === "icons/svg/item-bag.svg") {
    const isBow = type === "weapon" && sys.isBow;
    const iconType = isBow ? "bow" : type;
    item.img = DEFAULT_ICONS[iconType] ?? "icons/svg/item-bag.svg";
  }

  normalizeRichTextFields(sys, type);
}

/**
 * Normalizes rich text fields to strings for safe template rendering.
 *
 * Ensures all description, effect, and special rules fields are strings
 * rather than null/undefined to prevent ProseMirror editor errors in item sheets.
 * Different item types have different rich text fields based on their template structure.
 *
 * Common Rich Text Fields (all item types):
 * - description: Main item description shown in sheets and chat cards
 * - specialRules: Game rules text for special mechanics
 * - demands: Requirements or prerequisites text
 * - notes: GM or player notes field
 * - text: Generic text field for certain item types
 *
 * Type-Specific Rich Text Fields:
 * - spell: effect (spell effect description), raiseEffects (raise options)
 * - weapon/armor: special (special rules or abilities text)
 * - kata/kiho/tattoo: effect (technique effect description)
 * - technique: effect, benefit (rank benefits), drawback (technique limitations)
 *
 * @param {Object} sys - The item's system data object (item.system)
 * @param {string} type - The item type (weapon, spell, armor, etc.)
 * @returns {void} Mutates the sys parameter directly
 * @private
 */
function normalizeRichTextFields(sys, type) {
  const ensureString = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] == null) {
        obj[k] = "";
      } else if (typeof obj[k] !== "string") {
        obj[k] = String(obj[k]);
      }
    }
  };

  ensureString(sys, ["description", "specialRules", "demands", "notes", "text"]);

  switch (type) {
    case "spell":
      ensureString(sys, ["effect", "raiseEffects"]);
      break;
    case "weapon":
    case "armor":
      ensureString(sys, ["special"]);
      break;
    case "kata":
    case "kiho":
    case "tattoo":
      ensureString(sys, ["effect"]);
      break;
    case "technique":
      ensureString(sys, ["effect", "benefit", "drawback"]);
      break;
  }
}
