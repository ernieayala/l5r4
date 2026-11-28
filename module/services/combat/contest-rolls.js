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
 * The Strength rolls made for an attack's contest, by side, since its last tie. A roll counts for a side only when that
 * side's actor made it: the mark is on the roller's own message, which the roller could set to either side (#162).
 * @param {ChatMessage} attack - The attack message
 * @returns {{attacker?: ChatMessage, target?: ChatMessage}}
 */
export function contestRollsOf(attack) {
  const actors = { attacker: attack.system.actorUuid, target: attack.system.target?.uuid };
  const rolls = {};
  for (const message of game.messages.contents) {
    const mark = message.getFlag(SYS_ID, "contest");
    const own = message.type === "roll" && message.system.actorUuid === actors[mark?.side];
    if (mark?.attackId === attack.id && own) {
      rolls[mark.side] = message;
    }
    if (message.getFlag(SYS_ID, "contestTie") === attack.id) {
      delete rolls.attacker;
      delete rolls.target;
    }
  }
  return rolls;
}

/**
 * The side that won an attack's contest, once both sides have rolled: each side's declared Raises count (#166).
 * game-rules/29_types_of_rolls.md, p.80
 * @param {ChatMessage} attack - The attack message
 * @returns {{winner: string|null, tie: boolean}|null} null until both sides have rolled
 */
export function getContestOutcome(attack) {
  const rolls = contestRollsOf(attack);
  if (!rolls.attacker || !rolls.target) {
    return null;
  }
  return getContestResult(
    ["attacker", "target"].map(side => ({
      id: side,
      total: rolls[side].system.outcome.total,
      raises: rolls[side].system.tn.raises
    }))
  );
}
