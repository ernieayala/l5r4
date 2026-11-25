/**
 * @module documents/item/integration/sheet-data
 * @description Adds the option lists item sheets and the actor sheets' item lists render (Rings, Traits, Skill
 * types, and the like) to a sheet's context. The item and actor sheets call it from `_prepareContext()`; the lists
 * are the frozen constants of config/localization.js.
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
  KIHO_ACCESS_TYPES,
  ADVANTAGE_TYPES
} from "../../../config/localization.js";
import { NPC_NUMBER_WOUND_LEVELS } from "../../../config/game-mechanics.js";

/**
 * @typedef {object} SheetContext
 * @property {object} config - Configuration data for template rendering
 * @property {object} config.arrows - Arrow type localization keys (armor, flesh, humming, rope, willow)
 * @property {object} config.armorTypes - Armor type localization keys (ashigaru, light, heavy, riding)
 * @property {object} config.sizes - Weapon size localization keys (small, medium, large)
 * @property {object} config.rings - Five Rings localization keys (fire, water, air, earth, void)
 * @property {object} config.ringsWithNone - Five Rings with empty option for dropdowns
 * @property {object} config.spellRings - Spell Ring keys including "all" for universal spells
 * @property {object} config.traits - Skill trait keys with Void Ring option (sta, wil, str, per, ref, awa, agi, int, void)
 * @property {object} config.npcTraits - NPC trait keys (same as traits, semantic alias)
 * @property {object} config.skillTypes - Skill category keys (high, bugei, merch, low)
 * @property {object} config.actionTypes - Action timing keys (simple, complex, free)
 * @property {object} config.kihoTypes - Kiho category keys (internal, karmic, martial, mystic)
 * @property {object} config.kihoAccess - How a School's student learns kiho (brotherhood, monk, shugenja, ninja, none)
 * @property {object} config.advantageTypes - Advantage/disadvantage type keys (physical, mental, social, material, spiritual, ancestor)
 * @property {object} config.npcNumberWoundLevels - NPC rank to wound level count mapping (1-8)
 */

/**
 * Set `data.config` to the option lists the item templates render with `{{selectOptions}}`: arrows, armor types,
 * weapon sizes, Rings, Traits, Skill, action, kiho, and Advantage types, and the NPC Wound Rank counts.
 * @param {SheetContext} data - Mutable sheet context object from Foundry's data preparation
 * @returns {SheetContext} The same data object with injected config property (for chaining)
 */
export function prepareItemSheetOptions(data) {
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
    kihoAccess: KIHO_ACCESS_TYPES,
    advantageTypes: ADVANTAGE_TYPES,
    npcNumberWoundLevels: NPC_NUMBER_WOUND_LEVELS
  };
  return data;
}
