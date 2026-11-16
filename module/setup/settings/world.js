/**
 * @module setup/settings/world
 * @description Registers the world-scoped settings, which the GM controls and the world stores for every user: rule
 * options (the Little Truths exception, the optional Honor Roll) and hidden values the system keeps (custom
 * Emphases, the current game session).
 */
import { SYS_ID } from "../../config/constants.js";

/**
 * Registers all world-scoped (GM-controlled) game settings.
 * Called during system initialization to set up configurable game rules and automation options.
 *
 * Settings Registered:
 * - LtException: Little Truths spell conversion rule.
 * - customEmphases: world custom Emphases (hidden).
 * - honorRoll: the optional Honor Roll.
 * - session: the current game session's number (hidden).
 *
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
    name: "l5r4.system.settings.LtException.name",
    hint: "l5r4.system.settings.LtException.hint",
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

  // The optional Honor Roll, off unless the GM turns it on (roadmap/STAGE-11 decision 3)
  // game-rules/43_honor.md, p.92
  game.settings.register(SYS_ID, "honorRoll", {
    config: true,
    scope: "world",
    name: "l5r4.system.settings.honorRoll.name",
    hint: "l5r4.system.settings.honorRoll.hint",
    type: Boolean,
    default: false
  });

  // The game session the GM last started with the "New session" token control; once-per-session uses compare
  // against it
  game.settings.register(SYS_ID, "session", {
    config: false,
    scope: "world",
    type: Number,
    default: 0
  });
}
