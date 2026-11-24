/**
 * @module services/combat/contest-rolls
 * @description The Contested Strength rolls of a Knockdown or Disarm, read from the chat log: each side's Strength
 * roll is marked with the attack and its side, and a tie starts the contest again. contest.js settles a contest from
 * them, and the GM's client checks a contest's outcome from them before it acts on a player's request.
 * game-rules/38_maneuvers.md, p.86-87
 */

import { SYS_ID } from "../../config/constants.js";
import { getContestResult } from "../../utils/check.js";

/**
 * The Strength rolls made for an attack's contest, by side, since its last tie.
 * @param {string} attackId
 * @returns {{attacker?: ChatMessage, target?: ChatMessage}}
 */
export function contestRollsOf(attackId) {
  const rolls = {};
  for (const message of game.messages.contents) {
    const mark = message.getFlag(SYS_ID, "contest");
    if (mark?.attackId === attackId) {
      rolls[mark.side] = message;
    }
    if (message.getFlag(SYS_ID, "contestTie") === attackId) {
      delete rolls.attacker;
      delete rolls.target;
    }
  }
  return rolls;
}

/**
 * The side that won an attack's contest, once both sides have rolled.
 * game-rules/29_types_of_rolls.md, p.80
 * @param {string} attackId
 * @returns {{winner: string|null, tie: boolean}|null} null until both sides have rolled
 */
export function getContestOutcome(attackId) {
  const rolls = contestRollsOf(attackId);
  if (!rolls.attacker || !rolls.target) {
    return null;
  }
  return getContestResult([
    { id: "attacker", total: rolls.attacker.system.outcome.total },
    { id: "target", total: rolls.target.system.outcome.total }
  ]);
}
