/**
 * @module services/effects/combat-events
 * @description What turn and round events do for effects, called by L5R4Combat (module/documents/combat.js) on the
 * active GM:
 * - each event posts the saves that roll on it (Reactions stage = roundEnd, p.82, p.89);
 * - at the start of a Turn, an actor in Full Defense is asked for the Defense / Reflexes roll again (p.84), and a
 *   concentrating caster is reminded of the upkeep (p.166);
 * - before a new Round, Center Stance gives its bonus (p.84; decision 7).
 */

import { SYS_ID } from "../../config/constants.js";
import { F } from "../../utils/localization.js";
import { applyEffect, effectsOf } from "./apply.js";
import { promptFullDefense, promptSaves } from "./prompts.js";

/** Initiative added for the Round after Center Stance (p.84). */
const CENTER_INITIATIVE = 10;

/** Name of the GM query that settles Center Stance when a player ends the Round. */
const CENTER_QUERY = `${SYS_ID}.settleCenter`;

/**
 * Settle Center Stance before a Round begins. Each combatant in Center Stance now gets the next Round's bonus: the
 * "centered" effect (+1k1 plus the Void Ring on one roll) and +10 Initiative for that Round. A combatant that had
 * the +10 and left Center Stance loses it.
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function settleCenter(combat) {
  const updates = [];
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || combatant.initiative === null) {
      continue;
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
    if (centered !== had) {
      updates.push({
        _id: combatant.id,
        initiative: combatant.initiative + (centered ? CENTER_INITIATIVE : -CENTER_INITIATIVE),
        [`flags.${SYS_ID}.centerInitiative`]: centered
      });
    }
  }
  if (updates.length) {
    // Core re-sorts the turns on an Initiative change (client/documents/combat.mjs:492-515) while the turn index
    // stays, which would hand the ending Turn to another combatant; put the current one back, firing no events
    const current = combat.combatant;
    await combat.updateEmbeddedDocuments("Combatant", updates, { turnEvents: false });
    const index = combat.turns.indexOf(current);
    if (index >= 0 && index !== combat.turn) {
      await combat.update({ turn: index }, { turnEvents: false });
    }
  }
}

/**
 * The handlers L5R4Combat calls; the entry module sets `L5R4Combat.events` to this.
 */
export const combatEvents = {
  /**
   * A combatant's Turn starts or ends.
   * @param {string} event  "turnStart" or "turnEnd"
   * @param {Combat} _combat
   * @param {Combatant} combatant
   */
  async turn(event, _combat, combatant) {
    const actor = combatant.actor;
    if (!actor) {
      return;
    }
    await promptSaves(actor, event);
    if (event !== "turnStart") {
      return;
    }
    if (actor.statuses.has("fullDefenseStance")) {
      await promptFullDefense(actor);
    }
    for (const effect of effectsOf(actor, "concentration")) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p>${F("l5r4.ui.effects.concentrationUpkeep", { effect: effect.name })}</p>`
      });
    }
  },

  /**
   * A Round ends (the Reactions stage).
   * @param {string} event  "roundEnd"
   * @param {Combat} combat
   */
  async round(event, combat) {
    for (const actor of new Set(combat.combatants.map(c => c.actor).filter(Boolean))) {
      await promptSaves(actor, event);
    }
  },

  /**
   * Before the Round advances, on whichever client advances it.
   * @param {Combat} combat
   */
  async beforeNextRound(combat) {
    if (game.user.isGM) {
      await settleCenter(combat);
    } else {
      await game.users.activeGM?.query(CENTER_QUERY, { combatId: combat.id });
    }
  }
};

/** Register the GM side of beforeNextRound for players who end the Round. */
export function registerCombatQueries() {
  CONFIG.queries[CENTER_QUERY] = async ({ combatId }) => {
    const combat = game.combats.get(String(combatId));
    if (!combat?.started) {
      throw new Error(`No started combat ${combatId}`);
    }
    await settleCenter(combat);
  };
}
