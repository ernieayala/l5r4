/**
 * @module services/combat/replacement
 * @description A roll that replaces another (an Honor Roll, a re-roll keeping the better) takes the original's place
 * wherever it was recorded: every flow card that recorded it (duel, grapple, Fear test) and a Knockdown or Disarm
 * contest it was marked for. Each settles again while no later step depends on the original (#169, Ernie's ruling).
 * game-rules/43_honor.md, p.92
 */

import { applyRerollToContest } from "./contest.js";
import { applyRerollToFlows } from "./flow.js";

/**
 * Put a roll that replaces another in the original's place, in the flows and the contest that recorded it.
 * game-rules/43_honor.md, p.92
 * @param {ChatMessage} original - The roll replaced
 * @param {ChatMessage} replacement - The roll that replaces it
 * @returns {Promise<void>}
 */
export async function applyReroll(original, replacement) {
  await applyRerollToFlows(original, replacement);
  await applyRerollToContest(original, replacement);
}
