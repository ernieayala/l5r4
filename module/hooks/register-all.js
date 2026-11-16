/**
 * @module hooks/register-all
 * @description The one place the system's Foundry hooks are registered (CLAUDE.md Layers): services, apps, and
 * sheets export their handlers and init functions, and this file wires them, so every active hook and its order can
 * be read and audited here.
 */
import { registerChatHooks } from "../services/chat.js";
import { registerAnimations } from "../services/animations/initialize.js";
import { registerEffectAutomation } from "../services/effects/automation.js";
import { bindPromptCard } from "../services/effects/prompts.js";
import { registerCombat } from "../services/combat/index.js";
import { registerSessions } from "../services/session.js";
import { registerItemTransfer } from "../services/item-transfer.js";
import { bindCheckRequestCard } from "../services/check-request.js";
import { registerScrollingText } from "../services/scrolling-text.js";
import { registerEffectPanel } from "../apps/effect-panel.js";
import { registerCompendiumBrowser } from "../apps/compendium-browser.js";
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
  registerAnimations();

  // Effects: Full Defense roll, Prone from Wounds, Concentration checks
  registerEffectAutomation();

  // Chat integration: Damage buttons and inline roll parsing
  registerChatHooks();

  // Effect prompt cards: the owner's roll button
  Hooks.on("renderChatMessageHTML", bindPromptCard);

  // Request cards from a GM's Check link: each player's Roll button
  Hooks.on("renderChatMessageHTML", bindCheckRequestCard);

  // Effect panel: its token-controls button and redraws
  registerEffectPanel();

  // Hotbar macros: a dropped skill, weapon, spell, kata, kiho, Trait, or Ring becomes a macro that rolls it
  registerMacroApi();
  Hooks.on("hotbarDrop", onHotbarDrop);

  // Floating Wound and Void Point numbers over tokens
  registerScrollingText();

  // Compendium browser: its index fields and the Compendium sidebar's button
  registerCompendiumBrowser();

  // Combat loop: damage, maneuvers, duel, grapple, Guard
  registerCombat();

  // Game sessions: the GM's "New session" control for once-per-session abilities
  registerSessions();

  // Item folders: export and import items with their rules
  registerItemTransfer();

  // Damage buttons on cards posted by 3.x
  registerChatDamageButtons();

  // Spell system: Memorization XP tracking
  registerSpellMemorizationHooks();
}
