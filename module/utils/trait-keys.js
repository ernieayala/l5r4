/**
 * @module utils/trait-keys
 * @description Turns any way a Trait is named (its key, its English name, its localization key, or its label in the
 * current language) into the Trait's key.
 */

import { toString } from "./type-coercion.js";
import { T } from "./localization.js";

/**
 * Valid L5R4 trait abbreviations.
 * Physical: sta (Stamina), str (Strength), ref (Reflexes), agi (Agility)
 * Mental: wil (Willpower), per (Perception), awa (Awareness), int (Intelligence)
 * Void: void (Void Ring)
 * @constant {string[]}
 */
const KNOWN_TRAITS = Object.freeze([
  "sta",
  "wil",
  "str",
  "per",
  "ref",
  "awa",
  "agi",
  "int",
  "void"
]);

/**
 * Maps English trait names to abbreviations.
 * Used for normalizing trait references from various sources.
 * @constant {Record<string, string>}
 */
const ENGLISH_TRAIT_LABELS = Object.freeze({
  stamina: "sta",
  willpower: "wil",
  strength: "str",
  perception: "per",
  reflexes: "ref",
  awareness: "awa",
  agility: "agi",
  intelligence: "int",
  void: "void"
});

/**
 * Normalizes trait key to standard abbreviation.
 *
 * Handles multiple input formats:
 * - Abbreviations: "agi", "str", "void"
 * - English names: "agility", "strength"
 * - Localization keys: "l5r4.ui.mechanics.traits.agi"
 * - Localized labels: "Agilité" (French) -> "agi"
 *
 * So "agility" gives "agi", and "l5r4.ui.mechanics.traits.str" gives "str".
 * @param {*} raw - Raw trait identifier
 * @returns {string} Normalized trait key ("agi", "str", etc.) or empty string
 */
export function toTraitKey(raw) {
  if (raw == null) {
    return "";
  }
  if (typeof raw === "symbol") {
    return "";
  }
  const k = toString(raw).trim();

  // Check for localization key format: "l5r4.ui.mechanics.traits.agi"
  const m = /^l5r4\.ui\.mechanics\.traits\.(\w+)$/i.exec(k);
  if (m && KNOWN_TRAITS.includes(m[1].toLowerCase())) {
    return m[1].toLowerCase();
  }

  // Special case for void ring localization key
  if (/^l5r4\.ui\.mechanics\.rings\.void$/i.test(k)) {
    return "void";
  }

  // Check if already a valid abbreviation
  if (KNOWN_TRAITS.includes(k.toLowerCase())) {
    return k.toLowerCase();
  }

  // Check English trait names
  if (ENGLISH_TRAIT_LABELS[k.toLowerCase()]) {
    return ENGLISH_TRAIT_LABELS[k.toLowerCase()];
  }

  return getLocalizedTraitKey(k);
}

/**
 * The key of the Trait whose label in the current language is the text, matched without case.
 * @param {string} text - A trimmed Trait name
 * @returns {string} The Trait key, or "" when no label matches
 */
function getLocalizedTraitKey(text) {
  try {
    for (const key of KNOWN_TRAITS) {
      const labelKey =
        key === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${key}`;
      const label = T(labelKey);
      if (label && label.toLowerCase() === text.toLowerCase()) {
        return key;
      }
    }
  } catch {
    // Ignore i18n errors
  }

  // No match found
  return "";
}
