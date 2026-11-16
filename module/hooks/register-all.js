/**
 * @module hooks/register-all
 * @description The one place the system's Foundry hooks are registered (CLAUDE.md Layers): services, apps, and
 * sheets export their handlers and init functions, and this file wires them, so every active hook and its order can
 * be read and audited here.
 */
import { initializeChatService } from "../services/chat.js";
import { initializeAnimations } from "../services/animations/initialize.js";
import { initializeEffectAutomation } from "../services/effects/automation.js";
import { bindPromptCard } from "../services/effects/prompts.js";
import { initializeCombat } from "../services/combat/index.js";
import { initializeSessions } from "../services/session.js";
import { initializeItemTransfer } from "../services/item-transfer.js";
import { bindCheckRequestCard } from "../services/check-request.js";
import { initializeScrollingText } from "../services/scrolling-text.js";
import { initializeEffectPanel } from "../apps/effect-panel.js";
import { initializeCompendiumBrowser } from "../apps/compendium-browser.js";
import { onHotbarDrop, registerMacroApi } from "../sheets/ui/macros.js";
import { registerChatDamageButtons } from "./chat-damage-buttons.js";
import { registerSpellMemorizationHooks } from "./spell-memorization.js";

/**
 * Register all system hooks, once during `init` in the system entry point.
 *
 * Each feature registers in the order below; the comment above each call names what it adds.
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

  // Compendium browser: its index fields and the Compendium sidebar's button
  initializeCompendiumBrowser();

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
