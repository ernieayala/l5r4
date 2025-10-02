/**
 * @fileoverview L5R4 Fear Service - Fear and Terrifying Mechanics for Foundry VTT v13+
 * 
 * This service module implements the complete L5R4 Fear mechanic for NPCs, matching
 * the published rules for Fear X and Terrifying X exactly. Uses pre-computed Fear data
 * from Actor.prepareDerivedData() for optimal performance and maintainability.
 * 
 * **Core Responsibilities:**
 * - **Fear Tests**: Willpower vs pre-computed TN with success/failure evaluation
 * - **Effect Application**: Dazed (Fear) or Stunned (Terrifying) with correct duration
 * - **Chat Integration**: Clear result messages with all relevant information
 * - **Edge Case Handling**: Graceful handling of missing data and invalid states
 * 
 * **L5R4 Fear Rules:**
 * - **Fear X**: TN = 5 × Rank, Failure = Dazed (10 - Willpower) rounds, min 1
 * - **Terrifying X**: TN = 5 × Rank, Failure = Stunned (10 - Willpower) rounds, min 1
 * - **Dazed**: May only take Simple Actions until duration expires
 * - **Stunned**: May take no actions until duration expires
 * 
 * **Architecture:**
 * - Fear TN and labels computed in Actor.prepareDerivedData() (system.fear.*)
 * - Service layer handles roll logic and effect application only
 * - Consolidated executeFearTest() eliminates code duplication
 * - Proper duration calculation: max(1, 10 - Willpower)
 * 
 * @author L5R4 System Team
 * @since 1.0.2
 * @version 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html|Actor Document}
 * @see {@link https://foundryvtt.com/api/classes/documents.ChatMessage.html|ChatMessage}
 */

import { SYS_ID, CHAT_TEMPLATES } from "../config.js";
import { toInt, T } from "../utils.js";

/**
 * Core Fear test execution logic.
 * Consolidated function that handles all Fear test scenarios with proper duration calculation.
 * 
 * **Test Process:**
 * 1. Validate character has Willpower
 * 2. Build roll formula with modifiers
 * 3. Execute Willpower roll
 * 4. Evaluate success/failure against TN
 * 5. Calculate effect duration (10 - Willpower, min 1)
 * 6. Apply effect if failed (Dazed or Stunned)
 * 7. Post result to chat
 * 
 * **Effect Duration Formula:**
 * Duration = max(1, 10 - Character's Willpower Rank)
 * 
 * @param {object} opts - Test configuration
 * @param {Actor} opts.character - Character being tested
 * @param {number} opts.tn - Target Number for the test
 * @param {number} [opts.modifier=0] - Roll modifier (affects roll and keep)
 * @param {string} opts.fearType - "fear" or "terrifying"
 * @param {number} opts.fearRank - Fear rank for display
 * @param {string} opts.sourceName - Name of Fear source (NPC name)
 * @param {string} [opts.targetInfo=""] - Additional targeting info for flavor
 * @returns {Promise<ChatMessage|null>} Chat message or null if failed
 * @private
 */
async function executeFearTest({ character, tn, modifier = 0, fearType, fearRank, sourceName, targetInfo = "" } = {}) {
  // Validate character has Willpower
  const willpower = toInt(character.system?.traits?.wil ?? 0);
  if (willpower <= 0) {
    ui.notifications?.warn(game.i18n.format("l5r4.ui.mechanics.fear.noWillpower", {
      character: character.name
    }));
    return null;
  }

  // Build roll formula with modifier
  const effectiveWillpower = willpower + modifier;
  const rollFormula = `${effectiveWillpower}d10k${effectiveWillpower}x10`;
  const roll = new Roll(rollFormula);
  await roll.evaluate();

  // Evaluate success/failure
  const total = roll.total ?? 0;
  const success = tn > 0 ? total >= tn : null;

  // Apply effect if failed
  let effectDescription = "";
  
  if (success === false && fearRank > 0) {
    const effectType = fearType === "terrifying" ? "stunned" : "dazed";
    effectDescription = effectType === "stunned" ? "Stunned" : "Dazed";
    const duration = Math.max(1, 10 - willpower);
    await applyFearEffect(character, effectType, duration, sourceName);
  }

  // Build chat message flavor and outcome
  const typeLabel = game.i18n.localize(`l5r4.ui.mechanics.fear.${fearType}`);
  const flavor = [
    fearRank > 0 
      ? game.i18n.format("l5r4.ui.mechanics.fear.testResult", { type: typeLabel, rank: fearRank })
      : game.i18n.localize("l5r4.ui.mechanics.fear.fearRank"),
    targetInfo,
    modifier !== 0 ? ` ${game.i18n.localize("l5r4.ui.common.mod")} (${modifier > 0 ? '+' : ''}${modifier})` : ""
  ].filter(Boolean).join("");

  const rollHtml = await roll.render();
  
  const outcomeLabel = success === null ? "" :
    fearRank > 0
      ? game.i18n.format(success ? "l5r4.ui.mechanics.fear.testSuccess" : "l5r4.ui.mechanics.fear.testFailure", { type: typeLabel, rank: fearRank })
      : game.i18n.localize(success ? "l5r4.ui.mechanics.rolls.success" : "l5r4.ui.mechanics.rolls.failure");

  const tnResult = tn > 0 ? { effective: tn, raises: 0, outcome: outcomeLabel } : null;

  // Render chat content
  const content = await foundry.applications.handlebars.renderTemplate(
    CHAT_TEMPLATES.simpleRoll,
    {
      flavor,
      roll: rollHtml,
      tnResult,
      effectInfo: effectDescription || undefined
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
 */
export async function testFear({ npc, character } = {}) {
  // Validate inputs
  if (!npc || !character) {
    console.warn(`${SYS_ID}`, "Fear test: missing npc or character", { npc, character });
    return null;
  }

  // Use pre-computed Fear data from prepareDerivedData()
  const fearRank = npc.system?.fear?.rank ?? 0;
  const fearType = npc.system?.fear?.type ?? "fear";
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
    fearType,
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

/**
 * Apply a Fear effect (Dazed or Stunned) to a character.
 * Uses Foundry's Active Effects system to track the condition with proper duration.
 * 
 * **Effect Properties:**
 * - **Dazed**: "May only take Simple Actions"
 * - **Stunned**: "Cannot take any actions"
 * - **Duration**: Calculated as max(1, 10 - Willpower) rounds
 * - **Source**: References the NPC that caused the effect
 * 
 * **Duration Calculation:**
 * Per L5R4 rules, Fear effects last for (10 - Willpower) rounds, minimum 1 round.
 * This ensures even high-Willpower characters are affected for at least 1 round.
 * 
 * @param {Actor} character - Character to apply effect to
 * @param {string} effectType - "dazed" or "stunned"
 * @param {number} duration - Duration in rounds (pre-calculated)
 * @param {string} sourceName - Name of NPC that caused the effect
 * @returns {Promise<void>}
 */
async function applyFearEffect(character, effectType, duration, sourceName) {
  if (!character) return;

  try {
    // Remove existing fear effects to prevent duplicates
    const existingIds = character.effects
      .filter(e => e.flags?.[SYS_ID]?.fearEffect)
      .map(e => e.id);
    
    if (existingIds.length) {
      await character.deleteEmbeddedDocuments("ActiveEffect", existingIds);
    }

    // Create new fear effect
    await character.createEmbeddedDocuments("ActiveEffect", [{
      name: effectType === "stunned" ? "Stunned" : "Dazed",
      icon: effectType === "stunned" ? "icons/svg/daze.svg" : "icons/svg/stoned.svg",
      origin: character.uuid,
      statuses: [effectType],
      duration: { rounds: Math.max(1, duration) },
      flags: {
        [SYS_ID]: {
          fearEffect: true,
          effectType,
          sourceName,
          duration
        }
      }
    }]);
  } catch (err) {
    console.warn(`${SYS_ID}`, `Fear: Failed to apply ${effectType} effect to ${character.name}`, { err, duration });
  }
}

/**
 * Handle Fear test click from NPC sheet.
 * Gets selected tokens and tests each character against the NPC's Fear.
 * 
 * @param {Actor} npc - NPC actor with Fear
 * @returns {Promise<void>}
 */
export async function handleFearClick(npc) {
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

