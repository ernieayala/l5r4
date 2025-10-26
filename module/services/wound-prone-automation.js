/**
 * Wound-Prone Automation Service
 *
 * Automatically applies the Prone condition to actors when they reach maximum wounds
 * or enter the Down/Out wound levels. This reflects the character collapsing from
 * severe injuries per L5R4 combat rules.
 *
 * Key Responsibilities:
 * - Monitor actor wound state changes via updateActor hook
 * - Detect when actors reach max wounds (wounds.value <= 0)
 * - Detect when actors enter Down or Out wound levels
 * - Apply Prone status effect automatically if not already present
 * - Apply to both linked tokens and unlinked tokens
 *
 * L5R4 Game Rules Context:
 * When a character is severely wounded (Down or Out level), they typically collapse
 * to the ground. This automation applies the Prone condition to represent this,
 * imposing -10 Armor TN vs melee attacks and restricting movement/actions.
 *
 * Foundry VTT Integration:
 * - Hooks into updateActor to detect wound changes
 * - Creates ActiveEffect with "prone" status on actor and all linked tokens
 * - Checks existing effects to avoid duplicates
 *
 * @module services/wound-prone-automation
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../config/constants.js";
import { iconPath } from "../config/icons.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * Initialize the wound-prone automation service.
 *
 * Registers Foundry hook to monitor actor updates and automatically apply
 * the Prone condition when actors reach critical wound states.
 *
 * Called during system initialization before the game is ready.
 *
 * @function initializeWoundProneAutomation
 * @returns {void}
 */
export function initializeWoundProneAutomation() {
  Hooks.on("updateActor", onUpdateActor);
}

/**
 * Handle actor updates to detect critical wound states.
 *
 * Called automatically by Foundry whenever an actor is updated. Checks if
 * the update involved wound changes and applies Prone condition if the actor
 * has reached max wounds or Down/Out levels.
 *
 * Note: This hook fires after the actor update but before rendering, and
 * Foundry automatically calls prepareDerivedData() before this hook, so
 * wound levels are already recalculated when we check them.
 *
 * Detection Criteria:
 * - Actor has wounds.value <= 0 (at or past max wounds)
 * - Actor's current wound level is "down" or "out"
 *
 * Only applies Prone if:
 * - Actor does not already have Prone condition
 * - Actor is not already dead
 *
 * Applies to:
 * - Synthetic (unlinked) tokens: Effect only on specific token's actor
 * - Linked tokens: Effect on base actor (propagates to all tokens)
 *
 * @param {Actor} actor - The actor being updated
 * @param {Object} changes - The update delta containing changed properties
 * @param {Object} _options - Update options (unused)
 * @param {string} _userId - User who initiated the update (unused)
 * @returns {Promise<void>}
 * @private
 */
async function onUpdateActor(actor, changes, _options, _userId) {
  // Early return: Only process if wound-related fields changed
  if (!changes.system?.suffered && !changes.system?.wounds) {
    return;
  }

  // Early return: Skip if actor is invalid
  if (!actor?.system) {
    return;
  }

  const sys = actor.system;

  // Check if actor has the dead condition
  const isDead = actor.effects?.some(e => !e.disabled && e.statuses?.has("dead"));
  if (isDead) {
    return;
  }

  // Check if prone already exists (do this early to avoid unnecessary processing)
  const hasProne = actor.effects?.some(e => !e.disabled && e.statuses?.has("prone"));
  if (hasProne) {
    return;
  }

  // Determine if actor is at critical wound state
  const isAtMaxWounds = toInt(sys.wounds?.value) <= 0;

  // Check if actor is at Down or Out wound levels
  // Wound levels are recalculated during prepareDerivedData which runs before this hook
  let isDownOrOut = false;

  if (sys.woundLevels) {
    // Check if Down or Out levels are marked as current
    isDownOrOut = sys.woundLevels.down?.current === true || sys.woundLevels.out?.current === true;
  }

  // Only apply prone if at critical wound state
  if (!isAtMaxWounds && !isDownOrOut) {
    return;
  }

  // Apply Prone condition
  await applyProneCondition(actor);
}

/**
 * Apply Prone condition to an actor.
 *
 * Creates an ActiveEffect with "prone" status on the actor. The effect will
 * automatically apply the mechanical penalties defined in condition-effects.js:
 * - -10 Armor TN vs melee attacks
 * - -2k0 attack penalties
 * - Movement and stance restrictions
 *
 * Effect Naming:
 * Uses localized "Auto: Prone" name to indicate it was automatically applied
 * rather than manually toggled by GM/player.
 *
 * Error Handling:
 * Logs errors but does not throw to avoid disrupting other update logic.
 * Shows error notification to user if effect creation fails.
 *
 * @param {Actor} actor - The actor to apply Prone condition to
 * @returns {Promise<void>}
 * @private
 */
async function applyProneCondition(actor) {
  try {
    const proneName = game.i18n.localize("EFFECT.prone");
    const autoPrefix = game.i18n.localize("l5r4.ui.common.auto") || "Auto";

    await actor.createEmbeddedDocuments("ActiveEffect", [
      {
        name: `${autoPrefix}: ${proneName}`,
        icon: iconPath("prone.webp"),
        statuses: ["prone"],
        flags: {
          [SYS_ID]: {
            autoApplied: true,
            appliedReason: "maxWounds"
          }
        }
      }
    ]);
  } catch (err) {
    console.error(`${SYS_ID} | Failed to apply Prone condition to ${actor.name}`, err);
    ui.notifications?.error(
      game.i18n.format("l5r4.ui.notifications.conditionApplyFailed", {
        condition: game.i18n.localize("EFFECT.prone"),
        actor: actor.name
      })
    );
  }
}
