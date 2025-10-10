/**
 * @fileoverview Item Sheet Data Enhancement
 * 
 * Enhances item sheet template data with system configuration access.
 * Provides config object for dropdown options and constants.
 * 
 * **Responsibilities:**
 * - Build config object from imported constants for template context
 * - Provide access to system constants for templates
 * - Enable dropdown options and lookups in item sheets
 * 
 * **Architecture:**
 * Integration logic called from item.getData() to enhance template context.
 * Provides read-only access to system configuration for sheet rendering.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { 
  ARROWS, 
  SIZES, 
  RINGS, 
  RINGS_WITH_NONE, 
  SPELL_RINGS, 
  SKILL_TRAITS, 
  NPC_TRAITS, 
  SKILL_TYPES, 
  ACTION_TYPES, 
  KIHO_TYPES, 
  ADVANTAGE_TYPES 
} from "../../../config/localization.js";
import { NPC_NUMBER_WOUND_LVLS } from "../../../config/game-data.js";

/**
 * @typedef {object} ItemSheetData
 * @property {L5R4Item} item - The item document
 * @property {object} system - The item's system data
 * @property {object} config - System configuration (injected by enhanceItemSheetData)
 */

/**
 * Enhance item sheet data with system configuration.
 * 
 * Builds config object from imported constants and injects into the data object
 * passed to item sheet templates. This provides access to:
 * - Trait choices and labels
 * - Ring choices and labels
 * - Weapon types and properties
 * - Arrow types and modifiers
 * - Spell ring options
 * - Other system constants needed for dropdowns
 * 
 * **Side Effects:**
 * Mutates the input data object by adding a `config` property.
 * 
 * @param {ItemSheetData} data - Base data object from super.getData()
 * @returns {ItemSheetData} Same object with config property injected
 * 
 * @example
 * // Called from item sheet's getData()
 * const context = await super.getData();
 * return enhanceItemSheetData(context);
 * // Now templates can access {{config.traits}} etc.
 */
export function enhanceItemSheetData(data) {
  // Provide system config to templates for dropdown options and constants
  data.config = {
    arrows: ARROWS,
    sizes: SIZES,
    rings: RINGS,
    ringsWithNone: RINGS_WITH_NONE,
    spellRings: SPELL_RINGS,
    traits: SKILL_TRAITS,
    npcTraits: NPC_TRAITS,
    skillTypes: SKILL_TYPES,
    actionTypes: ACTION_TYPES,
    kihoTypes: KIHO_TYPES,
    advantageTypes: ADVANTAGE_TYPES,
    npcNumberWoundLvls: NPC_NUMBER_WOUND_LVLS
  };
  return data;
}
