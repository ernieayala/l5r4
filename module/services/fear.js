/**
 * @module services/fear
 * @description Fear tests:
 * - Characters face Fear effects (Rank 1-10) from supernatural creatures
 * - Test: Raw Willpower roll at TN 5 + 5 × Fear Rank, adding Honor Rank to the total
 * - Failure: the Feared condition at that Rank, -Xk0 to all rolls until the encounter ends (STAGE-09 decision 4)
 * - Catastrophic Failure (fail by 15+): Character flees or cowers
 *
 * The roll goes through the roll pipeline (module/services/dice/check/roll-check.js) as a Willpower Trait roll, so
 * its card carries the TN, the outcome, and the stored context like every other roll.
 * game-rules/42_fear.md, p.90
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import { getEffectiveTrait } from "../utils/mechanics.js";
import { getFearTn } from "../utils/fear.js";
import { rollCheck } from "./dice/check/roll-check.js";
import { applyEffectAnywhere } from "./effects/apply.js";

/**
 * Failing the Fear roll by this much or more overwhelms the character.
 * game-rules/42_fear.md, p.90
 */
const CATASTROPHIC_MARGIN = 15;

/** Lock to prevent concurrent Fear test executions from multiple rapid clicks */
let fearTestInProgress = false;

/**
 * @typedef {object} FearTestOptions
 * @property {L5R4Actor} character - The character making the Fear test
 * @property {number} tn - Target number to resist the Fear effect
 * @property {number} fearRank - Fear Rank of the effect (1-10)
 * @property {string} label - The card's label, naming the creature when there is one
 */

/**
 * Test a character against a Fear Rank with no creature behind it, as a Fear link does: TN 5 + 5 × Rank.
 * game-rules/42_fear.md, p.90
 * @param {object} options
 * @param {L5R4Actor} options.character
 * @param {number} options.fearRank - 1-10
 * @returns {Promise<ChatMessage|null>}
 */
export function testFearRank({ character, fearRank }) {
  return rollFearTest({
    character,
    tn: getFearTn(fearRank),
    fearRank,
    label: F("l5r4.ui.mechanics.fear.testResult", { rank: fearRank })
  });
}

/**
 * Triggers a Fear test for a single character against an NPC's Fear effect
 *
 * Extracts Fear Rank and TN from NPC, then executes the resistance roll.
 * NPCs without Fear ability (rank ≤ 0) are skipped with a warning.
 *
 * @param {object} options - Test parameters
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

  const label = F("l5r4.ui.mechanics.fear.testLabel", { rank: fearRank, name: npc.name });

  return rollFearTest({ character, tn, fearRank, label });
}

/**
 * Executes Fear tests for multiple characters against a single NPC
 *
 * Sequentially processes each character to maintain proper roll order
 * in the chat log. Displays warning if no valid characters provided.
 *
 * @param {object} options - Test parameters
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

/**
 * Handles Fear button clicks on NPC sheets
 *
 * Collects all controlled tokens (excluding the NPC itself) and triggers
 * Fear tests against them. Uses a lock to prevent concurrent executions
 * that could result in duplicate rolls or race conditions.
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

/**
 * Roll a Fear test and, on a failure, give the character the Feared condition at the Fear Rank.
 *
 * @param {FearTestOptions} options - Fear test configuration
 * @returns {Promise<ChatMessage|null>} The roll's message, or null when the character cannot roll
 */
async function rollFearTest({ character, tn, fearRank, label } = {}) {
  const willpower = getEffectiveTrait(character, "wil");
  if (willpower <= 0) {
    ui.notifications?.warn(F("l5r4.ui.mechanics.fear.noWillpower", { name: character.name }));
    return null;
  }
  const honorRank = toInt(character.system.honor?.rank);

  return rollCheck({
    actor: character,
    kind: "trait",
    label,
    base: { roll: willpower, keep: willpower },
    trait: "wil",
    tn,
    modifiers: honorRank ? [{ label: T("l5r4.character.ranks.honorRank"), total: honorRank }] : [],
    askForOptions: false,
    beforePost: async result => buildFearLabel(result, { tn, fearRank }),
    after: async message => {
      if (message.system.outcome.success === false) {
        await applyEffectAnywhere(character, "feared", {
          level: fearRank,
          name: F("l5r4.ui.mechanics.fear.label", { rank: fearRank })
        });
      }
    }
  });
}

/**
 * The label a failed Fear test adds to its card: the penalty, and a Catastrophic Failure when it failed by 15 or more.
 * game-rules/42_fear.md, p.90
 * @param {{success: boolean, total: number}} result - The roll's outcome
 * @param {{tn: number, fearRank: number}} fear - The test's TN and Fear Rank
 * @returns {{labelSuffix?: string}} rollCheck's `beforePost` result; nothing on a success
 */
function buildFearLabel({ success, total }, { tn, fearRank }) {
  if (success) {
    return {};
  }
  const key =
    total - tn <= -CATASTROPHIC_MARGIN
      ? "l5r4.ui.mechanics.fear.catastrophicSuffix"
      : "l5r4.ui.mechanics.fear.penaltySuffix";
  return { labelSuffix: F(key, { penalty: fearRank }) };
}
