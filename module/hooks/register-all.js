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
import { initializeCombat } from "../services/combat/index.js";
import { initializeSessions } from "../services/session.js";
import { initializeItemTransfer } from "../services/item-transfer.js";
import { bindCheckRequestCard } from "../services/check-request.js";
import { initializeEffectPanel } from "../apps/effect-panel.js";
import { onHotbarDrop, registerMacroApi } from "../sheets/ui/macros.js";
import { initializeScrollingText } from "../services/scrolling-text.js";

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

  // Request cards from a GM's Check link: each player's Roll button
  Hooks.on("renderChatMessageHTML", bindCheckRequestCard);

  // Effect panel: its token-controls button and redraws
  initializeEffectPanel();

  // Hotbar macros: a dropped skill, weapon, spell, kata, kiho, Trait, or Ring becomes a macro that rolls it
  registerMacroApi();
  Hooks.on("hotbarDrop", onHotbarDrop);

  // Floating Wound and Void Point numbers over tokens
  initializeScrollingText();

  // Combat loop: damage, maneuvers, duel, grapple, Guard
  initializeCombat();

  // Game sessions: the GM's "New session" control for once-per-session abilities
  initializeSessions();

  // Item folders: export and import items with their rules
  initializeItemTransfer();

  // Damage buttons on cards posted by 3.x
  registerChatDamageButtons();

  // Spell system: Memorization XP tracking
  registerSpellMemorizationHooks();
}
