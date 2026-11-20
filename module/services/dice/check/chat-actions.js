/**
 * @module services/dice/check/chat-actions
 * @description What a `roll` message can do after it posts, rebuilt from its stored context
 * (module/data/chat/roll-message-data.js), never from the card's HTML: roll the attack's damage, put an offered
 * condition on the target, re-roll keeping the better total, and settle a Contested Roll against the previous roll by
 * someone else. The card's Honor Roll button calls module/services/dice/check/honor-roll.js.
 * game-rules/29_types_of_rolls.md, p.80
 */

import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getContestResult, getCheckResult, getPoolFormula } from "../../../utils/check.js";
import { hideUnusable } from "../../../utils/dom.js";
import { applyEffectAnywhere } from "../../effects/apply.js";
import { rollDamageFromAttack } from "../../combat/damage-roll.js";
import { renderCheckCard } from "./card.js";
import { hasHonorRollLeft, rollHonor } from "./honor-roll.js";

/**
 * Roll damage for a hit from its attack's stored context (module/services/combat/damage-roll.js).
 * @param {ChatMessage} message - A `roll` message of kind "attack"
 * @param {{askForOptions?: boolean}} [options]
 * @returns {Promise<ChatMessage|null>}
 */
export function rollDamageFromMessage(message, options = {}) {
  return rollDamageFromAttack(message, options);
}

/**
 * Re-roll a check with the same pool and keep the better total, as an ability that grants a re-roll allows. No
 * Void Point is spent again; the TN and Raises stand.
 * @param {ChatMessage} message - A `roll` message
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollAgainKeepBetter(message) {
  const actor = rollActor(message);
  if (!canAct(actor)) {
    return null;
  }
  const source = message.system.toObject();
  const roll = new foundry.dice.Roll(getPoolFormula(source.pool));
  await roll.evaluate();
  const kept = roll.total >= source.outcome.total ? roll : message.rolls[0];
  const outcome = getCheckResult(kept.total, source.tn.effective);
  const system = {
    ...source,
    label: F("l5r4.ui.check.rerolledLabel", { label: source.label }),
    outcome: {
      total: kept.total,
      success: outcome?.success ?? null,
      margin: outcome?.margin ?? null
    },
    rerollOf: message.id
  };
  const content = await renderCheckCard(system, kept, { actorId: actor.id });
  return foundry.dice.Roll.fromData(kept.toJSON()).toMessage({
    type: "roll",
    system,
    speaker: message.speaker,
    content
  });
}

/**
 * The latest `roll` message before this one by a different actor.
 * @param {ChatMessage} message
 * @returns {ChatMessage|null}
 */
export function previousOpponentRollOf(message) {
  const messages = game.messages.contents;
  for (let i = messages.indexOf(message) - 1; i >= 0; i--) {
    const other = messages[i];
    if (other.type === "roll" && other.system.actorUuid !== message.system.actorUuid) {
      return other;
    }
  }
  return null;
}

/**
 * Settle a Contested Roll between two roll messages: the higher total wins; Raises declared on either must beat the
 * other by 5 each; a tie is re-rolled.
 * game-rules/29_types_of_rolls.md, p.80
 * @param {ChatMessage} message
 * @param {ChatMessage} opponent
 * @returns {Promise<ChatMessage>}
 */
export async function postContestedRoll(message, opponent) {
  const entries = [message, opponent].map(m => ({
    id: m.id,
    name: m.speaker.alias,
    total: m.system.outcome.total,
    raises: m.system.tn.raises
  }));
  const result = getContestResult(entries);
  const verdict = result.tie
    ? T("l5r4.ui.check.contestTie")
    : F("l5r4.ui.check.contestWinner", {
        name: entries.find(e => e.id === result.winner).name
      });
  return ChatMessage.create({
    speaker: message.speaker,
    content: await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.contest, {
      entries,
      verdict
    })
  });
}

/**
 * Put a condition the roll's ApplyCondition rules offer on its target. The roll must have succeeded; the condition
 * comes from the stored context by index, never from the card. A target the user does not own gets it through the
 * active GM.
 * @param {ChatMessage} message - A `roll` message
 * @param {number} index - Index into `system.conditions`
 * @returns {Promise<void>}
 */
export async function applyConditionFromMessage(message, index) {
  const entry = message.system.conditions[index];
  const target = message.system.target.uuid ? await fromUuid(message.system.target.uuid) : null;
  if (!entry || !target || message.system.outcome.success !== true) {
    return;
  }
  if (!canAct(rollActor(message))) {
    return;
  }
  await applyEffectAnywhere(
    target,
    entry.condition,
    entry.level === null ? {} : { level: entry.level }
  );
}

/**
 * Wire a rendered `roll` card's damage, condition, and Honor Roll buttons, shown only to the roller's owner (#112).
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindCheckCard(message, html) {
  if (message.type !== "roll") {
    return;
  }
  const actor = rollActor(message);
  const isRollers = Boolean(actor?.isOwner);
  hideUnusable(
    html,
    "[data-action='check-damage'], [data-action='apply-condition']",
    () => isRollers
  );
  hideUnusable(html, "[data-action='honor-roll']", () => isRollers && hasHonorRollLeft(actor));
  html.querySelector("[data-action='check-damage']")?.addEventListener("click", event => {
    event.preventDefault();
    rollDamageFromMessage(message, { askForOptions: !event.shiftKey });
  });
  for (const button of html.querySelectorAll("[data-action='apply-condition']")) {
    button.addEventListener("click", event => {
      event.preventDefault();
      applyConditionFromMessage(message, toInt(event.currentTarget.dataset.index));
    });
  }
  html.querySelector("[data-action='honor-roll']")?.addEventListener("click", event => {
    event.preventDefault();
    rollHonor(message);
  });
}

/**
 * Context menu entries for `roll` messages: re-roll keeping the better total, and contest the previous roll by
 * someone else.
 * @param {HTMLElement} _app
 * @param {object[]} options - Entries of the chat log's context menu, extended in place
 */
export function onGetChatMessageContextOptions(_app, options) {
  const messageOf = li => game.messages.get(li.dataset.messageId);
  options.push(
    {
      label: "l5r4.ui.check.rerollKeepBetter",
      icon: "fa-solid fa-dice",
      visible: li => {
        const message = messageOf(li);
        return message?.type === "roll" && message.isAuthor;
      },
      onClick: (_event, li) => rollAgainKeepBetter(messageOf(li))
    },
    {
      label: "l5r4.ui.check.contest",
      icon: "fa-solid fa-scale-balanced",
      visible: li => {
        const message = messageOf(li);
        return message?.type === "roll" && Boolean(previousOpponentRollOf(message));
      },
      onClick: (_event, li) => {
        const message = messageOf(li);
        return postContestedRoll(message, previousOpponentRollOf(message));
      }
    }
  );
}

/**
 * The actor a roll message belongs to, resolved from its stored UUID.
 * @param {ChatMessage} message
 * @returns {Actor|null}
 */
function rollActor(message) {
  return fromUuidSync(message.system.actorUuid) ?? null;
}

/**
 * Whether the current user may act for the roll's actor.
 * @param {Actor|null} actor
 * @returns {boolean}
 */
function canAct(actor) {
  if (actor?.isOwner || game.user.isGM) {
    return true;
  }
  ui.notifications?.warn(T("l5r4.ui.notifications.noPermissionDamage"));
  return false;
}
