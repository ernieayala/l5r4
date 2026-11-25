/**
 * @module hooks/register-all
 * @description The one place the system's Foundry hooks are registered (CLAUDE.md Layers): services, apps, and
 * sheets export their handlers and init functions, and this file wires them, so every active hook and its order can
 * be read and audited here.
 */
import { IMMUNE_STATUS_HOOK } from "../config/constants.js";
import {
  onPreCreateChangeOrigin,
  onPreDeleteChangeOrigin,
  onPreUpdateChangeOrigin
} from "../services/change-origin.js";
import {
  onActiveEffectAnimation,
  onCanvasReadyAnimation,
  onCreateChatMessageAnimation,
  onDeleteActorAnimation,
  onDrawTokenAnimation
} from "../services/animations/hooks.js";
import { hasAnimationModules } from "../services/animations/asset-library.js";
import {
  onCreateActiveEffectFullDefense,
  onGetSceneControlButtonsEncounter,
  onPreUpdateActorWounds,
  onUpdateActorWounds,
  registerTokenEffects
} from "../services/effects/automation.js";
import { onImmuneStatus } from "../services/effects/apply.js";
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
import { bindLegacyDamageCard } from "../services/combat/legacy-damage.js";
import { bindFlowCards } from "../services/combat/flow.js";
import { onGetSceneControlButtonsDuel } from "../services/combat/duel.js";
import { onGetSceneControlButtonsGuard } from "../services/combat/guard.js";
import { onGetSceneControlButtonsSession } from "../services/session.js";
import { onGetFolderContextOptions } from "../services/item-transfer.js";
import { onUpdateItemMemorization } from "../services/xp/versioning.js";
import { registerGmClient } from "../services/gm-client.js";
import EffectPanelApplication from "../apps/effect-panel.js";
import CompendiumBrowserApplication from "../apps/compendium-browser.js";
import { onHotbarDrop, registerMacroApi } from "../sheets/ui/macros.js";
import { onCreateMigrateDocument, onPreCreateMigrationSchema } from "../setup/migrations.js";

/** The hooks after which the open effect panel redraws: control changes, and effects or the actor change. */
const EFFECT_PANEL_REDRAWS = Object.freeze([
  "controlToken",
  "createActiveEffect",
  "updateActiveEffect",
  "deleteActiveEffect",
  "updateActor",
  "updateCombat"
]);

/** The documents whose changes carry the client that sent them (module/services/change-origin.js). */
const CHANGE_ORIGIN_DOCUMENTS = Object.freeze(["Actor", "Item", "ActiveEffect", "ChatMessage"]);

/**
 * Register all system hooks, once during `init` in the system entry point.
 *
 * Each feature registers in the order below; the comment on each step names what it adds. Handlers on the same hook
 * run in this order: the token controls list their buttons in it.
 * @returns {void}
 */
export function registerAllHooks() {
  // GM clients: the GM user's clients agree on the one that answers GM queries and runs GM-only work (#82)
  Hooks.once("ready", registerGmClient);
  registerChangeOriginHooks();
  registerAnimationHooks();
  registerEffectHooks();
  registerChatCardHooks();
  registerInterfaceHooks();
  registerCombatHooks();
  registerMigrationHooks();

  // Item folders: export and import items with their rules
  Hooks.on("getFolderContextOptions", onGetFolderContextOptions);

  // Damage buttons on cards posted by 3.x
  Hooks.on("renderChatMessageHTML", bindLegacyDamageCard);

  // Spell system: a spell memorized or forgotten rebuilds the XP history
  Hooks.on("updateItem", onUpdateItemMemorization);
}

/**
 * Change origin: each change a client sends carries its socket id, so the work after it runs on that client alone,
 * not on every client its user is signed in on.
 */
function registerChangeOriginHooks() {
  for (const documentName of CHANGE_ORIGIN_DOCUMENTS) {
    Hooks.on(`preCreate${documentName}`, onPreCreateChangeOrigin);
    Hooks.on(`preUpdate${documentName}`, onPreUpdateChangeOrigin);
    Hooks.on(`preDelete${documentName}`, onPreDeleteChangeOrigin);
  }
}

/**
 * Migration (#181): a created Actor, Item, or Scene records the schema its data had, and the active GM brings one
 * from an older version up to date.
 */
function registerMigrationHooks() {
  for (const documentName of ["Actor", "Item", "Scene"]) {
    Hooks.on(`preCreate${documentName}`, onPreCreateMigrationSchema);
    Hooks.on(`create${documentName}`, onCreateMigrateDocument);
  }
}

/**
 * Animation system, when Sequencer and JB2A are both active: each client keeps its tokens' stance and condition auras
 * in line with their statuses, and plays the attack animations of the hits it can read.
 */
function registerAnimationHooks() {
  if (hasAnimationModules()) {
    for (const action of ["create", "update", "delete"]) {
      Hooks.on(`${action}ActiveEffect`, onActiveEffectAnimation);
    }
    Hooks.on("deleteActor", onDeleteActorAnimation);
    Hooks.on("canvasReady", onCanvasReadyAnimation);
    Hooks.on("drawToken", onDrawTokenAnimation);
    Hooks.on("createChatMessage", onCreateChatMessageAnimation);
  }
}

/**
 * Effects: timed effects of unlinked tokens, Prone from Wounds, Concentration checks, the Full Defense roll, the GM's
 * "End encounter" control, and the notice for an effect dropped because the actor is immune to its status.
 */
function registerEffectHooks() {
  Hooks.once("ready", registerTokenEffects);
  Hooks.on("preUpdateActor", onPreUpdateActorWounds);
  Hooks.on("updateActor", onUpdateActorWounds);
  Hooks.on("createActiveEffect", onCreateActiveEffectFullDefense);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsEncounter);
  Hooks.on(IMMUNE_STATUS_HOOK, onImmuneStatus);
}

/** Chat cards and chat input: the roll, effect prompt, and Check request cards, and inline Roll & Keep notation. */
function registerChatCardHooks() {
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
}

/** The interface around the sheets: the effect panel, hotbar macros, floating numbers, and the compendium browser. */
function registerInterfaceHooks() {
  // Effect panel: its token-controls button and redraws
  Hooks.on("getSceneControlButtons", EffectPanelApplication.onGetSceneControlButtons);
  for (const hook of EFFECT_PANEL_REDRAWS) {
    Hooks.on(hook, EffectPanelApplication.renderIfOpen);
  }

  // Hotbar macros: a dropped skill, weapon, spell, kata, kiho, Trait, or Ring becomes a macro that rolls it
  registerMacroApi();
  Hooks.on("hotbarDrop", onHotbarDrop);

  // Floating Wound and Void Point numbers over tokens
  Hooks.on("preUpdateActor", onPreUpdateActorScrollingText);
  Hooks.on("updateActor", onUpdateActorScrollingText);

  // Compendium browser: its index fields and the Compendium sidebar's button
  CompendiumBrowserApplication.registerIndexFields();
  Hooks.on("renderCompendiumDirectory", CompendiumBrowserApplication.onRenderCompendiumDirectory);
}

/**
 * Combat loop and sessions: the attack card's maneuver buttons, damage and result cards, flow cards (duel, grapple),
 * the duel and Guard token controls, and the GM's "New session" control for once-per-session abilities.
 */
function registerCombatHooks() {
  Hooks.on("renderChatMessageHTML", bindAttackCard);
  Hooks.on("renderChatMessageHTML", bindDamageCards);
  Hooks.on("renderChatMessageHTML", bindFlowCards);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsDuel);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsGuard);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtonsSession);
}
