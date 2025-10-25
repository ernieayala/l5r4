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
 * @module hooks/chat-damage-buttons
 * @requires Foundry v13+
 */

import { T, F } from "../utils/localization.js";

/**
 * Applies wounds to the first selected token
 *
 * @param {number} damage - Amount of damage to apply
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

  const currentSuffered = actor.system?.suffered ?? 0;
  const newSuffered = currentSuffered + damage;

  await actor.update({ "system.suffered": newSuffered });

  ui.notifications?.info(
    F("l5r4.ui.mechanics.wounds.woundsApplied", {
      amount: damage,
      name: actor.name
    })
  );
}

/**
 * Reduces damage with Void Point then applies wounds to selected token
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

  // Reduce damage by 10 (minimum 0)
  const reducedDamage = Math.max(0, damage - 10);

  // Apply reduced damage
  const currentSuffered = targetActor.system?.suffered ?? 0;
  const newSuffered = currentSuffered + reducedDamage;

  await targetActor.update({ "system.suffered": newSuffered });

  ui.notifications?.info(
    F("l5r4.ui.mechanics.wounds.woundsReducedApplied", {
      amount: reducedDamage,
      name: targetActor.name
    })
  );
}

/**
 * Registers chat message hook to handle damage button clicks
 */
export function registerChatDamageButtons() {
  Hooks.on("renderChatMessage", (message, html) => {
    // Foundry v13 passes array of HTMLElements
    const element = html[0] || html;

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
