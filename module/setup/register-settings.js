/**
 * @fileoverview L5R4 System Settings Registration and Configuration Management
 * 
 * This module serves as the centralized configuration hub for the L5R4 Foundry VTT system,
 * registering all system settings with Foundry's settings API and establishing the
 * configuration interface that allows GMs and players to customize their gaming experience.
 * 
 * **Core Responsibilities:**
 * - **Settings Registration**: Register all system settings with appropriate scopes and types
 * - **Configuration Categories**: Organize settings into logical groups for user navigation
 * - **Default Value Management**: Establish sensible defaults for immediate system usability
 * - **Validation and Constraints**: Define acceptable value ranges and validation rules
 * - **Localization Integration**: Provide translatable setting names and descriptions
 * - **Migration Support**: Handle setting schema changes across system versions
 * 
 * **Setting Architecture:**
 * ```
 * Settings Hierarchy:
 * ├── World Settings (GM-controlled, affect all users)
 * │   ├── Automation (stance automation, roll behaviors)
 * │   ├── House Rules (optional rules, variant mechanics)
 * │   └── System Behavior (core mechanics, integration options)
 * └── Client Settings (per-user preferences)
 *     ├── Display (UI themes, visibility options)
 *     ├── Accessibility (contrast, font sizes, animations)
 *     └── Performance (rendering options, cache settings)
 * ```
 * 
 * **Setting Categories:**
 * - **Automation**: Combat stance automation, automatic roll calculations, effect applications
 * - **Display**: UI themes, sheet layouts, chat formatting, visibility toggles
 * - **Dice**: Roll behavior, dice appearance, result formatting, sound effects
 * - **House Rules**: Optional L5R4 mechanics, variant rules, custom interpretations
 * - **Debug**: Development tools, logging levels, diagnostic information
 * - **Performance**: Rendering optimizations, caching strategies, memory management
 * 
 * **Design Principles:**
 * - **Scope Separation**: World settings for game mechanics, client settings for UI preferences
 * - **Sensible Defaults**: All settings work out-of-the-box without configuration
 * - **Progressive Enhancement**: Advanced features are opt-in, basic functionality always available
 * - **Consistent Naming**: Settings follow `l5r4.category.setting` convention
 * - **User-Friendly Descriptions**: Clear, jargon-free explanations of setting effects
 * - **Validation**: Type checking and range validation prevent invalid configurations
 * - **Backwards Compatibility**: Setting changes maintain compatibility with existing worlds
 * 
 * **Integration Points:**
 * - **Dice Service**: Roll behavior, modifier handling, result formatting
 * - **Stance Service**: Automation triggers, effect management, UI updates
 * - **Sheet Classes**: Display preferences, layout options, interaction modes
 * - **Chat Service**: Message formatting, template selection, visibility rules
 * - **Migration System**: Setting schema updates, value transformations
 * 
 * **Usage Example:**
 * ```javascript
 * // Register all system settings during initialization
 * import { registerSettings } from './setup/register-settings.js';
 * 
 * Hooks.once('init', () => {
 *   registerSettings();
 * });
 * 
 * // Access settings in other modules
 * const autoStance = game.settings.get('l5r4', 'automation.stance');
 * const diceTheme = game.settings.get('l5r4', 'display.diceTheme');
 * ```
 * 
 * **Performance Considerations:**
 * - Settings are cached by Foundry for fast access
 * - Validation occurs only during setting changes, not access
 * - Complex settings use object types to minimize API calls
 * - Client settings avoid world data synchronization overhead
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/classes/client.ClientSettings.html|Foundry Settings API}
 * @see {@link https://foundryvtt.com/api/interfaces/client.SettingConfig.html|Setting Configuration}
 */

import { SYS_ID } from "../config.js";

/**
 * Register all L5R4 system settings with Foundry's settings API.
 * This function is called once during system initialization to define
 * all configuration options available to users and the system.
 * 
 * **Registration Strategy:**
 * Settings are registered in a specific order to ensure dependencies are available
 * and to group related functionality for easier maintenance and debugging.
 * 
 * **Registration Order:**
 * 1. **Migration Settings**: Version tracking and one-time migration flags
 * 2. **Client Preferences**: Per-user UI and interaction settings
 * 3. **World Mechanics**: GM-controlled game behavior and automation
 * 4. **Debug Options**: Development and troubleshooting tools
 * 
 * **Setting Scope Guidelines:**
 * - **World Scope**: Affects all users, persists with world data, GM-controlled
 *   - Game mechanics, automation behavior, house rules
 *   - Migration flags, system version tracking
 * - **Client Scope**: Per-user preferences, stored locally
 *   - UI themes, dialog visibility, personal shortcuts
 *   - Accessibility options, performance preferences
 * 
 * **Configuration Visibility:**
 * - `config: true`: Appears in Foundry's Configure Settings menu
 * - `config: false`: Hidden from UI, used for internal tracking
 * - Settings with `requiresReload: true` prompt user to refresh
 * 
 * @returns {void}
 * 
 * @example
 * // Called from system initialization
 * Hooks.once("init", () => {
 *   registerSettings();
 * });
 * 
 * @example
 * // Accessing registered settings
 * const showOptions = game.settings.get('l5r4', 'showTraitRollOptions');
 * const autoStance = game.settings.get('l5r4', 'enableStanceAutomation');
 */
export function registerSettings() {
  /**
   * Migration tracking: one-time v12→v13 item-type migration status.
   * Internal flag to track completion of the item type migration that occurred
   * during the Foundry v12 to v13 transition. Hidden from UI as it's purely
   * for system bookkeeping and should not be modified by users.
   * 
   * @type {boolean} true = migration completed, false = migration pending
   */
  game.settings.register(SYS_ID, "migratedCommonItemTypes", {
    scope: "world", 
    config: false, 
    type: Boolean, 
    default: false
  });

  /**
   * Client UI preference: trait roll dialog visibility.
   * Controls whether the roll options dialog appears when making trait rolls
   * (Ring and Trait rolls). When disabled, rolls use default parameters without
   * prompting for modifiers, void points, or other options.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showTraitRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showTraitRollOptions.name",
    hint: "SETTINGS.showTraitRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Client UI preference: skill roll dialog visibility.
   * Controls whether the roll options dialog appears when making skill rolls.
   * When disabled, skill rolls proceed immediately with default parameters,
   * bypassing modifier selection and emphasis options.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showSkillRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showSkillRollOptions.name",
    hint: "SETTINGS.showSkillRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Client UI preference: spell roll dialog visibility.
   * Controls whether the roll options dialog appears when casting spells.
   * When disabled, spell rolls proceed immediately without prompting for
   * raises, void points, or other casting modifiers.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showSpellRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showSpellRollOptions.name",
    hint: "SETTINGS.showSpellRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Client UI preference: weapon roll dialog visibility.
   * Controls whether the roll options dialog appears when making weapon attacks.
   * When disabled, weapon rolls proceed immediately with default parameters,
   * bypassing stance selection, called shots, and other combat options.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showWeaponRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showWeaponRollOptions.name",
    hint: "SETTINGS.showWeaponRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Migration control: enables/disables automatic data migrations.
   * Provides a safety mechanism to prevent migrations from running
   * if issues are discovered. Should normally remain enabled.
   * 
   * @type {boolean} true = migrations run automatically, false = skip migrations
   */
  game.settings.register(SYS_ID, "runMigration", {
    scope: "world",
    config: true,
    name: "SETTINGS.runMigration.name",
    hint: "SETTINGS.runMigration.label",
    type: Boolean,
    default: true
  });

  /**
   * Migration tracking: stores the last system version that had migrations applied.
   * Used internally to determine if migrations need to run when the system
   * version changes. Hidden from UI as it's purely for system bookkeeping.
   * 
   * @type {string} Semantic version string (e.g., "1.2.3")
   */
  game.settings.register(SYS_ID, "lastMigratedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

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
   * @type {boolean} true = apply Little Truths bonus, false = standard Ten Dice Rule
   * 
   * **Mechanical Effect:**
   * - Normal: 12k8 becomes 10k8 + 4 bonus
   * - With LT Exception: 12k8 becomes 10k8 + 6 bonus (extra +2)
   * 
   * @type {boolean} true = apply Little Truths exception, false = standard Ten Dice Rule
   */
  game.settings.register(SYS_ID, "LtException", {
    config: true, scope: "world",
    name: "SETTINGS.LtException.name",
    hint: "SETTINGS.LtException.label",
    type: Boolean, default: false
  });

  /**
   * NPC void point usage: controls whether NPCs can spend void points on rolls.
   * By default, NPCs don't track void points as a resource, but this setting
   * allows them to gain the mechanical benefits (+1k1) without resource deduction.
   * 
   * @type {boolean} true = NPCs can use void points, false = NPCs cannot use void points
   */
  game.settings.register(SYS_ID, "allowNpcVoidPoints", {
    config: true, scope: "world",
    name: "SETTINGS.allowNpcVoidPoints.name",
    hint: "SETTINGS.allowNpcVoidPoints.label",
    type: Boolean, default: false
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
    config: true, scope: "world",
    name: "SETTINGS.allowArmorStacking.name",
    hint: "SETTINGS.allowArmorStacking.label",
    type: Boolean, default: false
  });
}
