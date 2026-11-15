/**
 * @module services/dice/check/chat-actions
 * @description What a `roll` message can do after it posts, rebuilt from its stored context
 * (module/data/chat/roll-message-data.js), never from the card's HTML: roll the attack's damage, put an offered
 * condition on the target, re-roll keeping the better total, make the optional Honor Roll (p.92), and settle a
 * Contested Roll (p.80) against the previous roll by someone else.
 */

import { SYS_ID } from "../../../config/constants.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { buildPool, contest, evaluateCheck, poolFormula } from "../../../utils/check.js";
import { taintEffects } from "../../../utils/taint.js";
import { applyEffectAnywhere } from "../../effects/apply.js";
import { rollDamageFromAttack } from "../../combat/damage.js";
import { recordTrackChange } from "../../ledger.js";
import { offersHonorRoll, renderCheckCard } from "./roll-check.js";

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
function mayAct(actor) {
  if (actor?.isOwner || game.user.isGM) {
    return true;
  }
  ui.notifications?.warn(T("l5r4.ui.notifications.noPermissionDamage"));
  return false;
}

/**
 * Roll damage for a hit from its attack's stored context (module/services/combat/damage.js).
 * @param {ChatMessage} message  A `roll` message of kind "attack"
 * @param {{askForOptions?: boolean}} [options]
 * @returns {Promise<ChatMessage|null>}
 */
export function rollDamageFromMessage(message, options = {}) {
  return rollDamageFromAttack(message, options);
}

/**
 * Re-roll a check with the same pool and keep the better total, as an ability that grants a re-roll allows. No
 * Void Point is spent again; the TN and Raises stand.
 * @param {ChatMessage} message  A `roll` message
 * @returns {Promise<ChatMessage|null>}
 */
export async function rerollKeepBetter(message) {
  const actor = rollActor(message);
  if (!mayAct(actor)) {
    return null;
  }
  const source = message.system.toObject();
  const roll = new foundry.dice.Roll(poolFormula(source.pool));
  await roll.evaluate();
  const kept = roll.total >= source.outcome.total ? roll : message.rolls[0];
  const outcome = evaluateCheck(kept.total, source.tn.effective);
  const system = {
    ...source,
    label: `${source.label} (${T("l5r4.ui.check.rerolledKeptBetter")})`,
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
 * The optional Honor Roll (p.92; roadmap/STAGE-11 decision 3): once per session, the owner of a failed roll re-rolls
 * it at the same TN with Honor Rank in rolled and kept dice instead of the original dice, the Ten Dice Rule last.
 * Taint Level 4 takes 2k2 from it (p.278). Failing it costs a full Rank of Honor, through the ledger.
 * @param {ChatMessage} message  A failed `roll` message
 * @returns {Promise<ChatMessage|null>}
 */
export async function honorRoll(message) {
  const actor = rollActor(message);
  if (!actor?.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  if (!offersHonorRoll(message.system)) {
    return null;
  }
  const session = game.settings.get(SYS_ID, "session");
  if (actor.getFlag(SYS_ID, "honorRollSession") === session) {
    ui.notifications?.warn(F("l5r4.ui.honorRoll.used", { name: actor.name }));
    return null;
  }
  // A character without an Honor Rank has nothing to call on; an NPC has no Honor at all. A Taint penalty that
  // shrinks the pool floors at 1k1 like any other (module/utils/ten-dice.js)
  const honor = toInt(actor.system.honor?.rank);
  if (honor < 1) {
    ui.notifications?.warn(F("l5r4.ui.honorRoll.noDice", { name: actor.name }));
    return null;
  }
  const source = message.system.toObject();
  const penalty = taintEffects(toInt(actor.system.shadowTaint.rank)).honorRollPenalty;
  const modifiers = penalty.roll
    ? [{ label: T("l5r4.ui.taint.label"), roll: -penalty.roll, keep: -penalty.keep, total: 0 }]
    : [];
  const pool = buildPool({
    roll: honor,
    keep: honor,
    modifiers,
    littleTruths: game.settings.get(SYS_ID, "LtException")
  });
  await actor.setFlag(SYS_ID, "honorRollSession", session);
  const roll = new foundry.dice.Roll(poolFormula(pool));
  await roll.evaluate();
  const outcome = evaluateCheck(roll.total, source.tn.effective);
  const system = {
    ...source,
    label: `${source.label} (${T("l5r4.ui.honorRoll.button")})`,
    pool: { ...pool, unskilled: false },
    modifiers: modifiers.map(m => ({ ...m, enabled: true })),
    voidPoint: false,
    emphasis: "",
    outcome: { total: roll.total, success: outcome.success, margin: outcome.margin },
    honorRollOf: message.id
  };
  const content = await renderCheckCard(system, roll, { actorId: actor.id });
  const posted = await roll.toMessage({
    type: "roll",
    system,
    speaker: message.speaker,
    content
  });
  if (!outcome.success) {
    await recordTrackChange(actor, "honor", -10, T("l5r4.ui.honorRoll.failedReason"));
  }
  return posted;
}

/**
 * The latest `roll` message before this one by a different actor.
 * @param {ChatMessage} message
 * @returns {ChatMessage|null}
 */
export function previousOpponentRoll(message) {
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
 * Settle a Contested Roll between two roll messages (p.80): the higher total wins; Raises declared on either must
 * beat the other by 5 each; a tie is re-rolled.
 * @param {ChatMessage} message
 * @param {ChatMessage} opponent
 * @returns {Promise<ChatMessage>}
 */
export async function contestRolls(message, opponent) {
  const entries = [message, opponent].map(m => ({
    id: m.id,
    name: m.speaker.alias,
    total: m.system.outcome.total,
    raises: m.system.tn.raises
  }));
  const result = contest(entries);
  const lines = entries.map(e => {
    const raises = e.raises ? ` (${T("l5r4.ui.mechanics.rolls.raises")}: ${e.raises})` : "";
    return `<li>${foundry.utils.escapeHTML(e.name)}: ${e.total}${raises}</li>`;
  });
  const verdict = result.tie
    ? T("l5r4.ui.check.contestTie")
    : F("l5r4.ui.check.contestWinner", {
        name: foundry.utils.escapeHTML(entries.find(e => e.id === result.winner).name)
      });
  return ChatMessage.create({
    speaker: message.speaker,
    content: `<div class="chat-card l5r4-contest"><div class="dice-flavor">${T(
      "l5r4.ui.check.contest"
    )}</div><ul>${lines.join("")}</ul><p><strong>${verdict}</strong></p></div>`
  });
}

/**
 * Put a condition the roll's ApplyCondition rules offer on its target. The roll must have succeeded; the condition
 * comes from the stored context by index, never from the card. A target the user does not own gets it through the
 * active GM.
 * @param {ChatMessage} message  A `roll` message
 * @param {number} index         Index into `system.conditions`
 * @returns {Promise<void>}
 */
export async function applyConditionFromMessage(message, index) {
  const entry = message.system.conditions[index];
  const target = message.system.target.uuid ? await fromUuid(message.system.target.uuid) : null;
  if (!entry || !target || message.system.outcome.success !== true) {
    return;
  }
  if (!mayAct(rollActor(message))) {
    return;
  }
  await applyEffectAnywhere(
    target,
    entry.condition,
    entry.level === null ? {} : { level: entry.level }
  );
}

/**
 * Wire a rendered `roll` card's damage and condition buttons.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindCheckCard(message, html) {
  if (message.type !== "roll") {
    return;
  }
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
    honorRoll(message);
  });
}

/**
 * Context menu entries for `roll` messages: re-roll keeping the better total, and contest the previous roll by
 * someone else.
 * @param {HTMLElement} _app
 * @param {object[]} options  Entries of the chat log's context menu, extended in place
 */
export function addCheckContextOptions(_app, options) {
  const messageOf = li => game.messages.get(li.dataset.messageId);
  options.push(
    {
      label: "l5r4.ui.check.rerollKeepBetter",
      icon: "fa-solid fa-dice",
      visible: li => {
        const message = messageOf(li);
        return message?.type === "roll" && message.isAuthor;
      },
      onClick: (_event, li) => rerollKeepBetter(messageOf(li))
    },
    {
      label: "l5r4.ui.check.contest",
      icon: "fa-solid fa-scale-balanced",
      visible: li => {
        const message = messageOf(li);
        return message?.type === "roll" && Boolean(previousOpponentRoll(message));
      },
      onClick: (_event, li) => {
        const message = messageOf(li);
        return contestRolls(message, previousOpponentRoll(message));
      }
    }
  );
}
