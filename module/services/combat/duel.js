/**
 * @module services/combat/duel
 * @description The iaijutsu duel as a guided card:
 * - Assessment: each duelist rolls Iaijutsu / Awareness at TN 10 + the opponent's Insight Rank × 5; a success
 *   learns one fact about the opponent plus one per Raise, which the card leaves to the players and GM to name;
 *   beating the opponent's total by 10 or more gives +1k1 on Focus (+2k2 at Iaijutsu 7, a Mastery Ability). Either
 *   duelist may concede here.
 * - Focus: a Contested Iaijutsu / Void roll (+5 at Iaijutsu 5, a Mastery Ability); beating the opponent by 5 or
 *   more wins the first strike, with a Free Raise on the strike per further 5; otherwise the strike is kharmic
 *   (simultaneous).
 * - Strike: Iaijutsu / Reflexes attacks against the opponent's Armor TN, posted as attacks, so damage follows
 *   through the attack card.
 *
 * The GM starts a duel from the token controls with one token selected and one targeted.
 * game-rules/39_iaijutsu_dueling.md, p.87-88
 * game-rules/60_bugei_skills.md, p.140
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { rollCheck } from "../dice/check/roll-check.js";
import { registerFlow, canActFor, buildSkillRequest, startFlow } from "./flow.js";

/**
 * Assessment margin that wins +1k1 on Focus.
 * game-rules/39_iaijutsu_dueling.md, p.87
 */
const ASSESSMENT_EDGE = 10;

/**
 * Focus margin that wins the first strike, and each further step a Free Raise.
 * game-rules/39_iaijutsu_dueling.md, p.87
 */
const FOCUS_STEP = 5;

/**
 * Start a duel between two actors (on the GM). A Dazed character cannot fight an iaijutsu duel.
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} first
 * @param {Actor} second
 * @returns {Promise<ChatMessage|null>} null when a duelist is Dazed
 */
export function startDuel(first, second) {
  const dazed = [first, second].find(actor => actor.statuses.has("dazed"));
  if (dazed) {
    ui.notifications?.warn(F("l5r4.ui.combat.duel.dazed", { name: dazed.name }));
    return null;
  }
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
export async function startDuelFromCanvas() {
  const first = canvas.tokens.controlled[0]?.actor;
  const second = [...game.user.targets][0]?.actor;
  if (!first || !second || first === second) {
    ui.notifications?.warn(T("l5r4.ui.combat.duel.pick"));
    return;
  }
  await startDuel(first, second);
}

/**
 * Add the GM's "Iaijutsu duel" button to the token controls.
 * @param {Record<string, object>} controls
 */
export function onGetSceneControlButtonsDuel(controls) {
  if (!controls.tokens) {
    return;
  }
  const tools = controls.tokens.tools;
  tools[`${SYS_ID}-duel`] = {
    name: `${SYS_ID}-duel`,
    order: Object.keys(tools).length,
    title: "l5r4.ui.combat.duel.start",
    icon: "fa-solid fa-khanda",
    visible: game.user.isGM,
    button: true,
    onChange: () => startDuelFromCanvas()
  };
}

/**
 * What a duelist's Iaijutsu Mastery Abilities add: from Rank 5 a Free Raise on Focus, counted as +5 since Focus has
 * no TN (Ernie's ruling); from Rank 7 the Assessment edge is +2k2 instead of +1k1.
 * game-rules/60_bugei_skills.md, p.140
 * @param {Actor} actor
 * @returns {{focusTotal: number, edge: number}} Flat bonus on Focus; rolled and kept dice the edge gives
 */
function iaijutsuMasteryOf(actor) {
  const skill = actor.items.find(i => i.type === "skill" && i.name.toLowerCase() === "iaijutsu");
  const rank = toInt(skill?.system.rank);
  return { focusTotal: rank >= 5 ? FOCUS_STEP : 0, edge: rank >= 7 ? 2 : 1 };
}

/**
 * Roll a duel stage for a duelist: Iaijutsu with the stage's Trait or Ring.
 * @param {Actor} actor
 * @param {object} spec
 * @param {string} spec.stage - assessment, focus, or strike
 * @param {Actor} spec.opponent
 * @param {number} [spec.focusBonus] - +1k1 won at Assessment
 * @param {number} [spec.freeRaises] - Free Raises won at Focus
 * @returns {Promise<ChatMessage|null>}
 */
function rollStage(actor, { stage, opponent, focusBonus = 0, freeRaises = 0 }) {
  const trait = { assessment: "awa", focus: "void", strike: "ref" }[stage];
  const request = {
    ...buildSkillRequest(actor, "iaijutsu", trait),
    kind: stage === "strike" ? "attack" : "skill",
    label: F("l5r4.ui.combat.duel.rollLabel", {
      stage: T(`l5r4.ui.combat.duel.${stage}`),
      name: actor.name
    }),
    target: opponent,
    // A Technique's Focus-roll bonus predicates on the stage
    options: [`duel:${stage}`],
    modifiers: buildStageModifiers(actor, { stage, focusBonus })
  };
  if (stage === "assessment") {
    request.tn = 10 + 5 * opponent.system.insightRank;
  } else if (stage === "strike") {
    request.tn = toInt(opponent.system.armorTn.current);
    request.weapon = duelWeaponOf(actor);
    request.prepare = async () => ({ freeRaises });
  }
  return rollCheck(request);
}

/**
 * A duel stage's modifiers from the duelist's Iaijutsu: the +1k1 edge won at Assessment, and the Focus bonus of
 * Iaijutsu Mastery.
 * @param {Actor} actor
 * @param {{stage: string, focusBonus: number}} roll - The stage, and whether Assessment won the edge
 * @returns {object[]}
 */
function buildStageModifiers(actor, { stage, focusBonus }) {
  const mastery = iaijutsuMasteryOf(actor);
  const modifiers = [];
  if (focusBonus) {
    modifiers.push({
      label: T("l5r4.ui.combat.duel.assessmentEdge"),
      roll: mastery.edge,
      keep: mastery.edge
    });
  }
  if (stage === "focus" && mastery.focusTotal) {
    modifiers.push({ label: T("l5r4.ui.combat.duel.focusMastery"), total: mastery.focusTotal });
  }
  return modifiers;
}

/**
 * The sword a duelist strikes with, for the strike's damage: a weapon tied to Iaijutsu, else to Kenjutsu. None
 * leaves the damage to the GM.
 * @param {Actor} actor
 * @returns {Item|null}
 */
function duelWeaponOf(actor) {
  const weapons = actor.items.filter(i => i.type === "weapon");
  const getTiedWeapon = skill =>
    weapons.find(w => w.system.associatedSkill.toLowerCase() === skill);
  return getTiedWeapon("iaijutsu") ?? getTiedWeapon("kenjutsu") ?? null;
}

/**
 * The duel's state for one duelist index.
 * @param {object} state
 * @param {number} i
 * @returns {{actor: Actor|null, opponent: Actor|null}}
 */
function sidesOf(state, i) {
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
function updateStage(state) {
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

registerFlow("duel", {
  /**
   * The duelist a duel button acts for.
   * @param {object} state
   * @param {DOMStringMap} dataset
   * @returns {Actor|null}
   */
  actorOf(state, dataset) {
    return sidesOf(state, Number(dataset.duelist)).actor ?? null;
  },

  /**
   * A button on the duel card: roll this stage for the duelist the user owns, or concede.
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {DOMStringMap} dataset
   * @returns {Promise<object|null>}
   */
  async click(_card, state, dataset) {
    const i = Number(dataset.duelist);
    const { actor, opponent } = sidesOf(state, i);
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
   * @param {object} state
   * @param {object} step
   * @param {object} step.data - The step the clicking client sent
   * @param {User} step.user - The requesting user
   * @returns {Promise<object>}
   */
  async step(state, { data, user }) {
    const i = Number(data.duelist);
    const { actor } = sidesOf(state, i);
    if (![0, 1].includes(i) || !canActFor(user, actor) || state.stage === "done") {
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
    return updateStage(state);
  },

  /**
   * The card's HTML.
   * @param {object} state
   * @returns {Promise<string>}
   */
  async render(state) {
    const duelists = buildDuelists(state);
    return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.flowCard, {
      title: T("l5r4.ui.combat.duel.title"),
      stage:
        state.stage === "done"
          ? T("l5r4.ui.combat.duel.done")
          : T(`l5r4.ui.combat.duel.${state.stage}`),
      lines: buildDuelLines(state, duelists),
      buttons: buildDuelButtons(state, duelists)
    });
  }
});

/**
 * Each duelist as the card shows it: name, and whether they may roll this stage or concede. In the strike, the
 * duelist with the first strike rolls first; after a kharmic strike both roll at once.
 * @param {object} state
 * @returns {Array<{index: number, name: string, canRoll: boolean, canConcede: boolean}>}
 */
function buildDuelists(state) {
  return state.duelists.map((uuid, i) => {
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
}

/**
 * The card's lines: each duelist's facts learned and Focus edge won, then the first strike or a kharmic strike, then
 * a concession.
 * @param {object} state
 * @param {object[]} duelists - From buildDuelists
 * @returns {string[]}
 */
function buildDuelLines(state, duelists) {
  const lines = state.facts ? buildAssessmentLines(state, duelists) : [];
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
  return lines;
}

/**
 * The Assessment's lines: the facts each duelist learned, then the Focus edge each won.
 * @param {object} state - A state past the Assessment
 * @param {object[]} duelists - From buildDuelists
 * @returns {string[]}
 */
function buildAssessmentLines(state, duelists) {
  const lines = state.facts.map((n, i) =>
    F("l5r4.ui.combat.duel.facts", { name: duelists[i].name, count: n })
  );
  state.focusBonus.forEach((won, i) => {
    if (won) {
      const actor = fromUuidSync(state.duelists[i]);
      const edge = actor ? iaijutsuMasteryOf(actor).edge : 1;
      lines.push(
        F("l5r4.ui.combat.duel.edgeWon", { name: duelists[i].name, bonus: `+${edge}k${edge}` })
      );
    }
  });
  return lines;
}

/**
 * The card's buttons: each duelist's roll for this stage and concession, where allowed.
 * @param {object} state
 * @param {object[]} duelists - From buildDuelists
 * @returns {Array<{action: string, label: string, data: number}>}
 */
function buildDuelButtons(state, duelists) {
  return duelists.flatMap(d => [
    ...(d.canRoll
      ? [{ action: "roll", label: F("l5r4.ui.combat.duel.roll", { name: d.name }), data: d.index }]
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
  ]);
}
