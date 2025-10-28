/**
 * Central Hook Registration
 *
 * Centralizes all Foundry VTT hook registrations for the L5R4 Enhanced system.
 * Provides a single point of reference for all active hooks, making it easier to:
 * - Audit what hooks are registered
 * - Debug hook execution order
 * - Test hook interactions
 * - Maintain hook-related code
 *
 * Hook Categories:
 * - Chat Integration: Damage buttons, inline roll parsing
 * - Combat: Void Point spending, turn tracking
 * - Spell System: Memorization XP tracking
 * - Stance System: ActiveEffect lifecycle management
 * - Wound System: Prone automation on critical wounds
 *
 * @module hooks/register-all
 * @requires Foundry VTT v13+
 */

import { registerChatDamageButtons } from "./chat-damage-buttons.js";
import { registerCombatVoidSpending } from "./combat-void-spending.js";
import { registerSpellMemorizationHooks } from "./spell-memorization.js";
import { initializeStanceService } from "../services/stance/initialize.js";
import { initializeChatService } from "../services/chat.js";
import { initializeWoundProneAutomation } from "../services/wound-prone-automation.js";

/**
 * Register all system hooks
 *
 * Calls all hook registration functions in a centralized location.
 * This function should be called during the 'init' hook in the system entry point.
 *
 * Hook Registration Order:
 * 1. Stance Service - ActiveEffect lifecycle hooks (preCreate, create, update, delete)
 * 2. Chat Service - Chat message rendering, inline roll parsing
 * 3. Wound Prone Automation - Actor update hook for automatic prone application
 * 4. Chat Damage Buttons - Damage button click handlers in chat cards
 * 5. Combat Void Spending - Combat turn hook for Void Point duration tracking
 * 6. Spell Memorization - Item update hook for spell memorization XP tracking
 *
 * @function registerAllHooks
 * @returns {void}
 */
export function registerAllHooks() {
  // Stance system: ActiveEffect lifecycle management
  initializeStanceService();

  // Chat integration: Damage buttons and inline roll parsing
  initializeChatService();

  // Wound system: Automatic prone on critical wounds
  initializeWoundProneAutomation();

  // Chat damage buttons: Apply wounds and reduce with void
  registerChatDamageButtons();

  // Combat: Void Point spending duration tracking
  registerCombatVoidSpending();

  // Spell system: Memorization XP tracking
  registerSpellMemorizationHooks();
}
