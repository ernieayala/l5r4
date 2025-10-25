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
 * - Insight Rank calculation automation
 * - Little Truths spell conversion exception
 * - NPC Void Point usage
 * - Armor stacking rules
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
 * - calculateRank: Automatic Insight Rank calculation
 * - LtException: Little Truths spell conversion rule
 * - allowNpcVoidPoints: Enable Void Points for NPCs
 * - allowArmorStacking: Multiple armor pieces stack bonuses
 * - defaultNpcWoundMode: Formula vs manual wound thresholds for new NPCs
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
  // Insight Rank automation
  // Automatically calculates character Insight Rank based on total Insight Points per L5R4 advancement rules.
  // When enabled, system updates character rank; when disabled, GMs manually set rank.
  game.settings.register(SYS_ID, "calculateRank", {
    config: true,
    scope: "world",
    name: "SETTINGS.calculateRank.name",
    hint: "SETTINGS.calculateRank.label",
    type: Boolean,
    default: true
  });

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

  // NPC Void Point Usage
  // By default, most NPCs and non-human creatures in L5R4 do not have a Void Ring or Void Points (core rules).
  // Player Character NPCs and certain special creatures may have Void.
  // This setting displays Void Point options in NPC roll dialogs for such exceptions or house rules.
  game.settings.register(SYS_ID, "allowNpcVoidPoints", {
    config: true,
    scope: "world",
    name: "SETTINGS.allowNpcVoidPoints.name",
    hint: "SETTINGS.allowNpcVoidPoints.label",
    type: Boolean,
    default: false
  });

  // Armor Stacking
  // Core L5R4 rules: only one armor piece applies to Armor TN calculation (Reflexes × 5 + 5 + armor bonus).
  // This setting allows multiple armor items to stack bonuses (useful for magical buffs or house rules).
  game.settings.register(SYS_ID, "allowArmorStacking", {
    config: true,
    scope: "world",
    name: "SETTINGS.allowArmorStacking.name",
    hint: "SETTINGS.allowArmorStacking.label",
    type: Boolean,
    default: false
  });

  // Default NPC Wound Mode
  // Controls how new NPCs calculate wound thresholds:
  // - "formula": Earth Ring × multiplier per wound rank (standard multiplier is 2 for most ranks, 5 for Healthy)
  // - "manual": GM directly enters threshold values for each wound rank
  // Existing NPCs retain their individual wound mode setting.
  game.settings.register(SYS_ID, "defaultNpcWoundMode", {
    config: true,
    scope: "world",
    name: "SETTINGS.defaultNpcWoundMode.name",
    hint: "SETTINGS.defaultNpcWoundMode.label",
    type: String,
    default: "manual",
    choices: {
      manual: "SETTINGS.defaultNpcWoundMode.choices.manual",
      formula: "SETTINGS.defaultNpcWoundMode.choices.formula"
    }
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
