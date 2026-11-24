/**
 * @module services/effects/combat-events
 * @description What turn and round events do for effects, called by L5R4Combat (module/documents/combat.js) on the
 * active GM, where they run on its answering client only (module/services/gm-client.js, #82):
 * - each event posts the saves that roll on it (Reactions stage = roundEnd);
 * - at the start of a Turn, an actor in Full Defense is asked for the Defense / Reflexes roll again, and a
 *   concentrating caster is reminded of the upkeep;
 * - before a new Round, Center Stance gives its bonus (decision 7).
 * game-rules/31_combat_round.md, p.82
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/36_stances.md, p.84
 * game-rules/67_universal_spells.md, p.166
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, R } from "../../utils/localization.js";
import { isAnsweringGmClient, registerGmQuery, requestGmQuery } from "../gm-client.js";
import { applyEffect, effectsOf } from "./apply.js";
import { postFullDefensePrompt, postSavePrompts } from "./prompts.js";

/**
 * Initiative added for the Round after Center Stance.
 * game-rules/36_stances.md, p.84
 */
const CENTER_INITIATIVE = 10;

/** Name of the GM query that settles Center Stance when a player ends the Round. */
const CENTER_QUERY = `${SYS_ID}.settleCenter`;

/**
 * The handlers L5R4Combat calls; the entry module sets `L5R4Combat.EVENTS` to this.
 */
export const COMBAT_EVENTS = Object.freeze({
  /**
   * A combatant's Turn starts or ends.
   * @param {string} event - "turnStart" or "turnEnd"
   * @param {Combat} _combat
   * @param {Combatant} combatant
   */
  async turn(event, _combat, combatant) {
    const actor = combatant.actor;
    if (!actor || !isAnsweringGmClient()) {
      return;
    }
    await postSavePrompts(actor, event);
    if (event !== "turnStart") {
      return;
    }
    if (actor.statuses.has("fullDefenseStance")) {
      await postFullDefensePrompt(actor);
    }
    for (const effect of effectsOf(actor, "concentration")) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: await R(CHAT_TEMPLATES.note, {
          lines: [F("l5r4.ui.effects.concentrationUpkeep", { effect: effect.name })]
        })
      });
    }
  },

  /**
   * A Round ends (the Reactions stage).
   * @param {string} event - "roundEnd"
   * @param {Combat} combat
   */
  async round(event, combat) {
    if (!isAnsweringGmClient()) {
      return;
    }
    for (const actor of new Set(combat.combatants.map(c => c.actor).filter(Boolean))) {
      await postSavePrompts(actor, event);
    }
  },

  /**
   * Before the Round advances, on whichever client advances it.
   * @param {Combat} combat
   */
  async beforeNextRound(combat) {
    if (game.user.isGM) {
      await applyCenterStance(combat);
    } else {
      await requestGmQuery(CENTER_QUERY, { combatId: combat.id });
    }
  }
});

/**
 * Register the GM side of beforeNextRound for players who end the Round. Center Stance is settled once per Round, so
 * only the owner of the combatant whose Turn ends the Round may ask for it (#162).
 */
export function registerCombatQueries() {
  registerGmQuery(CENTER_QUERY, async ({ combatId }, { user }) => {
    const combat = game.combats.get(String(combatId));
    if (!combat?.started) {
      throw new Error("l5r4.ui.requests.noCombat");
    }
    const last = combat.turn === combat.turns.length - 1;
    if (!last || !combat.combatant?.actor?.testUserPermission(user, "OWNER")) {
      throw new Error("l5r4.ui.requests.notRoundEnd");
    }
    await applyCenterStance(combat);
  });
}

/**
 * Settle Center Stance before a Round begins. Each combatant in Center Stance now gets the next Round's bonus: the
 * "centered" effect (+1k1 plus the Void Ring on one roll) and +10 Initiative for that Round. A combatant that had
 * the +10 and left Center Stance loses it.
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function applyCenterStance(combat) {
  const updates = [];
  for (const combatant of combat.combatants) {
    const update = await applyCenterStanceTo(combatant);
    if (update) {
      updates.push(update);
    }
  }
  if (updates.length) {
    await updateCenterInitiative(combat, updates);
  }
}

/**
 * Settle Center Stance for one combatant: in Center Stance, its "centered" effect is renewed; the +10 Initiative
 * follows whether it is in Center Stance now.
 * game-rules/36_stances.md, p.84
 * @param {Combatant} combatant
 * @returns {Promise<object|null>} The combatant's Initiative update, or null when it does not change
 */
async function applyCenterStanceTo(combatant) {
  const actor = combatant.actor;
  if (!actor || combatant.initiative === null) {
    return null;
  }
  const centered = actor.statuses.has("centerStance");
  const had = Boolean(combatant.getFlag(SYS_ID, "centerInitiative"));
  if (centered) {
    const old = effectsOf(actor, "centered").map(e => e.id);
    if (old.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", old);
    }
    await applyEffect(actor, "centered");
  }
  if (centered === had) {
    return null;
  }
  return {
    _id: combatant.id,
    initiative: combatant.initiative + (centered ? CENTER_INITIATIVE : -CENTER_INITIATIVE),
    [`flags.${SYS_ID}.centerInitiative`]: centered
  };
}

/**
 * Write the combatants' Initiative changes, keeping the Turn with the combatant whose Turn it is.
 * @param {Combat} combat
 * @param {object[]} updates - The combatants' Initiative updates
 * @returns {Promise<void>}
 */
async function updateCenterInitiative(combat, updates) {
  // Core re-sorts the turns on an Initiative change [src: client/documents/combat.mjs:492-515] while the turn index
  // stays, which would hand the ending Turn to another combatant; put the current one back, firing no events
  const current = combat.combatant;
  await combat.updateEmbeddedDocuments("Combatant", updates, { turnEvents: false });
  const index = combat.turns.indexOf(current);
  if (index >= 0 && index !== combat.turn) {
    await combat.update({ turn: index }, { turnEvents: false });
  }
}
