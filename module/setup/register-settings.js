/**
 * L5R4 — Settings registration
 * -----------------------------------------------------------------------------
 * Purpose: centralize all system settings in one place and avoid side-effects on import.
 * Responsibilities: expose a pure function `registerSettings()` for the entrypoint to call.
 *
 * Foundry v13 API: https://foundryvtt.com/api/
 */

import { SYS_ID } from "../config.js";

/**
 * Register system settings for L5R4.
 * All settings live here; keep imports side-effect free.
 * @returns {void}
 */
export function registerSettings() {
  // Tracks the one-time v12→v13 item-type fix
  game.settings.register(SYS_ID, "migratedCommonItemTypes", {
    scope: "world", config: false, type: Boolean, default: false
  });

  // Client UX toggles used in dice prompts
  game.settings.register(SYS_ID, "showTraitRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showTraitRollOptions.name",
    hint: "SETTINGS.showTraitRollOptions.label",
    type: Boolean, default: true
  });

  game.settings.register(SYS_ID, "showSkillRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showSkillRollOptions.name",
    hint: "SETTINGS.showSkillRollOptions.label",
    type: Boolean, default: true
  });

  game.settings.register(SYS_ID, "showSpellRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showSpellRollOptions.name",
    hint: "SETTINGS.showSpellRollOptions.label",
    type: Boolean, default: true
  });

  // Used by weapon roll dialog in dice.js
  game.settings.register(SYS_ID, "showWeaponRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showWeaponRollOptions.name",
    hint: "SETTINGS.showWeaponRollOptions.label",
    type: Boolean, default: true
  });

  /**
   * Temporary kill switch to control whether data migrations run on world load.
   * @see https://foundryvtt.com/api/classes/client.settings.Settings.html#register
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
   * Internal: last system version for which migrations were applied.
   * Used to avoid re-running migrations unnecessarily.
   * World-scoped, hidden from the UI.
   */
  game.settings.register(SYS_ID, "lastMigratedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

  // World logic toggles
  game.settings.register(SYS_ID, "calculateRank", {
    config: true, scope: "world",
    name: "SETTINGS.calculateRank.name",
    hint: "SETTINGS.calculateRank.label",
    type: Boolean, default: true
  });

  /**
   * Little Truths exception (Ten Dice rule).
   * When dice keep is reduced below 10 by conversion, add +2.
   * @see https://foundryvtt.com/api/classes/clientSettings-ClientSettings.html#register
   */
  game.settings.register(SYS_ID, "LtException", {
    config: true, scope: "world",
    name: "SETTINGS.LtException.name",
    hint: "SETTINGS.LtException.label",
    type: Boolean, default: false
  });

  // Allow NPCs to spend Void Points when rolling (consumed by services/dice.js)
  game.settings.register(SYS_ID, "allowNpcVoidPoints", {
    config: true, scope: "world",
    name: "SETTINGS.allowNpcVoidPoints.name",
    hint: "SETTINGS.allowNpcVoidPoints.label",
    type: Boolean, default: false
  });

  // Armor stacking option read in L5R4Actor.prepareDerivedData()
  game.settings.register(SYS_ID, "allowArmorStacking", {
    config: true, scope: "world",
    name: "SETTINGS.allowArmorStacking.name",
    hint: "SETTINGS.allowArmorStacking.label",
    type: Boolean, default: false
  });
}
