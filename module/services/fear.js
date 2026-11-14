/**
 * Fear Test Service
 *
 * Fear (Core Rulebook p.90):
 * - Characters face Fear effects (Rank 1-10) from supernatural creatures
 * - Test: Raw Willpower roll at TN 5 + 5 × Fear Rank, adding Honor Rank to the total
 * - Failure: the Feared condition at that Rank, -Xk0 to all rolls until the encounter ends (STAGE-09 decision 4)
 * - Catastrophic Failure (fail by 15+): Character flees or cowers
 *
 * The roll goes through the roll pipeline (module/services/dice/check/roll-check.js) as a Willpower Trait roll, so
 * its card carries the TN, the outcome, and the stored context like every other roll.
 *
 * @module services/fear
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import { getEffectiveTrait } from "../utils/mechanics.js";
import { rollCheck } from "./dice/check/roll-check.js";
import { applyEffectAnywhere } from "./effects/apply.js";

/** Failing the Fear roll by this much or more overwhelms the character (p.90). */
const CATASTROPHIC_MARGIN = 15;

/**
 * @typedef {Object} FearTestOptions
 * @property {L5R4Actor} character - The character making the Fear test
 * @property {number} tn - Target number to resist the Fear effect
 * @property {number} fearRank - Fear Rank of the effect (1-10)
 * @property {string} [targetInfo=""] - Descriptive text about the Fear source
 */

/**
 * Roll a Fear test and, on a failure, give the character the Feared condition at the Fear Rank.
 *
 * @param {FearTestOptions} options - Fear test configuration
 * @returns {Promise<ChatMessage|null>} The roll's message, or null when the character cannot roll
 * @private
 */
async function executeFearTest({ character, tn, fearRank, targetInfo = "" } = {}) {
  const willpower = getEffectiveTrait(character, "wil");
  if (willpower <= 0) {
    ui.notifications?.warn(F("l5r4.ui.mechanics.fear.noWillpower", { character: character.name }));
    return null;
  }
  const honorRank = toInt(character.system.honor?.rank);

  return rollCheck({
    actor: character,
    kind: "trait",
    label: `${F("l5r4.ui.mechanics.fear.testResult", { rank: fearRank })}${targetInfo}`,
    base: { roll: willpower, keep: willpower },
    trait: "wil",
    tn,
    modifiers: honorRank ? [{ label: T("l5r4.character.ranks.honorRank"), total: honorRank }] : [],
    askForOptions: false,
    beforePost: async ({ success, total }) => {
      if (success) {
        return {};
      }
      let suffix = ` — ${F("l5r4.ui.mechanics.fear.penaltyApplied", { penalty: fearRank })}`;
      if (total - tn <= -CATASTROPHIC_MARGIN) {
        suffix += ` ${T("l5r4.ui.mechanics.fear.catastrophicFailure")}`;
      }
      return { labelSuffix: suffix };
    },
    after: async message => {
      if (message.system.outcome.success === false) {
        await applyEffectAnywhere(character, "feared", {
          level: fearRank,
          name: F("l5r4.ui.mechanics.fear.effectName", { rank: fearRank })
        });
      }
    }
  });
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

  const targetInfo = ` ${F("l5r4.ui.mechanics.fear.testAgainst", { creature: npc.name })}`;

  return executeFearTest({ character, tn, fearRank, targetInfo });
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
    ui.notifications?.warn(T("l5r4.ui.mechanics.fear.noTargets"));
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
  if (!npc || fearTestInProgress) {
    return;
  }

  fearTestInProgress = true;
  try {
    const selectedTokens = Array.from(canvas?.tokens?.controlled ?? []);
    const characters = selectedTokens
      .map(token => token.actor)
      .filter(actor => actor && actor.id !== npc.id);

    if (characters.length === 0) {
      ui.notifications?.warn(T("l5r4.ui.mechanics.fear.noTargets"));
      return;
    }

    await testFearMultiple({ npc, characters });
  } finally {
    fearTestInProgress = false;
  }
}
