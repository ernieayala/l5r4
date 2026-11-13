/**
 * Chat Service
 *
 * Chat-side features: the item creation dialog, roll card actions, and inline Roll & Keep notation.
 *
 * - **Item Creation Dialog**: Unified dialog for creating actor items (skills, advantages, equipment, etc.)
 * - **Roll cards**: a `roll` message's damage button and context menu entries come from
 *   module/services/dice/check/chat-actions.js; cards posted before 4.0.0 keep their own damage button here
 * - **Inline Roll & Keep**: [[XkY]] in a chat message rolls through the same pool code as a check (B9)
 *
 * Call initializeChatService() from the system init hook to register the hooks.
 *
 * @module services/chat
 */

import { SYS_ID } from "../config/constants.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { R, T } from "../utils/localization.js";
import { buildPool, parseRollAndKeep, poolFormula } from "../utils/check.js";
import { clamp } from "../utils/type-coercion.js";
import { validateAttackRaises } from "../utils/validators.js";
import { addCheckContextOptions, bindCheckCard } from "./dice/check/chat-actions.js";
import { WeaponRoll } from "./dice/rolls/weapon-roll.js";

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
 * Register the chat hooks, once during system init: roll card buttons and context menu entries, the damage button
 * of cards posted before 4.0.0, and inline Roll & Keep notation.
 */
export function initializeChatService() {
  registerLegacyDamageButtonHook();
  registerInlineRollParsingHook();
  Hooks.on("renderChatMessageHTML", bindCheckCard);
  Hooks.on("getChatMessageContextOptions", addCheckContextOptions);
}

/**
 * The damage button of attack cards posted before 4.0.0, which carried the weapon's dice in data attributes and
 * the attack's Raises in `flags.l5r4-enhanced.attackRaises`. The card's attributes are untrusted: dice are clamped
 * and Raises must match the flag. A `roll` message's button is wired by chat-actions.js instead.
 *
 * @private
 */
function registerLegacyDamageButtonHook() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    if (message.type === "roll") {
      return;
    }
    for (const button of html.querySelectorAll(".l5r4-damage-button")) {
      let isProcessing = false;
      button.addEventListener("click", async event => {
        event.preventDefault();
        if (isProcessing) {
          return;
        }
        isProcessing = true;
        try {
          const data = event.currentTarget.dataset;
          const validation = validateAttackRaises(
            parseInt(data.attackRaises) || 0,
            message.flags?.[SYS_ID]?.attackRaises ?? 0
          );
          if (!validation.valid) {
            ui.notifications?.error(validation.error);
            return;
          }
          const actor = game.actors.get(data.actorId);
          if (!actor) {
            ui.notifications?.warn(T("l5r4.ui.notifications.actorNotFound"));
            return;
          }
          if (!actor.isOwner && !game.user.isGM) {
            ui.notifications?.warn(T("l5r4.ui.notifications.noPermissionDamage"));
            return;
          }
          await WeaponRoll({
            diceRoll: clamp(parseInt(data.damageRoll) || 0, 0, 99),
            diceKeep: clamp(parseInt(data.damageKeep) || 0, 0, 99),
            weaponName: data.weaponName,
            weapon: actor.items.get(data.weaponId) ?? null,
            askForOptions: !event.shiftKey,
            attackRaises: validation.sanitized,
            actor
          });
        } finally {
          isProcessing = false;
        }
      });
    }
  });
}

/**
 * The Foundry formula for one inline Roll & Keep token, through the same pool code as a check: the Ten Dice Rule,
 * explosions, Unskilled ("u") and Emphasis ("e") prefixes (module/utils/check.js parseRollAndKeep).
 * @param {string} token
 * @returns {string|null} null when the token is not Roll & Keep notation
 */
export function inlineFormula(token) {
  const parsed = parseRollAndKeep(token);
  if (!parsed) {
    return null;
  }
  return poolFormula(
    buildPool({ ...parsed, littleTruths: game.settings.get(SYS_ID, "LtException") })
  );
}

/**
 * Turn Roll & Keep notation in an outgoing chat message into Foundry rolls. A message that is one [[XkY]] becomes
 * a /roll; [[XkY]] inside text becomes an inline roll. Foundry's own roll commands pass through, and so does any
 * [[...]] that is not Roll & Keep notation.
 *
 * @private
 */
function registerInlineRollParsingHook() {
  Hooks.on("chatMessage", (chatlog, message) => {
    if (message.length > 10000) {
      ui.notifications?.warn(T("l5r4.ui.notifications.messageTooLong"));
      return false;
    }
    if (/^\/(r(oll)?|gmr(oll)?|br(oll)?|sr(oll)?)\s/i.test(message)) {
      return true;
    }

    const whole = /^\[\[(.*)\]\]$/.exec(message);
    const wholeFormula = whole ? inlineFormula(whole[1]) : null;
    if (wholeFormula) {
      chatlog.processMessage(`/roll ${wholeFormula}`);
      return false;
    }

    let changed = false;
    const text = message.replace(/\[\[(.*?)\]\]/g, (match, token) => {
      const formula = inlineFormula(token);
      if (!formula) {
        return match;
      }
      changed = true;
      return `[[${formula}]]`;
    });
    if (changed) {
      chatlog.processMessage(text);
      return false;
    }
    return true;
  });
}
