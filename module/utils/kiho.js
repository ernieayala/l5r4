/**
 * @module utils/kiho
 * @description A monk's kiho against what the Monk Schools allow, which the XP manager shows beside the kiho's XP
 * (module/utils/xp-ledger.js prices them).
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 */

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
