/**
 * World Settings Registration
 * Registers world-scoped (GM-controlled) game settings for the L5R4 Enhanced system.
 * These settings affect game mechanics, automation, and rule interpretations.
 *
 * Foundry VTT Integration:
 * - Uses game.settings.register() API with "world" scope
 * - Settings are GM-only and persist with the world data
 * - config:true exposes settings in Configure Game Settings dialog
 *
 * Game Mechanics Affected:
 * - Little Truths spell conversion exception
 * - NPC wound threshold calculation method
 *
 * @module setup/settings/world
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Registers all world-scoped (GM-controlled) game settings.
 * Called during system initialization to set up configurable game rules and automation options.
 *
 * Settings Registered:
 * - LtException: Little Truths spell conversion rule
 *
 * Foundry API:
 * All settings use game.settings.register() with:
 * - scope: "world" (GM-only, affects all players)
 * - config: true (appears in Configure Game Settings)
 * - Localized name/hint from lang files
 *
 * @function registerWorldSettings
 * @returns {void}
 */
export function registerWorldSettings() {
  // Little Truths Exception (Air Spell)
  // Little Truths converts kept dice to rolled dice. Per core rules, if the conversion
  // reduces kept dice below 10, add 2 to the kept dice pool to compensate.
  // This setting enables that compensation mechanic.
  game.settings.register(SYS_ID, "LtException", {
    config: true,
    scope: "world",
    name: "SETTINGS.LtException.name",
    hint: "SETTINGS.LtException.label",
    type: Boolean,
    default: false
  });

  // Custom Skill Emphases
  // Stores world-level custom emphases added by GM/players that are not in the official L5R4 list.
  // Custom emphases are available to all players in the world when managing skill emphases.
  // Hidden from Configure Game Settings as it's managed through EmphasisManager dialog.
  game.settings.register(SYS_ID, "customEmphases", {
    config: false,
    scope: "world",
    type: Array,
    default: []
  });
}
