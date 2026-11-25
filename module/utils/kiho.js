/**
 * @module utils/kiho
 * @description Who may learn a kiho and at what price, and a monk's kiho against what the Monk Schools allow, which
 * the XP manager shows beside the kiho's XP (module/utils/xp-ledger.js prices them).
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * game-rules/87_kiho.md, p.261, 266
 */

import { KIHO_ACCESS_TYPES } from "../config/localization.js";

/**
 * How a School lets its student learn kiho (Ernie's ruling, #159): as a Brotherhood monk, through another Monk School
 * (the Togashi Tattooed Order), as a shugenja, as a ninja where the campaign allows, or not at all, the most open
 * first.
 * game-rules/87_kiho.md, p.266
 * @type {ReadonlyArray<string>}
 */
const KIHO_ACCESS = Object.freeze(Object.keys(KIHO_ACCESS_TYPES));

/**
 * Each kind of buyer's price, as a multiple of the kiho's Mastery Level.
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * game-rules/87_kiho.md, p.266
 */
const KIHO_PRICE_FACTOR = Object.freeze({ brotherhood: 1, monk: 1.5, shugenja: 2, ninja: 2 });

/**
 * A School's kiho access: the one its `kihoAccess` names, else what its data shows, a Brotherhood Monk School for one
 * that gives starting kiho, a shugenja School for one marked so, and none otherwise. A value not in KIHO_ACCESS is
 * read as unset: it is stored user data.
 * @param {{kihoAccess?: string, kiho: number, shugenja: boolean}} school - A School's system data
 * @returns {string} One of KIHO_ACCESS
 */
export function getSchoolKihoAccess({ kihoAccess, kiho, shugenja }) {
  if (KIHO_ACCESS.includes(kihoAccess)) {
    return kihoAccess;
  }
  return kiho > 0 ? "brotherhood" : shugenja ? "shugenja" : "none";
}

/**
 * The way a character learns kiho, from its Schools: the most open access any of them gives, in the order of
 * KIHO_ACCESS, with the highest and the total School Rank of the Schools giving it. A Brotherhood monk who also
 * studies as a shugenja learns as a monk.
 * game-rules/87_kiho.md, p.266
 * @param {Array<{kihoAccess?: string, kiho: number, shugenja: boolean, schoolRank: number}>} schools - Each School's
 *   system data
 * @returns {{access: string, rank: number, totalRank: number}|null} Null when no School gives kiho
 */
export function getKihoBuyer(schools) {
  for (const access of KIHO_ACCESS.filter(a => a !== "none")) {
    const ranks = schools.filter(s => getSchoolKihoAccess(s) === access).map(s => s.schoolRank);
    if (ranks.length) {
      return { access, rank: Math.max(...ranks), totalRank: ranks.reduce((a, b) => a + b, 0) };
    }
  }
  return null;
}

/**
 * Whether a buyer meets a kiho's Mastery Level: a monk with the kiho's Ring plus the School Rank, a shugenja with the
 * Ring alone, a ninja with the School Rank alone. Ring 3 and School Rank 1 reach Mastery 4 for a monk, 3 for a
 * shugenja.
 * game-rules/87_kiho.md, p.261, 266
 * @param {{access: string, rank: number}} buyer - From getKihoBuyer
 * @param {{mastery: number, ring: number}} kiho - The kiho's Mastery Level, and the buyer's rank in its Ring
 * @returns {boolean}
 */
export function isKihoMasteryMet({ access, rank }, { mastery, ring }) {
  const reach = access === "shugenja" ? ring : access === "ninja" ? rank : ring + rank;
  return reach >= mastery;
}

/**
 * A kiho's XP price for a kind of buyer: its Mastery Level for a Brotherhood monk, one and a half times for another
 * Monk School's student, rounded up (Ernie's ruling, #159), twice for a shugenja or a ninja. Mastery 3 costs 3, 5,
 * and 6. A kiho with no buyer, one the GM gave, costs its Mastery Level.
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * game-rules/87_kiho.md, p.266
 * @param {number} mastery
 * @param {string|undefined} access - The buyer's access
 * @returns {number}
 */
export function getKihoPrice(mastery, access) {
  return Math.ceil(mastery * (KIHO_PRICE_FACTOR[access] ?? 1));
}

/**
 * The most kiho a buyer outside the Brotherhood may know: the total School Rank of the Schools giving access. A
 * Brotherhood monk's bonus kiho are limited by getKihoLimits instead.
 * game-rules/87_kiho.md, p.266
 * @param {{access: string, totalRank: number}} buyer - From getKihoBuyer
 * @returns {number|null} Null for a Brotherhood monk
 */
export function getKihoCap({ access, totalRank }) {
  return access === "brotherhood" ? null : totalRank;
}

/**
 * A monk's kiho against what the Monk Schools allow: each gives its starting kiho at Rank 1 and two more each later
 * Rank, free; the character may buy bonus kiho, one per Rank of all Monk Schools together. A School with no starting
 * kiho is not a Monk School.
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * @param {{kiho: number, rank: number}[]} schools - Each School's starting kiho and School Rank
 * @param {{schoolKiho: boolean}[]} kiho - The character's kiho, each marked as a School kiho or not
 * @returns {{school: number, schoolAllowed: number, bonus: number, bonusAllowed: number}|null} Null for a character
 *   with no Monk School
 */
export function getKihoLimits(schools, kiho) {
  const monk = schools.filter(school => school.kiho > 0);
  if (!monk.length) {
    return null;
  }
  const school = kiho.filter(k => k.schoolKiho).length;
  return {
    school,
    schoolAllowed: monk.reduce((sum, s) => sum + s.kiho + 2 * Math.max(0, s.rank - 1), 0),
    bonus: kiho.length - school,
    bonusAllowed: monk.reduce((sum, s) => sum + s.rank, 0)
  };
}
