/**
 * Chat Service
 *
 * Centralized service for chat-related functionality including item creation dialogs,
 * inline roll parsing, and damage button event handling. Integrates L5R4 Roll & Keep
 * dice notation with Foundry's chat system and provides UI dialogs for item creation.
 *
 * Core Responsibilities:
 * - **Item Creation Dialog**: Unified dialog for creating actor items (skills, advantages, equipment, etc.)
 * - **Inline Roll Parsing**: Intercepts chat messages to parse L5R4 Roll & Keep notation (XkY format)
 * - **Damage Button Handling**: Attaches click handlers to weapon damage buttons in chat cards
 *
 * L5R4 Mechanics Integration:
 * - Roll & Keep Notation: Parses [[XkY]] inline rolls per Skills & Rolls rules
 * - Exploding Dice: All 10s explode (re-roll and add) per core dice mechanics
 * - Unskilled Rolls: Recognizes 'u' prefix (uXkY) - dice don't explode per Unskilled Roll rules
 * - Emphasis: Recognizes 'e' prefix (eXkY) - re-roll 1s per Skill Emphasis rules
 * - Damage Rolls: Handles weapon damage with attack raises and stance bonuses per Combat rules
 *
 * Foundry VTT Integration:
 * - Requires: Foundry VTT v13+ (DialogV2 API, Hook system)
 * - Hooks: renderChatMessageHTML (damage buttons), chatMessage (inline roll parsing)
 * - Permissions: Respects actor ownership and GM privileges for damage rolls
 * - Chat System: Integrates with ChatMessage and chatlog.processMessage() for roll output
 *
 * Service Initialization:
 * Call initializeChatService() from system init hook to register all chat hooks.
 * This attaches event listeners for damage buttons and inline roll interceptors.
 *
 * @module services/chat
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html|DialogV2 API}
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Hooks.html|Hooks API}
 */

import { DIALOG_TEMPLATES } from "../config/templates.js";
import { R, T } from "../utils/localization.js";
import { roll_parser } from "./dice/core/roll-parser.js";
import { clamp } from "../utils/type-coercion.js";
import { validateAttackRaises } from "../utils/validators.js";

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Item creation result object
 * @typedef {Object} ItemCreateResult
 * @property {string} [name] - Name of the item to create (only present if not cancelled)
 * @property {string} [type] - Item type identifier (only present if not cancelled)
 * @property {boolean} [cancelled] - True if dialog was cancelled or invalid input provided
 */

/**
 * Display unified item creation dialog and return user selections.
 *
 * Prompts the user with a dialog to create a new item for an actor. The dialog
 * adjusts available item types based on actor type:
 * - PC actors: All item types (skills, advantages, disadvantages, equipment, spells, etc.)
 * - NPC actors: Skills only (simplified NPC sheet)
 *
 * Dialog uses Foundry v13+ DialogV2.prompt() with rejectClose behavior, meaning
 * clicking outside the dialog or pressing Escape is treated as cancellation rather
 * than rejection, returning {cancelled: true} instead of throwing.
 *
 * Validation:
 * - Item name is required (empty names return {cancelled: true})
 * - Item type defaults to "commonItem" if not provided
 * - Form element access uses fallback pattern: button.form ?? dialog.form
 *
 * @param {string} actorType - Actor type ("pc" or "npc") to determine available item types
 * @param {string|null} [preferredType=null] - Item type to pre-select in dialog (e.g., "skill", "advantage")
 * @returns {Promise<ItemCreateResult>} Object with {name, type} on success, {cancelled: true} on cancellation
 *
 * @async
 */
export async function getUnifiedItemOptions(actorType, preferredType = null) {
  const showCharacterItems = actorType === "pc";
  const npcSkillsOnly = actorType === "npc";

  const content = await R(DIALOG_TEMPLATES.unifiedItemCreate, {
    showCharacterItems,
    npcSkillsOnly,
    preferredType
  });

  try {
    const result = await DIALOG.prompt({
      window: { title: T("l5r4.ui.sheets.addItem") },
      content,
      ok: {
        label: T("l5r4.ui.common.ok"),
        callback: (_ev, button, dialog) => {
          // Fallback pattern: button.form exists in most cases, dialog.form as backup
          // This handles edge cases where button might not have direct form reference
          const form = button.form ?? dialog.form;
          if (!form) {
            return { cancelled: true };
          }

          const name = String(form.elements.itemName?.value ?? "").trim();
          const type = String(form.elements.itemType?.value ?? "").trim() || "commonItem";

          if (!name) {
            return { cancelled: true };
          }

          return { name, type };
        }
      },
      cancel: { label: T("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });

    return result ?? { cancelled: true };
  } catch {
    return { cancelled: true };
  }
}

/**
 * Initialize chat service by registering all required Foundry VTT hooks.
 *
 * Registers two critical hooks for L5R4 chat integration:
 * 1. renderChatMessageHTML: Attaches click handlers to damage buttons in weapon chat cards
 * 2. chatMessage: Intercepts outgoing chat messages to parse L5R4 inline roll notation
 *
 * This function should be called once during system initialization (typically in the
 * 'init' hook). Hooks remain active for the entire Foundry session.
 *
 * Registered Hooks:
 * - **renderChatMessageHTML**: Runs after chat HTML is rendered, before display
 * - **chatMessage**: Runs before message is sent to chat, can intercept/modify
 *
 * @see registerDamageButtonHook
 * @see registerInlineRollParsingHook
 */
export function initializeChatService() {
  registerDamageButtonHook();
  registerInlineRollParsingHook();
}

/**
 * Register hook to attach damage roll click handlers to weapon chat cards.
 *
 * Hooks into renderChatMessageHTML to find all damage buttons (.l5r4-damage-button)
 * and attach click event listeners. When clicked, extracts weapon data from button
 * dataset attributes and invokes WeaponRoll service to execute damage roll.
 *
 * L5R4 Damage Mechanics:
 * - Base Damage: Weapon DR (roll/keep) from dataset.damageRoll/damageKeep
 * - Attack Raises: Converted to damage (+1k0 per raise) per Increased Damage maneuver
 * - Stance Bonuses: Full Attack stance grants +2k1 to damage rolls
 * - Clamping: Enforces game bounds (roll/keep 0-99, raises 0-20, stance 0-10)
 *
 * Permission Checks:
 * - Requires actor ownership (actor.isOwner) OR GM privileges (game.user.isGM)
 * - Shows warning notification if permission denied
 *
 * Debouncing:
 * - Uses isProcessing flag to prevent double-click damage rolls
 * - Flag scoped per button instance, resets after roll completes
 *
 * Shift-Key Modifier:
 * - Holding Shift when clicking bypasses damage modifier dialog
 * - Passed to WeaponRoll as askForOptions parameter
 *
 * Foundry VTT Hook:
 * - **renderChatMessageHTML**: Fired after chat HTML rendered, before inserted into DOM
 * - Params: (_app, html, _data) - html is jQuery-wrapped chat content
 *
 * @private
 */
function registerDamageButtonHook() {
  Hooks.on("renderChatMessageHTML", (message, html, _data) => {
    try {
      html.querySelectorAll(".l5r4-damage-button").forEach(button => {
        let isProcessing = false;

        button.addEventListener("click", async event => {
          event.preventDefault();

          if (isProcessing) {
            return;
          }
          isProcessing = true;

          try {
            const actorId = event.currentTarget.dataset.actorId;
            const weaponName = event.currentTarget.dataset.weaponName;

            // Extract and clamp damage dice (0-99 per Ten Dice Rule max)
            // Weapon DR + Strength typically 1-15, but allow higher for edge cases
            const rawRoll = parseInt(event.currentTarget.dataset.damageRoll) || 0;
            const rawKeep = parseInt(event.currentTarget.dataset.damageKeep) || 0;
            const damageRoll = clamp(rawRoll, 0, 99);
            const damageKeep = clamp(rawKeep, 0, 99);

            // Extract attack raises from HTML (UNTRUSTED - user can edit HTML)
            const rawRaises = parseInt(event.currentTarget.dataset.attackRaises) || 0;

            // SECURITY: Validate raises against trusted data in message flags
            // Prevents HTML injection exploit where attacker edits data-attack-raises
            const storedRaises = message?.flags?.["l5r4-enhanced"]?.attackRaises ?? 0;
            const validation = validateAttackRaises(rawRaises, storedRaises);

            if (!validation.valid) {
              ui?.notifications?.error(validation.error ?? "Invalid attack raises");
              console.warn("L5R4 | Security:", validation.error);
              return;
            }

            // Use sanitized raises from validation (guaranteed to match stored value)
            const attackRaises = validation.sanitized ?? 0;

            // Extract and clamp stance bonuses (Full Attack grants +2k1, max 10 for safety)
            const rawStanceRoll = parseInt(event.currentTarget.dataset.stanceRoll) || 0;
            const rawStanceKeep = parseInt(event.currentTarget.dataset.stanceKeep) || 0;
            const stanceRoll = clamp(rawStanceRoll, 0, 10);
            const stanceKeep = clamp(rawStanceKeep, 0, 10);

            const actor = game?.actors?.get(actorId);
            if (!actor) {
              const message =
                game?.i18n?.localize?.("l5r4.ui.notifications.actorNotFound") ?? "Actor not found";
              ui?.notifications?.warn(message);
              return;
            }

            if (!actor.isOwner && !game?.user?.isGM) {
              const message =
                game?.i18n?.localize?.("l5r4.ui.notifications.noPermissionDamage") ??
                "No permission to roll damage";
              ui?.notifications?.warn(message);
              return;
            }

            const { WeaponRoll } = await import("./dice/rolls/weapon-roll.js");

            return WeaponRoll({
              diceRoll: damageRoll,
              diceKeep: damageKeep,
              weaponName,
              askForOptions: event.shiftKey,
              attackRaises,
              stanceRollBonus: stanceRoll,
              stanceKeepBonus: stanceKeep,
              actor
            });
          } finally {
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
 * Register hook to intercept and parse L5R4 Roll & Keep notation in chat messages.
 *
 * Hooks into chatMessage to detect and parse inline L5R4 dice notation before the
 * message is sent to Foundry's standard chat system. Supports both whole-message
 * rolls [[XkY]] and inline rolls within text "I attack [[7k3+5]] and defend [[5k3]]".
 *
 * L5R4 Roll & Keep Notation:
 * - Basic Format: [[XkY]] = Roll X dice, keep Y highest (e.g., [[7k3]])
 * - With Bonus: [[XkY+Z]] = Roll X, keep Y, add flat bonus Z (e.g., [[7k3+5]])
 * - Unskilled: [[uXkY]] = Unskilled roll (dice don't explode per Unskilled Roll rules)
 * - Emphasis: [[eXkY]] = Emphasis (re-roll 1s per Skill Emphasis rules)
 * - Exploding Dice: All 10s explode automatically (re-roll and add to total)
 *
 * Regex Patterns:
 * - Foundry Roll Commands: /^\/(r(oll)?|gmr(oll)?|br(oll)?|sr(oll)?)\s/i
 *   → Detects /roll, /r, /gmroll, /gmr, /broll, /br, /sroll, /sr commands
 *   → Passes through to Foundry's native roll handler without interception
 *
 * - L5R4 Notation: /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/
 *   → Matches: [optional u/e prefix][digits]k[digits][optional xN][optional +N]
 *   → Examples: "7k3", "u3k3", "e7k3+5", "7k3x2+5"
 *
 * - Whole Message Roll: /^\[\[(.*)\]\]$/
 *   → Matches: [[content]] when it's the entire message (no surrounding text)
 *   → Extracts content and checks if it matches L5R4 notation
 *
 * - Inline Rolls: /\[\[(.*?)\]\]/g
 *   → Matches: [[content]] anywhere in message (supports multiple per message)
 *   → Global flag (/g) requires manual lastIndex reset to prevent state issues
 *
 * Hook Behavior:
 * - Returns true: Message passes through to Foundry's standard chat processing
 * - Returns false: Message intercepted, custom processing applied (prevents default)
 *
 * Character Limit:
 * - Maximum 10,000 characters enforced to prevent excessive chat message sizes
 * - Shows warning notification and prevents message submission if exceeded
 *
 * Foundry VTT Hook:
 * - **chatMessage**: Fired before message sent to chat, can intercept/modify
 * - Params: (chatlog, message, _chatData) - message is raw string input
 *
 * @private
 */
function registerInlineRollParsingHook() {
  Hooks.on("chatMessage", (chatlog, message, _chatData) => {
    // Enforce character limit to prevent performance issues with massive chat messages
    if (message.length > 10000) {
      const warning =
        game?.i18n?.localize?.("l5r4.ui.notifications.messageTooLong") ??
        "Message too long (max 10,000 characters)";
      ui?.notifications?.warn(warning);
      return false;
    }

    // Foundry native roll commands: /roll, /r, /gmroll, /gmr, /broll, /br, /sroll, /sr
    // Pass through to Foundry's standard roll handler (don't intercept)
    const rollCmd = /^\/(r(oll)?|gmr(oll)?|br(oll)?|sr(oll)?)\s/i;
    if (rollCmd.test(message)) {
      return true;
    }

    // L5R4 Roll & Keep notation pattern: (u|e)?XkY(xZ)?(+N)?
    // Matches: 7k3, u3k3, e7k3+5, 7k3x2+5, etc.
    const kxy = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;

    // Check for whole-message roll: [[XkY]] with no surrounding text
    const whole = /^\[\[(.*)\]\]$/;
    if (whole.test(message)) {
      const token = message.substring(2, message.length - 2);

      if (kxy.test(token)) {
        const result = roll_parser(token);
        chatlog.processMessage(result);
        return false; // Intercept message, prevent Foundry default processing
      }
    }

    // Check for inline rolls: text [[7k3]] more text [[5k3]] etc.
    // Non-greedy (.*?) to capture each [[...]] separately
    // Global flag (/g) to match all occurrences in message
    const inline = /\[\[(.*?)\]\]/g;

    // Test if message contains any [[...]] patterns
    const hasInlineRolls = inline.test(message);
    // CRITICAL: Reset regex state after .test() call with global flag
    // Global regexes maintain lastIndex state between calls, causing subsequent
    // .replace() to start mid-string instead of beginning. Reset ensures clean slate.
    inline.lastIndex = 0;

    if (hasInlineRolls) {
      let hasL5R4Rolls = false;
      // Replace each [[...]] with parsed roll formula, but only if it matches L5R4 notation
      const result = message.replace(inline, (match, token) => {
        if (!kxy.test(token)) {
          return match;
        } // Not L5R4 notation, leave unchanged
        hasL5R4Rolls = true;
        return roll_parser(token); // Parse and convert to Foundry roll formula
      });

      if (hasL5R4Rolls) {
        chatlog.processMessage(result);
        return false; // Intercept message, prevent Foundry default processing
      }
    }

    // No L5R4 notation found, pass through to Foundry default chat handler
    return true;
  });
}
