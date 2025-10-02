/**
 * @fileoverview L5R4 Fear Service - Fear Mechanics for Foundry VTT v13+
 * 
 * This service module implements the complete L5R4 Fear mechanic for NPCs, matching
 * the published rules for Fear X exactly. Uses pre-computed Fear data from
 * Actor.prepareDerivedData() for optimal performance and maintainability.
 * 
 * **Core Responsibilities:**
 * - **Fear Tests**: Raw Willpower roll vs TN, with Honor Rank added to total
 * - **Penalty Application**: -XkO penalty to all rolls on failure (where X = Fear Rank)
 * - **Chat Integration**: Clear result messages with penalty and catastrophic failure warnings
 * - **Edge Case Handling**: Graceful handling of missing data and invalid states
 * 
 * **L5R4 Fear Rules (RAW):**
 * - **Fear X**: TN = 5 + (5 × Fear Rank)
 *   - Example: Fear 3 = TN 20 (5 + 15)
 * - **Resistance Roll**: Raw Willpower at TN, then add Honor Rank to total
 * - **Failure**: Character suffers -XkO penalty to all rolls (X = Fear Rank)
 *   - Penalty lasts until end of encounter or source removed
 * - **Catastrophic Failure**: Failing by 15+ causes character to flee or cower
 * - **Honor Bonus**: Add Honor Rank to roll total (not dice pool)
 * 
 * **Architecture:**
 * - Fear TN computed in Actor.prepareDerivedData() (system.fear.*)
 * - Service layer handles roll logic and penalty tracking
 * - No Active Effects - penalties tracked via flags for manual application
 * - Consolidated executeFearTest() eliminates code duplication
 * 
 * @author L5R4 System Team
 * @since 1.0.2
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html|Actor Document}
 * @see {@link https://foundryvtt.com/api/classes/documents.ChatMessage.html|ChatMessage}
 * @see L5R4 Core Rulebook, 4th Edition, p. 91-92 - Fear rules
 */

import { SYS_ID, CHAT_TEMPLATES } from "../config.js";
import { toInt } from "../utils.js";

/**
 * Core Fear test execution logic.
 * Consolidated function that handles all Fear test scenarios per RAW.
 * 
 * **Test Process (RAW):**
 * 1. Validate character has Willpower
 * 2. Roll Raw Willpower (no modifiers to dice pool)
 * 3. Add Honor Rank to roll total
 * 4. Compare total vs TN
 * 5. On failure: Apply -XkO penalty flag (X = Fear Rank)
 * 6. Check for catastrophic failure (failed by 15+)
 * 7. Post result to chat with penalty info
 * 
 * **Penalty Application:**
 * - Failure causes -XkO penalty to all rolls (X = Fear Rank)
 * - Penalty tracked via actor flag for manual application by GM
 * - Lasts until end of encounter or source removed
 * 
 * **Catastrophic Failure:**
 * - Failing by 15+ triggers flee/cower message
 * - GM decides whether character flees or cowers
 * 
 * @param {object} opts - Test configuration
 * @param {Actor} opts.character - Character being tested
 * @param {number} opts.tn - Target Number for the test (5 + 5×rank)
 * @param {number} [opts.modifier=0] - Situational modifier to roll total (not dice pool)
 * @param {number} opts.fearRank - Fear rank for penalty calculation
 * @param {string} opts.sourceName - Name of Fear source (NPC name)
 * @param {string} [opts.targetInfo=""] - Additional targeting info for flavor
 * @returns {Promise<ChatMessage|null>} Chat message or null if failed
 * @private
 */
async function executeFearTest({ character, tn, modifier = 0, fearRank, sourceName, targetInfo = "" } = {}) {
  // Validate character has Willpower
  const willpower = toInt(character.system?.traits?.wil ?? 0);
  if (willpower <= 0) {
    ui.notifications?.warn(game.i18n.format("l5r4.ui.mechanics.fear.noWillpower", {
      character: character.name
    }));
    return null;
  }

  // Build roll formula with Honor bonus (RAW: added to roll total, not dice pool)
  const honorRank = toInt(character.system?.honor?.rank ?? 0);
  const totalBonus = honorRank + modifier;
  const rollFormula = totalBonus !== 0 
    ? `${willpower}d10k${willpower}x10+${totalBonus}`
    : `${willpower}d10k${willpower}x10`;
  
  const roll = new Roll(rollFormula);
  await roll.evaluate();

  // Roll total now includes Honor and modifiers
  const rollTotal = roll.total ?? 0;
  const success = tn > 0 ? rollTotal >= tn : null;
  const margin = rollTotal - tn;

  // Track penalty and catastrophic failure
  let penaltyInfo = "";
  let catastrophicFailure = false;
  
  if (success === false && fearRank > 0) {
    // RAW: Failure causes -XkO penalty (X = Fear Rank)
    penaltyInfo = game.i18n.format("l5r4.ui.mechanics.fear.penaltyApplied", { penalty: fearRank });
    
    // RAW: Catastrophic failure if failed by 15+
    if (margin <= -15) {
      catastrophicFailure = true;
    }
    
    // Store penalty flag for manual application
    // TODO: Implement penalty tracking system
    // await character.setFlag(SYS_ID, "fearPenalty", { rank: fearRank, source: sourceName });
  }

  // Build chat message flavor
  const bonusText = [];
  if (honorRank > 0) bonusText.push(`Honor +${honorRank}`);
  if (modifier !== 0) bonusText.push(`${game.i18n.localize("l5r4.ui.common.mod")} ${modifier > 0 ? '+' : ''}${modifier}`);
  const bonusDisplay = bonusText.length > 0 ? ` (${bonusText.join(", ")})` : "";
  
  const flavor = [
    fearRank > 0 
      ? game.i18n.format("l5r4.ui.mechanics.fear.testResult", { rank: fearRank })
      : game.i18n.localize("l5r4.ui.mechanics.fear.fearRank"),
    targetInfo,
    bonusDisplay
  ].filter(Boolean).join("");

  const rollHtml = await roll.render();
  
  // Build outcome message
  const outcomeLabel = success === null ? "" :
    fearRank > 0
      ? game.i18n.format(success ? "l5r4.ui.mechanics.fear.testSuccess" : "l5r4.ui.mechanics.fear.testFailure", { rank: fearRank })
      : game.i18n.localize(success ? "l5r4.ui.mechanics.rolls.success" : "l5r4.ui.mechanics.rolls.failure");

  const tnResult = tn > 0 ? { effective: tn, raises: 0, outcome: outcomeLabel } : null;

  // Build effect info for chat display
  let effectInfo = penaltyInfo;
  if (catastrophicFailure) {
    effectInfo += (effectInfo ? " " : "") + game.i18n.localize("l5r4.ui.mechanics.fear.catastrophicFailure");
  }

  // Render chat content
  const content = await foundry.applications.handlebars.renderTemplate(
    CHAT_TEMPLATES.simpleRoll,
    {
      flavor,
      roll: rollHtml,
      tnResult,
      effectInfo: effectInfo || undefined
    }
  );

  // Post to chat
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
 * Execute a Fear test for a character against an NPC with Fear.
 * Uses pre-computed Fear data from NPC's prepareDerivedData().
 * 
 * @param {object} opts - Test configuration options
 * @param {Actor} opts.npc - NPC actor with Fear
 * @param {Actor} opts.character - Character being tested
 * @returns {Promise<ChatMessage|null>} Chat message or null if test skipped
 * @example
 * // Test a PC against an NPC's Fear
 * const npc = game.actors.getName("Oni");
 * const pc = game.actors.getName("Samurai");
 * await Fear.testFear({ npc, character: pc });
 */
export async function testFear({ npc, character } = {}) {
  // Validate inputs
  if (!npc || !character) {
    console.warn(`${SYS_ID}`, "Fear test: missing npc or character", { npc, character });
    return null;
  }

  // Use pre-computed Fear data from prepareDerivedData()
  const fearRank = npc.system?.fear?.rank ?? 0;
  const tn = npc.system?.fear?.tn ?? 0;
  
  if (fearRank <= 0 || tn <= 0) {
    console.warn(`${SYS_ID}`, "Fear test: NPC has no Fear", { npc: npc.name, fearRank });
    return null;
  }

  const targetInfo = ` ${game.i18n.format("l5r4.ui.mechanics.fear.testAgainst", { creature: npc.name })}`;

  return executeFearTest({
    character,
    tn,
    modifier: 0,
    fearRank,
    sourceName: npc.name,
    targetInfo
  });
}

/**
 * Test Fear for multiple characters against an NPC.
 * Processes each character sequentially to avoid race conditions.
 * 
 * @param {object} opts - Test configuration options
 * @param {Actor} opts.npc - NPC actor with Fear
 * @param {Actor[]} opts.characters - Array of characters to test
 * @returns {Promise<void>}
 * @example
 * // Test multiple party members against Fear
 * const npc = game.actors.getName("Oni");
 * const party = game.actors.filter(a => a.type === "pc");
 * await Fear.testFearMultiple({ npc, characters: party });
 */
export async function testFearMultiple({ npc, characters } = {}) {
  if (!npc || !characters || characters.length === 0) {
    ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noTargets"));
    return;
  }

  // Process each character sequentially
  for (const character of characters) {
    await testFear({ npc, character });
  }
}

// TODO: Implement Fear penalty tracking system
// Future implementation should:
// 1. Store penalty in actor flag: { rank: X, source: "NPC Name", timestamp }
// 2. Provide UI for GMs to view/clear penalties  
// 3. Optionally integrate with dice roller to auto-apply penalty
// 4. Track multiple Fear sources (penalties stack per RAW)
// 
// Placeholder function signature:
// async function applyFearPenalty(character, fearRank, sourceName) {
//   await character.setFlag(SYS_ID, "fearPenalty", {
//     rank: fearRank,
//     source: sourceName,
//     timestamp: Date.now()
//   });
// }

/**
 * Handle Fear test click from NPC sheet.
 * Gets selected tokens and tests each character against the NPC's Fear.
 * 
 * @param {object} opts - Configuration options
 * @param {Actor} opts.npc - NPC actor with Fear
 * @returns {Promise<void>}
 * @example
 * // Called from NPC sheet button click
 * await Fear.handleFearClick({ npc: this.actor });
 */
export async function handleFearClick({ npc } = {}) {
  if (!npc) return;

  // Get selected tokens
  const selectedTokens = Array.from(canvas?.tokens?.controlled ?? []);
  
  if (selectedTokens.length === 0) {
    ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noTargets"));
    return;
  }

  // Extract actors from tokens
  const characters = selectedTokens
    .map(token => token.actor)
    .filter(actor => actor && actor.id !== npc.id); // Don't test the NPC against itself

  if (characters.length === 0) {
    ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noTargets"));
    return;
  }

  // Test each character
  await testFearMultiple({ npc, characters });
}

