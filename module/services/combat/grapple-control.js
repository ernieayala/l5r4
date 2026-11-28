/**
 * @module services/combat/grapple-control
 * @description A grapple's control rolls (grapple.js): each side's Contested Skill / Strength roll is recorded, and
 * once both have rolled the contest settles who is in control. The last contest settled is kept, so a roll that
 * replaces one of its rolls (an Honor Roll, a re-roll keeping the better) settles it again while no one has rolled or
 * acted since (#169, Ernie's ruling).
 * game-rules/40_grappling.md, p.88-89
 * game-rules/29_types_of_rolls.md, p.80
 */

import { T, F } from "../../utils/localization.js";
import { getContestResult } from "../../utils/check.js";
import { canActFor, getFreshRoll } from "./flow.js";

/**
 * Record a side's control roll in the state, after checking the side and the roll are the user's; once both sides
 * have rolled, settle the Contested Roll.
 * game-rules/40_grappling.md, p.88
 * @param {object} state - The grapple's state, changed in place
 * @param {Actor[]} sides - The two sides
 * @param {{card: ChatMessage, data: object, user: User}} step - The grapple card, the step the clicking client sent,
 *   and the requesting user
 */
export function applyControlRoll(state, sides, { card, data, user }) {
  const i = Number(data.side);
  // An empty slot only: a side rolls control once until both have (#162)
  if (![0, 1].includes(i) || !canActFor(user, sides[i]) || state.rolls[i] !== null) {
    throw new Error("l5r4.ui.requests.notYourSide");
  }
  const roll = getFreshRoll(card, state, {
    rollId: data.rollId,
    actor: sides[i],
    kinds: ["skill"]
  });
  state.rolls[i] = controlRecordOf(roll);
  // A new control roll is a later step: the contest before it can no longer be settled again (#169)
  state.settled = null;
  if (state.rolls.every(entry => entry !== null)) {
    applyControlContest(state, sides);
  }
}

/**
 * Put a roll that replaces a recorded control roll in its place: while its pair is still open, or in the last contest
 * settled, which then settles again from the control before it (#169, Ernie's ruling).
 * game-rules/43_honor.md, p.92
 * @param {object} state - The grapple's state, changed in place
 * @param {Actor[]} sides - The two sides
 * @param {{originalId: string, roll: ChatMessage}} replacement
 * @returns {boolean} Whether the roll took the original's place; false when a later step depends on it
 */
export function applyControlReplacement(state, sides, { originalId, roll }) {
  const open = state.rolls.findIndex(entry => entry?.id === originalId);
  if (open >= 0) {
    state.rolls[open] = controlRecordOf(roll);
    return true;
  }
  const settled = state.settled?.rolls.findIndex(entry => entry?.id === originalId) ?? -1;
  if (settled < 0 || state.over) {
    return false;
  }
  state.rolls = [...state.settled.rolls];
  state.rolls[settled] = controlRecordOf(roll);
  state.control = state.settled.control;
  applyControlContest(state, sides);
  return true;
}

/**
 * A control roll as the state records it: its message, total, and declared Raises.
 * @param {ChatMessage} roll
 * @returns {{id: string, total: number, raises: number}}
 */
function controlRecordOf(roll) {
  return { id: roll.id, total: roll.system.outcome.total, raises: roll.system.tn.raises };
}

/**
 * Settle the control rolls as a Contested Roll: a tie changes nothing, otherwise the winner takes control, and a
 * weapon grappler who loses it is told the opponent gains Free Raises for a Disarm. The rolls are cleared, and kept
 * with the control before them as `settled`.
 * game-rules/40_grappling.md, p.88-89
 * game-rules/29_types_of_rolls.md, p.80
 * @param {object} state - The grapple's state, changed in place
 * @param {Actor[]} sides - The two sides
 */
function applyControlContest(state, sides) {
  // Each side's declared Raises count (#166); a card from 4.0.0 stored a control roll as its bare total
  const result = getContestResult(
    state.rolls.map((entry, side) => ({
      id: String(side),
      total: typeof entry === "number" ? entry : entry.total,
      raises: typeof entry === "number" ? 0 : entry.raises
    }))
  );
  state.settled = { rolls: state.rolls, control: state.control };
  if (result.tie) {
    state.log.push(T("l5r4.ui.check.contestTie"));
  } else {
    const winner = Number(result.winner);
    if (state.weapon && state.control === 0 && winner === 1) {
      state.log.push(F("l5r4.ui.combat.grapple.weaponLost", { name: sides[1].name }));
    }
    state.control = winner;
    state.log.push(F("l5r4.ui.combat.grapple.inControl", { name: sides[winner].name }));
  }
  state.rolls = [null, null];
}
