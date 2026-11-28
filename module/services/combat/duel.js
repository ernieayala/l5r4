/**
 * @module services/combat/duel
 * @description The iaijutsu duel as a guided card:
 * - Assessment: each duelist rolls Iaijutsu / Awareness at TN 10 + the opponent's Insight Rank × 5; a success
 *   learns one fact about the opponent plus one per Raise, which the card leaves to the players and GM to name;
 *   beating the opponent's total by 10 or more gives +1k1 on Focus (+2k2 at Iaijutsu 7, a Mastery Ability). Either
 *   duelist may concede here.
 * - Focus: a Contested Iaijutsu / Void roll (+5 at Iaijutsu 5, a Mastery Ability); beating the opponent by 5 or
 *   more wins the first strike, with a Free Raise on the strike per further 5; otherwise the strike is kharmic
 *   (simultaneous). Raises declared on Focus must be beaten by 5 each too, or the strike is kharmic (#166).
 * - Strike: Iaijutsu / Reflexes attacks against the opponent's Armor TN, posted as attacks, so damage follows
 *   through the attack card. Once a first strike hits, the struck duelist may yield, which ends the duel, or strike
 *   back, which a duel to first blood counts dishonorable (Ernie's ruling, Stage 18 decision 18).
 *
 * The GM starts a duel from the token controls with one token selected and one targeted.
 * game-rules/39_iaijutsu_dueling.md, p.87-88
 * game-rules/60_bugei_skills.md, p.140
 */

import { SYS_ID } from "../../config/constants.js";
import { CONTEST_MARGIN_PER_RAISE } from "../../config/game-mechanics.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { getSkillItem } from "../../utils/selectors.js";
import { rollCheck } from "../dice/check/roll-check.js";
import { askGmAllow } from "../gm-allow.js";
import { registerFlow, canActFor, buildSkillRequest, getFreshRoll, startFlow } from "./flow.js";

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

/** The duel's stages in order. */
const STAGES = Object.freeze(["assessment", "focus", "strike", "done"]);

/**
 * Start a duel between two actors (on the GM). A Dazed character cannot fight an iaijutsu duel; the GM may let one
 * fight anyway (#223).
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} first
 * @param {Actor} second
 * @returns {Promise<ChatMessage|null>} null when a duelist is Dazed and the GM does not allow it
 */
export async function startDuel(first, second) {
  const dazed = [first, second].find(actor => actor.statuses.has("dazed"));
  const allowed =
    !dazed ||
    (await askGmAllow({
      title: T("l5r4.ui.combat.duel.title"),
      reason: F("l5r4.ui.combat.duel.dazed", { name: dazed.name }),
      ask: T("l5r4.ui.requests.allowRequest")
    }));
  if (!allowed) {
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
  const skill = getSkillItem(actor.items, "iaijutsu");
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
    // Granted before the dialog, so the striker may spend them on the TN
    // game-rules/28_raises.md, p.79
    request.freeRaises = freeRaises;
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
 * A duel roll as the state records it: its message, total, outcome, and declared Raises.
 * @param {ChatMessage} roll
 * @returns {{id: string, total: number, success: boolean|null, raises: number}}
 */
function recordOf(roll) {
  return {
    id: roll.id,
    total: roll.system.outcome.total,
    success: roll.system.outcome.success,
    raises: roll.system.tn.raises
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
    applyFocusResult(state, totals);
    state.stage = "strike";
  } else {
    state.stage = "done";
  }
  return state;
}

/**
 * Settle Focus: the duelist ahead by 5 or more strikes first, with a Free Raise per further 5. A duelist who declared
 * Raises must also be ahead by 5 per Raise, or he fails and the strike is kharmic; his Free Raises still count from
 * the whole margin (Ernie's ruling, #166).
 * game-rules/39_iaijutsu_dueling.md, p.87
 * game-rules/29_types_of_rolls.md, p.80
 * @param {object} state - The duel's state, changed in place
 * @param {Array<{total: number, raises: number}>} focus - Each duelist's Focus roll
 */
function applyFocusResult(state, focus) {
  const ahead = focus[0].total >= focus[1].total ? 0 : 1;
  const margin = focus[ahead].total - focus[1 - ahead].total;
  const needed = Math.max(FOCUS_STEP, CONTEST_MARGIN_PER_RAISE * toInt(focus[ahead].raises));
  const won = margin >= needed;
  state.firstStrike = won ? ahead : null;
  state.freeRaises = won ? Math.floor((margin - FOCUS_STEP) / FOCUS_STEP) : 0;
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
   * @param {{dataset: DOMStringMap}} press - The button pressed
   * @returns {Promise<object|null>}
   */
  async click(_card, state, { dataset }) {
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
   * @param {ChatMessage} step.card - The duel card
   * @param {object} step.data - The step the clicking client sent
   * @param {User} step.user - The requesting user
   * @returns {Promise<object>}
   */
  async step(state, { card, data, user }) {
    const i = Number(data.duelist);
    const { actor } = sidesOf(state, i);
    if (![0, 1].includes(i) || !canActFor(user, actor) || state.stage === "done") {
      throw new Error("l5r4.ui.requests.notYourDuelist");
    }
    if (data.action === "concede") {
      if (!canConcede(state, i)) {
        throw new Error("l5r4.ui.requests.cannotConcede");
      }
      state.conceded = i;
      state.stage = "done";
      return state;
    }
    // The card's own rule: an empty slot this stage, and in the strike the first striker first (#162)
    if (!buildDuelists(state)[i].canRoll) {
      throw new Error("l5r4.ui.requests.notDuelistRoll");
    }
    const kinds = state.stage === "strike" ? ["attack"] : ["skill"];
    const roll = getFreshRoll(card, state, { rollId: data.rollId, actor, kinds });
    state.rolls[state.stage][i] = recordOf(roll);
    return updateStage(state);
  },

  /**
   * A roll that replaces a duelist's recorded one (on the GM): it takes the original's place, and its stage settles
   * again, while the stage is open or the next has no roll yet and no one has conceded (#169, Ernie's ruling).
   * game-rules/43_honor.md, p.92
   * @param {object} state
   * @param {{originalId: string, roll: ChatMessage}} replacement
   * @returns {Promise<object|null>} null when a later step depends on the original
   */
  async replace(state, { originalId, roll }) {
    const stage = STAGES.find(s => s !== "done" && state.rolls[s].some(r => r?.id === originalId));
    const next = STAGES[STAGES.indexOf(stage) + 1];
    // Settled, not ended by the GM: both rolled it, and the stage after it has no roll
    const settled =
      state.stage === next &&
      state.rolls[stage].every(r => r !== null) &&
      (next === "done" || state.rolls[next].every(r => r === null));
    const open = stage === state.stage || settled;
    if (!stage || !open || state.conceded !== null) {
      return null;
    }
    const i = state.rolls[stage].findIndex(r => r?.id === originalId);
    state.rolls[stage][i] = recordOf(roll);
    state.stage = stage;
    return updateStage(state);
  },

  /**
   * The GM's Redo (#164): clear the stage in play, or after the duel ends, reopen its last stage. A concession is
   * taken back.
   * @param {object} state
   * @returns {object}
   */
  redo(state) {
    state.stage = state.stage === "done" ? lastStageOf(state) : state.stage;
    state.rolls[state.stage] = [null, null];
    state.conceded = null;
    return state;
  },

  /**
   * The GM's End (#164): the duel is over where it stands.
   * @param {object} state
   * @returns {Promise<object>}
   */
  async end(state) {
    state.stage = "done";
    return state;
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
      buttons: buildDuelButtons(state, duelists),
      gm: { redo: true, end: state.stage !== "done" }
    });
  }
});

/**
 * The stage a finished duel ended in: the strike once Focus settled, Focus once Assessment settled, else Assessment.
 * @param {object} state
 * @returns {string}
 */
function lastStageOf(state) {
  const isSettled = stage => state.rolls[stage].every(roll => roll !== null);
  if (isSettled("focus")) {
    return "strike";
  }
  return isSettled("assessment") ? "focus" : "assessment";
}

/**
 * Whether a duelist is out of the fight: Dead, or at the Out Wound Rank. Such a duelist does not strike; the second
 * strike happens only while the duelist still stands (#164).
 * game-rules/39_iaijutsu_dueling.md, p.87
 * @param {Actor|null} actor
 * @returns {boolean}
 */
function isOutOfFight(actor) {
  return Boolean(actor?.statuses.has("dead") || actor?.system.woundLevels?.out?.current);
}

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
    const standing = !isOutOfFight(actor);
    return {
      index: i,
      name: actor?.name ?? "?",
      canRoll:
        state.stage !== "done" && !rolled && (state.stage !== "strike" || (strikesNow && standing)),
      canConcede: standing && canConcede(state, i)
    };
  });
}

/**
 * Whether a duelist may concede now: either one at Assessment or Focus; at the Strike, the one a first strike has
 * hit, before striking back, who has lost a duel to first blood (Ernie's ruling, Stage 18 decision 18).
 * game-rules/39_iaijutsu_dueling.md, p.87
 * @param {object} state
 * @param {number} i - The duelist's index
 * @returns {boolean}
 */
function canConcede(state, i) {
  if (state.stage === "assessment" || state.stage === "focus") {
    return true;
  }
  const first = state.firstStrike;
  return (
    state.stage === "strike" &&
    first !== null &&
    i !== first &&
    Boolean(state.rolls.strike[first]?.success) &&
    state.rolls.strike[i] === null
  );
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
  const focusSettled = state.rolls.focus.every(roll => roll !== null);
  if (state.stage === "strike" || (state.stage === "done" && focusSettled)) {
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
    const key = focusSettled ? "yielded" : "conceded";
    lines.push(F(`l5r4.ui.combat.duel.${key}`, { name: duelists[state.conceded].name }));
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
    ...(d.canConcede
      ? [
          {
            action: "concede",
            label: F(`l5r4.ui.combat.duel.${state.stage === "strike" ? "yield" : "concede"}`, {
              name: d.name
            }),
            data: d.index
          }
        ]
      : [])
  ]);
}
