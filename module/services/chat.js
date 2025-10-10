/**
 * @fileoverview L5R4 Chat Service - Chat Integration and Dialog Utilities for Foundry VTT v13+
 * 
 * This service module provides chat message integration and dialog utilities for the L5R4 system.
 * Handles damage button interactions, inline roll parsing, and unified item creation dialogs.
 *
 * **Core Responsibilities:**
 * - **Chat Integration**: Damage button handlers and inline roll parsing in chat messages
 * - **Unified Dialogs**: Single dialog for all item creation needs
 * - **Roll Parsing**: Convert L5R4 notation (XkY+Z) to Foundry roll format in chat
 * - **Context Awareness**: Shows appropriate item types based on actor type
 *
 * **Chat Integration Features:**
 * - **Damage Buttons**: Click handlers for rolling weapon damage from attack chat cards
 * - **Inline Roll Parsing**: Automatic conversion of [[3k2+1]] notation to proper Foundry rolls
 * - **Permission Validation**: Ensures users can only roll damage for actors they control
 * - **Mixed Content Support**: Handles both pure roll messages and text with embedded rolls
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html|DialogV2}
 * @see {@link https://foundryvtt.com/api/classes/documents.ChatMessage.html|ChatMessage}
 * @see {@link ./dice.js|Dice Service} - Roll construction and execution
 */

import { DIALOG_TEMPLATES } from "../config/templates.js";
import { R, T } from "../utils/localization.js";
import { roll_parser } from "./dice/core/roll-parser.js";

/** Foundry's DialogV2 API for creating modal dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Result object returned by the unified item creation dialog.
 * @typedef {Object} UnifiedItemResult
 * @property {string} [name] - The item name (mutually exclusive with cancelled)
 * @property {string} [type] - The item type (mutually exclusive with cancelled)
 * @property {boolean} [cancelled] - True if user cancelled the dialog (mutually exclusive with name/type)
 */

/**
 * Display a unified item creation dialog and collect user input.
 * Shows all item types relevant to the actor type with proper categorization.
 * 
 * **Dialog Behavior:**
 * - **PC Actors**: Shows all character items (advantages, skills, spells, etc.) + equipment
 * - **NPC Actors**: Shows only skills (restricted for simplified NPC management)
 * - **Validation**: Requires non-empty item name before allowing creation
 * - **Cancellation**: Returns cancelled status if user cancels or validation fails
 * - **Auto-Selection**: Pre-selects item type based on sheet section context
 * 
 * **Template Context:**
 * The dialog template receives context data to determine which item types to show:
 * - `showCharacterItems`: Boolean indicating if PC items should be displayed (true for PCs)
 * - `npcSkillsOnly`: Boolean indicating if only skills should be shown for NPCs
 * - `preferredType`: String indicating which item type should be pre-selected
 * 
 * **NPC Restriction Rationale:**
 * NPCs are currently restricted to skills only for simplified management. This ensures
 * the Skills section "Add item" button works correctly while preventing clutter from
 * unnecessary item types that NPCs typically don't use.
 * 
 * @integration-test Scenario: User submits dialog with valid item name and type
 * @integration-test Scenario: User submits dialog with empty item name (should return cancelled:true)
 * @integration-test Scenario: User cancels dialog (should return cancelled:true)
 * @integration-test Scenario: Dialog rejection/error (should return cancelled:true)
 * @integration-test Reason: DIALOG constant captured at module load prevents unit testing callback
 * @integration-test Validates: Form validation, return value handling, error recovery
 * 
 * @param {string} actorType - The actor type ("pc" or "npc") to determine available items
 * @param {string} [preferredType] - Optional item type to pre-select in dropdown
 * @returns {Promise<UnifiedItemResult>} User selections or cancellation status
 */
export async function getUnifiedItemOptions(actorType, preferredType = null) {
  // Determine which item types to show based on actor type
  const isNpc = actorType === "npc";
  const showCharacterItems = actorType === "pc";
  const npcSkillsOnly = isNpc; // NPCs restricted to skills only
  
  // Render dialog content with appropriate context
  const content = await R(DIALOG_TEMPLATES.unifiedItemCreate, { 
    showCharacterItems,
    npcSkillsOnly,
    preferredType 
  });

  try {
    // Display modal dialog with form validation
    const result = await DIALOG.prompt({
      window: { title: T("l5r4.ui.sheets.addItem") },
      content,
      ok: {
        label: T("l5r4.ui.common.ok"),
        callback: (_ev, button, dialog) => {
          // Extract form data from dialog
          const form = button.form ?? dialog.form;
          if (!form) return { cancelled: true };
          
          // Validate and normalize user input
          const name = String(form.elements.itemName?.value ?? "").trim();
          const type = String(form.elements.itemType?.value ?? "").trim() || "commonItem";
          
          // Require non-empty item name
          if (!name) return { cancelled: true };
          
          return { name, type };
        }
      },
      cancel: { label: T("l5r4.ui.common.cancel") },
      rejectClose: true, // Prevent closing without button interaction
      modal: true        // Block other UI interaction
    });

    return result ?? { cancelled: true };
  } catch {
    return { cancelled: true };
  }
}

/**
 * Initialize chat service by registering all chat-related hooks.
 * This function should be called once during system initialization.
 * 
 * **Registered Hooks:**
 * - `renderChatMessageHTML`: Attach damage button click handlers
 * - `chatMessage`: Parse L5R4 inline roll notation
 * 
 * @returns {void}
 * 
 * @example
 * // Called from l5r4.js during init hook
 * Hooks.once("init", () => {
 *   initializeChatService();
 * });
 */
export function initializeChatService() {
  registerDamageButtonHook();
  registerInlineRollParsingHook();
}

/**
 * Register damage button click handler for weapon chat cards.
 * Attaches event listeners to damage buttons in rendered chat messages,
 * enabling players to roll weapon damage directly from attack results.
 * 
 * **Foundry v13 Migration:**
 * Uses `renderChatMessageHTML` hook (v13+) instead of deprecated `renderChatMessage`.
 * HTML parameter is native HTMLElement, not jQuery.
 * 
 * **Button Data Attributes:**
 * - `data-weapon-id`: Item UUID for the weapon
 * - `data-actor-id`: Actor ID who owns the weapon
 * - `data-weapon-name`: Display name of the weapon
 * - `data-damage-roll`: Number of dice to roll (e.g., 3 for 3k2)
 * - `data-damage-keep`: Number of dice to keep (e.g., 2 for 3k2)
 * 
 * **Security Hardening:**
 * - **Permission Validation**: Validates actor ownership before allowing damage rolls
 * - **GM Override**: GM users can roll damage for any actor
 * - **Input Validation**: Clamps dice values to safe bounds [0, 99] to prevent negative/extreme values
 * - **Race Condition Protection**: Debouncing prevents multiple concurrent clicks (DoS prevention)
 * - **Defensive Null Checks**: Optional chaining throughout to handle undefined globals gracefully
 * - **Error Recovery**: Try/finally blocks ensure cleanup even on failure
 * 
 * @returns {void}
 * @private
 */
function registerDamageButtonHook() {
  Hooks.on("renderChatMessageHTML", (app, html, data) => {
    try {
      html.querySelectorAll(".l5r4-damage-button").forEach(button => {
        let isProcessing = false; // Debounce flag per button
        
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          
          // Prevent concurrent clicks (race condition protection)
          if (isProcessing) return;
          isProcessing = true;
          
          try {
            const button = event.currentTarget;
            const weaponId = button.dataset.weaponId;
            const actorId = button.dataset.actorId;
            const weaponName = button.dataset.weaponName;
            
            // Input validation: Clamp dice values to reasonable bounds (0-99)
            // L5R4 game rules: Max realistic roll is ~15k10, so 99 is safe upper bound
            const rawRoll = parseInt(button.dataset.damageRoll) || 0;
            const rawKeep = parseInt(button.dataset.damageKeep) || 0;
            const damageRoll = Math.max(0, Math.min(99, rawRoll));
            const damageKeep = Math.max(0, Math.min(99, rawKeep));
            
            // Extract raises from attack roll (clamped to reasonable bounds)
            const rawRaises = parseInt(button.dataset.attackRaises) || 0;
            const attackRaises = Math.max(0, Math.min(20, rawRaises));
            
            // Extract stance bonuses from attack (Full Attack: +1k1 damage)
            const rawStanceRoll = parseInt(button.dataset.stanceRoll) || 0;
            const rawStanceKeep = parseInt(button.dataset.stanceKeep) || 0;
            const stanceRoll = Math.max(0, Math.min(10, rawStanceRoll));
            const stanceKeep = Math.max(0, Math.min(10, rawStanceKeep));

            // Find the actor (defensive null checks)
            const actor = game?.actors?.get(actorId);
            if (!actor) {
              const message = game?.i18n?.localize?.("l5r4.ui.notifications.actorNotFound") 
                ?? "Actor not found";
              ui?.notifications?.warn(message);
              return;
            }

            // Check permissions - only allow if user owns the actor or is GM
            if (!actor.isOwner && !game?.user?.isGM) {
              const message = game?.i18n?.localize?.("l5r4.ui.notifications.noPermissionDamage") 
                ?? "No permission to roll damage";
              ui?.notifications?.warn(message);
              return;
            }

            // Import WeaponRoll from dice service
            const { WeaponRoll } = await import("./dice/rolls/weapon-roll.js");
            
            // Roll weapon damage with automatic raise and stance bonuses
            return WeaponRoll({
              diceRoll: damageRoll,
              diceKeep: damageKeep,
              weaponName: weaponName,
              askForOptions: event.shiftKey,
              attackRaises: attackRaises,
              stanceRollBonus: stanceRoll,
              stanceKeepBonus: stanceKeep
            });
          } finally {
            // Always reset processing flag
            isProcessing = false;
          }
        });
      });
    } catch (error) {
      console.warn("L5R4", "Error attaching damage button listeners:", error);
    }
  });
}

/**
 * Register inline roll parsing for L5R4 notation in chat messages.
 * Intercepts chat messages and converts [[XkY+Z]] notation to proper Foundry rolls.
 * 
 * **Supported Formats:**
 * - Pure roll: `[[3k2+1]]` → Converted to Foundry roll
 * - Mixed content: `I roll [[3k2+1]] for damage` → Text with embedded roll
 * - Modifiers: `u` (unskilled), `e` (emphasis), `x` (explode value), `+` (bonus)
 * 
 * **Roll Commands Ignored:**
 * Standard Foundry roll commands are passed through unchanged:
 * - `/roll`, `/r`, `/gmroll`, `/gmr`, `/blindroll`, `/br`, `/selfroll`, `/sr`
 * 
 * **Pattern Matching:**
 * - Roll notation: `(u|e)?\d+k\d+(x\d+)?([+]\d+)?`
 * - Examples: `3k2`, `u4k3`, `e5k4+2`, `6k5x9+3`
 * 
 * **Security Hardening:**
 * - **DoS Protection**: Rejects messages >10,000 characters to prevent regex catastrophic backtracking
 * - **Defensive Null Checks**: Optional chaining for game globals to handle undefined gracefully
 * - **Fallback Messages**: Provides fallback text if i18n localization unavailable
 * 
 * @returns {void}
 * @private
 */
function registerInlineRollParsingHook() {
  Hooks.on("chatMessage", (chatlog, message, _chatData) => {
    // DoS protection: Reject extremely long messages (>10k chars)
    // Prevents regex catastrophic backtracking and performance issues
    if (message.length > 10000) {
      const warning = game?.i18n?.localize?.("l5r4.ui.notifications.messageTooLong") 
        ?? "Message too long (max 10,000 characters)";
      ui?.notifications?.warn(warning);
      return false;
    }
    
    // Ignore standard roll commands
    const rollCmd = /^\/(r(oll)?|gmr(oll)?|br(oll)?|sr(oll)?)\s/i;
    if (rollCmd.test(message)) return true;

    // Handle complete inline roll messages: [[3k2+1]]
    const whole = /^\[\[(.*)\]\]$/;
    if (whole.test(message)) {
      const token = message.substring(2, message.length - 2);
      const kxy   = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;
      
      // Only process if token matches L5R4 notation
      if (kxy.test(token)) {
        const result = roll_parser(token);
        chatlog.processMessage(result);
        return false;
      }
    }

    // Handle mixed text with embedded inline rolls: "I roll [[3k2+1]] for damage"
    const inline = /\[\[(.*?)\]\]/g;
    const kxy = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;
    
    // Check if message contains any inline rolls
    const hasInlineRolls = inline.test(message);
    inline.lastIndex = 0; // Reset regex state after test
    
    if (hasInlineRolls) {
      let hasL5R4Rolls = false;
      const result = message.replace(inline, (match, token) => {
        if (!kxy.test(token)) return match;
        hasL5R4Rolls = true;
        return roll_parser(token);
      });
      
      // Only process if we found actual L5R4 notation
      if (hasL5R4Rolls) {
        chatlog.processMessage(result);
        return false;
      }
    }

    return true;
  });
}
