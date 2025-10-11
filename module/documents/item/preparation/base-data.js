/**
 * @fileoverview Item Base Data Preparation
 * 
 * Handles initialization and normalization of base item data for template safety.
 * Ensures all rich-text fields are strings, sets bow defaults, and validates icons.
 * 
 * **Responsibilities:**
 * - Normalize rich-text fields to prevent null/undefined in templates
 * - Set type-specific defaults (bow strength, arrow types)
 * - Assign default icons when missing
 * - Ensure system data object exists and is mutable
 * 
 * **Architecture:**
 * Preparation logic called during item.prepareBaseData() lifecycle hook.
 * Mutates item.system in place to establish safe baseline state.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { DEFAULT_ICONS } from "../constants/item-types.js";

/**
 * Prepare base item data for all item types.
 * 
 * Normalizes rich-text fields, sets type-specific defaults, and ensures
 * valid icon paths. Called during prepareBaseData() before derived calculations.
 * 
 * @param {L5R4Item} item - The item document being prepared
 * @returns {void} Mutates item.system and item.img in place
 */
export function prepareItemBaseData(item) {
  const sys = (item.system ??= {});
  const type = item.type;

  // Set bow-specific defaults for damage calculation compatibility
  if (type === "weapon" && sys.isBow) {
    if (sys.str == null) sys.str = 0;            // Bow strength rating for damage calculation
    if (sys.arrow == null) sys.arrow = "willow"; // Default arrow type (must match ARROW_MODS keys)
  }

  // Ensure valid image path, preferring type-specific defaults over generic bag icon
  if (!item.img || typeof item.img !== "string" || item.img === "icons/svg/item-bag.svg") {
    // Special case: bows are weapon type but need bow icon
    const isBow = type === "weapon" && sys.isBow;
    const iconType = isBow ? "bow" : type;
    item.img = DEFAULT_ICONS[iconType] ?? "icons/svg/item-bag.svg";
  }

  // Normalize rich-text fields to strings for template safety
  normalizeRichTextFields(sys, type);
}

/**
 * Normalize rich-text fields to prevent null/undefined in Handlebars templates.
 * 
 * Ensures all rich-text editor fields are strings (empty string if missing).
 * Prevents template rendering errors when editors try to display null values.
 * 
 * @param {object} sys - Item system data object
 * @param {string} type - Item type key
 * @returns {void} Mutates sys in place
 */
function normalizeRichTextFields(sys, type) {
  /**
   * Ensure specified object keys are strings.
   * Converts null/undefined to empty string, coerces other types to string.
   * 
   * @param {object} obj - Object to normalize
   * @param {string[]} keys - Array of property keys to ensure are strings
   * @returns {void} Mutates obj in place
   */
  const ensureString = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] == null) obj[k] = "";
      else if (typeof obj[k] !== "string") obj[k] = String(obj[k]);
    }
  };

  // Normalize common rich-text fields used across multiple item types
  ensureString(sys, ["description", "specialRules", "demands", "notes", "text"]);

  // Normalize type-specific rich-text fields for template editors
  switch (type) {
    case "spell":
      ensureString(sys, ["effect", "raiseEffects"]);
      break;
    case "weapon":
      ensureString(sys, ["special"]);
      break;
    case "armor":
      ensureString(sys, ["special"]);
      break;
    case "kata":
      ensureString(sys, ["effect"]);
      break;
    case "kiho":
      ensureString(sys, ["effect"]);
      break;
    case "technique":
      ensureString(sys, ["effect", "benefit", "drawback"]);
      break;
    case "tattoo":
      ensureString(sys, ["effect"]);
      break;
    case "skill":
      // Skills have no additional type-specific rich-text fields
      break;
  }
}
