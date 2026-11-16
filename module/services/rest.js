/**
 * @module services/rest
 * @description A long rest for one character: heals (Stamina × 2) + Insight Rank Wounds for the night, restores
 * spell slots and Void Points to their maximum, removes the Fatigued condition, and posts a chat card with the
 * result.
 */

import { SYS_ID } from "../config/constants.js";
import { CHAT_TEMPLATES } from "../config/templates.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * Applies long rest recovery to a character.
 *
 * Recovery includes:
 * - **Wounds**: (Stamina × 2) + Insight Rank + modifiers
 * - **Spell Slots**: All elemental and Void slots restore to maximum
 * - **Void Points**: Restore to maximum (Void Ring value) UNLESS fasting
 * - **Conditions**: Removes Fatigued status effect
 *
 * **Fasting Condition:** Per L5R4 rules, characters with the Fasting condition
 * do NOT recover Void Points during rest. Wounds and spell slots still recover normally.
 *
 * This represents one night's rest (8 hours).
 *
 * @param {L5R4Actor} actor - The actor taking a long rest
 * @returns {Promise<void>}
 */
export async function applyLongRest(actor) {
  if (!actor) {
    console.warn(`${SYS_ID} | rest.js: No actor provided to applyLongRest`);
    return;
  }

  const healing = getRestHealing(actor);

  // Log if heal rate is invalid
  if (healing.healRate <= 0) {
    console.warn(`${SYS_ID} | rest.js: Actor ${actor.name} has heal rate of ${healing.healRate}`);
  }

  // Check if character is fasting (blocks void recovery per L5R4 rules)
  const isFasting = actor.effects?.some(e => e.statuses?.has("fasting")) ?? false;

  // Restore Void Points to maximum (unless fasting): the Void Ring, less a point at Taint Level 4
  // game-rules/89_shadowlands_taint.md, p.278
  const voidMax = toInt(actor.system?.rings?.void?.max ?? 0);
  const recovery = buildRecoveryUpdate(actor, { isFasting, voidMax });

  await deleteFatigued(actor);

  // Apply all updates in single transaction
  const updated = await updateRestedActor(actor, {
    "system.suffered": healing.newSuffered,
    ...recovery
  });
  if (!updated) {
    return;
  }

  // Post chat message with rest summary
  await postRestMessage(buildRestSummary(actor, healing, { isFasting, voidMax }));
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
 * @param {RestSummary} summary - The rest's results (buildRestSummary)
 * @returns {Promise<ChatMessage|null>} Created chat message, or null if failed
 */
async function postRestMessage(summary) {
  const speaker = ChatMessage.getSpeaker({ actor: summary.actor });
  const templateData = buildRestCardData(summary);

  // Render chat card from template
  let content;
  try {
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

/**
 * The night's healing: the stored suffered Wounds less the heal rate, never below 0.
 * @param {L5R4Actor} actor - The actor taking a long rest
 * @returns {{currentSuffered: number, maxWounds: number, healRate: number, healingApplied: number,
 *   newSuffered: number}} The Wounds before and after, the maximum, the heal rate, and the Wounds healed
 */
function getRestHealing(actor) {
  // Suffered Wounds are the stored value, not the prepared one, so an Active Effect on Wounds is never written into
  // storage (B6).
  const currentSuffered = actor._source.system.suffered;
  const maxWounds = toInt(actor.system?.wounds?.max ?? 0);
  const healRate = toInt(actor.system?.wounds?.healRate ?? 0);
  // Calculate healing: reduce suffered wounds by heal rate, minimum 0
  const healingApplied = healRate > 0 ? Math.min(currentSuffered, healRate) : 0;
  const newSuffered = healRate > 0 ? Math.max(0, currentSuffered - healRate) : currentSuffered;
  return { currentSuffered, maxWounds, healRate, healingApplied, newSuffered };
}

/**
 * The rest's recovery update: every spell slot to its maximum, and Void Points to their maximum unless the character
 * is fasting. Only PCs have rings.void.value; NPCs only have rings.void.rank.
 * @param {L5R4Actor} actor - The actor taking a long rest
 * @param {{isFasting: boolean, voidMax: number}} voidRecovery - Whether the character is fasting, and its Void
 *   Point maximum
 * @returns {object} The update's spell slot and Void Point fields
 */
function buildRecoveryUpdate(actor, { isFasting, voidMax }) {
  const rings = actor.system?.rings || {};
  const hasVoidValue = rings.void && "value" in rings.void;
  return {
    "system.spellSlots.air": toInt(rings.air ?? 0),
    "system.spellSlots.earth": toInt(rings.earth ?? 0),
    "system.spellSlots.fire": toInt(rings.fire ?? 0),
    "system.spellSlots.water": toInt(rings.water ?? 0),
    "system.spellSlots.void": toInt(rings.void?.rank ?? 0),
    ...(isFasting || !hasVoidValue ? {} : { "system.rings.void.value": voidMax })
  };
}

/**
 * Remove the Fatigued condition a rest ends; a failure is logged and the rest goes on.
 * @param {L5R4Actor} actor - The actor taking a long rest
 * @returns {Promise<void>}
 */
async function deleteFatigued(actor) {
  const fatigued = actor.effects?.find(e => e.statuses?.has("fatigued"));
  if (fatigued) {
    try {
      await fatigued.delete();
    } catch (err) {
      console.warn(`${SYS_ID} | rest.js: Failed to remove Fatigued condition`, { err });
    }
  }
}

/**
 * Write the rest's update and redraw the sheet; a failure is reported to the user.
 * @param {L5R4Actor} actor - The actor taking a long rest
 * @param {object} updates - The Wounds, spell slot, and Void Point fields
 * @returns {Promise<boolean>} Whether the update was written
 */
async function updateRestedActor(actor, updates) {
  try {
    await actor.update(updates, { diff: true });

    // Trigger sheet re-render to update UI
    actor.sheet?.render(false);
    return true;
  } catch (err) {
    console.error(`${SYS_ID} | rest.js: Failed to update actor after rest`, { actor, err });
    ui.notifications?.error(
      game.i18n.localize("l5r4.ui.mechanics.wounds.healingFailed", {
        name: actor.name
      })
    );
    return false;
  }
}

/**
 * @typedef {object} RestSummary
 * @property {L5R4Actor} actor - The actor who rested
 * @property {number} healingApplied - Amount of wounds healed
 * @property {number} healRate - Character's heal rate per rest
 * @property {number} previousSuffered - Suffered wounds before healing; not read
 * @property {number} newSuffered - Suffered wounds after healing
 * @property {number} newCurrentWounds - Current wounds after healing (max - suffered)
 * @property {number} maxWounds - Maximum wounds (total HP)
 * @property {boolean} wasFullyHealed - Whether character reached full health
 * @property {number} voidRestored - Void Points restored to maximum (0 if fasting)
 * @property {boolean} voidBlockedByFasting - Whether void recovery was blocked by fasting
 * @property {boolean} spellSlotsRestored - Whether spell slots were restored
 */

/**
 * The rest's results for its chat card.
 * @param {L5R4Actor} actor - The actor who rested
 * @param {object} healing - The night's healing (getRestHealing)
 * @param {{isFasting: boolean, voidMax: number}} voidRecovery - Whether the character is fasting, and its Void
 *   Point maximum
 * @returns {RestSummary}
 */
function buildRestSummary(actor, healing, { isFasting, voidMax }) {
  return {
    actor,
    healingApplied: healing.healingApplied,
    healRate: healing.healRate,
    previousSuffered: healing.currentSuffered,
    newSuffered: healing.newSuffered,
    newCurrentWounds: healing.maxWounds - healing.newSuffered,
    maxWounds: healing.maxWounds,
    wasFullyHealed: healing.newSuffered === 0,
    voidRestored: isFasting ? 0 : voidMax,
    voidBlockedByFasting: isFasting,
    // Whether the actor has any spells, so the card mentions the spell slots
    spellSlotsRestored: actor.items?.some(item => item.type === "spell") ?? false
  };
}

/**
 * The rest card's template data: the actor's portrait and name, the healing and Wounds text, and what was restored.
 * @param {RestSummary} summary - The rest's results
 * @returns {object}
 */
function buildRestCardData(summary) {
  const { actor } = summary;
  return {
    actorImg: actor.img || actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg",
    actorName: actor.name,
    healingText: game.i18n.localize("l5r4.ui.mechanics.wounds.healingApplied", {
      amount: summary.healingApplied,
      rate: summary.healRate
    }),
    woundsText: game.i18n.localize("l5r4.ui.mechanics.wounds.status", {
      current: summary.newCurrentWounds,
      max: summary.maxWounds,
      suffered: summary.newSuffered
    }),
    wasFullyHealed: summary.wasFullyHealed,
    voidRestored: summary.voidRestored,
    voidBlockedByFasting: summary.voidBlockedByFasting,
    spellSlotsRestored: summary.spellSlotsRestored
  };
}
