/**
 * Natural Healing Service
 *
 * Handles natural healing mechanics for L5R4 system per core rules:
 * - Characters heal (Stamina × 2) + Insight Rank wounds per night of rest
 * - Healing cannot reduce suffered wounds below 0 (no over-healing)
 * - Provides chat feedback on healing applied
 *
 * L5R4 Rules Reference:
 * Core Rulebook, Stances_Actions_Maneuvers.md:
 * "For every night's rest a character gets, he recovers a number of Wounds
 * equal to twice his Stamina Trait, plus his Insight Rank."
 *
 * Architecture Notes:
 * - Services layer: Handles side effects (actor updates, chat messages)
 * - Can import: utils, config (NOT documents per architecture rules)
 * - Pure business logic with Foundry API integration
 *
 * Integrates with:
 * - Actor document for wound updates
 * - ChatMessage API for healing feedback
 * - Localization system for user messages
 *
 * @module services/healing
 * @requires Foundry v13+
 */

import { SYS_ID } from "../config/constants.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * Applies natural healing to a character after rest.
 *
 * Implements L5R4 natural healing rules:
 * - Healing amount = (Stamina × 2) + Insight Rank + modifiers
 * - Reduces suffered wounds by healing amount
 * - Cannot reduce suffered wounds below 0 (clamped)
 * - Posts chat message with healing details
 *
 * **Game Rules Context:**
 * This represents one night's rest. Multiple applications could represent
 * multiple nights of recovery. Medicine skill can increase healing rate
 * through the wounds.mod field (managed separately).
 *
 * **Edge Cases:**
 * - Already at full health: Shows message, no update
 * - Partial healing: Heals available amount, clamps to 0
 * - Missing heal rate: Defaults to 0, shows warning
 *
 * **Side Effects:**
 * - Updates actor.system.suffered (reduces by healing amount)
 * - Creates ChatMessage with healing summary
 * - Shows UI notification if actor already at full health
 *
 * @async
 * @param {L5R4Actor} actor - The actor receiving healing
 * @returns {Promise<void>}
 *
 * @example
 * // Apply healing to selected character
 * import { applyNaturalHealing } from "./services/healing.js";
 * await applyNaturalHealing(actor);
 */
export async function applyNaturalHealing(actor) {
  if (!actor) {
    console.warn(`${SYS_ID} | healing.js: No actor provided to applyNaturalHealing`);
    return;
  }

  // Read current wound state from actor
  const currentSuffered = toInt(actor.system?.suffered ?? 0);
  const maxWounds = toInt(actor.system?.wounds?.max ?? 0);
  const healRate = toInt(actor.system?.wounds?.healRate ?? 0);

  // Check if already at full health (suffered = 0)
  if (currentSuffered <= 0) {
    ui.notifications?.info(
      game.i18n.format("l5r4.ui.mechanics.wounds.alreadyFullHealth", {
        name: actor.name
      })
    );
    return;
  }

  // Validate heal rate exists
  if (healRate <= 0) {
    console.warn(`${SYS_ID} | healing.js: Actor ${actor.name} has invalid heal rate: ${healRate}`);
    ui.notifications?.warn(
      game.i18n.format("l5r4.ui.mechanics.wounds.noHealRate", {
        name: actor.name
      })
    );
    return;
  }

  // Calculate healing: reduce suffered wounds by heal rate, minimum 0
  const healingApplied = Math.min(currentSuffered, healRate);
  const newSuffered = Math.max(0, currentSuffered - healRate);

  // Update actor with new suffered wounds value
  try {
    await actor.update({ "system.suffered": newSuffered }, { diff: true });
  } catch (err) {
    console.error(`${SYS_ID} | healing.js: Failed to update actor wounds`, { actor, err });
    ui.notifications?.error(
      game.i18n.format("l5r4.ui.mechanics.wounds.healingFailed", {
        name: actor.name
      })
    );
    return;
  }

  // Calculate wound state for chat message
  const newCurrentWounds = maxWounds - newSuffered;
  const wasFullyHealed = newSuffered === 0;

  // Post chat message with healing summary
  await _postHealingMessage({
    actor,
    healingApplied,
    healRate,
    previousSuffered: currentSuffered,
    newSuffered,
    newCurrentWounds,
    maxWounds,
    wasFullyHealed
  });
}

/**
 * Creates a chat message announcing healing results.
 *
 * Posts a formatted chat card showing:
 * - Character name and portrait
 * - Healing amount applied
 * - Wounds before/after
 * - Whether character reached full health
 *
 * **Visibility:**
 * Posts to chat with default visibility (respects Foundry's whisper/blind settings).
 * GMs can use chat controls to adjust visibility after posting.
 *
 * @async
 * @private
 * @param {Object} data - Healing message data
 * @param {L5R4Actor} data.actor - The actor who was healed
 * @param {number} data.healingApplied - Amount of wounds healed
 * @param {number} data.healRate - Character's heal rate per rest
 * @param {number} data.previousSuffered - Suffered wounds before healing
 * @param {number} data.newSuffered - Suffered wounds after healing
 * @param {number} data.newCurrentWounds - Current wounds after healing (max - suffered)
 * @param {number} data.maxWounds - Maximum wounds (total HP)
 * @param {boolean} data.wasFullyHealed - Whether character reached full health
 * @returns {Promise<ChatMessage|null>} Created chat message, or null if failed
 */
async function _postHealingMessage({
  actor,
  healingApplied,
  healRate,
  previousSuffered,
  newSuffered,
  newCurrentWounds,
  maxWounds,
  wasFullyHealed
}) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const actorImg = actor.img || actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg";

  // Build healing summary text
  const healingText = game.i18n.format("l5r4.ui.mechanics.wounds.healingApplied", {
    amount: healingApplied,
    rate: healRate
  });

  const woundsText = game.i18n.format("l5r4.ui.mechanics.wounds.woundStatus", {
    current: newCurrentWounds,
    max: maxWounds,
    suffered: newSuffered
  });

  // Prepare template data
  const templateData = {
    actorImg,
    actorName: actor.name,
    healingText,
    woundsText,
    wasFullyHealed
  };

  // Render chat card from template
  let content;
  try {
    const { CHAT_TEMPLATES } = await import("../config/templates.js");
    content = await foundry.applications.handlebars.renderTemplate(
      CHAT_TEMPLATES.healing,
      templateData
    );
  } catch (err) {
    console.error(`${SYS_ID} | healing.js: Failed to render healing template`, { err });
    return null;
  }

  const messageData = {
    speaker,
    content,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flavor: game.i18n.localize("l5r4.ui.mechanics.wounds.naturalHealing")
  };

  try {
    return await ChatMessage.create(messageData);
  } catch (err) {
    console.error(`${SYS_ID} | healing.js: Failed to create healing chat message`, { err });
    return null;
  }
}
