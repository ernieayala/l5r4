/**
 * @module services/dice/check/honor-roll
 * @description The optional Honor Roll (roadmap/STAGE-11 decision 3) a failed `roll` card offers: once per session,
 * the owner re-rolls it at the same TN with Honor Rank in rolled and kept dice instead of the original dice.
 * game-rules/43_honor.md, p.92
 */

import { SYS_ID } from "../../../config/constants.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { buildPool, getCheckResult, getPoolFormula } from "../../../utils/check.js";
import { getTaintEffects } from "../../../utils/taint.js";
import { askGmAllow } from "../../gm-allow.js";
import { applyTrackChange } from "../../ledger.js";
import { hasHonorToCall, isHonorRollOffered, renderCheckCard } from "./card.js";

/**
 * The optional Honor Roll: once per session, the owner of a failed roll re-rolls it at the same TN with Honor Rank
 * in rolled and kept dice instead of the original dice, the Ten Dice Rule last. Taint Level 4 takes 2k2 from it.
 * Failing it costs a full Rank of Honor, through the ledger.
 * game-rules/43_honor.md, p.92
 * game-rules/89_shadowlands_taint.md, p.278
 * @param {ChatMessage} message - A failed `roll` message
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollHonor(message) {
  const actor = fromUuidSync(message.system.actorUuid) ?? null;
  const allowed = await validateHonorRoll(message, actor);
  if (!allowed) {
    return null;
  }
  const source = message.system.toObject();
  const { pool, modifiers } = buildHonorPool(actor, allowed.honor, source.modifiers);
  await actor.setFlag(SYS_ID, "honorRollSession", allowed.session);
  const roll = new foundry.dice.Roll(getPoolFormula(pool));
  await roll.evaluate();
  const outcome = getCheckResult(roll.total, source.tn.effective);
  const posted = await postHonorRoll(message, roll, { source, pool, modifiers, outcome, actor });
  if (!outcome.success) {
    await applyTrackChange(actor, "honor", {
      points: -10,
      reason: T("l5r4.ui.honorRoll.failedReason")
    });
  }
  return posted;
}

/**
 * Whether an actor still has its Honor Roll this session: not used since the GM's last New session, and an Honor
 * Rank to call on. A card shows no Honor Roll button otherwise (#114).
 * game-rules/43_honor.md, p.92
 * @param {Actor|null} actor - The roller
 * @returns {boolean}
 */
export function hasHonorRollLeft(actor) {
  return (
    actor?.getFlag(SYS_ID, "honorRollSession") !== game.settings.get(SYS_ID, "session") &&
    hasHonorToCall(actor)
  );
}

/**
 * Whether the roll's actor may make its Honor Roll: the user owns the actor, the card offers the roll, the actor has
 * not used it this session or the GM allows another, and it has an Honor Rank to roll. A refusal warns and gives
 * null.
 * game-rules/43_honor.md, p.92
 * @param {ChatMessage} message - A failed `roll` message
 * @param {Actor|null} actor - The roll's actor
 * @returns {Promise<{honor: number, session: unknown}|null>} The Honor Rank and the current session, or null when
 *   refused
 */
async function validateHonorRoll(message, actor) {
  if (!actor?.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  if (!isHonorRollOffered(message.system)) {
    return null;
  }
  const session = game.settings.get(SYS_ID, "session");
  // A second Honor Roll in a session is the GM's call (#223)
  const again = actor.getFlag(SYS_ID, "honorRollSession") === session;
  if (
    again &&
    !(await askGmAllow({
      title: T("l5r4.ui.honorRoll.button"),
      reason: F("l5r4.ui.honorRoll.used", { name: actor.name }),
      ask: T("l5r4.ui.requests.allowRequest")
    }))
  ) {
    return null;
  }
  // A card posted before the roller lost his last Honor Rank still offers the roll. A Taint penalty that shrinks
  // the pool floors at 1k1 like any other (module/utils/ten-dice.js)
  if (!hasHonorToCall(actor)) {
    ui.notifications?.warn(F("l5r4.ui.honorRoll.noDice", { name: actor.name }));
    return null;
  }
  return { honor: toInt(actor.system.honor.rank), session };
}

/**
 * The Honor Roll's pool: Honor Rank in rolled and kept dice, less the dice penalties the failed roll carried (Fear,
 * Dazed, and the like fall on all die rolls; its bonuses do not carry over, since the Honor Rank replaces its dice;
 * decision 16) and what Taint Level 4 takes, the Ten Dice Rule last.
 * game-rules/43_honor.md, p.92
 * game-rules/42_fear.md, p.90
 * game-rules/89_shadowlands_taint.md, p.278
 * @param {Actor} actor - The roller
 * @param {number} honor - The Honor Rank
 * @param {object[]} failedModifiers - The failed roll's stored modifiers
 * @returns {{pool: object, modifiers: object[]}} The pool, and the penalty modifiers it took
 */
function buildHonorPool(actor, honor, failedModifiers) {
  const modifiers = failedModifiers
    .filter(m => m.enabled && (toInt(m.roll) < 0 || toInt(m.keep) < 0))
    .map(m => ({
      label: m.label,
      roll: Math.min(0, toInt(m.roll)),
      keep: Math.min(0, toInt(m.keep)),
      total: 0
    }));
  const penalty = getTaintEffects(toInt(actor.system.shadowTaint.rank)).honorRollPenalty;
  if (penalty.roll) {
    modifiers.push({
      label: T("l5r4.ui.taint.label"),
      roll: -penalty.roll,
      keep: -penalty.keep,
      total: 0
    });
  }
  const pool = buildPool({
    roll: honor,
    keep: honor,
    modifiers,
    littleTruths: game.settings.get(SYS_ID, "LtException")
  });
  return { pool, modifiers };
}

/**
 * Post the Honor Roll's card: the failed roll's context with the Honor pool, no Void Point or Emphasis, and the new
 * outcome, marked as the Honor Roll of the original.
 * @param {ChatMessage} message - The failed `roll` message
 * @param {Roll} roll - The evaluated Honor Roll
 * @param {{source: object, pool: object, modifiers: object[], outcome: object, actor: Actor}} honorRoll - The failed
 *   roll's stored context, the pool and its modifiers, the outcome, and the roller
 * @returns {Promise<ChatMessage>}
 */
async function postHonorRoll(message, roll, { source, pool, modifiers, outcome, actor }) {
  const system = {
    ...source,
    label: F("l5r4.ui.honorRoll.rollLabel", { label: source.label }),
    pool: { ...pool, unskilled: false },
    modifiers: modifiers.map(m => ({ ...m, enabled: true })),
    voidPoint: false,
    emphasis: "",
    outcome: { total: roll.total, success: outcome.success, margin: outcome.margin },
    honorRollOf: message.id
  };
  const content = await renderCheckCard(system, roll, { actorId: actor.id });
  return roll.toMessage({
    type: "roll",
    system,
    speaker: message.speaker,
    content
  });
}
