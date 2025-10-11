/**
 * @fileoverview L5R4 Game Mechanics Data
 * 
 * Contains game rules constants and mechanical data for L5R4 system.
 * Includes arrow modifiers, wound levels, and status effects.
 * 
 * **Responsibilities:**
 * - Define arrow damage modifiers
 * - Define NPC wound level progression
 * - Define status effects for token HUD
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 */

import { iconPath } from "./icons.js";

/**
 * Immutability helper alias.
 * Used to freeze configuration objects and prevent runtime modification.
 * @constant {typeof Object.freeze}
 */
const freeze = Object.freeze;

/**
 * Arrow damage modifiers keyed by arrow type.
 * Each entry defines bonus dice using L5R4's XkY notation:
 * - `r` (roll): Additional dice to roll
 * - `k` (keep): Additional dice to keep
 * 
 * Valid arrow types: armor, flesh, humming, rope, willow
 * Used for calculating damage bonuses based on arrow selection.
 * 
 * @type {Readonly<Record<string, {r: number, k: number}>>}
 * @example
 * // Flesh-cutter arrow adds +2k3 to damage
 * const fleshMod = ARROW_MODS.flesh; // {r: 2, k: 3}
 */
export const ARROW_MODS = freeze({
  armor:   { r: 1, k: 1 },
  flesh:   { r: 2, k: 3 },
  humming: { r: 0, k: 1 },
  rope:    { r: 1, k: 1 },
  willow:  { r: 2, k: 2 }
});

/**
 * Number of wound levels by NPC rank (1-8).
 * Direct mapping: rank N grants N wound levels (rank 3 = 3 wounds).
 * Determines wound track length based on NPC power level.
 * 
 * @constant {Readonly<Record<number, number>>}
 * @example
 * // Rank 5 NPC has 5 wound levels
 * const wounds = NPC_NUMBER_WOUND_LVLS[5]; // 5
 */
export const NPC_NUMBER_WOUND_LVLS = freeze({ 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 });

/**
 * Registered status effects for the system.
 * Includes combat stances and generic conditions for token HUD integration.
 * @constant {ReadonlyArray<{id: string, name: string, img: string}>}
 */
export const STATUS_EFFECTS = freeze([
  // Stances
  { id: "attackStance",      name: "l5r4.ui.mechanics.stances.attack",       img: iconPath("attack-stance.webp") },
  { id: "fullAttackStance",  name: "l5r4.ui.mechanics.stances.fullAttack",   img: iconPath("full-attack-stance.webp") },
  { id: "defenseStance",     name: "l5r4.ui.mechanics.stances.defense",      img: iconPath("defence-stance.webp") },
  { id: "fullDefenseStance", name: "l5r4.ui.mechanics.stances.fullDefense",  img: iconPath("full-defense-stance.webp") },
  { id: "centerStance",      name: "l5r4.ui.mechanics.stances.center",       img: iconPath("centered-stance.webp") },

  // Generic conditions
  { id: "blinded",   name: "EFFECT.blinded",   img: iconPath("blinded.webp") },
  { id: "dazed",     name: "EFFECT.dazed",     img: iconPath("dazed.webp") },
  { id: "dead",      name: "EFFECT.dead",      img: iconPath("dead.webp") },
  { id: "entangled", name: "EFFECT.entangled", img: iconPath("entangled.webp") },
  { id: "fasting",   name: "EFFECT.fasting",   img: iconPath("fasting.webp") },
  { id: "fatigued",  name: "EFFECT.fatigued",  img: iconPath("fatigue.webp") },
  { id: "grappled",  name: "EFFECT.grappled",  img: iconPath("grappled.webp") },
  { id: "mounted",   name: "EFFECT.mounted",   img: iconPath("mounted.webp") },
  { id: "prone",     name: "EFFECT.prone",     img: iconPath("prone.webp") },
  { id: "stunned",   name: "EFFECT.stunned",   img: iconPath("stunned.webp") }
]);
