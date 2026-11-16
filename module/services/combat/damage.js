/**
 * @module services/combat/damage
 * @description From a damage roll to Wounds (roadmap/STAGE-10): the damage a hit rolls (damage-roll.js), applied
 * to the attack's target (or selected tokens) through Reduction, Spirit, and Invulnerability, with a result card that
 * offers the target's owner a Void Point for 10 fewer Wounds (decision 5) and lets the damage be undone.
 *
 * Applying, reducing, and undoing change an actor the user may not own; a player's request runs on the active GM
 * (`CONFIG.queries`), which posts the result card, so every card's flags are the GM's to change.
 * game-rules/25_rings_and_traits.md, p.78
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { isDead, getVoidReduction, getWoundsTaken } from "../../utils/damage.js";
import { buildVoidUseUpdate, warnVoidLimit } from "../effects/uses.js";

/** Name of the GM query that carries a player's damage action. */
const DAMAGE_QUERY = `${SYS_ID}.damage`;

/**
 * Apply a damage roll to actors: the attack's target, or the selected tokens' actors.
 * @param {ChatMessage} message - A `roll` message of kind "damage"
 * @param {Actor[]} actors
 * @returns {Promise<void>}
 */
export async function applyDamage(message, actors) {
  if (actors.length === 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noTokenSelected"));
    return;
  }
  for (const actor of actors) {
    await requestDamageAction({ action: "apply", messageId: message.id, actorUuid: actor.uuid });
  }
}

/**
 * Wire a damage card's Apply buttons and a result card's Void and Undo buttons.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindDamageCards(message, html) {
  const on = (action, handler) =>
    html.querySelector(`[data-action='${action}']`)?.addEventListener("click", event => {
      event.preventDefault();
      handler(event);
    });
  if (message.type === "roll" && message.system.kind === "damage") {
    on("damage-apply-target", async () => {
      const target = await fromUuid(message.system.target.uuid);
      await applyDamage(message, target ? [target] : []);
    });
    on("damage-apply-selected", () =>
      applyDamage(message, [...new Set(canvas.tokens.controlled.map(t => t.actor).filter(Boolean))])
    );
  }
  const result = message.getFlag(SYS_ID, "damageResult");
  if (result) {
    const actor = fromUuidSync(result.actorUuid);
    const voidButton = html.querySelector("[data-action='damage-void']");
    if (voidButton && !actor?.isOwner) {
      voidButton.remove();
    }
    on("damage-void", () => requestDamageAction({ action: "void", messageId: message.id }));
    on("damage-undo", () => requestDamageAction({ action: "undo", messageId: message.id }));
  }
}

/** Register the GM side of damage actions. */
export function registerDamageQueries() {
  CONFIG.queries[DAMAGE_QUERY] = (request, { user }) => applyDamageAction(request, user);
}

/**
 * An actor's defenses against damage: its Reduction (armor and Reduction rules, with each rule's exceptions) and
 * its Invulnerability and Spirit rules.
 * @param {Actor} actor
 * @returns {import("../../utils/damage.js").Defenses}
 */
function defensesOf(actor) {
  const { reduction, ruleReduction } = actor.system.armorTn;
  return {
    // The armor's (or stat block's) Reduction has no exceptions; each rule's part keeps its own
    reduction: [{ value: reduction - ruleReduction, except: [] }, ...actor.reductionParts],
    invulnerable: actor.damageDefenses.invulnerable,
    spirit: actor.damageDefenses.spirit
  };
}

/**
 * Apply a damage roll to one actor and post the result card. Runs where the actor can be changed.
 * @param {ChatMessage} damageMessage
 * @param {Actor} actor
 * @returns {Promise<ChatMessage>}
 */
async function applyToActor(damageMessage, actor) {
  const damage = damageMessage.system;
  const result = getWoundsTaken({
    damage: damage.outcome.total,
    tags: damage.sources,
    ignoreReduction: damage.ignoreReduction,
    defenses: defensesOf(actor)
  });
  // The stored value, so an Active Effect on Wounds is never written into storage (B6)
  await actor.update({ "system.suffered": toInt(actor._source.system.suffered) + result.wounds });
  const killed =
    !actor.statuses.has("dead") &&
    isDead(toInt(actor.system.suffered), toInt(actor.system.woundLevels?.out?.value));
  if (killed) {
    await actor.toggleStatusEffect("dead", { active: true, overlay: true });
  }
  return postResult(actor, {
    damageMessageId: damageMessage.id,
    damage: damage.outcome.total,
    wounds: result.wounds,
    reduction: result.reduction,
    spirit: result.spirit,
    invulnerable: result.invulnerable,
    killed,
    voidSpent: false,
    undone: false
  });
}

/**
 * Post or update a damage result card.
 * @param {Actor} actor
 * @param {object} result - The card's flags
 * @param {ChatMessage} [existing] - The card to update instead of posting a new one
 * @returns {Promise<ChatMessage>}
 */
async function postResult(actor, result, existing) {
  const notes = buildResultNotes(result);
  const taken = result.wounds - (result.voidSpent ? getVoidReduction(result.wounds) : 0);
  const content = await foundry.applications.handlebars.renderTemplate(
    CHAT_TEMPLATES.damageResult,
    {
      ...result,
      title: F("l5r4.ui.combat.resultTitle", {
        name: actor.name,
        wounds: taken,
        damage: result.damage
      }),
      notes,
      canVoid: !result.voidSpent && !result.undone && result.wounds > 0
    }
  );
  const flags = { [SYS_ID]: { damageResult: { actorUuid: actor.uuid, ...result } } };
  if (existing) {
    await existing.update({ content, flags });
    return existing;
  }
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, flags });
}

/**
 * The notes a damage result card lists: Reduction, Spirit, Invulnerability, a Void Point spent, and a kill.
 * @param {object} result - The card's flags
 * @returns {string[]} The localized notes, in that order
 */
function buildResultNotes(result) {
  const notes = [];
  if (result.reduction) {
    notes.push(F("l5r4.ui.combat.reductionNote", { reduction: result.reduction }));
  }
  if (result.spirit) {
    notes.push(T("l5r4.ui.combat.spiritNote"));
  }
  if (result.invulnerable) {
    notes.push(T("l5r4.ui.combat.invulnerableNote"));
  }
  if (result.voidSpent) {
    notes.push(F("l5r4.ui.combat.voidNote", { wounds: getVoidReduction(result.wounds) }));
  }
  if (result.killed) {
    notes.push(T("l5r4.ui.combat.killedNote"));
  }
  return notes;
}

/**
 * Spend the damaged actor's Void Point for 10 fewer Wounds from this damage.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {ChatMessage} card - A damage result card
 * @returns {Promise<void>}
 */
async function spendVoidPointOnDamage(card) {
  const result = card.getFlag(SYS_ID, "damageResult");
  const actor = await fromUuid(result.actorUuid);
  if (result.voidSpent || result.undone || toInt(actor.system.rings.void.value) <= 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noVoidPoints"));
    return;
  }
  warnVoidLimit(actor);
  const stored = actor._source.system;
  await actor.update({
    "system.rings.void.value": stored.rings.void.value - 1,
    "system.suffered": Math.max(0, stored.suffered - getVoidReduction(result.wounds)),
    ...buildVoidUseUpdate(actor)
  });
  await postResult(actor, { ...result, voidSpent: true }, card);
}

/**
 * Undo a damage result: take its Wounds back off, return a Void Point spent on it, and lift a Dead status it gave.
 * @param {ChatMessage} card - A damage result card
 * @returns {Promise<void>}
 */
async function applyDamageUndo(card) {
  const result = card.getFlag(SYS_ID, "damageResult");
  if (result.undone) {
    return;
  }
  const actor = await fromUuid(result.actorUuid);
  const stored = actor._source.system;
  const taken = result.wounds - (result.voidSpent ? getVoidReduction(result.wounds) : 0);
  await actor.update({
    "system.suffered": Math.max(0, stored.suffered - taken),
    ...(result.voidSpent ? { "system.rings.void.value": stored.rings.void.value + 1 } : {})
  });
  if (result.killed) {
    await actor.toggleStatusEffect("dead", { active: false });
  }
  await postResult(actor, { ...result, undone: true }, card);
}

/**
 * Run a damage action as the GM: what the requesting user may do is checked here.
 * @param {{action: string, messageId: string, actorUuid?: string}} request
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function applyDamageAction({ action, messageId, actorUuid }, user) {
  const message = game.messages.get(String(messageId));
  if (!message) {
    throw new Error(`No message ${messageId}`);
  }
  if (action === "apply") {
    await applyRequestedDamage(message, actorUuid, user);
    return;
  }
  const result = message.getFlag(SYS_ID, "damageResult");
  const actor = result ? await fromUuid(result.actorUuid) : null;
  if (!actor) {
    throw new Error("Not a damage result");
  }
  if (action === "void") {
    if (!user.isGM && !actor.testUserPermission(user, "OWNER")) {
      throw new Error("Only the damaged actor's owner spends its Void Point");
    }
    await spendVoidPointOnDamage(message);
  } else if (action === "undo") {
    const damage = game.messages.get(result.damageMessageId);
    const roller = damage ? fromUuidSync(damage.system.actorUuid) : null;
    if (!user.isGM && !roller?.testUserPermission(user, "OWNER")) {
      throw new Error("Only the roller or a GM undoes this damage");
    }
    await applyDamageUndo(message);
  }
}

/**
 * Apply a damage roll to the actor a request names, as the GM: the message must be a damage roll, the uuid an actor,
 * and the requesting user the roller or a GM.
 * @param {ChatMessage} message - The damage roll
 * @param {string} actorUuid - The actor to damage, from the request
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function applyRequestedDamage(message, actorUuid, user) {
  const actor = await fromUuid(String(actorUuid));
  const roller = fromUuidSync(message.system.actorUuid);
  if (
    message.type !== "roll" ||
    message.system.kind !== "damage" ||
    actor?.documentName !== "Actor"
  ) {
    throw new Error("Not a damage roll and an actor");
  }
  if (!user.isGM && !roller?.testUserPermission(user, "OWNER")) {
    throw new Error("Only the roller or a GM applies this damage");
  }
  await applyToActor(message, actor);
}

/**
 * Ask the active GM to run a damage action, or run it when this user is the GM.
 * @param {object} request
 * @returns {Promise<void>}
 */
async function requestDamageAction(request) {
  if (game.user.isGM) {
    return applyDamageAction(request, game.user);
  }
  const gm = game.users.activeGM;
  if (!gm) {
    ui.notifications?.warn(T("l5r4.ui.effects.noGM"));
    return undefined;
  }
  return gm.query(DAMAGE_QUERY, request);
}
