/**
 * Chat Damage Buttons Handler
 *
 * Handles clicks on Apply Wounds and Reduce with Void buttons in damage roll chat cards.
 * Applies damage to selected tokens with optional Void Point reduction.
 *
 * L5R4 Void Point Damage Reduction:
 * - Spending a Void Point reduces incoming damage by 10
 * - Can reduce damage to 0 minimum
 * - Must be declared before damage is applied
 *
 * L5R4 Armor Reduction:
 * - Armor reduces incoming damage by its Reduction value
 * - Applied automatically from equipped armor
 * - Stacks with Void Point reduction (Void first, then armor)
 * - Can reduce damage to 0 minimum
 *
 * @module hooks/chat-damage-buttons
 * @requires Foundry v13+
 */

import { T, F } from "../utils/localization.js";

/**
 * Applies wounds to the first selected token
 *
 * Automatically applies armor reduction per L5R4 Equipment rules:
 * "Reduction decreases the amount of any damage roll made against the person
 * wearing the armor by the amount listed in the description."
 *
 * @param {number} damage - Amount of damage to apply before armor reduction
 * @returns {Promise<void>}
 * @async
 */
async function applyWoundsToToken(damage) {
  const tokens = canvas.tokens?.controlled ?? [];

  if (tokens.length === 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noTokenSelected"));
    return;
  }

  const token = tokens[0];
  const actor = token.actor;

  if (!actor) {
    ui.notifications?.warn("Token has no actor");
    return;
  }

  // Get armor reduction from actor's equipped armor (calculated in prepareDerivedData)
  const armorReduction = actor.system?.armorTn?.reduction ?? 0;

  // Apply armor reduction per L5R4 rules (minimum 0 damage)
  const reducedDamage = Math.max(0, damage - armorReduction);

  const currentSuffered = actor.system?.suffered ?? 0;
  const newSuffered = currentSuffered + reducedDamage;

  await actor.update({ "system.suffered": newSuffered });

  // Show appropriate notification based on whether armor reduced damage
  if (armorReduction > 0 && reducedDamage < damage) {
    ui.notifications?.info(
      F("l5r4.ui.mechanics.wounds.woundsAppliedWithArmor", {
        original: damage,
        reduction: armorReduction,
        final: reducedDamage,
        name: actor.name
      })
    );
  } else {
    ui.notifications?.info(
      F("l5r4.ui.mechanics.wounds.woundsApplied", {
        amount: reducedDamage,
        name: actor.name
      })
    );
  }
}

/**
 * Reduces damage with Void Point then applies wounds to selected token
 *
 * Applies both Void Point reduction (-10) and armor reduction per L5R4 rules:
 * 1. Void Point reduces damage by 10
 * 2. Armor Reduction then reduces remaining damage
 * 3. Final damage applied (minimum 0)
 *
 * @param {number} damage - Original damage amount
 * @param {string} actorId - ID of actor who can spend void
 * @returns {Promise<void>}
 * @async
 */
async function reduceAndApplyWounds(damage, _actorId) {
  const tokens = canvas.tokens?.controlled ?? [];

  if (tokens.length === 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noTokenSelected"));
    return;
  }

  const token = tokens[0];
  const targetActor = token.actor;

  if (!targetActor) {
    ui.notifications?.warn("Token has no actor");
    return;
  }

  // Check if target has void points
  const voidCurrent = targetActor.system?.rings?.void?.value ?? 0;
  if (voidCurrent <= 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noVoidPoints"));
    return;
  }

  // Spend void point
  await targetActor.update({
    "system.rings.void.value": voidCurrent - 1
  });

  // Step 1: Reduce damage by Void Point (10 points)
  const afterVoid = Math.max(0, damage - 10);

  // Step 2: Apply armor reduction (calculated in prepareDerivedData)
  const armorReduction = targetActor.system?.armorTn?.reduction ?? 0;
  const finalDamage = Math.max(0, afterVoid - armorReduction);

  // Apply final damage
  const currentSuffered = targetActor.system?.suffered ?? 0;
  const newSuffered = currentSuffered + finalDamage;

  await targetActor.update({ "system.suffered": newSuffered });

  // Show notification with both reductions if armor applied
  if (armorReduction > 0 && finalDamage < afterVoid) {
    ui.notifications?.info(
      F("l5r4.ui.mechanics.wounds.woundsReducedWithArmor", {
        original: damage,
        afterVoid: afterVoid,
        reduction: armorReduction,
        final: finalDamage,
        name: targetActor.name
      })
    );
  } else {
    ui.notifications?.info(
      F("l5r4.ui.mechanics.wounds.woundsReducedApplied", {
        amount: finalDamage,
        name: targetActor.name
      })
    );
  }
}

/**
 * Registers chat message hook to handle damage button clicks
 */
export function registerChatDamageButtons() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    // Foundry v13 renderChatMessageHTML passes HTMLElement directly
    const element = html;

    // Apply wounds button
    const applyButton = element.querySelector("[data-action='apply-wounds']");
    if (applyButton) {
      applyButton.addEventListener("click", async event => {
        event.preventDefault();
        const damage = parseInt(event.currentTarget.dataset.damage) || 0;
        await applyWoundsToToken(damage);
      });
    }

    // Reduce with void button
    const reduceButton = element.querySelector("[data-action='reduce-wounds-void']");
    if (reduceButton) {
      reduceButton.addEventListener("click", async event => {
        event.preventDefault();
        const button = event.currentTarget;
        const damage = parseInt(button.dataset.damage) || 0;
        const actorId = button.dataset.actorId;
        await reduceAndApplyWounds(damage, actorId);
      });
    }
  });
}
