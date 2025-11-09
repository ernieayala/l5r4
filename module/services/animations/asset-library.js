/**
 * JB2A Asset Library for L5R4 Stances and Conditions
 *
 * Maps L5R4 stance and condition IDs to JB2A animation asset paths.
 * Provides fallback behavior when JB2A is not installed.
 *
 * Key Responsibilities:
 * - Map stance IDs to appropriate JB2A visual effects
 * - Map condition IDs to appropriate JB2A visual effects
 * - Provide animation configuration (scale, duration, opacity, etc.)
 * - Support both free and paid JB2A versions with fallbacks
 *
 * JB2A Integration:
 * - Free version: Limited asset library (shields, basic effects)
 * - Paid version: Full asset library (all effects)
 * - Fallback: No animation if asset not found
 *
 * Animation Design Philosophy:
 * - Stances: Persistent auras/fields representing combat posture
 * - Conditions: Visual indicators of status effects
 * - Subtle and non-intrusive (avoid blocking gameplay)
 * - Color-coded by Ring association or effect type
 *
 * @module services/animations/asset-library
 * @requires Foundry VTT v13+
 * @see {@link https://library.jb2a.com/|JB2A Asset Library}
 */

/**
 * @typedef {Object} AnimationConfig
 * @property {string} file - JB2A asset path (e.g., "jb2a.shield.01.intro.blue")
 * @property {number} [scale=1.0] - Scale multiplier for the effect
 * @property {number} [opacity=0.8] - Opacity (0.0-1.0)
 * @property {boolean} [persist=true] - Whether effect persists or plays once
 * @property {number} [duration=null] - Duration in milliseconds (null = infinite for persistent)
 * @property {string} [attachTo="tokens"] - What to attach to ("tokens", "template", etc.)
 * @property {boolean} [belowTokens=false] - Render below tokens
 * @property {string} [color=null] - Color tint (hex string)
 */

/**
 * Stance animation configurations.
 * Maps stance IDs to JB2A asset paths and animation settings.
 *
 * L5R4 Stances (Ring associations):
 * - Attack: Water (fluid, versatile) - Blue flowing energy
 * - Full Attack: Fire (aggressive, consuming) - Red/orange flames
 * - Defense: Air (reactive, adaptable) - White/cyan shield
 * - Full Defense: Earth (unmoving, solid) - Green/brown barrier
 * - Center: Void (focused energy) - Purple/void energy
 *
 * @constant {Object.<string, AnimationConfig>}
 */
export const STANCE_ANIMATIONS = Object.freeze({
  fullAttackStance: {
    file: "jb2a.token_border.circle.spinning.blue.004",
    scale: 0.6,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  defenseStance: {
    file: "jb2a.markers.shield.green.01",
    scale: 0.4,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  fullDefenseStance: {
    file: "jb2a.markers.shield_rampart.loop.01.orange",
    scale: 0.4,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  centerStance: {
    file: "jb2a.markers.bubble.loop.blue",
    scale: 0.3,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  }
});

/**
 * Condition animation configurations.
 * Maps condition IDs to JB2A asset paths and animation settings.
 *
 * L5R4 Conditions (visual indicators):
 * - Blinded: Dark overlay/blind effect
 * - Dazed: Swirling stars/confusion
 * - Entangled: Binding/rope effects
 * - Fatigued: Dim/exhausted aura
 * - Feared: Dark fear aura
 * - Grappled: Binding/restraint effect
 * - Guarded: Protective shield (ally protecting)
 * - Guarding: Defensive stance (protecting ally)
 * - Prone: Ground marker
 * - Stunned: Impact/stun stars
 *
 * @constant {Object.<string, AnimationConfig>}
 */
export const CONDITION_ANIMATIONS = Object.freeze({
  concentration: {
    file: "jb2a.markers.light.nopulse.blue",
    scale: 0.6,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  dazed: {
    file: "jb2a.markers.stun.purple.01",
    scale: 0.5,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  entangled: {
    file: "jb2a.swirling_leaves.loop.01.green.0",
    scale: 0.5,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  fatigued: {
    file: "jb2a.sleep.symbol.dark_pink",
    scale: 0.5,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  feared: {
    file: "jb2a.markers.fear.dark_purple.01",
    scale: 0.5,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  grappled: {
    file: "jb2a.markers.chain.standard.loop.02.red",
    scale: 0.6,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  guarded: {
    file: "jb2a.markers.shield.green.02",
    scale: 0.5,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  guarding: {
    file: "jb2a.markers.shield_cracked.purple.02",
    scale: 0.5,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  },

  stunned: {
    file: "jb2a.markers.chain.spectral_standard.loop.02.blue",
    scale: 0.6,
    opacity: 1,
    persist: true,
    duration: null,
    attachTo: "tokens",
    belowTokens: false
  }
});

/**
 * Get animation configuration for a stance ID.
 *
 * @param {string} stanceId - The stance ID (e.g., "fullAttackStance")
 * @returns {AnimationConfig|null} Animation config or null if not found
 */
export function getStanceAnimation(stanceId) {
  return STANCE_ANIMATIONS[stanceId] ?? null;
}

/**
 * Get animation configuration for a condition ID.
 *
 * @param {string} conditionId - The condition ID (e.g., "blinded")
 * @returns {AnimationConfig|null} Animation config or null if not found
 */
export function getConditionAnimation(conditionId) {
  return CONDITION_ANIMATIONS[conditionId] ?? null;
}

/**
 * Check if JB2A module is installed and active.
 *
 * @returns {boolean} True if JB2A is available
 */
export function isJB2AAvailable() {
  return game.modules.get("JB2A_DnD5e")?.active ?? false;
}

/**
 * Check if Sequencer module is installed and active.
 *
 * @returns {boolean} True if Sequencer is available
 */
export function isSequencerAvailable() {
  return game.modules.get("sequencer")?.active ?? false;
}
