/**
 * Full Defense Roll Service
 * 
 * Handles the Full Defense Stance roll mechanic per L5R4 combat rules.
 * When a character assumes Full Defense Stance, they make a Defense/Reflexes roll
 * and add half the total (rounding up) to their Armor TN until their next Turn.
 * This roll is a Complex Action, limiting the character to Free Actions only.
 * 
 * The Full Defense Stance represents the Ring of Earth: reserved, unmoving, unassailable.
 * 
 * Deduplication Strategy:
 * - Uses actor flags to store roll results (prevents duplicate rolls)
 * - Uses module-level Set to track pending rolls (prevents race conditions)
 * 
 * Foundry Integration:
 * - Uses Roll API with exploding dice notation (x10 for exploding tens)
 * - Stores roll results in actor flags under system namespace
 * - Triggers actor.prepareData() to recalculate derived stats with new armor bonus
 * - Requires Foundry v10+ for Roll API
 * 
 * API References:
 * @see {@link https://foundryvtt.com/api/classes/client.Roll.html|Roll API}
 * @see {@link https://foundryvtt.com/api/classes/client.ChatMessage.html|ChatMessage API}
 * 
 * @module services/stance/rolls/full-defense-roll
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { toInt } from "../../../utils/type-coercion.js";
import { R } from "../../../utils/localization.js";
import { getDefenseSkillRank } from "../core/helpers.js";

/**
 * Tracks actors with pending Full Defense rolls to prevent race conditions.
 * When multiple async operations trigger simultaneously, this Set ensures
 * only one roll executes per actor. Entries are added before roll execution
 * and removed in the finally block to guarantee cleanup.
 * 
 * @type {Set<string>} Set of actor IDs currently executing Full Defense rolls
 */
const pendingFullDefenseRolls = new Set();

/**
 * Triggers a Full Defense roll for an actor and updates their Armor TN bonus.
 * 
 * Implements the Full Defense Stance mechanic: makes a Defense/Reflexes roll,
 * calculates armor bonus as half the roll total (rounding up), stores the result
 * in actor flags, and posts to chat. The armor bonus applies until the actor's next Turn.
 * 
 * Deduplication:
 * - Checks for existing roll in actor flags (prevents duplicate rolls same Turn)
 * - Checks pending rolls Set (prevents race conditions from concurrent triggers)
 * 
 * Roll Formula: (Defense Skill + Reflexes)k(Reflexes)x10
 * - Defense Skill: Rank in the "Defense" skill (0 if untrained)
 * - Reflexes: Current Reflexes trait value from actor system data
 * - x10: Exploding tens (dice showing 10 roll again and add)
 * 
 * Armor Bonus Calculation:
 * - Bonus = Math.ceil(rollTotal / 2) per core rules "rounding up"
 * - Example: Roll of 23 gives +12 Armor TN, roll of 30 gives +15 Armor TN
 * 
 * Side Effects:
 * - Sets actor flag: flags[SYS_ID].fullDefenseRoll with {total, formula, timestamp}
 * - Creates chat message with roll results and armor bonus
 * - Calls actor.prepareData() to recalculate derived stats with new bonus
 * 
 * @async
 * @param {Actor} actor - The L5R4 actor assuming Full Defense Stance
 * @param {object} sys - The actor's system data (actor.system)
 * @returns {Promise<void>} Resolves when roll is complete and flags are set
 * 
 * @throws {Error} If roll evaluation fails - error is logged and user notification shown
 */
export async function triggerFullDefenseRoll(actor, sys) {
  if (!actor?.isOwner) return;

  const actorId = actor.id;

  try {
    // Check if actor already has a Full Defense roll this Turn
    // (prevents duplicate rolls until next Turn when flag is cleared)
    const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");
    if (existingRoll) {
      return;
    }

    // Check if a roll is already in progress for this actor
    // (prevents race conditions from concurrent stance changes)
    if (pendingFullDefenseRolls.has(actorId)) {
      return;
    }

    // Mark this actor's roll as pending until complete or failed
    pendingFullDefenseRolls.add(actorId);

    const defenseSkillRank = getDefenseSkillRank(actor);
    const reflexes = toInt(sys.traits?.ref || sys._derived?.traitsEff?.ref || 0);
    const rollDice = reflexes + defenseSkillRank;
    const keepDice = reflexes;

    const formula = `${rollDice}d10k${keepDice}x10`;
    const roll = new Roll(formula);

    await roll.evaluate();
    const rollHtml = await roll.render();

    await actor.setFlag(SYS_ID, "fullDefenseRoll", {
      total: roll.total,
      formula: formula,
      timestamp: Date.now()
    });

    // Calculate armor bonus: half of roll total, rounding up per Full Defense rules
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

    // Recalculate derived stats (Armor TN) with new Full Defense bonus
    actor.prepareData();
  } catch (error) {
    console.error("L5R4 | Failed to trigger Full Defense roll:", error);
    ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.fullDefenseRollFailed"));
  } finally {
    pendingFullDefenseRolls.delete(actorId);
  }
}
