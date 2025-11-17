/**
 * @file L5R4 game mechanics data and configuration
 * @module config/game-data
 *
 * Provides immutable game rule data for Legend of the Five Rings 4th Edition.
 * Includes arrow modifiers, wound levels, status effects, and skill emphases.
 * All data structures are frozen to prevent runtime modification.
 *
 * @see {@link https://foundryvtt.com/api/classes/client.ActiveEffect.html|Foundry Active Effects}
 */

import { iconPath } from "./icons.js";

const freeze = Object.freeze;

/**
 * Arrow type damage modifiers for ranged combat.
 * Each arrow type provides roll (r) and keep (k) bonuses to damage.
 *
 * @type {Object<string, {r: number, k: number}>}
 * @constant
 * @property {Object} armor - Armor-piercing arrows (+1r1k)
 * @property {Object} flesh - Flesh-cutter arrows (+2r3k)
 * @property {Object} humming - Humming bulb arrows (+0r1k)
 * @property {Object} rope - Rope-cutter arrows (+1r1k)
 * @property {Object} willow - Willow leaf arrows (+2r2k)
 *
 * @example
 * // Apply flesh-cutter arrow bonus:
 * // damage.r += ARROW_MODS.flesh.r; // +2r
 * // damage.k += ARROW_MODS.flesh.k; // +3k
 */
export const ARROW_MODS = freeze({
  armor: { r: 1, k: 1 },
  flesh: { r: 2, k: 3 },
  humming: { r: 0, k: 1 },
  rope: { r: 1, k: 1 },
  willow: { r: 2, k: 2 }
});

/**
 * NPC wound level configuration options.
 * Maps number of wound levels to their count for simplified NPC tracking.
 *
 * @type {Object<number, number>}
 * @constant
 * @example
 * // NPC with 3 wound levels:
 * // const woundLevels = NPC_NUMBER_WOUND_LVLS[3]; // 3
 */
export const NPC_NUMBER_WOUND_LVLS = freeze({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 });

/**
 * Status effects for combat stances and conditions.
 * Used by Foundry's Active Effect system for token status icons.
 * First group: Combat stances (Attack, Full Attack, Defense, Full Defense, Center)
 * Second group: General conditions (blinded, stunned, etc.)
 *
 * @type {Array<{id: string, name: string, img: string}>}
 * @constant
 * @property {string} id - Unique identifier for the status effect
 * @property {string} name - Localization key for effect name
 * @property {string} img - Path to status icon image
 *
 * @example
 * // Apply attack stance to token:
 * // token.toggleEffect(STATUS_EFFECTS.find(e => e.id === "attackStance"));
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

/**
 * Official skill emphases from L5R4 core rulebook and supplements.
 * Used for skill specialization validation and autocomplete suggestions.
 * Emphases provide mechanical bonuses when specific conditions are met.
 *
 * @type {Array<string>}
 * @constant
 *
 * @example
 * // Validate emphasis selection:
 * // const isOfficial = OFFICIAL_EMPHASES.includes(userInput);
 *
 * @example
 * // Provide autocomplete options:
 * // <datalist id="emphases">
 * //   {OFFICIAL_EMPHASES.map(e => `<option value="${e}">`)}
 * // </datalist>
 */
export const OFFICIAL_EMPHASES = freeze([
  "Aiguchi",
  "Ambush",
  "Antidotes",
  "Appraisal",
  "Artwork",
  "Assessment",
  "Astrology",
  "Bisento",
  "Blowgun",
  "Bo",
  "Bribery",
  "Bullying",
  "Bureaucracy",
  "Cipher",
  "Clan",
  "Climbing",
  "Conceal",
  "Construction",
  "Control",
  "Conversation",
  "Courtesy",
  "Dai Tsuchi",
  "Dai-kyu",
  "Deceit",
  "Disease",
  "Documents",
  "Dogs",
  "Escape",
  "Falcons",
  "Fasting",
  "Focus",
  "Gaijin Riding Horse",
  "Gender",
  "Gossip",
  "Grappling",
  "Han-kyu",
  "Herbalism",
  "High Rokugani",
  "Honesty",
  "Horses",
  "Improvised Weapons",
  "Importune",
  "Interrogation",
  "Jo",
  "Jitte",
  "Kama",
  "Katana",
  "Kawaru",
  "Knot-work",
  "Kumade",
  "Kusarigama",
  "Kyoketsu-shogi",
  "Lance",
  "Machi-kanshisha",
  "Mai Chong",
  "Manipulation",
  "Manrikikusari",
  "Martial Arts",
  "Masakari",
  "Mass Combat",
  "Mathematics",
  "Nage-yari",
  "Nagamaki",
  "Naginata",
  "Navigation",
  "Ninja-to",
  "No-dachi",
  "Non-Humans",
  "Notice",
  "Nunchaku",
  "Ono",
  "Parangu",
  "Personal Seals",
  "Pick Pocket",
  "Poison",
  "Prestidigitation",
  "Profession",
  "Rhetoric",
  "Rokugani Pony",
  "Running",
  "Sai",
  "Sang Kauw",
  "Sasumata",
  "Scimitar",
  "Search",
  "Seduction",
  "Shadowing",
  "Shuriken",
  "Siege",
  "Skirmish",
  "Sneaking",
  "Sodegarami",
  "Spell Casting",
  "Spell Research",
  "Survival",
  "Swimming",
  "Tanto",
  "Tetsubo",
  "Throwing",
  "Tonfa",
  "Torture",
  "Tracking",
  "Trailblazing",
  "Tsubute",
  "Utaku Steed",
  "Varies by type",
  "Void Recovery",
  "Wakizashi",
  "Wound Treatment",
  "Yari",
  "Yumi"
]);
