/**
 * @module config/reference-data
 * @description Reference data for L5R4 skill emphases and validation constraints.
 *
 * Skill Emphases represent specialized training within a broader skill.
 * For example, a character with Kenjutsu 5 might have the "Katana" emphasis,
 * granting them a bonus when using that specific weapon.
 *
 * This module provides:
 * - Official emphasis names from L5R4 rulebooks
 * - Validation constraints for custom emphases
 * - Reference data for character creation and advancement
 *
 * All arrays are frozen to prevent runtime modification.
 */

const freeze = Object.freeze;

/**
 * Maximum character length for custom skill emphasis names.
 * Enforces reasonable length for UI display and data storage.
 *
 * @type {number}
 * @constant
 */
export const MAX_EMPHASIS_LENGTH = 100;

/**
 * Minimum character length for custom skill emphasis names.
 * Prevents empty or whitespace-only emphasis entries.
 *
 * @type {number}
 * @constant
 */
export const MIN_EMPHASIS_LENGTH = 1;

/**
 * Official skill emphases from L5R4 rulebooks.
 *
 * Comprehensive list of canonical emphases for skills, weapons, animals,
 * and specializations. Used for autocomplete suggestions and validation.
 * Players can create custom emphases, but these represent the official
 * options from core and supplement books.
 *
 * @type {ReadonlyArray<string>}
 * @constant
 *
 * @example
 * // Check if emphasis is official
 * const isOfficial = OFFICIAL_EMPHASES.includes("Katana"); // true
 *
 * @example
 * // Provide autocomplete suggestions
 * const suggestions = OFFICIAL_EMPHASES.filter(e =>
 *   e.toLowerCase().startsWith(userInput.toLowerCase())
 * );
 */
export const OFFICIAL_EMPHASES = freeze([
  "Aiguchi",
  "Ambush",
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
  "Control",
  "Conversation",
  "Courtesy",
  "Dai Tsuchi",
  "Dai-kyu",
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
  "Kusarigama",
  "Kyoketsu-shogi",
  "Manipulation",
  "Manrikikusari",
  "Martial Arts",
  "Masakari",
  "Mass Combat",
  "Mathematics",
  "Naginata",
  "Navigation",
  "Ninja-to",
  "No-dachi",
  "Notice",
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
  "Scimitar",
  "Search",
  "Seduction",
  "Shadowing",
  "Shuriken",
  "Skirmish",
  "Sneaking",
  "Spell Casting",
  "Spell Research",
  "Survival",
  "Swimming",
  "Tanto",
  "Tetsubo",
  "Throwing",
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
