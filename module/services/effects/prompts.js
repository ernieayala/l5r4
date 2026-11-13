/**
 * @module services/effects/prompts
 * @description Chat cards that ask an actor's owner to roll for an effect, and what each roll does. The active GM
 * posts them on combat events (module/services/effects/combat-events.js) or after damage; the owner clicks, rolls
 * through the roll dialog with every choice it offers, and the result is applied.
 *
 * - `save`: a PeriodicSave (Dazed and Stunned in the Reactions stage, p.89). Success ends the effect; a failure
 *   lowers the next TN (Dazed, decision 5) or ends the effect after the next Round (Stunned).
 * - `fullDefense`: the Defense / Reflexes roll of Full Defense (p.84), half of it (rounded up) to Armor TN until the
 *   next Turn.
 * - `concentration`: the Willpower roll when a concentrating caster takes more Wounds than the Earth Ring (p.166);
 *   failure ends the Concentration and the effects it holds up.
 *
 * The card's request is stored in its message's flags, which only its author (the GM) can change; the button
 * reads them back and never the card's HTML.
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, T } from "../../utils/localization.js";
import { nextSaveTn } from "../../utils/effects.js";
import { toInt } from "../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { rollCheck } from "../dice/check/roll-check.js";
import { SkillRoll } from "../dice/rolls/skill-roll.js";
import { applyEffect, ownTurnStart } from "./apply.js";

/**
 * Post a prompt card for an actor.
 * @param {Actor} actor
 * @param {object} request  Stored in the message flags; `kind` names the handler
 * @param {{title: string, text?: string, button: string}} card
 * @returns {Promise<ChatMessage>}
 */
async function postPrompt(actor, request, card) {
  const content = await foundry.applications.handlebars.renderTemplate(
    CHAT_TEMPLATES.effectPrompt,
    card
  );
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [SYS_ID]: { prompt: { actorUuid: actor.uuid, ...request } } }
  });
}

/**
 * Label of a save's roll: the Ring or Trait name.
 * @param {string} roll  "ring:earth" or "trait:wil"
 * @returns {string}
 */
function rollLabel(roll) {
  const [type, key] = roll.split(":");
  return T(type === "ring" ? `l5r4.ui.mechanics.rings.${key}` : `l5r4.ui.mechanics.traits.${key}`);
}

/**
 * Post a card for each PeriodicSave of the actor's effects that rolls on this event.
 * @param {Actor} actor
 * @param {string} event
 * @returns {Promise<void>}
 */
export async function promptSaves(actor, event) {
  for (const save of actor.periodicSaves ?? []) {
    if (save.event !== event) {
      continue;
    }
    const effect = fromUuidSync(save.effectUuid);
    const tn = effect?.getFlag(SYS_ID, "saveTn") ?? save.tn;
    await postPrompt(
      actor,
      { kind: "save", ...save, tn },
      {
        title: F("l5r4.ui.effects.saveTitle", { effect: save.source }),
        text: F("l5r4.ui.effects.saveText", { roll: rollLabel(save.roll), tn }),
        button: T("l5r4.ui.common.roll")
      }
    );
  }
}

/**
 * Post the Full Defense card: the stance is declared again at the start of the Turn (p.82, p.84).
 * @param {Actor} actor
 * @returns {Promise<ChatMessage>}
 */
export function promptFullDefense(actor) {
  return postPrompt(
    actor,
    { kind: "fullDefense" },
    {
      title: T("l5r4.ui.mechanics.stances.fullDefense"),
      text: T("l5r4.ui.mechanics.stances.fullDefenseDescription"),
      button: T("l5r4.ui.common.roll")
    }
  );
}

/**
 * Post the Concentration check: Willpower at TN 20 + 5 per Mastery Level of the spell (p.166).
 * @param {Actor} actor
 * @param {ActiveEffect} effect  The Concentration effect; its level is the spell's Mastery Level
 * @returns {Promise<ChatMessage>}
 */
export function promptConcentration(actor, effect) {
  const tn = 20 + 5 * toInt(effect.system.level);
  return postPrompt(
    actor,
    { kind: "concentration", effectUuid: effect.uuid, roll: "trait:wil", tn },
    {
      title: F("l5r4.ui.effects.saveTitle", { effect: effect.name }),
      text: F("l5r4.ui.effects.saveText", { roll: rollLabel("trait:wil"), tn }),
      button: T("l5r4.ui.common.roll")
    }
  );
}

/**
 * Roll a Ring or a Trait against a TN through the roll pipeline.
 * @param {Actor} actor
 * @param {string} roll  "ring:<ring>" or "trait:<trait>"
 * @param {number} tn
 * @param {string} label
 * @returns {Promise<ChatMessage|null>}
 */
function rollAgainst(actor, roll, tn, label) {
  const [type, key] = roll.split(":");
  const rank =
    type === "ring"
      ? toInt(key === "void" ? actor.system.rings.void.rank : actor.system.rings[key])
      : getEffectiveTrait(actor, key);
  return rollCheck({
    actor,
    kind: type,
    label,
    base: { roll: rank, keep: rank },
    [type]: key,
    tn
  });
}

/**
 * Roll a Full Defense: Defense / Reflexes, and half the total, rounded up, to Armor TN until the next Turn
 * (p.84). The bonus replaces any earlier one.
 * @param {Actor} actor
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollFullDefense(actor) {
  const defense = actor.items.find(i => i.type === "skill" && i.name.toLowerCase() === "defense");
  const message = await SkillRoll({
    actor,
    skillName: defense?.name ?? "Defense",
    actorTrait: getEffectiveTrait(actor, "ref"),
    skillRank: toInt(defense?.system.rank),
    skillTrait: "ref"
  });
  if (!message) {
    return null;
  }
  const bonus = Math.ceil(message.system.outcome.total / 2);
  await actor.deleteEmbeddedDocuments(
    "ActiveEffect",
    actor.effects.filter(e => e.getFlag(SYS_ID, "effectId") === "fullDefense").map(e => e.id)
  );
  await applyEffect(actor, "fullDefense", {
    name: `${T("l5r4.ui.effects.fullDefense")} (+${bonus})`,
    rules: [{ key: "ArmorTN", value: bonus }],
    start: ownTurnStart(actor)
  });
  return message;
}

/** Name of the GM query that ends a Concentration for a player. */
const END_CONCENTRATION_QUERY = `${SYS_ID}.endConcentration`;

/**
 * End a Concentration and every effect it holds up: effects whose origin is the Concentration effect, on any actor
 * in the world or on the canvas. Effects on actors the user does not own are ended by the active GM.
 * @param {ActiveEffect} effect
 * @returns {Promise<void>}
 */
export async function endConcentration(effect) {
  if (!game.user.isGM) {
    await game.users.activeGM?.query(END_CONCENTRATION_QUERY, { effectUuid: effect.uuid });
    return;
  }
  const tokenActors = (canvas?.tokens?.placeables ?? []).map(t => t.actor).filter(Boolean);
  for (const actor of new Set([...game.actors, ...tokenActors])) {
    const held = actor.effects.filter(e => e.origin === effect.uuid).map(e => e.id);
    if (held.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", held);
    }
  }
  await effect.delete();
}

/** Register the GM side of endConcentration. */
export function registerPromptQueries() {
  CONFIG.queries[END_CONCENTRATION_QUERY] = async ({ effectUuid }) => {
    const effect = await fromUuid(String(effectUuid));
    if (effect?.documentName !== "ActiveEffect" || !effect.statuses.has("concentration")) {
      throw new Error(`Not a Concentration effect: ${effectUuid}`);
    }
    await endConcentration(effect);
  };
}

/**
 * Handle a click on a prompt card's button.
 * @param {ChatMessage} message
 * @returns {Promise<void>}
 */
export async function onPromptClick(message) {
  const request = message.getFlag(SYS_ID, "prompt");
  const actor = await fromUuid(request.actorUuid);
  if (!actor?.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return;
  }

  if (request.kind === "fullDefense") {
    await rollFullDefense(actor);
    return;
  }

  const effect = await fromUuid(request.effectUuid);
  if (!effect) {
    ui.notifications?.info(T("l5r4.ui.effects.alreadyEnded"));
    return;
  }
  const rolled = await rollAgainst(actor, request.roll, request.tn, effect.name);
  const success = rolled?.system.outcome.success;
  if (success === undefined || success === null) {
    return;
  }

  if (request.kind === "concentration") {
    if (!success) {
      await endConcentration(effect);
    }
    return;
  }

  // A PeriodicSave
  if (success) {
    await effect.delete();
  } else if (request.onFailure === "endNextRound") {
    // Ends at the end of the Round now running: the Reactions stage that prompted the save has passed
    await effect.update({
      duration: { value: 0, units: "rounds", expiry: "roundEnd" },
      start: foundry.documents.ActiveEffect.getEffectStart()
    });
  } else {
    await effect.setFlag(SYS_ID, "saveTn", nextSaveTn(request.tn, request.step, request.min));
  }
}

/**
 * Wire a prompt card's button.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindPromptCard(message, html) {
  if (!message.getFlag(SYS_ID, "prompt")) {
    return;
  }
  html.querySelector("[data-action='effect-prompt']")?.addEventListener("click", event => {
    event.preventDefault();
    onPromptClick(message);
  });
}
