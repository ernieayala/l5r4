/**
 * Ask the GM's client to apply damage straight through core, so a refusal never reaches the player.
 * @param {object} request - The damage action
 * @returns {Promise<*>} The answer
 */
export function requestExample(request) {
  return game.users.activeGM?.query("l5r4-enhanced.damage", request);
}
