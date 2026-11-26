/**
 * @module services/fear-card
 * @description The Fear card: a group's Fear test as a flow card (module/services/combat/flow.js). One card names the
 * Fear Rank and TN with a Roll button for each character, shown to its owners; each rolls through the check dialog,
 * so Void Points and modifiers are theirs to choose (#151). The poster's GM client rolls at once, with no dialog, for
 * the characters no connected player owns, and the GM's "Roll for the rest" rolls for anyone who has not answered, so
 * no dialogs pile up on the GM's screen. The NPC sheet's Fear button and a Fear link post it.
 * game-rules/42_fear.md, p.90
 */

import { SYS_ID } from "../config/constants.js";
import { CHAT_TEMPLATES } from "../config/templates.js";
import { F, T } from "../utils/localization.js";
import { getFearTn, isCatastrophicFear } from "../utils/fear.js";
import { hasActivePlayer } from "../utils/ownership.js";
import { canActFor, getFreshRoll, registerFlow, requestStep, startFlow } from "./combat/flow.js";
import { effectsOf } from "./effects/apply.js";
import { rollFearTest } from "./fear.js";

/** Lock to prevent concurrent Fear test executions from multiple rapid clicks */
let fearTestInProgress = false;

/**
 * Post a Fear card for several characters: a Fear link's Rank with no creature behind it (TN 5 + 5 × Rank), or a
 * creature's Fear. The poster's GM client then rolls, with no dialog, for each character no connected player owns.
 * game-rules/42_fear.md, p.90
 * @param {object} options
 * @param {Actor[]} options.characters - The characters who test, at least one
 * @param {number} options.fearRank - 1-10
 * @param {number} [options.tn] - The TN, 5 + 5 × Rank when not given
 * @param {string} [options.label] - The card's title, "Fear N test" when not given
 * @param {Actor} [options.speaker] - The creature, when there is one
 * @returns {Promise<ChatMessage|null>} The card, or null with no characters
 */
export async function startFearTest({ characters, fearRank, tn, label, speaker }) {
  if (!characters?.length) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.fear.noTargets"));
    return null;
  }
  const card = await startFlow(
    "fear",
    {
      label: label ?? F("l5r4.ui.mechanics.fear.testResult", { rank: fearRank }),
      fearRank,
      tn: tn ?? getFearTn(fearRank),
      characters: characters.map(actor => actor.uuid),
      results: characters.map(() => null),
      order: []
    },
    speaker
  );
  if (game.user.isGM) {
    await rollFearForUnplayed(card);
  }
  return card;
}

/**
 * Handles Fear button clicks on NPC sheets
 *
 * Collects all controlled tokens (excluding the NPC itself) and posts one Fear card for them. Uses a lock to prevent
 * concurrent executions that could result in duplicate cards.
 *
 * Requires Foundry canvas with selected tokens.
 *
 * @param {object} options - Handler parameters
 * @param {L5R4Actor} options.npc - The creature triggering Fear
 * @returns {Promise<void>}
 */
export async function onFearClick({ npc } = {}) {
  if (!npc || fearTestInProgress) {
    return;
  }

  fearTestInProgress = true;
  try {
    const characters = Array.from(canvas?.tokens?.controlled ?? [])
      .map(token => token.actor)
      .filter(actor => actor && actor.id !== npc.id);
    const { rank, tn } = npc.system.fear;
    await startFearTest({
      characters: [...new Set(characters)],
      fearRank: rank,
      tn,
      label: F("l5r4.ui.mechanics.fear.testLabel", { rank, name: npc.name }),
      speaker: npc
    });
  } finally {
    fearTestInProgress = false;
  }
}

registerFlow("fear", {
  /**
   * The character a Roll button acts for.
   * @param {object} state
   * @param {DOMStringMap} dataset
   * @returns {Actor|null}
   */
  actorOf(state, dataset) {
    return fromUuidSync(state.characters[Number(dataset.side)] ?? "") ?? null;
  },

  /**
   * A Roll button: the owner rolls through the check dialog; Shift skips it, as for other rolls.
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {{dataset: DOMStringMap, shiftKey: boolean}} press - The button pressed, and whether Shift was held
   * @returns {Promise<object|null>} The step, or null when nothing rolled
   */
  async click(_card, state, { dataset, shiftKey }) {
    const i = Number(dataset.side);
    const character = fromUuidSync(state.characters[i] ?? "");
    if (!character?.isOwner) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
      return null;
    }
    const message = await rollFearTest({ character, ...state, askForOptions: !shiftKey });
    return message ? { action: "roll", side: i, rollId: message.id } : null;
  },

  /**
   * Record a character's roll (on the GM), read from its own message.
   * @param {object} state
   * @param {object} step
   * @param {ChatMessage} step.card - The Fear card
   * @param {object} step.data - The step the clicking client sent
   * @param {User} step.user - The requesting user
   * @returns {Promise<object>}
   */
  async step(state, { card, data, user }) {
    const i = Number(data.side);
    const actor = fromUuidSync(state.characters[i] ?? "");
    if (!canActFor(user, actor) || state.results[i] !== null) {
      throw new Error("l5r4.ui.requests.notYourFearTest");
    }
    const roll = getFreshRoll(card, state, { rollId: data.rollId, actor, kinds: ["trait"] });
    return applyFearRoll(state, i, roll);
  },

  /**
   * A roll that replaces a character's recorded one (on the GM): each character's test stands alone, so it always
   * takes the original's place. A test that now resists ends the Feared condition the failure gave at this Rank (#169).
   * game-rules/42_fear.md, p.90
   * game-rules/43_honor.md, p.92
   * @param {object} state
   * @param {{originalId: string, roll: ChatMessage}} replacement
   * @returns {Promise<object|null>} null when the card holds no such roll
   */
  async replace(state, { originalId, roll }) {
    const i = state.results.findIndex(result => result?.id === originalId);
    if (i < 0) {
      return null;
    }
    const failed = !state.results[i].success;
    state.results[i] = fearRecordOf(roll);
    const character = fromUuidSync(state.characters[i] ?? "");
    if (failed && state.results[i].success && character) {
      const feared = effectsOf(character, "feared").filter(e => e.system.level === state.fearRank);
      await character.deleteEmbeddedDocuments(
        "ActiveEffect",
        feared.map(e => e.id)
      );
    }
    return state;
  },

  /**
   * The GM's Redo: clear the last roll recorded, so that character rolls again. A Feared condition it gave stays for
   * the GM to remove.
   * @param {object} state
   * @returns {object}
   */
  redo(state) {
    const i = state.order.pop();
    if (i !== undefined) {
      state.results[i] = null;
    }
    return state;
  },

  /**
   * The GM's "Roll for the rest": a roll, with no dialog, for each character who has not answered.
   * @param {object} state
   * @returns {Promise<object>}
   */
  async end(state) {
    for (const [i, uuid] of state.characters.entries()) {
      const character = fromUuidSync(uuid);
      const message =
        state.results[i] === null && character
          ? await rollFearTest({ character, ...state, askForOptions: false })
          : null;
      if (message) {
        applyFearRoll(state, i, message);
      }
    }
    return state;
  },

  /**
   * The card's HTML: each result so far, a Roll button for each character still to roll, and the GM's corrections.
   * @param {object} state
   * @returns {Promise<string>}
   */
  async render(state) {
    const names = state.characters.map(uuid => fromUuidSync(uuid)?.name ?? "?");
    const waiting = state.results.flatMap((result, i) => (result === null ? [i] : []));
    return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.flowCard, {
      title: state.label,
      stage: waiting.length
        ? F("l5r4.ui.mechanics.fear.cardStage", { tn: state.tn })
        : T("l5r4.ui.mechanics.fear.cardDone"),
      lines: state.order.map(i => formatFearResult(names[i], state.results[i], state)),
      buttons: waiting.map(i => ({
        action: "roll",
        label: F("l5r4.ui.mechanics.fear.rollFor", { name: names[i] }),
        data: i
      })),
      gm: {
        redo: state.order.length > 0,
        end: waiting.length > 0,
        endLabel: T("l5r4.ui.mechanics.fear.rollRest")
      }
    });
  }
});

/**
 * Roll, with no dialog, for each character on a Fear card no connected player owns, and record each roll on the card.
 * Runs on the GM's client that posted it.
 * @param {ChatMessage} card
 * @returns {Promise<void>}
 */
async function rollFearForUnplayed(card) {
  const state = card.getFlag(SYS_ID, "flow").state;
  for (const [i, uuid] of state.characters.entries()) {
    const character = fromUuidSync(uuid);
    const message =
      character && !hasActivePlayer(character, game.users)
        ? await rollFearTest({ character, ...state, askForOptions: false })
        : null;
    if (message) {
      await requestStep(card, { action: "roll", side: i, rollId: message.id });
    }
  }
}

/**
 * Put a Fear roll on the card's state: its total, and whether it resisted.
 * @param {object} state
 * @param {number} i - The character's index
 * @param {ChatMessage} roll - The Fear roll's message
 * @returns {object} The state
 */
function applyFearRoll(state, i, roll) {
  state.results[i] = fearRecordOf(roll);
  state.order.push(i);
  return state;
}

/**
 * A Fear roll as the card records it: its message, total, and whether it resisted.
 * @param {ChatMessage} roll
 * @returns {{id: string, total: number, success: boolean}}
 */
function fearRecordOf(roll) {
  const { total, success } = roll.system.outcome;
  return { id: roll.id, total, success: Boolean(success) };
}

/**
 * A character's line on the Fear card: resisted, Feared, or overwhelmed by a Catastrophic Failure.
 * game-rules/42_fear.md, p.90
 * @param {string} name
 * @param {{total: number, success: boolean}} result
 * @param {{tn: number, fearRank: number}} fear - The test's TN and Fear Rank
 * @returns {string}
 */
function formatFearResult(name, { total, success }, { tn, fearRank }) {
  if (success) {
    return F("l5r4.ui.mechanics.fear.resisted", { name, total });
  }
  const key = isCatastrophicFear(total, tn)
    ? "l5r4.ui.mechanics.fear.overwhelmed"
    : "l5r4.ui.mechanics.fear.feared";
  return F(key, { name, total, penalty: fearRank });
}
