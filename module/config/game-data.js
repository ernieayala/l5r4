/**
 * Game Data Constants
 * Defines gameplay mechanics data for the Legend of the Five Rings 4th Edition system.
 * Contains arrow type modifiers, NPC wound level configuration, and status effects
 * (stances and conditions) from the core L5R4 rulebook.
 *
 * This module provides frozen (immutable) data structures that implement:
 * - Arrow type damage modifiers for archery system (Equipment rules)
 * - NPC wound level count lookup for simplified NPC stat blocks
 * - Combat stances from Stances/Actions/Maneuvers rules
 * - Conditional status effects from Dueling/Grappling/Conditions rules
 *
 * Foundry VTT Integration:
 * - STATUS_EFFECTS registers with CONFIG.statusEffects for token status icons
 * - Uses Foundry's standard status effect object format {id, name, img}
 *
 * @module config/game-data
 * @requires Foundry VTT v13+
 */

import { iconPath } from "./icons.js";

// Alias for conciseness - all game data is frozen for immutability
const freeze = Object.freeze;

/**
 * Arrow type damage modifiers for archery system.
 * Implements the specialized arrow types from Equipment rules.
 *
 * Archery damage calculation: (Bow Strength + arrow.r)k(arrow.k)
 * - Bow adds its Strength to rolled dice (r)
 * - Arrow determines both rolled (r) and kept (k) dice
 *
 * Arrow Types:
 * - armor: Armor-Piercing arrows ignore armor TN bonus
 * - flesh: Flesh Cutter arrows for devastating unarmored damage (double armor penalty, ½ range)
 * - humming: Humming Bulb arrows for signaling (loud whistle, minimal damage)
 * - rope: Rope Cutter arrows for cutting ropes/banners (2 Free Raises vs objects, ½ range)
 * - willow: Willow Leaf (Ya) standard arrows used for general archery
 *
 * @constant {Object.<string, ArrowModifier>}
 * @property {ArrowModifier} armor - Armor-Piercing (1k1)
 * @property {ArrowModifier} flesh - Flesh Cutter (2k3)
 * @property {ArrowModifier} humming - Humming Bulb (0k1)
 * @property {ArrowModifier} rope - Rope Cutter (1k1)
 * @property {ArrowModifier} willow - Willow Leaf/Ya (2k2)
 * @readonly
 */

/**
 * @typedef {Object} ArrowModifier
 * @property {number} r - Rolled dice (added to bow strength for total rolled dice)
 * @property {number} k - Kept dice (determines which dice are kept from the roll)
 */
export const ARROW_MODS = freeze({
  armor: { r: 1, k: 1 },
  flesh: { r: 2, k: 3 },
  humming: { r: 0, k: 1 },
  rope: { r: 1, k: 1 },
  willow: { r: 2, k: 2 }
});

/**
 * NPC wound level count lookup by rank.
 * Maps NPC rank (1-8) to number of wound levels for simplified stat blocks.
 *
 * NPCs in L5R4 can use simplified wound tracking instead of the full 8-level
 * Healthy/Nicked/Grazed/Hurt/Injured/Crippled/Down/Out progression.
 * This lookup determines how many wound levels an NPC of a given rank uses.
 *
 * Used by wound-config.js for NPC Actor sheets to configure wound level display.
 *
 * @constant {Object.<number, number>}
 * @readonly
 */
export const NPC_NUMBER_WOUND_LVLS = freeze({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 });

/**
 * Status effects for combat stances and conditional states.
 * Implements the five combat stances from Stances/Actions/Maneuvers rules
 * and ten conditional effects from Dueling/Grappling/Conditions rules.
 *
 * Combat Stances (Ring-based combat postures):
 * - attackStance: Water Ring - versatile standard combat stance
 * - fullAttackStance: Fire Ring - aggressive +2k1 attack, -10 Armor TN
 * - defenseStance: Air Ring - adds Air Ring + Defense Skill to Armor TN
 * - fullDefenseStance: Earth Ring - Defense/Reflexes roll added to Armor TN
 * - centerStance: Void Ring - forfeit actions for +1k1 + Void bonus next round
 *
 * Conditional Effects (mechanical penalties/restrictions):
 * - blinded: -3k3 ranged, -1k1 melee, reduced Armor TN and movement
 * - dazed: -3k0 all actions, limited stances, Earth roll to recover
 * - dead: Character is deceased
 * - entangled: Cannot act except Strength roll to break free
 * - fasting: Void recovery disabled, escalating TN penalties, eventual death
 * - fatigued: +5 TN penalties (stacking), Willpower rolls to avoid sleep
 * - feared: -XkO all rolls (X = Fear Rank), lasts until encounter end
 * - grappled: Armor TN reduced to 5 + armor bonus
 * - mounted: +1k0 attack vs unmounted/lower targets
 * - prone: -10 Armor TN vs melee, movement/attack restrictions
 * - stunned: No actions, Armor TN 5 + armor, Earth roll to recover
 *
 * Foundry VTT Integration:
 * Registered to CONFIG.statusEffects during system initialization.
 * Enables token status icon overlay system for visual combat state tracking.
 *
 * @constant {Array<StatusEffectConfig>}
 * @readonly
 */

/**
 * @typedef {Object} StatusEffectConfig
 * @property {string} id - Unique identifier for the status effect
 * @property {string} name - Localized name key for display (e.g., "l5r4.ui.mechanics.stances.attack")
 * @property {string} img - Path to status effect icon image
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
  { id: "dazed", name: "EFFECT.dazed", img: iconPath("dazed.webp") },
  { id: "dead", name: "EFFECT.dead", img: iconPath("dead.webp") },
  { id: "entangled", name: "EFFECT.entangled", img: iconPath("entangled.webp") },
  { id: "fasting", name: "EFFECT.fasting", img: iconPath("fasting.webp") },
  { id: "fatigued", name: "EFFECT.fatigued", img: iconPath("fatigue.webp") },
  { id: "feared", name: "EFFECT.feared", img: iconPath("disadvantage.webp") },
  { id: "grappled", name: "EFFECT.grappled", img: iconPath("grappled.webp") },
  { id: "mounted", name: "EFFECT.mounted", img: iconPath("mounted.webp") },
  { id: "prone", name: "EFFECT.prone", img: iconPath("prone.webp") },
  { id: "stunned", name: "EFFECT.stunned", img: iconPath("stunned.webp") }
]);
