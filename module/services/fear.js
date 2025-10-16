/**
 * Fear Test Service
 *
 * Handles Fear mechanic for L5R4 system per core rules:
 * - Characters face Fear effects (Rank 1-10) from supernatural creatures
 * - Test: Roll Raw Willpower vs TN (5 + 5×Fear Rank), add Honor Rank
 * - Failure: -Xk0 penalty to all rolls (X = Fear Rank) for encounter
 * - Catastrophic Failure (fail by 15+): Character flees or cowers
 * - Duration: Effect persists until encounter end (ActiveEffect with no expiry)
 *
 * Integrates with:
 * - Foundry Roll API for dice mechanics
 * - ChatMessage API for result posting
 * - Canvas tokens for target selection
 * - ActiveEffect API for persistent penalty tracking
 *
 * @module services/fear
 * @requires Foundry v13+
 */

import { SYS_ID } from "../config/constants.js";
import { CHAT_TEMPLATES } from "../config/templates.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * @typedef {Object} FearTestOptions
 * @property {L5R4Actor} character - The character making the Fear test
 * @property {number} tn - Target number to resist the Fear effect
 * @property {number} [modifier=0] - Additional modifier to the roll
 * @property {number} fearRank - Fear Rank of the effect (1-10)
 * @property {string} [targetInfo=""] - Descriptive text about the Fear source
 */

/**
 * Executes a Fear resistance test for a character
 *
 * Implements core Fear mechanic:
 * - Roll: Willpower d10k Willpower x10 + Honor Rank + modifier
 * - Target: TN (typically 5 + 5×Fear Rank)
 * - Success: No effect
 * - Failure: -Fear Rank k0 penalty to all rolls (ActiveEffect created)
 * - Catastrophic (fail by 15+): Character overwhelmed by terror
 * - Duration: Effect persists until manually removed (encounter end)
 *
 * @async
 * @param {FearTestOptions} options - Fear test configuration
 * @returns {Promise<ChatMessage|null>} Created chat message, or null if failed
 * @private
 */
async function executeFearTest({ character, tn, modifier = 0, fearRank, targetInfo = "" } = {}) {
  const willpower = toInt(character.system?.traits?.wil ?? 0);
  if (willpower <= 0) {
    ui.notifications?.warn(
      game.i18n.format("l5r4.ui.mechanics.fear.noWillpower", {
        character: character?.name ?? "Character"
      })
    );
    return null;
  }

  const honorRank = toInt(character.system?.honor?.rank ?? 0);
  const totalBonus = honorRank + modifier;
  const rollFormula =
    totalBonus !== 0
      ? `${willpower}d10k${willpower}x10+${totalBonus}`
      : `${willpower}d10k${willpower}x10`;

  let roll;
  try {
    roll = new Roll(rollFormula);
    await roll.evaluate();
  } catch (err) {
    console.error(`${SYS_ID}`, "Fear test: Roll evaluation failed", { rollFormula, err });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.mechanics.fear.rollFailed"));
    return null;
  }

  const rollTotal = roll.total ?? 0;
  const success = rollTotal >= tn;
  const margin = rollTotal - tn;

  let penaltyInfo = "";
  let catastrophicFailure = false;

  if (!success) {
    // Create ActiveEffect for Fear penalty that persists until encounter end
    try {
      await character.createEmbeddedDocuments("ActiveEffect", [
        {
          name: game.i18n.format("l5r4.ui.mechanics.fear.effectName", { rank: fearRank }),
          statuses: ["feared"],
          icon: "systems/l5r4-enhanced/assets/icons/fear.webp",
          flags: {
            [SYS_ID]: {
              fearRank: fearRank
            }
          }
        }
      ]);
    } catch (err) {
      console.error(`${SYS_ID}`, "Fear test: Failed to create Fear effect", { err });
    }

    penaltyInfo = game.i18n.format("l5r4.ui.mechanics.fear.penaltyApplied", { penalty: fearRank });

    // Catastrophic failure occurs when failing by 15+, causing the character to flee or cower
    if (margin <= -15) {
      catastrophicFailure = true;
    }
  }

  const bonusText = [];
  if (honorRank > 0) bonusText.push(`Honor +${honorRank}`);
  if (modifier !== 0)
    bonusText.push(
      `${game.i18n.localize("l5r4.ui.common.mod")} ${modifier > 0 ? "+" : ""}${modifier}`
    );
  const bonusDisplay = bonusText.length > 0 ? ` (${bonusText.join(", ")})` : "";

  const flavor = [
    game.i18n.format("l5r4.ui.mechanics.fear.testResult", { rank: fearRank }),
    targetInfo,
    bonusDisplay
  ]
    .filter(Boolean)
    .join("");

  let rollHtml;
  try {
    rollHtml = await roll.render();
  } catch (err) {
    console.error(`${SYS_ID}`, "Fear test: Roll render failed", { err });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.mechanics.fear.rollFailed"));
    return null;
  }

  const outcomeLabel = game.i18n.format(
    success ? "l5r4.ui.mechanics.fear.testSuccess" : "l5r4.ui.mechanics.fear.testFailure",
    { rank: fearRank }
  );

  const tnResult = { effective: tn, raises: 0, outcome: outcomeLabel };

  let effectInfo = penaltyInfo;
  if (catastrophicFailure) {
    effectInfo += " " + game.i18n.localize("l5r4.ui.mechanics.fear.catastrophicFailure");
  }

  let content;
  try {
    content = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.simpleRoll, {
      flavor,
      roll: rollHtml,
      tnResult,
      effectInfo: effectInfo || undefined
    });
  } catch (err) {
    console.error(`${SYS_ID}`, "Fear test: Template render failed", { err });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.mechanics.fear.templateFailed"));
    return null;
  }

  try {
    return await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: character }),
      content,
      sound: CONFIG.sounds.dice
    });
  } catch (err) {
    console.error(`${SYS_ID}`, "Fear test: Failed to post chat message", { err });
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.chatMessageFailed"));
    return null;
  }
}

/**
 * Triggers a Fear test for a single character against an NPC's Fear effect
 *
 * Extracts Fear Rank and TN from NPC, then executes the resistance roll.
 * NPCs without Fear ability (rank ≤ 0) are skipped with a warning.
 *
 * @async
 * @param {Object} options - Test parameters
 * @param {L5R4Actor} options.npc - The creature with the Fear ability
 * @param {L5R4Actor} options.character - The character being tested
 * @returns {Promise<ChatMessage|null>} Created chat message, or null if invalid/failed
 */
export async function testFear({ npc, character } = {}) {
  if (!npc || !character) {
    console.warn(`${SYS_ID}`, "Fear test: missing npc or character", { npc, character });
    return null;
  }

  const fearRank = npc.system?.fear?.rank ?? 0;
  const tn = npc.system?.fear?.tn ?? 0;

  if (fearRank <= 0 || tn <= 0) {
    console.warn(`${SYS_ID}`, "Fear test: NPC has no Fear", { npc: npc.name, fearRank });
    return null;
  }

  const targetInfo = ` ${game.i18n.format("l5r4.ui.mechanics.fear.testAgainst", {
    creature: npc.name
  })}`;

  return executeFearTest({
    character,
    tn,
    modifier: 0,
    fearRank,
    targetInfo
  });
}

/**
 * Executes Fear tests for multiple characters against a single NPC
 *
 * Sequentially processes each character to maintain proper roll order
 * in the chat log. Displays warning if no valid characters provided.
 *
 * @async
 * @param {Object} options - Test parameters
 * @param {L5R4Actor} options.npc - The creature with the Fear ability
 * @param {L5R4Actor[]} options.characters - Array of characters to test
 * @returns {Promise<void>}
 */
export async function testFearMultiple({ npc, characters } = {}) {
  if (!npc || !characters || characters.length === 0) {
    ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noTargets"));
    return;
  }

  for (const character of characters) {
    await testFear({ npc, character });
  }
}

/** Lock to prevent concurrent Fear test executions from multiple rapid clicks */
let fearTestInProgress = false;

/**
 * Handles Fear button clicks on NPC sheets
 *
 * Collects all controlled tokens (excluding the NPC itself) and triggers
 * Fear tests against them. Uses a lock to prevent concurrent executions
 * that could result in duplicate rolls or race conditions.
 *
 * Requires Foundry canvas with selected tokens.
 *
 * @async
 * @param {Object} options - Handler parameters
 * @param {L5R4Actor} options.npc - The creature triggering Fear
 * @returns {Promise<void>}
 */
export async function handleFearClick({ npc } = {}) {
  if (!npc || fearTestInProgress) return;

  fearTestInProgress = true;
  try {
    const selectedTokens = Array.from(canvas?.tokens?.controlled ?? []);
    const characters = selectedTokens
      .map(token => token.actor)
      .filter(actor => actor && actor.id !== npc.id);

    if (characters.length === 0) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noTargets"));
      return;
    }

    await testFearMultiple({ npc, characters });
  } finally {
    fearTestInProgress = false;
  }
}
