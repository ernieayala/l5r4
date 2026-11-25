/**
 * @module services/fear
 * @description Fear tests:
 * - Characters face Fear effects (Rank 1-10) from supernatural creatures
 * - Test: Raw Willpower roll at TN 5 + 5 × Fear Rank, adding Honor Rank to the total
 * - Failure: the Feared condition at that Rank, -Xk0 to all rolls until the encounter ends (STAGE-09 decision 4)
 * - Catastrophic Failure (fail by 15+): Character flees or cowers
 *
 * The roll goes through the roll pipeline (module/services/dice/check/roll-check.js) as a Willpower Trait roll, so
 * its card carries the TN, the outcome, and the stored context like every other roll. A group's test is the Fear card
 * (module/services/fear-card.js).
 * game-rules/42_fear.md, p.90
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import { getEffectiveTrait } from "../utils/mechanics.js";
import { isCatastrophicFear } from "../utils/fear.js";
import { rollCheck } from "./dice/check/roll-check.js";
import { applyEffectAnywhere } from "./effects/apply.js";

/**
 * @typedef {object} FearTestOptions
 * @property {L5R4Actor} character - The character making the Fear test
 * @property {number} tn - Target number to resist the Fear effect
 * @property {number} fearRank - Fear Rank of the effect (1-10)
 * @property {string} label - The card's label, naming the creature when there is one
 * @property {boolean} [askForOptions=false] - Show the check dialog, where a Void Point or a modifier is the roller's
 *   to choose (#151)
 */

/**
 * Triggers a Fear test for a single character against an NPC's Fear effect
 *
 * Extracts Fear Rank and TN from NPC, then executes the resistance roll.
 * NPCs without Fear ability (rank ≤ 0) are skipped with a warning.
 *
 * @param {object} options - Test parameters
 * @param {L5R4Actor} options.npc - The creature with the Fear ability
 * @param {L5R4Actor} options.character - The character being tested
 * @param {boolean} [options.askForOptions=false] - Show the check dialog
 * @returns {Promise<ChatMessage|null>} Created chat message, or null if invalid/failed
 */
export async function testFear({ npc, character, askForOptions = false } = {}) {
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

  return rollFearTest({ character, tn, fearRank, label, askForOptions });
}

/**
 * Roll a Fear test and, on a failure, give the character the Feared condition at the Fear Rank. A Void Point may be
 * spent on it as on any Trait roll, through the dialog.
 * game-rules/42_fear.md, p.90
 * game-rules/25_rings_and_traits.md, p.78
 * @param {FearTestOptions} options - Fear test configuration
 * @returns {Promise<ChatMessage|null>} The roll's message, or null when the character cannot roll
 */
export async function rollFearTest({ character, tn, fearRank, label, askForOptions = false } = {}) {
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
    askForOptions,
    beforePost: async result => buildFearLabel(result, { tn, fearRank }),
    after: async message => {
      if (message.system.outcome.success === false) {
        // The effect's name, "Fear N", comes from its level on whichever client makes it (#144)
        await applyEffectAnywhere(character, "feared", { level: fearRank });
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
  const key = isCatastrophicFear(total, tn)
    ? "l5r4.ui.mechanics.fear.catastrophicSuffix"
    : "l5r4.ui.mechanics.fear.penaltySuffix";
  return { labelSuffix: F(key, { penalty: fearRank }) };
}
