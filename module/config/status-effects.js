/**
 * @module config/status-effects
 * @description Defines all available status effects for the L5R4 system.
 *
 * Status effects include combat stances (Attack, Defense, Center, etc.) and
 * conditions (Blinded, Stunned, Prone, etc.). These integrate with Foundry's
 * token status effect system and appear in the combat tracker.
 *
 * Each effect requires:
 * - id: Unique identifier for programmatic access
 * - name: Localization key for display name
 * - img: Icon path for visual representation
 *
 * @see {@link https://foundryvtt.com/api/classes/client.TokenDocument.html#effects}
 */

import { iconPath } from "./icons.js";

const freeze = Object.freeze;

/**
 * Status effects configuration for L5R4 system.
 *
 * Defines combat stances and conditions that can be applied to tokens.
 * Effects are frozen to prevent runtime modification.
 *
 * @type {ReadonlyArray<{id: string, name: string, img: string}>}
 * @constant
 *
 * @property {string} id - Unique identifier for the status effect
 * @property {string} name - Localization key for the effect name
 * @property {string} img - Path to the effect icon image
 *
 * @example
 * // Apply attack stance to a token
 * await token.toggleEffect("attackStance");
 *
 * @example
 * // Check if token has full defense stance
 * const hasFullDefense = token.effects.some(e => e.id === "fullDefenseStance");
 */
export const STATUS_EFFECTS = freeze([
  {
    id: "attackStance",
    name: "l5r4.ui.mechanics.stances.attack",
    img: iconPath("attack-stance.webp")
  },
  {
    id: "fullAttackStance",
    name: "l5r4.ui.mechanics.stances.fullAttack",
    img: iconPath("full-attack-stance.webp")
  },
  {
    id: "defenseStance",
    name: "l5r4.ui.mechanics.stances.defense",
    img: iconPath("defence-stance.webp")
  },
  {
    id: "fullDefenseStance",
    name: "l5r4.ui.mechanics.stances.fullDefense",
    img: iconPath("full-defense-stance.webp")
  },
  {
    id: "centerStance",
    name: "l5r4.ui.mechanics.stances.center",
    img: iconPath("centered-stance.webp")
  },

  { id: "blinded", name: "EFFECT.blinded", img: iconPath("blinded.webp") },
  { id: "concentration", name: "EFFECT.concentration", img: iconPath("concentration.webp") },
  { id: "dazed", name: "EFFECT.dazed", img: iconPath("dazed.webp") },
  { id: "dead", name: "EFFECT.dead", img: iconPath("dead.webp") },
  { id: "entangled", name: "EFFECT.entangled", img: iconPath("entangled.webp") },
  { id: "fasting", name: "EFFECT.fasting", img: iconPath("fasting.webp") },
  { id: "fatigued", name: "EFFECT.fatigued", img: iconPath("fatigue.webp") },
  { id: "feared", name: "EFFECT.feared", img: iconPath("fear.webp") },
  { id: "grappled", name: "EFFECT.grappled", img: iconPath("grappled.webp") },
  { id: "guarded", name: "EFFECT.guarded", img: iconPath("guarded.webp") },
  { id: "guarding", name: "EFFECT.guarding", img: iconPath("guarding.webp") },
  { id: "mounted", name: "EFFECT.mounted", img: iconPath("mounted.webp") },
  { id: "prone", name: "EFFECT.prone", img: iconPath("prone.webp") },
  { id: "stunned", name: "EFFECT.stunned", img: iconPath("stunned.webp") }
]);
