/**
 * Item Sheet Data Enhancement
 *
 * Provides a utility function to augment Foundry VTT sheet context objects with
 * L5R4-specific configuration data needed by Handlebars templates for rendering
 * item sheets and embedded item lists in actor sheets.
 *
 * This module follows the Application v2 data preparation pattern where sheet classes
 * call this function within their `_prepareContext()` methods to inject localized
 * dropdown options, form selectors, and other UI configuration data.
 *
 * Usage Pattern:
 * - ItemSheetV2: Called in `_prepareContext()` to prepare item editing forms
 * - ActorSheetV2: Called in `_prepareContext()` for embedded item rendering
 * - Legacy Item.getData(): Called for backwards compatibility (deprecated pattern)
 *
 * Foundry VTT Integration:
 * - Follows Application v2 context preparation lifecycle (Foundry v13+)
 * - Mutates context object in-place following Foundry's data preparation convention
 * - Config objects reference frozen localization constants from config/localization.js
 *
 * @module documents/item/integration/sheet-data
 * @requires Foundry VTT v13+
 */

import {
  ARROWS,
  ARMOR_TYPES,
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
 * @typedef {Object} SheetContext
 * @property {Object} config - Configuration data for template rendering
 * @property {Object} config.arrows - Arrow type localization keys (armor, flesh, humming, rope, willow)
 * @property {Object} config.armorTypes - Armor type localization keys (ashigaru, light, heavy, riding)
 * @property {Object} config.sizes - Weapon size localization keys (small, medium, large)
 * @property {Object} config.rings - Five Rings localization keys (fire, water, air, earth, void)
 * @property {Object} config.ringsWithNone - Five Rings with empty option for dropdowns
 * @property {Object} config.spellRings - Spell Ring keys including "all" for universal spells
 * @property {Object} config.traits - Skill trait keys with Void Ring option (sta, wil, str, per, ref, awa, agi, int, void)
 * @property {Object} config.npcTraits - NPC trait keys (same as traits, semantic alias)
 * @property {Object} config.skillTypes - Skill category keys (high, bugei, merch, low)
 * @property {Object} config.actionTypes - Action timing keys (simple, complex, free)
 * @property {Object} config.kihoTypes - Kiho category keys (internal, karmic, martial, mystic)
 * @property {Object} config.advantageTypes - Advantage/disadvantage type keys (physical, mental, social, material, spiritual, ancestor)
 * @property {Object} config.npcNumberWoundLvls - NPC rank to wound level count mapping (1-8)
 */

/**
 * Augments sheet context with L5R4 configuration data for template rendering.
 *
 * Injects a `config` property containing localized dropdown options and form selector
 * data used by item sheet templates and embedded item lists. Each config property maps
 * to frozen localization constants that reference i18n keys for Handlebars {{selectOptions}}
 * and similar helpers.
 *
 * This function mutates the provided data object in-place following Foundry's convention
 * for sheet context preparation. The config data enables templates to render:
 * - Arrow type selectors (weapon sheets)
 * - Weapon size dropdowns (weapon sheets)
 * - Ring selectors (spell/kiho sheets)
 * - Trait dropdowns (skill roll dialogs)
 * - Skill type categories (skill sheets)
 * - Action type selectors (technique/kata sheets)
 * - Advantage/disadvantage type filters (advantage/disadvantage sheets)
 * - NPC wound level configuration (NPC sheets)
 *
 * Foundry Integration:
 * - Called within `_prepareContext()` methods of ItemSheetV2 and ActorSheetV2 classes
 * - Mutates context object per Application v2 data preparation pattern
 * - All config values reference frozen constants for immutability and performance
 *
 * @param {SheetContext} data - Mutable sheet context object from Foundry's data preparation
 * @returns {SheetContext} The same data object with injected config property (for chaining)
 */
export function enhanceItemSheetData(data) {
  data.config = {
    arrows: ARROWS,
    armorTypes: ARMOR_TYPES,
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
