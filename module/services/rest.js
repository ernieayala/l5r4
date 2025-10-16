/**
 * Long Rest Service
 *
 * Handles long rest recovery mechanics for L5R4 system:
 * - Characters heal (Stamina × 2) + Insight Rank wounds per night of rest
 * - Spell slots restore to maximum
 * - Void Points restore to maximum
 * - Removes Fatigued condition
 * - Provides chat feedback on recovery
 *
 * Architecture Notes:
 * - Services layer: Handles side effects (actor updates, chat messages)
 * - Can import: utils, config (NOT documents per architecture rules)
 * - Pure business logic with Foundry API integration
 *
 * @module services/rest
 * @requires Foundry v13+
 */

import { SYS_ID } from "../config/constants.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * Applies long rest recovery to a character.
 *
 * Recovery includes:
 * - **Wounds**: (Stamina × 2) + Insight Rank + modifiers
 * - **Spell Slots**: All elemental and Void slots restore to maximum
 * - **Void Points**: Restore to maximum (Void Ring value)
 * - **Conditions**: Removes Fatigued status effect
 *
 * This represents one night's rest (8 hours).
 *
 * @async
 * @param {L5R4Actor} actor - The actor taking a long rest
 * @returns {Promise<void>}
 *
 * @example
 * import { applyLongRest } from "./services/rest.js";
 * await applyLongRest(actor);
 */
export async function applyLongRest(actor) {
  if (!actor) {
    console.warn(`${SYS_ID} | rest.js: No actor provided to applyLongRest`);
    return;
  }

  // Read current wound state from actor
  const currentSuffered = toInt(actor.system?.suffered ?? 0);
  const maxWounds = toInt(actor.system?.wounds?.max ?? 0);
  const healRate = toInt(actor.system?.wounds?.healRate ?? 0);

  // Log if heal rate is invalid
  if (healRate <= 0) {
    console.warn(`${SYS_ID} | rest.js: Actor ${actor.name} has heal rate of ${healRate}`);
  }

  // Calculate healing: reduce suffered wounds by heal rate, minimum 0
  const healingApplied = healRate > 0 ? Math.min(currentSuffered, healRate) : 0;
  const newSuffered = healRate > 0 ? Math.max(0, currentSuffered - healRate) : currentSuffered;

  // Restore spell slots to maximum
  const rings = actor.system?.rings || {};
  const spellSlotUpdates = {
    "system.spellSlots.air": toInt(rings.air ?? 0),
    "system.spellSlots.earth": toInt(rings.earth ?? 0),
    "system.spellSlots.fire": toInt(rings.fire ?? 0),
    "system.spellSlots.water": toInt(rings.water ?? 0),
    "system.spellSlots.void": toInt(rings.void?.rank ?? 0)
  };

  // Restore Void Points to maximum
  const voidMax = toInt(rings.void?.rank ?? 0);
  const voidUpdate = { "system.rings.void.value": voidMax };

  // Remove Fatigued condition
  const fatigued = actor.effects?.find(e => e.statuses?.has("fatigued"));
  if (fatigued) {
    try {
      await fatigued.delete();
    } catch (err) {
      console.warn(`${SYS_ID} | rest.js: Failed to remove Fatigued condition`, { err });
    }
  }

  // Build complete update object
  const updates = {
    "system.suffered": newSuffered,
    ...spellSlotUpdates,
    ...voidUpdate
  };

  // Apply all updates in single transaction
  try {
    await actor.update(updates, { diff: true });
  } catch (err) {
    console.error(`${SYS_ID} | rest.js: Failed to update actor after rest`, { actor, err });
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

  // Post chat message with rest summary
  await _postRestMessage({
    actor,
    healingApplied,
    healRate,
    previousSuffered: currentSuffered,
    newSuffered,
    newCurrentWounds,
    maxWounds,
    wasFullyHealed,
    voidRestored: voidMax,
    spellSlotsRestored: true
  });
}

/**
 * Creates a chat message announcing rest recovery results.
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
 * @param {Object} data - Rest message data
 * @param {L5R4Actor} data.actor - The actor who rested
 * @param {number} data.healingApplied - Amount of wounds healed
 * @param {number} data.healRate - Character's heal rate per rest
 * @param {number} data.previousSuffered - Suffered wounds before healing
 * @param {number} data.newSuffered - Suffered wounds after healing
 * @param {number} data.newCurrentWounds - Current wounds after healing (max - suffered)
 * @param {number} data.maxWounds - Maximum wounds (total HP)
 * @param {boolean} data.wasFullyHealed - Whether character reached full health
 * @param {number} data.voidRestored - Void Points restored to maximum
 * @param {boolean} data.spellSlotsRestored - Whether spell slots were restored
 * @returns {Promise<ChatMessage|null>} Created chat message, or null if failed
 */
async function _postRestMessage({
  actor,
  healingApplied,
  healRate,
  previousSuffered,
  newSuffered,
  newCurrentWounds,
  maxWounds,
  wasFullyHealed,
  voidRestored,
  spellSlotsRestored
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
    wasFullyHealed,
    voidRestored,
    spellSlotsRestored
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
    console.error(`${SYS_ID} | rest.js: Failed to render rest template`, { err });
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
    console.error(`${SYS_ID} | rest.js: Failed to create rest chat message`, { err });
    return null;
  }
}
