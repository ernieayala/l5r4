/**
 * @module services/combat/legacy-damage
 * @description The Apply Wounds and Reduce with Void buttons on damage cards posted before 4.0.0, which carry their
 * damage in the HTML. Either button applies the damage to the first selected token. Reduce with Void first spends one
 * of the target's Void Points for 10 fewer Wounds, declared before the damage is applied. The equipped armor's
 * Reduction then lowers what is left. Neither step takes the damage below 0. A `roll` message's damage goes through
 * module/services/combat/damage.js. module/hooks/register-all.js wires the binder.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/73_armor.md, p.198
 */
import { T, F } from "../../utils/localization.js";
import { buildVoidUseUpdate, warnVoidLimit } from "../effects/uses.js";

/**
 * Wire the damage buttons of a card posted before 4.0.0, which carries its damage in the HTML.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindLegacyDamageCard(message, html) {
  if (message.type === "roll") {
    return;
  }
  // renderChatMessageHTML passes an HTMLElement, not jQuery
  bindDebouncedClick(html.querySelector("[data-action='apply-wounds']"), event =>
    applyWoundsToToken(parseInt(event.currentTarget.dataset.damage) || 0)
  );
  bindDebouncedClick(html.querySelector("[data-action='reduce-wounds-void']"), event => {
    const button = event.currentTarget;
    return applyWoundsWithVoid(parseInt(button.dataset.damage) || 0, button.dataset.actorId);
  });
}

/**
 * Wire a card button's click, ignored while the click before it is still being handled.
 * @param {HTMLElement|null} button - The button, when the card has it
 * @param {function(MouseEvent): Promise<void>} onClick - What the click does
 */
function bindDebouncedClick(button, onClick) {
  if (!button) {
    return;
  }
  let isProcessing = false;
  button.addEventListener("click", async event => {
    event.preventDefault();

    // Debounce protection: prevent multiple simultaneous clicks
    if (isProcessing) {
      return;
    }
    isProcessing = true;

    try {
      await onClick(event);
    } finally {
      isProcessing = false;
    }
  });
}

/**
 * The actor of the first selected token, when the user may change it; otherwise a warning and null.
 * @returns {Actor|null}
 */
function validateSelectedActor() {
  const tokens = canvas.tokens?.controlled ?? [];

  if (tokens.length === 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noTokenSelected"));
    return null;
  }

  const token = tokens[0];
  const actor = token.actor;

  if (!actor) {
    ui.notifications?.warn(T("l5r4.ui.notifications.tokenNoActor"));
    return null;
  }

  // Permission check: Only owner or GM can apply wounds
  if (!actor.isOwner && !game?.user?.isGM) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  return actor;
}

/**
 * Applies wounds to the first selected token, less the Reduction of the armor the actor wears.
 * game-rules/73_armor.md, p.198
 * @param {number} damage - Amount of damage to apply before armor reduction
 * @returns {Promise<void>}
 */
async function applyWoundsToToken(damage) {
  const actor = validateSelectedActor();
  if (!actor) {
    return;
  }

  // Get armor reduction from actor's equipped armor (calculated in prepareDerivedData)
  const armorReduction = actor.system?.armorTn?.reduction ?? 0;

  // Apply armor reduction per L5R4 rules (minimum 0 damage)
  const reducedDamage = Math.max(0, damage - armorReduction);

  // The stored value, not the prepared one, so an Active Effect on Wounds is never written into storage (B6)
  const newSuffered = actor._source.system.suffered + reducedDamage;

  await actor.update({ "system.suffered": newSuffered });

  // Show appropriate notification based on whether armor reduced damage
  if (armorReduction > 0 && reducedDamage < damage) {
    ui.notifications?.info(
      F("l5r4.ui.mechanics.wounds.appliedWithArmor", {
        original: damage,
        reduction: armorReduction,
        final: reducedDamage,
        name: actor.name
      })
    );
  } else {
    ui.notifications?.info(
      F("l5r4.ui.mechanics.wounds.applied", {
        amount: reducedDamage,
        name: actor.name
      })
    );
  }
}

/**
 * Reduces damage with Void Point then applies wounds to selected token.
 *
 * The Void Point removes 10 Wounds first, then the armor's Reduction lowers the rest; the final damage is at least 0.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/73_armor.md, p.198
 * @param {number} damage - Original damage amount
 * @param {string} _actorId - ID of actor who can spend void
 * @returns {Promise<void>}
 */
async function applyWoundsWithVoid(damage, _actorId) {
  const targetActor = validateSelectedActor();
  if (!targetActor) {
    return;
  }

  // Check if target has void points
  const voidCurrent = targetActor.system?.rings?.void?.value ?? 0;
  if (voidCurrent <= 0) {
    ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noVoidPoints"));
    return;
  }

  // Step 1: Reduce damage by Void Point (10 points)
  const afterVoid = Math.max(0, damage - 10);

  // Step 2: Apply armor reduction (calculated in prepareDerivedData)
  const armorReduction = targetActor.system?.armorTn?.reduction ?? 0;
  const finalDamage = Math.max(0, afterVoid - armorReduction);

  // Apply final damage and spend void point in single atomic update. Both start from the stored values, so an
  // Active Effect on Void Points or Wounds is never written into storage (B6).
  const stored = targetActor._source.system;

  warnVoidLimit(targetActor);
  await targetActor.update({
    "system.rings.void.value": stored.rings.void.value - 1,
    "system.suffered": stored.suffered + finalDamage,
    ...buildVoidUseUpdate(targetActor)
  });

  ui.notifications?.info(
    formatVoidReducedWounds(targetActor.name, { damage, afterVoid, armorReduction, finalDamage })
  );
}

/**
 * The notification for wounds reduced with a Void Point: both reductions when the armor lowered the damage, the
 * Wounds applied otherwise.
 * @param {string} name - The damaged actor's name
 * @param {{damage: number, afterVoid: number, armorReduction: number, finalDamage: number}} amounts - The damage
 *   before, after the Void Point, the armor's Reduction, and the final damage
 * @returns {string}
 */
function formatVoidReducedWounds(name, { damage, afterVoid, armorReduction, finalDamage }) {
  if (armorReduction > 0 && finalDamage < afterVoid) {
    return F("l5r4.ui.mechanics.wounds.reducedWithArmor", {
      original: damage,
      afterVoid: afterVoid,
      reduction: armorReduction,
      final: finalDamage,
      name
    });
  }
  return F("l5r4.ui.mechanics.wounds.reducedApplied", { amount: finalDamage, name });
}
