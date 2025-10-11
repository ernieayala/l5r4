/**
 * @fileoverview L5R4 Full Defense Roll - Special Defense Roll Logic
 * 
 * This module handles the special Defense/Reflexes roll required when a character
 * enters Full Defense Stance. Includes race condition protection to prevent
 * duplicate rolls, chat message creation for roll results, and flag management
 * for persisting roll results across actor data preparation cycles.
 * 
 * **Core Responsibilities:**
 * - **Roll Execution**: Create and evaluate Defense/Reflexes rolls
 * - **Race Protection**: Prevent duplicate rolls from concurrent requests
 * - **Chat Integration**: Post roll results to chat with Armor TN calculation
 * - **Flag Management**: Store roll results for stance automation
 * - **Result Calculation**: Compute half of roll result (rounded up) for Armor TN
 * 
 * **L5R4 Full Defense Mechanics:**
 * - Roll: Defense Skill + Reflexes kept Reflexes
 * - Bonus: Half of roll result (rounded up) added to Armor TN
 * - Duration: Lasts until stance changed or combat ends
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link ../hooks/effect-lifecycle.js|Effect Lifecycle Hooks} - Triggers rolls
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { toInt } from "../../../utils/type-coercion.js";
import { R } from "../../../utils/localization.js";
import { getDefenseSkillRank } from "../core/helpers.js";

/* -------------------------------------------- */
/* Full Defense Roll Logic                     */
/* -------------------------------------------- */

/**
 * Track pending Full Defense rolls to prevent race conditions.
 * When multiple events trigger simultaneously, this Set ensures only one roll
 * is created per actor.
 * 
 * @type {Set<string>}
 * @private
 */
const pendingFullDefenseRolls = new Set();

/**
 * Trigger a Defense/Reflexes roll for Full Defense Stance.
 * 
 * @param {Actor} actor - The actor making the Defense roll
 * @param {object} sys - The actor's system data object
 */
export async function triggerFullDefenseRoll(actor, sys) {
  if (!actor?.isOwner) return;
  
  const actorId = actor.id;
  
  try {
    // Check if roll already exists to prevent duplicates
    const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");
    if (existingRoll) {
      return;
    }
    
    // Check if a roll is already pending for this actor
    if (pendingFullDefenseRolls.has(actorId)) {
      return;
    }
    
    // Mark this actor as having a pending roll
    pendingFullDefenseRolls.add(actorId);
    
    const defenseSkillRank = getDefenseSkillRank(actor);
    const reflexes = toInt(sys.traits?.ref || sys._derived?.traitsEff?.ref || 0);
    const rollDice = reflexes + defenseSkillRank;
    const keepDice = reflexes;
    
    // Create the roll formula (use x10 for exploding tens, standard L5R4 syntax)
    const formula = `${rollDice}d10k${keepDice}x10`;
    const roll = new Roll(formula);
    
    // Execute the roll
    await roll.evaluate();
    const rollHtml = await roll.render();
    
    // Store the roll result
    await actor.setFlag(SYS_ID, "fullDefenseRoll", {
      total: roll.total,
      formula: formula,
      timestamp: Date.now()
    });
    
    // Create chat message using the new template
    const armorBonus = Math.ceil(roll.total / 2);
    const templateData = {
      formula: formula,
      rollTotal: roll.total,
      armorBonus: armorBonus,
      rollHtml: rollHtml
    };
    
    const content = await R(CHAT_TEMPLATES.fullDefenseRoll, templateData);
    
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content,
      sound: CONFIG.sounds.dice
    };
    
    ChatMessage.create(messageData);
    
    // Re-prepare actor data to apply the new roll result
    actor.prepareData();
    
  } catch (error) {
    console.error("L5R4 | Failed to trigger Full Defense roll:", error);
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.fullDefenseRollFailed"));
  } finally {
    // Always remove the pending flag, even if the roll failed
    pendingFullDefenseRolls.delete(actorId);
  }
}
