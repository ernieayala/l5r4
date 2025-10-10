/**
 * @fileoverview L5R4 World Settings
 * 
 * Registers GM-controlled game mechanics settings that affect gameplay rules,
 * automation behavior, and default configurations. These settings are stored
 * with world data and apply to all users in the game session.
 * 
 * **Responsibilities:**
 * - Register automation settings (rank calculation)
 * - Register house rule variants (Ten Dice Rule, NPC behavior)
 * - Register default configurations (NPC wound mode, armor stacking)
 * - Provide GM control over game mechanics interpretation
 * 
 * **Settings Registered:**
 * - `calculateRank`: Automatic insight rank calculation based on traits/skills
 * - `LtException`: Little Truths Ten Dice Rule variant (+2 compensation bonus)
 * - `allowNpcVoidPoints`: Enable void point usage for NPCs in rolls
 * - `allowArmorStacking`: Allow multiple armor pieces to stack TN bonuses
 * - `defaultNpcWoundMode`: Default wound calculation method for new NPCs
 * 
 * **Scope:** All settings are `world` scope (stored with world data, GM-controlled)
 * **Visibility:** All are visible in Settings UI (`config: true`)
 * 
 * **Design Notes:**
 * These settings follow L5R4 core rules by default, with house rule variants
 * available as opt-in. GMs can customize gameplay mechanics without modifying code.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/client.ClientSettings.html|Foundry Settings API}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Register all world-scope game mechanics settings.
 * These settings are controlled by the GM and affect all players.
 * 
 * **Registration Order:**
 * Automation settings first, then house rules, then default configurations
 * 
 * @returns {void}
 * 
 * @example
 * // Called from main settings registration
 * registerWorldSettings();
 * 
 * @example
 * // Accessing world settings
 * const autoRank = game.settings.get('l5r4', 'calculateRank');
 * const ltException = game.settings.get('l5r4', 'LtException');
 */
export function registerWorldSettings() {
  /**
   * World game logic: automatic rank calculation.
   * Controls whether the system automatically calculates character insight rank
   * based on ring and skill values. When enabled, rank updates dynamically as
   * traits change. When disabled, GMs must manually set character ranks.
   * 
   * @type {boolean} true = auto-calculate ranks, false = manual rank management
   */
  game.settings.register(SYS_ID, "calculateRank", {
    config: true, 
    scope: "world",
    name: "SETTINGS.calculateRank.name",
    hint: "SETTINGS.calculateRank.label",
    type: Boolean, 
    default: true
  });

  /**
   * Ten Dice Rule variant: Little Truths exception.
   * When the Ten Dice Rule reduces kept dice below 10, adds a +2 bonus
   * to compensate. This is a house rule variant not in the core L5R4 rules.
   * Provides balance for characters with very high dice pools who would
   * otherwise be penalized by the Ten Dice Rule's kept dice reduction.
   * 
   * **Mechanical Effect:**
   * - Normal: 12k8 becomes 10k8 + 4 bonus
   * - With LT Exception: 12k8 becomes 10k8 + 6 bonus (extra +2)
   * 
   * @type {boolean} true = apply Little Truths exception, false = standard Ten Dice Rule
   */
  game.settings.register(SYS_ID, "LtException", {
    config: true, 
    scope: "world",
    name: "SETTINGS.LtException.name",
    hint: "SETTINGS.LtException.label",
    type: Boolean, 
    default: false
  });

  /**
   * NPC void point usage: controls whether NPCs can spend void points on rolls.
   * By default, NPCs don't track void points as a resource, but this setting
   * allows them to gain the mechanical benefits (+1k1) without resource deduction.
   * 
   * @type {boolean} true = NPCs can use void points, false = NPCs cannot use void points
   */
  game.settings.register(SYS_ID, "allowNpcVoidPoints", {
    config: true, 
    scope: "world",
    name: "SETTINGS.allowNpcVoidPoints.name",
    hint: "SETTINGS.allowNpcVoidPoints.label",
    type: Boolean, 
    default: false
  });

  /**
   * Armor mechanics: controls whether multiple armor pieces stack their TN bonuses.
   * Standard L5R4 rules typically don't allow armor stacking, but this provides
   * flexibility for house rules or specific campaign needs.
   * 
   * **Mechanical Effect:**
   * - false (default): Only highest armor TN bonus applies
   * - true: All equipped armor TN bonuses stack together
   * 
   * @type {boolean} true = armor bonuses stack, false = only highest applies
   */
  game.settings.register(SYS_ID, "allowArmorStacking", {
    config: true, 
    scope: "world",
    name: "SETTINGS.allowArmorStacking.name",
    hint: "SETTINGS.allowArmorStacking.label",
    type: Boolean, 
    default: false
  });

  /**
   * NPC wound system: controls the default wound calculation mode for NPCs.
   * Determines whether new NPCs use formula-based (Earth Ring) calculations
   * or manual threshold entry for wound levels.
   * 
   * **Mechanical Effect:**
   * - "manual" (default): NPCs use direct threshold/penalty entry
   * - "formula": NPCs use Earth Ring-based wound calculations like PCs
   * 
   * **Impact:**
   * - Affects new NPC creation defaults
   * - Existing NPCs retain their individual wound mode settings
   * - Can be overridden per-NPC via Wound Configuration dialog
   * 
   * @type {string} "manual" = direct entry, "formula" = Earth-based calculations
   */
  game.settings.register(SYS_ID, "defaultNpcWoundMode", {
    config: true, 
    scope: "world",
    name: "SETTINGS.defaultNpcWoundMode.name",
    hint: "SETTINGS.defaultNpcWoundMode.label",
    type: String, 
    default: "manual",
    choices: {
      "manual": "SETTINGS.defaultNpcWoundMode.choices.manual",
      "formula": "SETTINGS.defaultNpcWoundMode.choices.formula"
    }
  });
}
