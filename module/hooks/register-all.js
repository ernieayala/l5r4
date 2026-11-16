/**
 * @module hooks/register-all
 * @description The one place the system's Foundry hooks are registered (CLAUDE.md Layers): services, apps, and
 * sheets export their handlers and init functions, and this file wires them, so every active hook and its order can
 * be read and audited here.
 */
import {
  onCreateActiveEffectAnimation,
  onCreateChatMessageAnimation,
  onDeleteActiveEffectAnimation,
  onDeleteActorAnimation,
  onUpdateActiveEffectAnimation
} from "../services/animations/hooks.js";
import { hasAnimationModules } from "../services/animations/asset-library.js";
import {
  onCreateActiveEffectFullDefense,
  onGetSceneControlButtonsEncounter,
  onPreUpdateActorWounds,
  onUpdateActorWounds,
  registerTokenEffects
} from "../services/effects/automation.js";
import { bindLegacyAttackCard, onChatMessage } from "../services/chat.js";
import {
  bindCheckCard,
  onGetChatMessageContextOptions
} from "../services/dice/check/chat-actions.js";
import { bindPromptCard } from "../services/effects/prompts.js";
import { bindCheckRequestCard } from "../services/check-request.js";
import {
  onPreUpdateActorScrollingText,
  onUpdateActorScrollingText
} from "../services/scrolling-text.js";
import { bindAttackCard } from "../services/combat/attack-card.js";
import { bindDamageCards } from "../services/combat/damage.js";
import { bindFlowCards } from "../services/combat/flow.js";
import { onGetSceneControlButtonsDuel } from "../services/combat/duel.js";
import { onGetSceneControlButtonsGuard } from "../services/combat/guard.js";
import { onGetSceneControlButtonsSession } from "../services/session.js";
import { onGetFolderContextOptions } from "../services/item-transfer.js";
import EffectPanel from "../apps/effect-panel.js";
import CompendiumBrowser from "../apps/compendium-browser.js";
import { onHotbarDrop, registerMacroApi } from "../sheets/ui/macros.js";
import { registerChatDamageButtons } from "./chat-damage-buttons.js";
import { registerSpellMemorizationHooks } from "./spell-memorization.js";

/** The hooks after which the open effect panel redraws: control changes, and effects or the actor change. */
const EFFECT_PANEL_REDRAWS = Object.freeze([
  "controlToken",
  "createActiveEffect",
  "updateActiveEffect",
  "deleteActiveEffect",
  "updateActor",
  "updateCombat"
]);

/**
 * Register all system hooks, once during `init` in the system entry point.
 *
 * Each feature registers in the order below; the comment above each group names what it adds. Handlers on the same
 * hook run in this order: the token controls list their buttons in it.
 * @returns {void}
 */
export function registerAllHooks() {
  // Animation system: visual effects for stances and conditions, when Sequencer and JB2A are both active
  if (hasAnimationModules()) {
    Hooks.on("createActiveEffect", onCreateActiveEffectAnimation);
    Hooks.on("updateActiveEffect", onUpdateActiveEffectAnimation);
    Hooks.on("deleteActiveEffect", onDeleteActiveEffectAnimation);
    Hooks.on("deleteActor", onDeleteActorAnimation);
    Hooks.on("createChatMessage", onCreateChatMessageAnimation);
  }

  // Effects: timed effects of unlinked tokens, Prone from Wounds, Concentration checks, the Full Defense roll, and
  // the GM's "End encounter" control
  Hooks.once("ready", registerTokenEffects);
  Hooks.on("preUpdateActor", onPreUpdateActorWounds);
  Hooks.on("updateActor", onUpdateActorWounds);
  Hooks.on("createActiveEffect", onCreateActiveEffectFullDefense);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsEncounter);

  // Chat integration: the damage button of cards posted before 4.0.0, inline Roll & Keep notation, and the roll
  // card's buttons and context menu entries
  Hooks.on("renderChatMessageHTML", bindLegacyAttackCard);
  Hooks.on("chatMessage", onChatMessage);
  Hooks.on("renderChatMessageHTML", bindCheckCard);
  Hooks.on("getChatMessageContextOptions", onGetChatMessageContextOptions);

  // Effect prompt cards: the owner's roll button
  Hooks.on("renderChatMessageHTML", bindPromptCard);

  // Request cards from a GM's Check link: each player's Roll button
  Hooks.on("renderChatMessageHTML", bindCheckRequestCard);

  // Effect panel: its token-controls button and redraws
  Hooks.on("getSceneControlButtons", EffectPanel.onGetSceneControlButtons);
  for (const hook of EFFECT_PANEL_REDRAWS) {
    Hooks.on(hook, EffectPanel.renderIfOpen);
  }

  // Hotbar macros: a dropped skill, weapon, spell, kata, kiho, Trait, or Ring becomes a macro that rolls it
  registerMacroApi();
  Hooks.on("hotbarDrop", onHotbarDrop);

  // Floating Wound and Void Point numbers over tokens
  Hooks.on("preUpdateActor", onPreUpdateActorScrollingText);
  Hooks.on("updateActor", onUpdateActorScrollingText);

  // Compendium browser: its index fields and the Compendium sidebar's button
  CompendiumBrowser.registerIndexFields();
  Hooks.on("renderCompendiumDirectory", CompendiumBrowser.onRenderCompendiumDirectory);

  // Combat loop: the attack card's maneuver buttons, damage and result cards, flow cards (duel, grapple), and the
  // duel and Guard token controls
  Hooks.on("renderChatMessageHTML", bindAttackCard);
  Hooks.on("renderChatMessageHTML", bindDamageCards);
  Hooks.on("renderChatMessageHTML", bindFlowCards);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsDuel);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsGuard);

  // Game sessions: the GM's "New session" control for once-per-session abilities
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsSession);

  // Item folders: export and import items with their rules
  Hooks.on("getFolderContextOptions", onGetFolderContextOptions);

  // Damage buttons on cards posted by 3.x
  registerChatDamageButtons();

  // Spell system: Memorization XP tracking
  registerSpellMemorizationHooks();
}
