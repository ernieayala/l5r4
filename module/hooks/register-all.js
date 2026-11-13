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
 * - Animation System: Visual effects for stances and conditions
 * - Chat Integration: Damage buttons, inline roll parsing, effect prompt cards
 * - Effects: Full Defense roll, Prone from Wounds, Concentration checks
 * - Spell System: Memorization XP tracking
 *
 * @module hooks/register-all
 */

import { registerChatDamageButtons } from "./chat-damage-buttons.js";
import { registerSpellMemorizationHooks } from "./spell-memorization.js";
import { initializeChatService } from "../services/chat.js";
import { initializeAnimations } from "../services/animations/initialize.js";
import { initializeEffectAutomation } from "../services/effects/automation.js";
import { bindPromptCard } from "../services/effects/prompts.js";

/**
 * Register all system hooks
 *
 * Calls all hook registration functions in a centralized location.
 * This function should be called during the 'init' hook in the system entry point.
 *
 * Hook Registration Order:
 * 1. Animation System - Visual effects for stances and conditions (ActiveEffect lifecycle)
 * 2. Effect automation - Full Defense roll, Prone from Wounds, Concentration checks
 * 3. Chat Service - Chat message rendering, inline roll parsing
 * 4. Effect prompt cards - Save, Full Defense, and Concentration buttons
 * 5. Chat Damage Buttons - Damage button click handlers in chat cards
 * 6. Spell Memorization - Item update hook for spell memorization XP tracking
 *
 * @function registerAllHooks
 * @returns {void}
 */
export function registerAllHooks() {
  // Animation system: Visual effects for stances and conditions
  initializeAnimations();

  // Effects: Full Defense roll, Prone from Wounds, Concentration checks
  initializeEffectAutomation();

  // Chat integration: Damage buttons and inline roll parsing
  initializeChatService();

  // Effect prompt cards: the owner's roll button
  Hooks.on("renderChatMessageHTML", bindPromptCard);

  // Chat damage buttons: Apply wounds and reduce with void
  registerChatDamageButtons();

  // Spell system: Memorization XP tracking
  registerSpellMemorizationHooks();
}
