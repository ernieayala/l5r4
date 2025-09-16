/**
 * L5R4 Services Module - Centralized Service Exports for Foundry VTT v13+.
 * 
 * This barrel module provides a stable import interface for all L5R4 system services,
 * enabling clean dependency management and consistent API access across the codebase.
 * All services are re-exported as namespaced modules to prevent naming conflicts.
 *
 * ## Available Services:
 * - **dice**: Roll mechanics, Ten Dice Rule, and dialog systems
 * - **chat**: Item creation dialogs and chat utilities
 * - **stance**: Combat stance automation, effects, and roll modifications
 *
 * ## Usage Examples:
 * ```javascript
 * import { dice, chat, stance } from "./services/index.js";
 * 
 * // Execute a skill roll
 * await dice.SkillRoll({ actor, skillName: "kenjutsu", ... });
 * 
 * // Show item creation dialog
 * const result = await chat.getItemOptions("advantage");
 * 
 * // Apply stance automation during actor preparation
 * stance.applyStanceAutomation(actor, actor.system);
 * 
 * // Create a stance effect
 * const effect = stance.createFullAttackStanceEffect(actor);
 * ```
 *
 * ## Design Principles:
 * - **No Side Effects**: Pure re-exports without initialization logic
 * - **Namespace Isolation**: Each service maintains its own namespace
 * - **Stable API**: Consistent import paths regardless of internal restructuring
 * - **Localization**: Services handle their own i18n via game.i18n API
 *
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 */

/** Dice rolling mechanics and dialog systems. */
export * as dice from "./dice.js";

/** Chat utilities and item creation dialogs. */
export * as chat from "./chat.js";

/** Combat stance automation, effects, and roll modifications. */
export * as stance from "./stance.js";
