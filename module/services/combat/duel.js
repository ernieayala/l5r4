/**
 * @module services/combat/duel
 * @description The iaijutsu duel as a guided card (Core Rulebook pp.87-88):
 * - Assessment: each duelist rolls Iaijutsu / Awareness at TN 10 + the opponent's Insight Rank × 5; a success
 *   learns one fact about the opponent plus one per Raise, which the card leaves to the players and GM to name;
 *   beating the opponent's total by 10 or more gives +1k1 on Focus. Either duelist may concede here.
 * - Focus: a Contested Iaijutsu / Void roll; beating the opponent by 5 or more wins the first strike, with a Free
 *   Raise on the strike per further 5; otherwise the strike is kharmic (simultaneous).
 * - Strike: Iaijutsu / Reflexes attacks against the opponent's Armor TN, posted as attacks, so damage follows
 *   through the attack card.
 *
 * The GM starts a duel from the token controls with one token selected and one targeted.
 */

import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { rollCheck } from "../dice/check/roll-check.js";
import { defineFlow, mayActFor, skillRequest, startFlow } from "./flow.js";

/** Assessment margin that wins +1k1 on Focus (p.87). */
const ASSESSMENT_EDGE = 10;

/** Focus margin that wins the first strike, and each further step a Free Raise (p.87). */
const FOCUS_STEP = 5;

/**
 * Roll a duel stage for a duelist: Iaijutsu with the stage's Trait or Ring.
 * @param {Actor} actor
 * @param {object} spec
 * @param {string} spec.stage         assessment, focus, or strike
 * @param {Actor} spec.opponent
 * @param {number} [spec.focusBonus]  +1k1 won at Assessment
 * @param {number} [spec.freeRaises]  Free Raises won at Focus
 * @returns {Promise<ChatMessage|null>}
 */
function rollStage(actor, { stage, opponent, focusBonus = 0, freeRaises = 0 }) {
  const trait = { assessment: "awa", focus: "void", strike: "ref" }[stage];
  const request = {
    ...skillRequest(actor, "iaijutsu", trait),
    kind: stage === "strike" ? "attack" : "skill",
    label: `${T(`l5r4.ui.combat.duel.${stage}`)}: ${actor.name}`,
    target: opponent,
    modifiers: focusBonus
      ? [{ label: T("l5r4.ui.combat.duel.assessmentEdge"), roll: 1, keep: 1 }]
      : []
  };
  if (stage === "assessment") {
    request.tn = 10 + 5 * toInt(opponent.system.insight?.rank);
  } else if (stage === "strike") {
    request.tn = toInt(opponent.system.armorTn.current);
    request.weapon = duelWeapon(actor);
    request.prepare = async () => ({ freeRaises });
  }
  return rollCheck(request);
}

/**
 * The sword a duelist strikes with, for the strike's damage: a weapon tied to Iaijutsu, else to Kenjutsu. None
 * leaves the damage to the GM.
 * @param {Actor} actor
 * @returns {Item|null}
 */
function duelWeapon(actor) {
  const weapons = actor.items.filter(i => i.type === "weapon");
  const tiedTo = skill => weapons.find(w => w.system.associatedSkill.toLowerCase() === skill);
  return tiedTo("iaijutsu") ?? tiedTo("kenjutsu") ?? null;
}

/**
 * The duel's state for one duelist index.
 * @param {object} state
 * @param {number} i
 * @returns {{actor: Actor|null, opponent: Actor|null}}
 */
function sides(state, i) {
  return {
    actor: fromUuidSync(state.duelists[i]),
    opponent: fromUuidSync(state.duelists[1 - i])
  };
}

/**
 * Settle a stage once both duelists have rolled it.
 * @param {object} state
 * @returns {object}
 */
function settle(state) {
  const totals = state.rolls[state.stage];
  if (totals.length < 2 || totals.some(t => t === null)) {
    return state;
  }
  if (state.stage === "assessment") {
    const [a, b] = totals.map(t => t.total);
    state.focusBonus = [a - b >= ASSESSMENT_EDGE, b - a >= ASSESSMENT_EDGE];
    state.facts = totals.map(t => (t.success ? 1 + t.raises : 0));
    state.stage = "focus";
  } else if (state.stage === "focus") {
    const [a, b] = totals.map(t => t.total);
    const margin = Math.abs(a - b);
    if (margin < FOCUS_STEP) {
      state.firstStrike = null;
      state.freeRaises = 0;
    } else {
      state.firstStrike = a > b ? 0 : 1;
      state.freeRaises = Math.floor((margin - FOCUS_STEP) / FOCUS_STEP);
    }
    state.stage = "strike";
  } else {
    state.stage = "done";
  }
  return state;
}

defineFlow("duel", {
  /**
   * A button on the duel card: roll this stage for the duelist the user owns, or concede.
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {DOMStringMap} dataset
   * @returns {Promise<object|null>}
   */
  async click(_card, state, dataset) {
    const i = Number(dataset.duelist);
    const { actor, opponent } = sides(state, i);
    if (!actor?.isOwner) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
      return null;
    }
    if (dataset.flowAction === "concede") {
      return { action: "concede", duelist: i };
    }
    const message = await rollStage(actor, {
      stage: state.stage,
      opponent,
      focusBonus: state.stage === "focus" && state.focusBonus?.[i] ? 1 : 0,
      freeRaises: state.stage === "strike" && state.firstStrike === i ? state.freeRaises : 0
    });
    return message ? { action: "roll", duelist: i, rollId: message.id } : null;
  },

  /**
   * Record a roll or a concession (on the GM). The roll is read from its own message.
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {object} data
   * @param {User} user
   * @returns {Promise<object>}
   */
  async step(_card, state, data, user) {
    const i = Number(data.duelist);
    const { actor } = sides(state, i);
    if (![0, 1].includes(i) || !mayActFor(user, actor) || state.stage === "done") {
      throw new Error("Not this user's duelist, or the duel is over");
    }
    if (data.action === "concede") {
      state.conceded = i;
      state.stage = "done";
      return state;
    }
    const roll = game.messages.get(String(data.rollId));
    if (roll?.type !== "roll" || roll.system.actorUuid !== actor.uuid) {
      throw new Error("Not the duelist's roll");
    }
    state.rolls[state.stage][i] = {
      total: roll.system.outcome.total,
      success: roll.system.outcome.success,
      raises: roll.system.tn.raises
    };
    return settle(state);
  },

  /**
   * The card's HTML.
   * @param {object} state
   * @returns {Promise<string>}
   */
  async render(state) {
    const duelists = state.duelists.map((uuid, i) => {
      const actor = fromUuidSync(uuid);
      const rolled = state.rolls[state.stage]?.[i];
      const strikesNow =
        state.stage === "strike" &&
        (state.firstStrike === null ||
          state.firstStrike === i ||
          state.rolls.strike[state.firstStrike] !== null);
      return {
        index: i,
        name: actor?.name ?? "?",
        canRoll: state.stage !== "done" && !rolled && (state.stage !== "strike" || strikesNow),
        canConcede: state.stage === "assessment" || state.stage === "focus"
      };
    });
    const lines = [];
    if (state.facts) {
      state.facts.forEach((n, i) =>
        lines.push(F("l5r4.ui.combat.duel.facts", { name: duelists[i].name, count: n }))
      );
      state.focusBonus.forEach((won, i) => {
        if (won) {
          lines.push(F("l5r4.ui.combat.duel.edgeWon", { name: duelists[i].name }));
        }
      });
    }
    if (state.stage === "strike" || (state.stage === "done" && state.conceded === null)) {
      lines.push(
        state.firstStrike === null
          ? T("l5r4.ui.combat.duel.kharmic")
          : F("l5r4.ui.combat.duel.firstStrike", {
              name: duelists[state.firstStrike].name,
              raises: state.freeRaises
            })
      );
    }
    if (state.conceded !== null) {
      lines.push(F("l5r4.ui.combat.duel.conceded", { name: duelists[state.conceded].name }));
    }
    return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.flowCard, {
      title: T("l5r4.ui.combat.duel.title"),
      stage:
        state.stage === "done"
          ? T("l5r4.ui.combat.duel.done")
          : T(`l5r4.ui.combat.duel.${state.stage}`),
      lines,
      buttons: duelists.flatMap(d => [
        ...(d.canRoll
          ? [
              {
                action: "roll",
                label: F("l5r4.ui.combat.duel.roll", { name: d.name }),
                data: d.index
              }
            ]
          : []),
        ...(d.canConcede && state.stage !== "done"
          ? [
              {
                action: "concede",
                label: F("l5r4.ui.combat.duel.concede", { name: d.name }),
                data: d.index
              }
            ]
          : [])
      ])
    });
  }
});

/**
 * Start a duel between two actors (on the GM).
 * @param {Actor} first
 * @param {Actor} second
 * @returns {Promise<ChatMessage>}
 */
export function startDuel(first, second) {
  return startFlow(
    "duel",
    {
      duelists: [first.uuid, second.uuid],
      stage: "assessment",
      rolls: { assessment: [null, null], focus: [null, null], strike: [null, null] },
      focusBonus: null,
      facts: null,
      firstStrike: null,
      freeRaises: 0,
      conceded: null
    },
    first
  );
}

/**
 * The GM's "Iaijutsu duel" control: the selected token's actor against the targeted token's actor.
 * @returns {Promise<void>}
 */
export async function duelFromCanvas() {
  const first = canvas.tokens.controlled[0]?.actor;
  const second = [...game.user.targets][0]?.actor;
  if (!first || !second || first === second) {
    ui.notifications?.warn(T("l5r4.ui.combat.duel.pick"));
    return;
  }
  await startDuel(first, second);
}
