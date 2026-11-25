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
import {
  canReduceWithVoid,
  getDeathThreshold,
  isDead,
  getVoidReduction,
  getWoundsTaken
} from "../../utils/damage.js";
import { hideUnusable } from "../../utils/dom.js";
import { updateCheckCardUse } from "../dice/check/card.js";
import { askGmFor } from "../gm-allow.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";
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
    bindApplyButtons(message, html, on);
  }
  const result = message.getFlag(SYS_ID, "damageResult");
  if (result) {
    bindResultButtons(message, result, { html, on });
  }
}

/** Register the GM side of damage actions. */
export function registerDamageQueries() {
  registerGmQuery(DAMAGE_QUERY, (request, { user }) => applyDamageAction(request, user));
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
 * The Wounds that kill an actor: an NPC whose Wound Ranks the GM enters (manual mode) has a creature's own Wound list,
 * whose last rank is the total that kills it; Wound Ranks from the Earth Ring kill past Out.
 * game-rules/99_creatures.md, p.318
 * @param {Actor} actor
 * @returns {number}
 */
function deathThresholdOf(actor) {
  const ownWoundList = actor.type === "npc" && actor.system.woundMode === "manual";
  return getDeathThreshold(toInt(actor.system.woundLevels?.out?.value), ownWoundList);
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
    !actor.statuses.has("dead") && isDead(toInt(actor.system.suffered), deathThresholdOf(actor));
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
  let card = existing;
  if (card) {
    await card.update({ content, flags });
  } else {
    card = await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, flags });
  }
  await updateDamageCardUse(card, actor, { ...result, taken });
  return card;
}

/**
 * Keep the damage roll's card in step with one of its result cards, so it lists who took its Wounds and how many:
 * a result adds or updates its line, an undone one takes it away (#140). A damage roll deleted since shows nothing.
 * @param {ChatMessage} card - The result card
 * @param {Actor} actor - The damaged actor
 * @param {object} result - The result card's flags, with the Wounds `taken` after a Void Point
 * @returns {Promise<void>}
 */
async function updateDamageCardUse(card, actor, result) {
  const damage = game.messages.get(result.damageMessageId);
  if (!damage) {
    return;
  }
  const others = (damage.getFlag(SYS_ID, "used")?.applied ?? []).filter(
    a => a.resultId !== card.id
  );
  const line = { uuid: actor.uuid, name: actor.name, wounds: result.taken, resultId: card.id };
  await updateCheckCardUse(damage, { applied: result.undone ? others : [...others, line] });
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
  if (!canReduceWithVoid(result, toInt(actor.system.rings.void.value))) {
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
  // Back below the Wounds that kill, the Void Point saves the life this damage took, as Undo would (#117)
  const saved = result.killed && !isDead(toInt(actor.system.suffered), deathThresholdOf(actor));
  if (saved) {
    await actor.toggleStatusEffect("dead", { active: false });
  }
  await postResult(actor, { ...result, voidSpent: true, killed: result.killed && !saved }, card);
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
    throw new Error("l5r4.ui.requests.messageGone");
  }
  if (action === "apply") {
    await applyRequestedDamage(message, actorUuid, user);
    return;
  }
  // The GM's client makes every result card; a player's own message carrying these flags is not one (#162)
  const result = message.author?.isGM ? message.getFlag(SYS_ID, "damageResult") : null;
  const actor = result ? await fromUuid(result.actorUuid) : null;
  if (!actor) {
    throw new Error("l5r4.ui.requests.notDamageResult");
  }
  if (action === "void") {
    if (!user.isGM && !actor.testUserPermission(user, "OWNER")) {
      throw new Error("l5r4.ui.requests.onlyOwnerVoid");
    }
    await spendVoidPointOnDamage(message);
  } else if (action === "undo") {
    await applyRequestedUndo(message, { result, actor }, user);
  }
}

/**
 * Undo a damage result for the requesting user. Someone else's Undo, such as the damaged character's owner taking
 * back a mistake, is the GM's call (#223).
 * @param {ChatMessage} message - The result card
 * @param {{result: object, actor: Actor}} card - Its `damageResult` flag and the damaged actor
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function applyRequestedUndo(message, { result, actor }, user) {
  const allowed =
    canUndoDamage(result, user) ||
    (await askGmFor(user, {
      title: actor.name,
      reason: T("l5r4.ui.requests.onlyRollerUndoes"),
      ask: T("l5r4.ui.requests.allowRequest")
    }));
  if (!allowed) {
    throw new Error("l5r4.ui.requests.declined");
  }
  await applyDamageUndo(message);
}

/**
 * Whether a user may undo a damage result: a GM, or an owner of the actor who rolled the damage.
 * @param {object} result - The result card's `damageResult` flag
 * @param {User} user
 * @returns {boolean}
 */
function canUndoDamage(result, user) {
  const damage = game.messages.get(result.damageMessageId);
  const roller = damage ? fromUuidSync(damage.system.actorUuid) : null;
  return user.isGM || Boolean(roller?.testUserPermission(user, "OWNER"));
}

/**
 * Wire a damage roll card's Apply buttons, shown only to the roller's owner or a GM (#112).
 * @param {ChatMessage} message - The damage roll
 * @param {HTMLElement} html
 * @param {function(string, Function): void} on - Binds a button's click by action
 */
function bindApplyButtons(message, html, on) {
  const roller = fromUuidSync(message.system.actorUuid);
  hideUnusable(
    html,
    "[data-action='damage-apply-target'], [data-action='damage-apply-selected']",
    () => Boolean(roller?.isOwner)
  );
  on("damage-apply-target", async () => {
    const target = await fromUuid(message.system.target.uuid);
    await applyDamage(message, target ? [target] : []);
  });
  on("damage-apply-selected", () =>
    applyDamage(message, [...new Set(canvas.tokens.controlled.map(t => t.actor).filter(Boolean))])
  );
}

/**
 * Wire a damage result card's Void and Undo buttons, each shown only to the users who may use it (#108); Reduce with
 * Void also only while the actor has a Void Point to spend. The Void check runs on the clicking client too, which can
 * see the owner's Void Points, so a refusal warns that player (#113).
 * @param {ChatMessage} message - The result card
 * @param {object} result - Its `damageResult` flag
 * @param {{html: HTMLElement, on: function(string, Function): void}} card - The rendered card and its click binder
 */
function bindResultButtons(message, result, { html, on }) {
  const actor = fromUuidSync(result.actorUuid);
  // An actor with no Void Point left has nothing to spend: the button shows once it has one again (#142)
  hideUnusable(
    html,
    "[data-action='damage-void']",
    () => Boolean(actor?.isOwner) && toInt(actor.system.rings.void.value) > 0
  );
  hideUnusable(html, "[data-action='damage-undo']", () => canUndoDamage(result, game.user));
  on("damage-void", () => {
    if (!canReduceWithVoid(result, toInt(actor.system.rings.void.value))) {
      ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noVoidPoints"));
      return undefined;
    }
    return requestDamageAction({ action: "void", messageId: message.id });
  });
  on("damage-undo", () => requestDamageAction({ action: "undo", messageId: message.id }));
}

/**
 * Apply a damage roll to the actor a request names, as the GM: the message must be a damage roll, the uuid an actor,
 * and a player's request is checked further (validatePlayerDamage).
 * @param {ChatMessage} message - The damage roll
 * @param {string} actorUuid - The actor to damage, from the request
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function applyRequestedDamage(message, actorUuid, user) {
  const actor = await fromUuid(String(actorUuid));
  if (
    message.type !== "roll" ||
    message.system.kind !== "damage" ||
    actor?.documentName !== "Actor"
  ) {
    throw new Error("l5r4.ui.requests.notDamageRoll");
  }
  if (!user.isGM) {
    await validatePlayerDamage(message, actor, user);
  }
  await applyToActor(message, actor);
}

/**
 * Check a player's damage request against what the roll allows (#162). A stored total that is not its Roll's is a
 * tampered card and is refused. Anything else the roll does not allow is the GM's to rule on (#223): damage from a roll
 * the player did not make, on an actor that is neither the roll's target nor the player's, or on an actor it already
 * hit until that result is undone. The GM is asked, and a refusal names why.
 * @param {ChatMessage} message - The damage roll
 * @param {Actor} actor - The actor to damage
 * @param {User} user - The requesting player
 * @returns {Promise<void>}
 */
async function validatePlayerDamage(message, actor, user) {
  if (message.rolls[0]?.total !== message.system.outcome.total) {
    throw new Error("l5r4.ui.requests.damageMismatch");
  }
  const problem = getPlayerDamageProblem(message, actor, user);
  const allowed =
    !problem ||
    (await askGmFor(user, {
      title: message.system.label,
      reason: F("l5r4.ui.requests.damageAsk", {
        damage: message.system.outcome.total,
        name: actor.name,
        why: T(problem)
      }),
      ask: T("l5r4.ui.requests.allowRequest")
    }));
  if (!allowed) {
    throw new Error("l5r4.ui.requests.declined");
  }
}

/**
 * What a player's damage request asks beyond what the roll allows, as the reason's i18n key; null when nothing.
 * @param {ChatMessage} message - The damage roll
 * @param {Actor} actor - The actor to damage
 * @param {User} user - The requesting player
 * @returns {string|null}
 */
function getPlayerDamageProblem(message, actor, user) {
  if (!fromUuidSync(message.system.actorUuid)?.testUserPermission(user, "OWNER")) {
    return "l5r4.ui.requests.onlyRollerApplies";
  }
  const ownTarget = actor.uuid === message.system.target?.uuid;
  if (!ownTarget && !actor.testUserPermission(user, "OWNER")) {
    return "l5r4.ui.requests.damageNotTarget";
  }
  const applied = game.messages.contents.some(card => {
    const result = card.author?.isGM ? card.getFlag(SYS_ID, "damageResult") : null;
    return (
      result?.damageMessageId === message.id && result.actorUuid === actor.uuid && !result.undone
    );
  });
  return applied ? "l5r4.ui.requests.damageApplied" : null;
}

/**
 * Ask the active GM to run a damage action, or run it when this user is the GM; a refusal is shown to this user.
 * @param {object} request
 * @returns {Promise<void>}
 */
async function requestDamageAction(request) {
  await requestGmQuery(DAMAGE_QUERY, request, applyDamageAction);
}
