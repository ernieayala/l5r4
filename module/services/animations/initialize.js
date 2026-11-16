/**
 * @module services/animations/initialize
 * @description Starts the visual animation system: registers the animation hooks when Sequencer and JB2A are both
 * active, and otherwise warns which module is missing and leaves the system running without animations.
 */

import { registerAnimationHooks } from "./hooks.js";
import { isSequencerAvailable, isJb2aAvailable } from "./asset-library.js";

/**
 * Initialize the animation system.
 *
 * Checks for required modules (Sequencer, JB2A) and registers animation hooks
 * if both are available. Does not register hooks if modules are missing.
 *
 * @returns {void}
 */
export function registerAnimations() {
  // Check module availability
  const hasSequencer = isSequencerAvailable();
  const hasJb2a = isJb2aAvailable();

  if (!hasSequencer) {
    console.warn(
      "L5R4 | Sequencer module not found. Visual animations disabled. " +
        "Install Sequencer from: https://foundryvtt.com/packages/sequencer"
    );
  }

  if (!hasJb2a) {
    console.warn(
      "L5R4 | JB2A module not found. Visual animations disabled. " +
        "Install JB2A (free) from: https://foundryvtt.com/packages/JB2A_DnD5e"
    );
  }

  // Only register hooks if both modules are available
  if (!hasSequencer || !hasJb2a) {
    return;
  }

  // Register animation hooks
  registerAnimationHooks();
}
