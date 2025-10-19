/**
 * @fileoverview Static mock data for tests
 */

/**
 * Sample character trait values
 */
export const SAMPLE_TRAITS = {
  low: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
  medium: { sta: 3, wil: 4, str: 3, per: 3, ref: 4, awa: 3, agi: 4, int: 3 },
  high: { sta: 5, wil: 6, str: 5, per: 5, ref: 6, awa: 5, agi: 6, int: 5 }
};

/**
 * Sample ring values
 */
export const SAMPLE_RINGS = {
  low: { earth: 2, air: 2, fire: 2, water: 2, void: { rank: 2 } },
  medium: { earth: 3, air: 3, fire: 3, water: 3, void: { rank: 3 } },
  high: { earth: 5, air: 5, fire: 5, water: 5, void: { rank: 5 } }
};

/**
 * Wound level data
 */
export const WOUND_LEVELS = [
  'healthy',
  'nicked',
  'grazed',
  'hurt',
  'injured',
  'crippled',
  'down',
  'out'
];

/**
 * Standard insight rank thresholds
 */
export const INSIGHT_THRESHOLDS = {
  1: 0,
  2: 150,
  3: 175,
  4: 200,
  5: 225,
  6: 250,
  7: 275,
  8: 300
};

/**
 * Common skill names
 */
export const COMMON_SKILL_NAMES = [
  'Kenjutsu',
  'Iaijutsu',
  'Kyujutsu',
  'Defense',
  'Etiquette',
  'Sincerity',
  'Courtier',
  'Investigation',
  'Lore: History',
  'Meditation'
];

/**
 * Stance types
 */
export const STANCES = [
  'attack',
  'defense',
  'fullAttack',
  'fullDefense',
  'center'
];
